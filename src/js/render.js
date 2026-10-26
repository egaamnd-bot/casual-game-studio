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

  // Trailer-style gap wall (comet look): dark hull, crimson rim and chevrons pointing at the gap,
  // amber lines on the gap-facing edges (they mark exactly where the collision edge is). A moving
  // gap also gets a dotted rail through it and small arrows showing which way it is swinging.
  // Reads the live `gapL`/`gapR`, so what is drawn is always what collides.
  function cometGate(g, seg, width, beat, ghost) {
    const y = seg.y;
    const h = seg.h;
    const piece = (x0, x1, dir) => {
      if (x1 - x0 < 2) return;
      g.fillStyle(0x16060f, 0.94);
      g.fillRect(x0, y, x1 - x0, h);
      g.lineStyle(6, T.wallEdge, 0.14); // soft glow
      g.strokeRect(x0, y, x1 - x0, h);
      g.lineStyle(2, T.wallEdge, 0.95);
      g.strokeRect(x0, y, x1 - x0, h);
      g.lineStyle(2, T.wallEdge, 0.6);
      g.beginPath();
      const cy = y + h / 2;
      const hh = h / 2 - 7;
      // Chevrons, closest to the gap first, pointing toward it.
      const edge = dir > 0 ? x1 : x0;
      for (let x = edge - dir * 12; dir > 0 ? x > x0 + 6 : x < x1 - 6; x -= dir * 15) {
        g.moveTo(x - dir * 6, cy - hh);
        g.lineTo(x, cy);
        g.lineTo(x - dir * 6, cy + hh);
      }
      g.strokePath();
    };
    piece(0, seg.gapL, 1);
    piece(seg.gapR, width, -1);
    g.fillStyle(T.gapEdge, 1);
    g.fillRect(seg.gapL - 3, y, 3, h);
    g.fillRect(seg.gapR, y, 3, h);
    if (seg.slide) {
      const cy = y + h / 2;
      g.fillStyle(T.gapEdge, 0.55);
      for (let x = 10; x < width; x += 20) g.fillRect(x, cy - 1, 8, 2);
      // Ghost brackets: where the opening will be when it reaches the orb (the motion is
      // deterministic, so this is exact). The live gap glides to meet them.
      if (ghost) {
        const m = Pulse.Rhythm.motionShape(seg.slide, seg.arriveBeat, seg.arriveBeat);
        const gx0 = seg.cx0 + m.off - m.half;
        const gx1 = seg.cx0 + m.off + m.half;
        g.lineStyle(2, T.gapEdge, 0.45);
        g.beginPath();
        for (const [gx, d] of [[gx0, 1], [gx1, -1]]) {
          g.moveTo(gx + d * 7, y - 7);
          g.lineTo(gx, y - 7);
          g.lineTo(gx, y + h + 7);
          g.lineTo(gx + d * 7, y + h + 7);
        }
        g.strokePath();
      }
      // Arrows beside the gap showing where it goes next: a swinging gap points the way it is
      // heading; a breathing gap points inward (closing, amber) or outward (opening, mint).
      const u = (beat - seg.arriveBeat) / seg.slide.beats + seg.slide.phase;
      const mid = (seg.gapL + seg.gapR) / 2;
      const breathe = seg.slide.kind === 'breathe';
      const dir = breathe ? (Math.sin(2 * Math.PI * u) <= 0 ? 1 : -1) : (Math.cos(2 * Math.PI * u) >= 0 ? 1 : -1);
      g.lineStyle(2, breathe && dir < 0 ? T.bonus : T.gapEdge, 0.9);
      g.beginPath();
      for (const side of breathe ? [-1, 1] : [1]) {
        const heading = breathe ? -side * dir : dir; // breathe: toward the gap while closing
        for (let k = 0; k < 2; k++) {
          const ax = breathe ? mid + side * (seg.slide.half + 16 + k * 9) : mid + dir * (seg.slide.half + 16 + k * 9);
          g.moveTo(ax - heading * 4, cy - 6);
          g.lineTo(ax + heading * 2, cy);
          g.lineTo(ax - heading * 4, cy + 6);
        }
      }
      g.strokePath();
    }
  }

  // Rotating ring gate. Drawn from exactly the numbers the collision test uses: centre, radius,
  // thickness, and the live notch angle and half-width. Rotation direction reads three ways: the
  // chevrons on the ring point the way it turns, an amber marker rides the notch, and the notch's
  // leading edge is brighter. Two faint ticks on the ring mark the front and rear points where the
  // orb will pass: the notch arrives there on the beat.
  function ring(g, seg, time) {
    const r = seg.ring;
    const cx = Pulse.CONFIG.orb.x;
    const cy = seg.y + seg.h / 2;
    const notch = Pulse.Rhythm.Ring.notchAngle(r, time);
    const a0 = notch + r.alpha; // the solid arc runs the long way round from here ...
    const a1 = notch + 2 * Math.PI - r.alpha; // ... to here
    const half = r.t / 2;
    g.lineStyle(r.t + 8, T.wallEdge, 0.12); // glow
    g.beginPath();
    g.arc(cx, cy, r.R, a0, a1);
    g.strokePath();
    g.lineStyle(r.t, 0x16060f, 0.94); // hull
    g.beginPath();
    g.arc(cx, cy, r.R, a0, a1);
    g.strokePath();
    g.lineStyle(2, T.wallEdge, 0.95); // rims
    for (const rad of [r.R - half, r.R + half]) {
      g.beginPath();
      g.arc(cx, cy, rad, a0, a1);
      g.strokePath();
    }
    // Chevrons along the ring, pointing the way it turns.
    g.lineStyle(2, T.wallEdge, 0.6);
    g.beginPath();
    const step = 15 / r.R;
    const arm = half - 5;
    for (let a = a0 + step * 0.6; a < a1 - step * 0.4; a += step) {
      const tx = -Math.sin(a) * r.dir;
      const ty = Math.cos(a) * r.dir;
      const nx = Math.cos(a);
      const ny = Math.sin(a);
      const px = cx + nx * r.R;
      const py = cy + ny * r.R;
      g.moveTo(px - tx * 3 + nx * arm, py - ty * 3 + ny * arm);
      g.lineTo(px + tx * 4, py + ty * 4);
      g.lineTo(px - tx * 3 - nx * arm, py - ty * 3 - ny * arm);
    }
    g.strokePath();
    // The opening: amber edges, a brighter leading edge, and a marker that rides it.
    for (const sgn of [-1, 1]) {
      const a = notch + sgn * r.alpha;
      const lead = sgn * r.dir > 0; // the edge the ring turns toward
      g.lineStyle(lead ? 4 : 3, T.gapEdge, lead ? 1 : 0.75);
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * (r.R - half - 3), cy + Math.sin(a) * (r.R - half - 3));
      g.lineTo(cx + Math.cos(a) * (r.R + half + 3), cy + Math.sin(a) * (r.R + half + 3));
      g.strokePath();
    }
    const mx = cx + Math.cos(notch) * r.R;
    const my = cy + Math.sin(notch) * r.R;
    g.fillStyle(T.gapEdge, 0.9);
    g.fillTriangle(mx + Math.cos(notch + r.dir * 1.57) * 8, my + Math.sin(notch + r.dir * 1.57) * 8,
      mx - Math.cos(notch) * 4 - Math.cos(notch + r.dir * 1.57) * 3, my - Math.sin(notch) * 4 - Math.sin(notch + r.dir * 1.57) * 3,
      mx + Math.cos(notch) * 4 - Math.cos(notch + r.dir * 1.57) * 3, my + Math.sin(notch) * 4 - Math.sin(notch + r.dir * 1.57) * 3);
    // Where the opening must be when the orb arrives: the front and rear points of the ring.
    g.lineStyle(2, T.gapEdge, 0.4);
    g.beginPath();
    for (const s of [1, -1]) {
      g.moveTo(cx, cy + s * (r.R - half - 9));
      g.lineTo(cx, cy + s * (r.R - half - 3));
    }
    g.strokePath();
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

  // A note pickup at lane position seg.x: energy is a circle, bonus a diamond. It can be taken at
  // any orb size, so it is never dimmed.
  function pickup(g, seg) {
    if (seg.taken) return;
    const r = C.pickup.radius;
    const color = seg.variant === 'bonus' ? T.bonus : T.pickup;
    const x = seg.x;
    g.fillStyle(color, 0.25);
    g.fillCircle(x, seg.y, r + 6);
    g.fillStyle(color, 1);
    if (seg.variant === 'bonus') {
      g.fillTriangle(x, seg.y - r - 3, x - r, seg.y, x + r, seg.y);
      g.fillTriangle(x, seg.y + r + 3, x - r, seg.y, x + r, seg.y);
    } else {
      g.fillCircle(x, seg.y, r);
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

  function orb(g, x, y, radius, dead, skin, fx) {
    const colors = skin.colors;
    const shrunk = radius < C.orb.radius - 4;
    const color = dead ? T.danger : (shrunk ? colors.shrunk : colors.orb);
    g.fillStyle(color, 0.18);
    g.fillCircle(x, y, radius * (fx ? fx.glow : 1) + 10);
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

  return { background, walls, cometGate, ring, tunnelBody, barrier, chargeRing, pickup, finishLine, orb, collectRing, progressBar, star, stars };
})();
