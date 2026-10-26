// Mirror Pulse (docs/MIRROR.md): a short, telegraphed event in which an echo orb mirrors the player's
// horizontal position across the lane centreline, and the obstacles are laid out in mirrored pairs.
// Pure logic, no Phaser: the scene and the tests share it.
//
// Everything is a function of the distance travelled, so pausing, retrying, crashing and any frame rate
// behave identically: there are no timers to forget. A zone is a contiguous run of items tagged `zone`.
//
//   tele0 ──telegraph──▶ intro0 ──intro──▶ introEnd ───active───▶ outro0 ──outro──▶ end
//   banner + centreline   echo grows out        echo mirrors, hazards    echo folds back
//                         of the centreline     are paired               into the centreline
(function () {
  const C = Pulse.CONFIG;
  const M = C.mirror;

  const center = (width) => (width || C.width) / 2;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const smooth = (t) => { const u = clamp(t, 0, 1); return u * u * (3 - 2 * u); };

  // The reflection of lane position x across the centreline: echoX = 2 * laneCenterX - playerX.
  function reflect(x, width) {
    return 2 * center(width) - x;
  }

  // Where the echo is drawn and collides. `k` (0..1) is the strength of the event: 0 = on the centreline
  // (appearing or dissolving), 1 = the full reflection. The steering margins are symmetric about the
  // centreline, so a player inside them always has an echo inside them; the clamp only guards rounding.
  function echoX(x, k, width) {
    const w = width || C.width;
    const c = center(w);
    return clamp(c + (reflect(x, w) - c) * clamp(k === undefined ? 1 : k, 0, 1), C.steer.margin, w - C.steer.margin);
  }

  // What a mirror zone may contain: plain gates, mirrored gate pairs, barriers (plain or charged), and
  // optional mint notes. Gold notes would make the stars depend on the echo; moving gaps, rings, tunnels
  // and route forks cannot be mirrored into a fair pair here, so they never appear inside a zone.
  function supports(it) {
    if (it.type === 'barrier') return true;
    if (it.type === 'bonus') return !it.lane && !it.route;
    if (it.type === 'gate') return !it.slide && !it.ring && !it.length && !it.route && (!it.fork || !!it.mirror);
    return false;
  }

  // Lays out each zone along the track from the compiled items. Distances are `travelled` values:
  // an item's near edge reaches the orb's centre at at + orbY, and its far edge has fully passed at
  // at + h + orbY + orbRadius.
  function plan(items, orbY) {
    const zones = [];
    const byId = {};
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.zone) continue;
      let z = byId[it.zone];
      if (!z) {
        z = byId[it.zone] = { id: it.zone, first: i, last: i, rows: 0, twins: 0 };
        zones.push(z);
      }
      z.last = i;
      z.rows++;
      if (it.mirror) z.twins++;
    }
    for (const z of zones) {
      const a = items[z.first];
      const b = items[z.last];
      z.arrive0 = a.at + orbY;
      z.pass1 = b.at + b.h + orbY + C.orb.radius;
      z.intro0 = z.arrive0 - M.leadPx;
      z.tele0 = z.intro0 - M.telegraphPx;
      z.introEnd = z.intro0 + M.introPx;
      z.outro0 = z.pass1;
      z.end = z.pass1 + M.outroPx;
    }
    return zones;
  }

  // The event's state at distance `travelled` for one zone: { phase, k, tele }. `tele` (0..1) is how far
  // through the telegraph we are; `k` the echo's strength.
  function phase(z, travelled) {
    if (travelled < z.tele0 || travelled >= z.end) return { phase: 'idle', k: 0, tele: 0 };
    if (travelled < z.intro0) return { phase: 'telegraph', k: 0, tele: (travelled - z.tele0) / (z.intro0 - z.tele0) };
    if (travelled < z.introEnd) return { phase: 'intro', k: smooth((travelled - z.intro0) / (z.introEnd - z.intro0)), tele: 1 };
    if (travelled < z.outro0) return { phase: 'active', k: 1, tele: 1 };
    return { phase: 'outro', k: 1 - smooth((travelled - z.outro0) / (z.end - z.outro0)), tele: 1 };
  }

  // The zone that is on (telegraphing, active or dissolving) at `travelled`, with its state; null if none.
  function current(zones, travelled) {
    if (!zones) return null;
    for (let i = 0; i < zones.length; i++) {
      const s = phase(zones[i], travelled);
      if (s.phase !== 'idle') return Object.assign({ zone: zones[i] }, s);
    }
    return null;
  }

  Pulse.Mirror = { center, reflect, echoX, supports, plan, phase, current, smooth };
})();
