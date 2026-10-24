// PLACEHOLDER geometric rendering. All drawing lives here so sprites can replace these
// functions later without changing gameplay logic.
Pulse.Render = (function () {
  const T = Pulse.THEME;
  const C = Pulse.CONFIG;
  const LINE_SPACING = 120;

  function background(g, width, height, scroll) {
    g.fillStyle(T.speedLine, 1);
    const offset = scroll % LINE_SPACING;
    for (let y = offset - LINE_SPACING; y < height; y += LINE_SPACING) {
      g.fillRect(0, y, width, 2);
    }
  }

  function walls(g, seg, width, edgeColor) {
    g.fillStyle(T.wall, 1);
    g.fillRect(0, seg.y, seg.gapL, seg.h);
    g.fillRect(seg.gapR, seg.y, width - seg.gapR, seg.h);
    // Crimson rims, plus amber strips on the gap-facing edges, so the gap reads at speed.
    g.fillStyle(edgeColor || T.wallEdge, 1);
    g.fillRect(0, seg.y, seg.gapL, 3);
    g.fillRect(0, seg.y + seg.h - 3, seg.gapL, 3);
    g.fillRect(seg.gapR, seg.y, width - seg.gapR, 3);
    g.fillRect(seg.gapR, seg.y + seg.h - 3, width - seg.gapR, 3);
    g.fillStyle(T.gapEdge, 1);
    g.fillRect(seg.gapL - 4, seg.y, 4, seg.h);
    g.fillRect(seg.gapR, seg.y, 4, seg.h);
  }

  // Tunnel body for the sprite renderer (its edges and lane guide are sprites).
  function tunnelBody(g, seg, width) {
    g.fillStyle(T.wall, 1);
    g.fillRect(0, seg.y, seg.gapL - 20, seg.h);
    g.fillRect(seg.gapR + 20, seg.y, width - seg.gapR - 20, seg.h);
    g.fillStyle(T.wallEdge, 1);
    g.fillRect(0, seg.y, seg.gapL - 20, 3);
    g.fillRect(0, seg.y + seg.h - 3, seg.gapL - 20, 3);
    g.fillRect(seg.gapR + 20, seg.y, width - seg.gapR - 20, 3);
    g.fillRect(seg.gapR + 20, seg.y + seg.h - 3, width - seg.gapR - 20, 3);
  }

  // Cyan barrier (code-drawn in both renderers; there is no barrier art yet).
  // State is shown by colour AND shape: when hitting it now would smash it, cyan with solid
  // edges; when it would crash you, red with broken (dashed) edges.
  // Charged barriers are thicker, with a second inner edge and diamond studs.
  function barrier(g, seg, width, ready) {
    if (seg.broken) return;
    const color = ready ? T.orb : T.danger;
    const y = seg.y;
    const h = seg.h;
    g.fillStyle(color, 0.16);
    g.fillRect(0, y, width, h);
    g.fillStyle(color, 1);
    if (ready) {
      g.fillRect(0, y, width, 3);
      g.fillRect(0, y + h - 3, width, 3);
    } else {
      for (let x = 0; x < width; x += 24) {
        g.fillRect(x, y, 14, 3);
        g.fillRect(x + 12, y + h - 3, 14, 3);
      }
    }
    if (seg.charged) {
      g.fillStyle(color, 0.8);
      g.fillRect(0, y + 6, width, 2);
      g.fillRect(0, y + h - 8, width, 2);
      const cy = y + h / 2;
      for (let x = 27; x < width; x += 54) {
        g.fillTriangle(x, cy - 7, x - 7, cy, x + 7, cy);
        g.fillTriangle(x, cy + 7, x - 7, cy, x + 7, cy);
      }
    } else {
      g.fillStyle(color, 0.7);
      for (let x = 9; x < width; x += 36) g.fillRect(x, y + h / 2 - 2, 18, 4);
    }
  }

  // Charge ring around the orb: fills clockwise while the orb stays full size; a closed, thicker
  // ring means a charged barrier will break.
  function chargeRing(g, x, y, radius, charge) {
    const r = radius + 16;
    g.lineStyle(2, T.orb, 0.25);
    g.strokeCircle(x, y, r);
    if (charge <= 0) return;
    const full = charge >= 1;
    g.lineStyle(full ? 5 : 3, full ? T.orbCore : T.orb, full ? 1 : 0.85);
    if (full) {
      g.strokeCircle(x, y, r);
    } else {
      g.beginPath();
      g.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + charge * Math.PI * 2, false);
      g.strokePath();
    }
  }

  // Energy is a circle, bonus a diamond. `dimmed` while the orb is too small to collect.
  function pickup(g, seg, orbX, dimmed) {
    if (seg.taken) return;
    const r = C.pickup.radius;
    const a = dimmed ? C.pickup.dimAlpha : 1;
    const color = seg.variant === 'bonus' ? T.bonus : T.pickup;
    for (let side = -1; side <= 1; side += 2) {
      const x = orbX + side * seg.offset;
      g.fillStyle(color, 0.25 * a);
      g.fillCircle(x, seg.y, r + 6);
      g.fillStyle(color, a);
      if (seg.variant === 'bonus') {
        g.fillTriangle(x, seg.y - r - 3, x - r, seg.y, x + r, seg.y);
        g.fillTriangle(x, seg.y + r + 3, x - r, seg.y, x + r, seg.y);
      } else {
        g.fillCircle(x, seg.y, r);
      }
    }
  }

  function finishLine(g, y, width) {
    const h = C.campaign.finishThickness;
    const cell = h / 2;
    for (let x = 0, col = 0; x < width; x += cell, col++) {
      g.fillStyle(col % 2 ? T.finishA : T.finishB, 1);
      g.fillRect(x, y, cell, cell);
      g.fillStyle(col % 2 ? T.finishB : T.finishA, 1);
      g.fillRect(x, y + cell, cell, cell);
    }
  }

  function orb(g, x, y, radius, dead, skin) {
    const colors = skin.colors;
    const shrunk = radius < C.orb.radius - 4;
    const color = dead ? T.danger : (shrunk ? colors.shrunk : colors.orb);
    g.fillStyle(color, 0.18);
    g.fillCircle(x, y, radius + 10);
    g.fillStyle(color, 1);
    g.fillCircle(x, y, radius);
    g.fillStyle(colors.core, 0.9);
    g.fillCircle(x, y, radius * 0.4);
  }

  // Expanding ring after collecting a pickup; t runs from 0 to 1.
  function collectRing(g, x, y, t) {
    g.lineStyle(4 * (1 - t), T.pickup, 1 - t);
    g.strokeCircle(x, y, C.orb.radius + 10 + 50 * t);
  }

  function progressBar(g, x, y, w, t) {
    g.fillStyle(T.progressTrack, 1);
    g.fillRect(x, y, w, 6);
    g.fillStyle(T.progressFill, 1);
    g.fillRect(x, y, w * t, 6);
  }

  // Five-pointed star; used by menus and result screens, not during play.
  function star(g, x, y, r, filled) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * 0.45 : r;
      pts.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr });
    }
    g.fillStyle(filled ? T.pickup : T.starEmpty, 1);
    g.fillPoints(pts, true);
  }

  function stars(g, cx, y, r, count, max) {
    const step = r * 2.4;
    const x0 = cx - ((max - 1) * step) / 2;
    for (let i = 0; i < max; i++) star(g, x0 + i * step, y, r, i < count);
  }

  return { background, walls, tunnelBody, barrier, chargeRing, pickup, finishLine, orb, collectRing, progressBar, star, stars };
})();
