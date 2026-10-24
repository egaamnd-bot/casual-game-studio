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

  function walls(g, seg, width) {
    g.fillStyle(T.wall, 1);
    g.fillRect(0, seg.y, seg.gapL, seg.h);
    g.fillRect(seg.gapR, seg.y, width - seg.gapR, seg.h);
    // Bright inner edges make the gap easy to read at speed.
    g.fillStyle(T.wallEdge, 1);
    g.fillRect(seg.gapL - 4, seg.y, 4, seg.h);
    g.fillRect(seg.gapR, seg.y, 4, seg.h);
  }

  function pickup(g, seg, orbX) {
    if (seg.taken) return;
    const r = C.pickup.radius;
    g.fillStyle(T.pickup, 0.25);
    g.fillCircle(orbX - seg.offset, seg.y, r + 6);
    g.fillCircle(orbX + seg.offset, seg.y, r + 6);
    g.fillStyle(T.pickup, 1);
    g.fillCircle(orbX - seg.offset, seg.y, r);
    g.fillCircle(orbX + seg.offset, seg.y, r);
  }

  function orb(g, x, y, radius, dead) {
    const shrunk = radius < C.orb.radius - 4;
    const color = dead ? T.danger : (shrunk ? T.orbShrunk : T.orb);
    g.fillStyle(color, 0.18);
    g.fillCircle(x, y, radius + 10);
    g.fillStyle(color, 1);
    g.fillCircle(x, y, radius);
    g.fillStyle(T.orbCore, 0.9);
    g.fillCircle(x, y, radius * 0.4);
  }

  // Expanding ring after collecting a pickup; t runs from 0 to 1.
  function collectRing(g, x, y, t) {
    g.lineStyle(4 * (1 - t), T.pickup, 1 - t);
    g.strokeCircle(x, y, C.orb.radius + 10 + 50 * t);
  }

  return { background, walls, pickup, orb, collectRing };
})();
