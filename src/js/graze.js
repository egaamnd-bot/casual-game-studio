// Graze detection for the near-miss -> Overdrive prototype (docs/NEAR_MISS.md). Pure geometry, no Phaser,
// no audio; nothing here reads or changes collision. It answers one question about a gate the orb has
// just cleared: how close did the orb's BODY (the collision circle) come to the wall, at its closest,
// over the whole crossing?
//
//   clearance(seg, x, y, r, width)  signed gap between the orb circle (centre x,y, radius r) and the gate's
//                                   walls: distance to the nearest wall rectangle minus r. It is negative
//                                   exactly when Level.hitsWall says the orb is hit (same rectangles, same
//                                   strict "distance < r" rule), 0 when just touching.
//   observe(seg, x, y, r, width)    call once per frame, after the world moved: updates seg.gz (the smallest
//                                   clearance so far) by sampling the crossing every <= STEP px of wall travel,
//                                   interpolating the orb and the (possibly moving) gap between frames, so the
//                                   result does not depend on the frame rate.
//   isGraze(seg, margin)            0 <= closest clearance <= margin: it was close and it was NOT a hit.
//
// The older cosmetic near-miss (GameScene.checkNearMiss) looks at the horizontal gap once, at the moment the
// wall has fully passed. That can miss a real graze (the orb brushed the wall, then drifted away) and, for a
// moving gap, judge the wrong moment; it is left as is for every other stage.
(function () {
  const STEP = 4; // px of wall travel between samples
  const MAX_SUB = 12;

  function rectDist(x, y, rx, ry, rw, rh) {
    const dx = x - Math.min(rx + rw, Math.max(rx, x));
    const dy = y - Math.min(ry + rh, Math.max(ry, y));
    return Math.sqrt(dx * dx + dy * dy);
  }

  // The same rectangles as Level.hitsWall (ring gates are not handled: they are not lateral gaps).
  function clearanceAt(y0, h, gl, gr, g2l, g2r, fork, x, y, r, width) {
    let d = Math.min(rectDist(x, y, 0, y0, gl, h), rectDist(x, y, fork ? g2r : gr, y0, width - (fork ? g2r : gr), h));
    if (fork) d = Math.min(d, rectDist(x, y, gr, y0, g2l - gr, h));
    return d - r;
  }

  function clearance(seg, x, y, r, width) {
    return clearanceAt(seg.y, seg.h, seg.gapL, seg.gapR, seg.gap2L, seg.gap2R, !!seg.fork, x, y, r, width);
  }

  function reset(seg) {
    seg.gz = Infinity;
    seg.gzSide = 0;
    seg.gpy = NaN;
  }

  function observe(seg, x, y, r, width) {
    if (seg.kind !== 'gate' || seg.ring) return;
    const fork = !!seg.fork;
    const gl = seg.gapL, gr = seg.gapR, g2l = fork ? seg.gap2L : 0, g2r = fork ? seg.gap2R : 0;
    if (seg.gpy !== seg.gpy) { // first look: no previous state to interpolate from
      seg.gpy = seg.y; seg.gpx = x; seg.gpr = r; seg.gpl = gl; seg.gpgr = gr; seg.gpl2 = g2l; seg.gpr2 = g2r;
    }
    // Far from the orb in y the clearance is above any margin: nothing to measure, only keep the previous state.
    const near = seg.y <= y + r + 40 && seg.y + seg.h >= y - r - 40;
    if (near) {
      const n = Math.max(1, Math.min(MAX_SUB, Math.ceil(Math.abs(seg.y - seg.gpy) / STEP)));
      for (let i = 1; i <= n; i++) {
        const u = i / n;
        const sx = seg.gpx + (x - seg.gpx) * u;
        const sr = seg.gpr + (r - seg.gpr) * u;
        const sy = seg.gpy + (seg.y - seg.gpy) * u;
        const il = seg.gpl + (gl - seg.gpl) * u, ir = seg.gpgr + (gr - seg.gpgr) * u;
        const il2 = seg.gpl2 + (g2l - seg.gpl2) * u, ir2 = seg.gpr2 + (g2r - seg.gpr2) * u;
        const c = clearanceAt(sy, seg.h, il, ir, il2, ir2, fork, sx, y, sr, width);
        if (c < seg.gz) {
          seg.gz = c;
          const open = fork && sx >= width / 2 ? (il2 + ir2) / 2 : (il + ir) / 2; // the opening the orb is in
          seg.gzSide = sx < open ? -1 : 1; // which wall was the closer one
        }
      }
    }
    seg.gpy = seg.y; seg.gpx = x; seg.gpr = r; seg.gpl = gl; seg.gpgr = gr; seg.gpl2 = g2l; seg.gpr2 = g2r;
  }

  const isGraze = (seg, margin) => seg.gz >= 0 && seg.gz <= margin;

  Pulse.Graze = { STEP, clearance, reset, observe, isGraze };
})();
