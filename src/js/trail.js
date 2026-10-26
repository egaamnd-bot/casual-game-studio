// Comet / echo trail path (cosmetic only; nothing here is read by gameplay).
//
// Why a history and not "a rotated tail": the orb stays at one screen height while the world scrolls
// past it (Level.travelled grows by the distance moved). A point where the orb WAS therefore sits
// lower on the screen by exactly the distance travelled since: y = orbY + (travelledNow - travelledThen),
// the same rule every obstacle follows (seg.y = travelled - at - h). The trail is that path:
// x(s) is the orb's lateral position s px of travel ago. Because s is the vertical offset, the path
// is a function of s and can never fold back on itself; fast steering shows as a lean, not a loop.
//
// Samples are stored on a fixed grid of `step` px of travel (absolute: grid index k covers
// travelled = k * step) in a ring buffer, so spacing is uniform at any frame rate, the Catmull-Rom
// evaluation below is the plain uniform one, and pausing (travelled does not move) adds nothing.
// A rewind (a retry resets travelled to 0) or a jump restarts the history at the current position.
(function () {
  const STEP = 4;
  const CAP = 256; // ring size: STEP * (CAP - 8) = 992 px of history, far more than any tail length

  function create() {
    return { xs: new Float32Array(CAP), latest: 0, oldest: 0, d: NaN, x: 0 };
  }

  // Start (or restart) the history at x, as a straight tail.
  function reset(t, x, travelled) {
    const k = Math.floor(travelled / STEP);
    t.d = travelled;
    t.x = x;
    t.latest = k;
    t.oldest = k;
    t.xs[((k % CAP) + CAP) % CAP] = x;
  }

  const at = (t, k) => t.xs[((k % CAP) + CAP) % CAP];

  // Record the orb at `x` after the world has moved to `travelled`.
  function push(t, x, travelled) {
    if (!(t.d === t.d) || travelled < t.d - 1e-6 || travelled - t.d > STEP * (CAP - 16)) {
      reset(t, x, travelled);
      return;
    }
    const k1 = Math.floor(travelled / STEP);
    if (travelled > t.d) {
      for (let k = t.latest + 1; k <= k1; k++) {
        const frac = (k * STEP - t.d) / (travelled - t.d); // where on this frame's move the grid line is crossed
        t.xs[((k % CAP) + CAP) % CAP] = t.x + (x - t.x) * Math.min(1, Math.max(0, frac));
        t.latest = k;
      }
      t.oldest = Math.max(t.oldest, t.latest - (CAP - 8));
      t.d = travelled;
    }
    t.x = x;
  }

  // The lateral position s px of travel behind the head (s = 0 is the orb itself). Beyond the recorded
  // history the oldest position is held, which is a straight tail.
  function xAt(t, s) {
    if (s <= 0) return t.x;
    const d = t.d - s;
    const f = d / STEP;
    const k1 = Math.floor(f);
    if (k1 >= t.latest) { // between the newest grid line and the head: linear
      const span = t.d - t.latest * STEP;
      if (span < 1e-6) return t.x;
      const w = Math.min(1, Math.max(0, (d - t.latest * STEP) / span));
      return at(t, t.latest) + (t.x - at(t, t.latest)) * w;
    }
    if (k1 < t.oldest) return at(t, t.oldest);
    const u = f - k1;
    const p1 = at(t, k1);
    const p2 = at(t, k1 + 1);
    const p0 = k1 - 1 >= t.oldest ? at(t, k1 - 1) : p1;
    const p3 = k1 + 2 <= t.latest ? at(t, k1 + 2) : t.x;
    // Uniform Catmull-Rom (tension 0.5).
    const u2 = u * u;
    const u3 = u2 * u;
    return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
  }

  // dx/ds at s: how far the path moves sideways per px it goes back.
  function slopeAt(t, s) {
    const h = STEP;
    const a = Math.max(0, s - h);
    const b = s + h;
    return (xAt(t, b) - xAt(t, a)) / (b - a);
  }

  // Fills out.x / out.s / out.rot / out.gap for `n` stamps spread evenly over `len` px of travel, the
  // first one `s0` px behind the orb.
  // x is lateral, s is the offset below the orb, rot tilts a vertical stamp along the path (Phaser
  // rotation: positive turns the stamp's down axis toward -x, so a path that leans left going back gets +),
  // gap is the straight distance to the next stamp (a stamp is stretched to cover it with overlap).
  function ribbon(t, len, n, out, s0) {
    const step = len / (n - 1);
    for (let i = 0; i < n; i++) {
      const s = (s0 || 0) + step * i;
      out.s[i] = s;
      out.x[i] = xAt(t, s);
      const m = slopeAt(t, s);
      out.rot[i] = -Math.atan(m);
    }
    for (let i = 0; i < n; i++) {
      const j = i < n - 1 ? i + 1 : i - 1;
      const dx = out.x[j] - out.x[i];
      out.gap[i] = Math.sqrt(dx * dx + step * step);
    }
    return out;
  }

  function makeOut(n) {
    return { x: new Float32Array(n), s: new Float32Array(n), rot: new Float32Array(n), gap: new Float32Array(n) };
  }

  Pulse.Trail = { STEP, CAP, create, reset, push, xAt, slopeAt, ribbon, makeOut };
})();
