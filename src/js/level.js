// Shared track core for both modes: item placement, the obstacle pool, collision, the rules for
// what happens when the orb meets each obstacle, fairness validation, and the test autopilot.
// Pure logic with no Phaser dependency, so it can be tested on its own.
//
// Item types (campaign data and Endless patterns use the same ones):
//   gate     wall with a gap centred `x` px off the lane centre, `need` px half-width (or longer:
//            `length` = a tunnel). The orb must be inside the gap, steered there, and small enough.
//   barrier  full-width barrier; the orb must be charged (near full size) to smash it, wherever it is.
//            `charged: true` = charged barrier: also needs a full charge ring (held full size)
//   energy   gold note pickup at lane position `x`; collected on contact at any orb size
//   bonus    mint note pickup; optional extra, allowed tighter timing
(function () {
  const C = Pulse.CONFIG;
  const R = C.orb.radius;

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  function circleRect(cx, cy, r, rx, ry, rw, rh) {
    const dx = cx - clamp(cx, rx, rx + rw);
    const dy = cy - clamp(cy, ry, ry + rh);
    return dx * dx + dy * dy < r * r;
  }

  // "Charged" = close enough to full size to collect energy and smash barriers.
  const CHARGED_RADIUS = R - C.pickup.sizeTolerance;
  const isCharged = (r) => r > CHARGED_RADIUS;

  // Orb state shared by the game and the tests. Size: the radius follows the touch, and the charge
  // ring fills while the orb stays charged (full in `chargeTime` s) and empties the moment it isn't.
  // Position: `x` chases the steering target `tx` with a speed limit and an acceleration limit,
  // integrated in fixed slices (`SLICE`) so the motion is the same at 30, 60 or 144 fps.
  const S = C.steer;
  const SLICE = 0.004;
  const Orb = {
    create() {
      return { radius: R, charge: 1, x: C.orb.x, vx: 0, tx: C.orb.x };
    },
    // Steering target, kept inside the lane margins.
    setTarget(o, tx, width) {
      o.tx = clamp(tx, S.margin, (width || C.width) - S.margin);
      return o;
    },
    slide(o, dt, width) {
      const lo = S.margin;
      const hi = (width || C.width) - S.margin;
      const n = Math.max(1, Math.ceil(dt / SLICE - 1e-9));
      const h = dt / n;
      for (let i = 0; i < n; i++) {
        const want = clamp(S.follow * (o.tx - o.x), -S.maxSpeed, S.maxSpeed);
        const dv = clamp(want - o.vx, -S.accel * h, S.accel * h);
        o.vx += dv;
        o.x += o.vx * h;
        if (o.x < lo) { o.x = lo; if (o.vx < 0) o.vx = 0; }
        if (o.x > hi) { o.x = hi; if (o.vx > 0) o.vx = 0; }
      }
      return o;
    },
    step(o, held, dt, width) {
      const target = held ? C.orb.minRadius : R;
      o.radius = o.radius > target
        ? Math.max(target, o.radius - C.orb.shrinkRate * dt)
        : Math.min(target, o.radius + C.orb.growRate * dt);
      o.charge = isCharged(o.radius) ? Math.min(1, o.charge + dt / C.barrier.chargeTime) : 0;
      Orb.slide(o, dt, width);
      return o;
    },
  };

  // Gap geometry. `half` is the half-width of the opening and `x` its centre offset from the lane
  // centre; the opening is clamped so a wall of at least `wallMinWidth` stays on each side.
  // The orb fits when its radius is within the opening, and it must also be steered there.
  function setGap(seg, half, x, width) {
    const cx = clamp(C.orb.x + (x || 0), C.wallMinWidth + half, width - C.wallMinWidth - half);
    seg.cx = seg.cx0 = cx;
    seg.half = half;
    seg.gapL = cx - half;
    seg.gapR = cx + half;
    seg.need = half;
  }

  // Route fork (docs/ROUTES.md): ONE wall with TWO openings, left (`gapL..gapR`, the item's own `need`
  // and `x`) and right (`gap2L..gap2R`, from `fork.need`/`fork.x`), kept apart by a divider pillar
  // at least `route.divider` px wide on the lane centre. `fork.risk` ('L' or 'R') says which opening
  // is the demanding route. The openings are clamped so each stays on its own side of the divider.
  function setFork(seg, src, width) {
    const D = C.route.divider / 2;
    const mid = width / 2;
    const h1 = src.need;
    const h2 = src.fork.need;
    const cx1 = clamp(C.orb.x + (src.x || 0), C.wallMinWidth + h1, mid - D - h1);
    const cx2 = clamp(C.orb.x + (src.fork.x || 0), mid + D + h2, width - C.wallMinWidth - h2);
    seg.cx = seg.cx0 = cx1;
    seg.half = seg.need = h1;
    seg.gapL = cx1 - h1;
    seg.gapR = cx1 + h1;
    seg.cx2 = cx2;
    seg.need2 = h2;
    seg.gap2L = cx2 - h2;
    seg.gap2R = cx2 + h2;
    seg.risk = src.fork.risk === 'L' ? 'L' : 'R';
    seg.fork = true;
  }

  // One opening of a gate as a plain gate-shaped object: side 'L'/'R' of a fork, or the gate itself.
  function openingOf(g, side) {
    if (!g.fork) return { gapL: g.gapL, gapR: g.gapR, half: g.half !== undefined ? g.half : g.need, cx: g.cx, side: null };
    return side === 'R'
      ? { gapL: g.gap2L, gapR: g.gap2R, half: g.need2, cx: g.cx2, side: 'R' }
      : { gapL: g.gapL, gapR: g.gapR, half: g.need, cx: g.cx, side: 'L' };
  }

  // Which side a route name means at this fork: 'risk' / 'safe' (relative to the fork) or 'L' / 'R'.
  function sideOf(g, route) {
    if (route === 'L' || route === 'R') return route;
    const other = g.risk === 'L' ? 'R' : 'L';
    return route === 'risk' ? g.risk : other;
  }

  // The opening the orb is in (or nearest to) at lane position x.
  function openingAt(g, x, width) {
    return openingOf(g, x < (width || C.width) / 2 ? 'L' : 'R');
  }

  // A fork's lane as an ordinary item list: shared items as they are, the other lane's items left out,
  // each fork row replaced by the gate for that lane's opening. Fairness is checked on each lane alone.
  function laneView(items, side) {
    const out = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.lane && it.lane !== side) continue;
      if (it.fork) {
        const o = openingOf(it, side);
        out.push(Object.assign({}, it, { fork: false, gapL: o.gapL, gapR: o.gapR, need: o.half, half: o.half, cx: o.cx, cx0: o.cx, _i: i }));
      } else out.push(it._i === undefined ? Object.assign({}, it, { _i: i }) : it);
    }
    return out;
  }

  const isPickup = (type) => type === 'energy' || type === 'bonus';
  const itemHeight = (src) => (src.type === 'gate' ? (src.length || C.gate.thickness)
    : src.type === 'barrier' ? (src.charged ? C.barrier.chargedThickness : C.barrier.thickness) : 0);

  // What size an item demands: 'small' (a gate too narrow for a full-size orb to aim through
  // comfortably), 'big' (barrier) or null (wide gate, pickups: any size passes).
  function demand(it) {
    if (it.type === 'gate') return it.need < R + C.lateral.minWindow ? 'small' : null;
    if (it.type === 'barrier') return 'big';
    return null;
  }

  // Distance the orb itself takes up between two items when measuring clear time.
  const extent = (type) => (isPickup(type) ? 2.5 * C.pickup.radius : R);

  // Clear time (s) between item a's far edge and item b's near edge at `speed`, and the inverse.
  const clearTime = (aType, bType, distance, speed) => (distance - extent(aType) - extent(bType)) / speed;
  const spaceFor = (aType, bType, seconds, speed) => extent(aType) + extent(bType) + seconds * speed;

  // Places one item `space` px after `prevTop`. Returns the compiled item.
  function placeItem(src, prevTop, width) {
    const h = itemHeight(src);
    const item = { type: src.type, at: prevTop + src.space, h, space: src.space };
    if (src.type === 'gate' && src.fork) {
      setFork(item, src, width);
    } else if (src.type === 'gate' && src.ring) {
      // Rotating ring (unused by the portrait campaign): geometry is filled in by
      // Pulse.Campaign.compile. Until then it is an ordinary centred gap of half-width `need`.
      Pulse.setGap(item, src.need, 0, width);
      item.ring = { dir: src.ring.dir < 0 ? -1 : 1, beats: src.ring.beats || 2 };
    } else if (src.type === 'gate' && src.slide) {
      // Moving gap: it swings `amp` px either side of its centre line (`slide`), or opens and
      // closes between `need` and `need + amp` half-width (`breathe`). Level.applyMotion moves it.
      const s = src.slide;
      const breathe = s.kind === 'breathe';
      Pulse.setGap(item, src.need, src.x, width);
      item.slide = { kind: breathe ? 'breathe' : 'slide', amp: s.amp, beats: s.beats, phase: s.phase || 0,
        half: src.need, base: src.need };
    } else if (src.type === 'gate') Pulse.setGap(item, src.need, src.x, width);
    if (src.type === 'barrier' && src.charged) item.charged = true;
    if (isPickup(src.type)) item.x = clamp(C.orb.x + (src.x || 0), S.margin, width - S.margin);
    if (src.pattern) item.pattern = src.pattern;
    if (src.zone) item.zone = src.zone; // Mirror Pulse zone id (docs/MIRROR.md)
    if (src.mirror) item.mirror = true; // a mirrored pair of openings (a fork without routes)
    if (src.route) {
      item.route = src.route; // route id: the fork rows and the notes of one route choice share it
      if (src.routeEnd) item.routeEnd = true; // the last row of the fork
      if (src.lane) { item.lane = src.lane; item.role = src.role; } // a note that belongs to one lane
    }
    return item;
  }

  // Minimum time to switch from one size demand to the other.
  function minSwitchTime(from, to) {
    const T = C.track;
    if (to.type === 'barrier' && to.charged) return T.toChargedBarrier;
    if (to.type === 'barrier') return T.toBarrier;
    return T.toSmall;
  }

  // The x range a centred orb of radius `r` may occupy while it crosses this gate, and the same for a
  // moving gate over the whole time the orb overlaps it (`bpm` needed for moving gates).
  function gateSpan(it, r, speed, bpm) {
    if (!it.slide || !bpm) return [it.gapL + r, it.gapR - r];
    let lo = -Infinity;
    let hi = Infinity;
    const toBeats = bpm / 60 / speed;
    const b0 = it.arriveBeat - r * toBeats;
    const b1 = it.arriveBeat + (it.h + r) * toBeats;
    const N = 16;
    for (let k = 0; k <= N; k++) {
      const m = Pulse.Rhythm.motionShape(it.slide, b0 + ((b1 - b0) * k) / N, it.arriveBeat);
      lo = Math.max(lo, it.cx0 + m.off - m.half + r);
      hi = Math.min(hi, it.cx0 + m.off + m.half - r);
    }
    return [lo, hi];
  }

  // ---- Fairness floors for authoring ----
  // The campaign compiler treats an item's authored `t` as a request: it never places an item
  // closer to the previous one than the fairness floor below, so no stage can ask for a size switch
  // that is too quick or a sideways move too far for the clear time. (Pulse.Track.validateItems
  // re-checks the finished track independently.) State is carried from item to item.
  const FLOOR_EPS = 1.5; // px of slack so rounding can never leave a track a hair under the limit
  function fairState() {
    return { lastBig: { type: 'start', top: 0 }, lastSmall: null, prevTop: 0, reachTop: 0, reachType: 'start', reach: [C.orb.x, C.orb.x] };
  }

  // The x range the orb should aim for at this item (null = barrier / optional bonus: no constraint).
  // `exact` uses the item's real swing timing (needs arriveBeat); otherwise a moving gap is
  // represented by its swing range.
  function wantRange(it, speed, bpm, exact) {
    if (it.type === 'barrier' || it.type === 'bonus') return null;
    if (it.type !== 'gate') return [it.x - C.pickup.window, it.x + C.pickup.window];
    const r = demand(it) === 'small' ? C.orb.minRadius : R;
    if (it.slide && !exact) {
      const amp = it.slide.kind === 'breathe' ? 0 : it.slide.amp;
      return [it.cx0 - amp, it.cx0 + amp];
    }
    return gateSpan(it, r, speed, bpm);
  }

  // Smallest distance (px) after the previous item's far edge at which `it` may sit.
  function floorSpace(st, it, speed, bpm, exact) {
    let at = st.prevTop; // absolute position of the item's near edge
    const prev = st.prevType;
    const minGap = prev === undefined ? 0
      : isPickup(it.type) || isPickup(prev) ? 2 * C.pickup.radius
        : it.type !== prev ? C.track.minMixedSpace : C.track.minWallSpace;
    at = Math.max(at, st.prevTop + minGap);
    const need = demand(it);
    const from = need === 'small' ? st.lastBig : need === 'big' ? st.lastSmall : null;
    if (from) {
      at = Math.max(at, from.top + spaceFor(from.type === 'start' ? 'gate' : from.type, it.type, minSwitchTime(from, it), speed));
    }
    const want = wantRange(it, speed, bpm, exact);
    if (want) {
      const d = Math.max(0, want[0] - st.reach[1], st.reach[0] - want[1]);
      if (d > 0) {
        const c = S.latency + d / S.fairSpeed;
        at = Math.max(at, st.reachTop + spaceFor(st.reachType === 'start' ? 'gate' : st.reachType, it.type, c, speed));
      }
    }
    return at + FLOOR_EPS - st.prevTop;
  }

  // A lane-only item the other lane never meets still moves that lane's "previous item" forward.
  function advanceFair(st, it) {
    st.prevTop = it.at + it.h;
    st.prevType = it.type;
  }

  function commitFair(st, it, speed, bpm, exact) {
    const want = wantRange(it, speed, bpm, exact);
    if (want) {
      const clear = clearTime(st.reachType === 'start' ? 'gate' : st.reachType, it.type, it.at - st.reachTop, speed);
      const e = S.fairSpeed * Math.max(0, clear - S.latency);
      st.reach = [Math.max(st.reach[0] - e, S.margin, want[0]), Math.min(st.reach[1] + e, C.width - S.margin, want[1])];
      if (st.reach[0] > st.reach[1]) st.reach = [(want[0] + want[1]) / 2, (want[0] + want[1]) / 2];
      st.reachType = it.type;
      st.reachTop = it.at + it.h;
    }
    const need = demand(it);
    const rec = { type: it.type, top: it.at + it.h };
    if (need === 'small') st.lastSmall = rec;
    if (need === 'big') st.lastBig = rec;
    st.prevTop = it.at + it.h;
    st.prevType = it.type;
  }

  // Fairness of a compiled item list. Two checks:
  //  1. Size: the last moment the orb had to be small and the last it had to be big, and that
  //     there is time to switch between them, however many items sit in between.
  //  2. Steering: the set of x positions the orb can be in when it meets each item, assuming it
  //     drifts at only `steer.fairSpeed` after a `steer.latency` pause (well under what the orb can
  //     do), must never become empty, and every gate must leave `lateral.minWindow` of aiming room.
  // `speedOf(item)` gives the speed when the item reaches the orb. `opts.bpm` is needed for moving gaps.
  function validateItems(items, speedOf, label, opts) {
    if (!items.some((it) => it.fork || it.lane)) return validateLane(items, speedOf, label, opts, null);
    // A route fork is two tracks that share their start and finish: each lane must be fair on its own,
    // and the wall between the openings must be a real divider.
    const errors = [];
    const width = (opts && opts.width) || C.width;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.fork) continue;
      if (it.gap2L - it.gapR < C.route.divider - 1e-9) errors.push(`${label}: item ${i} (gate): divider ${(it.gap2L - it.gapR).toFixed(0)} px is thinner than ${C.route.divider}`);
      if (it.gapL < C.wallMinWidth - 1e-9 || it.gap2R > width - C.wallMinWidth + 1e-9) errors.push(`${label}: item ${i} (gate): fork leaves less than the minimum wall at the lane edge`);
    }
    for (const side of ['L', 'R']) {
      const view = laneView(items, side);
      errors.push(...validateLane(view, speedOf, `${label} [lane ${side}]`, opts, view.map((v) => v._i)));
    }
    return errors;
  }

  function validateLane(items, speedOf, label, opts, ids) {
    const errors = [];
    const bpm = opts && opts.bpm;
    const width = (opts && opts.width) || C.width;
    const err = (i, msg) => errors.push(`${label}: item ${ids ? ids[i] : i} (${items[i].type}): ${msg}`);
    const minNeed = C.orb.minRadius + C.lateral.minWindow;
    const lo0 = S.margin;
    const hi0 = width - S.margin;
    let lastBig = { type: 'start', top: 0 };
    let lastSmall = null;
    let prevTop = 0;
    let reachTop = 0; // far edge of the last item that constrains x
    let reachType = 'start';
    let reach = [C.orb.x, C.orb.x];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const speed = speedOf(it);
      if (it.type === 'gate') {
        if (it.need < minNeed - 1e-9) err(i, `half-width ${it.need.toFixed(1)} below the fair minimum ${minNeed}`);
        if (it.gapL < C.wallMinWidth - 1e-9 || it.gapR > width - C.wallMinWidth + 1e-9) err(i, 'gap leaves less than the minimum wall at the lane edge');
      }
      if (i > 0) {
        const prev = items[i - 1];
        const min = isPickup(it.type) || isPickup(prev.type) ? 2 * C.pickup.radius
          : it.type !== prev.type ? C.track.minMixedSpace : C.track.minWallSpace;
        if (it.at - prevTop < min) err(i, `only ${(it.at - prevTop).toFixed(0)} px after previous ${prev.type} (min ${min})`);
      }
      const need = demand(it);
      const from = need === 'small' ? lastBig : need === 'big' ? lastSmall : null;
      if (from) {
        const t = clearTime(from.type === 'start' ? 'gate' : from.type, it.type, it.at - from.top, speed);
        const min = minSwitchTime(from, it);
        if (t < min - 1e-9) err(i, `${t.toFixed(2)}s to become ${need} after ${from.type} (min ${min})`);
      }
      // Steering reach. Mint bonuses are optional, so they never constrain the path.
      if (it.type !== 'bonus' && it.type !== 'barrier') {
        let want;
        if (it.type === 'gate') {
          const r = need === 'small' ? C.orb.minRadius : R;
          want = gateSpan(it, r, speed, bpm);
          if (want[1] - want[0] < 2 * C.lateral.minWindow - 1e-9) err(i, `aiming room ${(want[1] - want[0]).toFixed(0)} px is below the ${2 * C.lateral.minWindow} px minimum`);
        } else {
          want = [it.x - C.pickup.window, it.x + C.pickup.window];
        }
        const clear = clearTime(reachType === 'start' ? 'gate' : reachType, it.type, it.at - reachTop, speed);
        const e = S.fairSpeed * Math.max(0, clear - S.latency);
        const lo = Math.max(reach[0] - e, lo0, want[0]);
        const hi = Math.min(reach[1] + e, hi0, want[1]);
        if (lo > hi + 1e-9) {
          err(i, `unreachable: the orb can be at x ${Math.max(reach[0] - e, lo0).toFixed(0)}-${Math.min(reach[1] + e, hi0).toFixed(0)} but needs ${want[0].toFixed(0)}-${want[1].toFixed(0)} (${clear.toFixed(2)}s clear)`);
        } else reach = [lo, hi];
        reachType = it.type;
        reachTop = it.at + it.h;
      }
      const rec = { type: it.type, top: it.at + it.h };
      if (need === 'small') lastSmall = rec;
      if (need === 'big') lastBig = rec;
      prevTop = it.at + it.h;
    }
    return errors;
  }

  // Segments are pooled objects, reused to avoid allocations during play. Items stream in from
  // `this.items` (absolute positions) as the track scrolls; subclasses fill that list.
  class Level {
    constructor(width, height) {
      this.width = width;
      this.height = height;
      this.segments = [];
      this.items = [];
      this.reset();
    }

    reset() {
      for (let i = 0; i < this.segments.length; i++) this.segments[i].active = false;
      this.travelled = 0;
      this.nextIndex = 0;
      this.time = 0; // run time (s); moving obstacles are a function of it, so a run is repeatable
    }

    difficulty(elapsed) {
      return clamp(elapsed / C.spacing.rampSeconds, 0, 1);
    }

    speedAt(elapsed) {
      return Math.min(C.speed.start + C.speed.perSecond * elapsed, C.speed.max);
    }

    // Hook for subclasses to append items ahead of the orb.
    fill() {}

    update(dt, speed, elapsed) {
      const dy = speed * dt;
      this.moveSegments(dy);
      this.travelled += dy;
      this.time += dt;
      this.fill(elapsed, speed);
      const items = this.items;
      while (this.nextIndex < items.length && this.travelled >= items[this.nextIndex].at) {
        this.spawnItem(items[this.nextIndex++]);
      }
      this.applyMotion();
    }

    // Where a moving gap is at run time `time`: { gapL, gapR, half, cx }.
    gapAt(s, time) {
      if (!s.slide || !this.bpm) return { gapL: s.gapL, gapR: s.gapR, half: s.half, cx: s.cx };
      const m = Pulse.Rhythm.motionShape(s.slide, (time * this.bpm) / 60, s.arriveBeat);
      const cx = s.cx0 + m.off;
      return { gapL: cx - m.half, gapR: cx + m.half, half: m.half, cx };
    }

    // Moves every active moving gap to where the beat puts it. `bpm` is set by the campaign level;
    // without one (Endless) nothing moves. Whether the orb can follow is checked by
    // Track.validateItems (the aiming room over the whole crossing).
    applyMotion() {
      if (!this.bpm) return;
      for (let i = 0; i < this.segments.length; i++) {
        const s = this.segments[i];
        if (!s.active || !s.slide) continue;
        const g = this.gapAt(s, this.time);
        s.gapL = g.gapL;
        s.gapR = g.gapR;
        s.cx = g.cx;
        s.half = s.need = g.half;
      }
    }

    moveSegments(dy) {
      for (let i = 0; i < this.segments.length; i++) {
        const s = this.segments[i];
        if (!s.active) continue;
        s.y += dy;
        if (s.y > this.height + 40) s.active = false;
      }
    }

    obtain() {
      for (let i = 0; i < this.segments.length; i++) {
        if (!this.segments[i].active) return this.segments[i];
      }
      const s = { active: false };
      this.segments.push(s);
      return s;
    }

    spawnItem(it) {
      const seg = this.obtain();
      seg.active = true;
      seg.scored = false;
      seg.resolved = false;
      seg.taken = false;
      seg.broken = false;
      seg.h = it.h;
      seg.y = this.travelled - it.at - it.h;
      seg.pattern = it.pattern || null;
      seg.slide = it.slide || null;
      seg.ring = it.ring || null;
      seg.pinged = false;
      seg.whooshed = false;
      seg.arriveBeat = it.arriveBeat || 0;
      seg.quality = null;
      // Segments are pooled: reset flags a previous use may have left (a recycled charged
      // barrier must not make a gate look charged).
      seg.charged = it.type === 'barrier' && !!it.charged;
      seg.fork = false;
      seg.side = null;
      seg.route = it.route || null;
      seg.lane = it.lane || null;
      seg.role = it.role || null;
      seg.routeEnd = !!it.routeEnd;
      seg.zone = it.zone || null;
      seg.mirror = !!it.mirror;
      if (it.type === 'gate') {
        seg.kind = 'gate';
        seg.gapL = it.gapL;
        seg.gapR = it.gapR;
        seg.need = seg.half = it.need;
        seg.cx = seg.cx0 = it.cx0;
        if (it.fork) {
          seg.fork = true;
          seg.gap2L = it.gap2L;
          seg.gap2R = it.gap2R;
          seg.need2 = it.need2;
          seg.cx2 = it.cx2;
          seg.risk = it.risk;
          seg.laneSpan = it.laneSpan || 0;
          seg.firstRow = !!it.firstRow;
          seg.riskNotes = it.riskNotes || 0;
          seg.safeNotes = it.safeNotes || 0;
        }
      } else if (it.type === 'barrier') {
        seg.kind = 'barrier';
      } else {
        seg.kind = 'pickup';
        seg.variant = it.type;
        seg.x = it.x;
        seg.quality = null;
      }
    }

    // A ring gate: the ring is centred on the lane, and its notch turns with the run clock.
    ringHit(seg, x, y, r) {
      const cx = this.width / 2;
      return Pulse.Rhythm.Ring.hits(seg.ring, cx, seg.y + seg.h / 2, Pulse.Rhythm.Ring.notchAngle(seg.ring, this.time), x, y, r);
    }

    hitsWall(seg, x, y, r) {
      if (seg.kind !== 'gate') return false;
      if (y + r < seg.y || y - r > seg.y + seg.h) return false;
      if (seg.ring) return this.ringHit(seg, x, y, r);
      if (seg.fork) {
        return circleRect(x, y, r, 0, seg.y, seg.gapL, seg.h) ||
          circleRect(x, y, r, seg.gapR, seg.y, seg.gap2L - seg.gapR, seg.h) ||
          circleRect(x, y, r, seg.gap2R, seg.y, this.width - seg.gap2R, seg.h);
      }
      return circleRect(x, y, r, 0, seg.y, seg.gapL, seg.h) ||
        circleRect(x, y, r, seg.gapR, seg.y, this.width - seg.gapR, seg.h);
    }

    touchesBarrier(seg, y, r) {
      return circleRect(C.orb.x, y, r, 0, seg.y, this.width, seg.h);
    }

    // Whether hitting this barrier right now would smash it (also used to colour it).
    canSmash(seg, r, charge) {
      return isCharged(r) && (!seg.charged || (charge === undefined ? 1 : charge) >= 1);
    }

    // A note pickup is collected when the orb's centre comes within `collectRadius` of it, at any
    // orb size (so a trail of notes can be steered through even while shrunk).
    touchesPickup(seg, x, y) {
      const dx = seg.x - x;
      const dy = seg.y - y;
      const reach = C.pickup.collectRadius;
      return dx * dx + dy * dy < reach * reach;
    }

    // The game's rules for one segment this frame. Marks the segment and returns what happened:
    // 'crash' | 'pass' (wall cleared) | 'break' (barrier smashed) | 'collect' | 'miss' | null.
    // `x` is the orb's lane position, `charge` (0..1) its charge ring; charged barriers need it full.
    // `seg.quality` is set to 'perfect' or 'good' on pass/collect/break. Shared by the game scene
    // and the tests so they can't drift apart.
    resolve(s, orbY, r, charge, x) {
      if (x === undefined) x = C.orb.x;
      if (s.kind === 'pickup') {
        if (s.resolved) return null;
        if (this.touchesPickup(s, x, orbY)) {
          s.taken = s.resolved = true;
          s.quality = Math.abs(s.x - x) <= C.pickup.perfect ? 'perfect' : 'good';
          return 'collect';
        }
        if (s.y - C.pickup.collectRadius > orbY) {
          s.resolved = true;
          return 'miss';
        }
        return null;
      }
      if (s.kind === 'barrier') {
        if (s.broken || !this.touchesBarrier(s, orbY, r)) return null;
        if (!this.canSmash(s, r, charge)) return 'crash';
        s.broken = s.scored = true;
        s.quality = 'perfect';
        return 'break';
      }
      if (this.hitsWall(s, x, orbY, r)) return 'crash';
      if (!s.scored && s.y > orbY + r) {
        s.scored = true;
        const o = openingAt(s, x, this.width);
        s.side = o.side; // which opening of a fork the orb used (null for an ordinary gate)
        s.quality = Math.abs(x - o.cx) <= Math.max(C.pickup.perfect, 0.3 * o.half) ? 'perfect' : 'good';
        return 'pass';
      }
      return null;
    }
  }

  // Mirror Pulse (docs/MIRROR.md): the echo orb's collisions, evaluated independently of the main orb's.
  // The echo shares the orb's radius and charge, sits at `ex`, and only meets segments of the mirror zone
  // (everything else was never laid out for two orbs). Returns 'crash' or 'collect' (a mint note the echo
  // touched; the segment is then resolved exactly once, so rewards are never doubled) or null. Passing a
  // row is scored once by the main orb in `resolve`.
  Level.prototype.resolveEcho = function (s, orbY, r, charge, ex) {
    if (!s.zone) return null;
    if (s.kind === 'pickup') {
      if (s.resolved || !this.touchesPickup(s, ex, orbY)) return null;
      s.taken = s.resolved = true;
      s.quality = 'good';
      return 'collect';
    }
    if (s.kind === 'barrier') {
      if (s.broken || !this.touchesBarrier(s, orbY, r)) return null;
      return this.canSmash(s, r, charge) ? null : 'crash'; // the main orb smashes it first when it can
    }
    return this.hitsWall(s, ex, orbY, r) ? 'crash' : null;
  };

  // Test autopilot with perfect reading: acts on the nearest obstacle within ~`lookSeconds`.
  // Shrinks for a gate that needs it, stays full size for a barrier (looking further ahead for
  // charged barriers, to fill the ring), otherwise grows. A larger `lookSeconds` gives the cautious
  // player: it holds through every close dare. Returns whether to hold (shrink).
  function autopilot(level, orbY, speed, lookSeconds, route) {
    const look = speed * (lookSeconds || 0.3);
    const chargeLook = speed * C.barrier.chargeTime;
    let nearest = null;
    let nearestBottom = -Infinity;
    const segs = level.segments;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      if (!s.active || s.kind === 'pickup' || s.broken) continue;
      if (s.kind === 'gate' && (openingOf(s, s.fork ? sideOf(s, route) : null).half >= R + C.lateral.minWindow || s.y >= orbY + R)) continue;
      const bottom = s.y + s.h;
      if (bottom < orbY - R - look - (s.charged ? chargeLook : 0)) continue;
      if (bottom > nearestBottom) {
        nearest = s;
        nearestBottom = bottom;
      }
    }
    return !!nearest && nearest.kind === 'gate';
  }

  // Test autopilot steering: the lane x the orb should head for. It aims for the middle of the gap
  // of the nearest gate not yet passed (where that gap will be when the orb gets there), leaning
  // toward the next gate or note so it is already on its way; a gold note ahead of a gate is taken
  // only when it is on the way. `lookSeconds` is how far ahead it looks. `skill` 0..1 scales how
  // precisely it aims (1 = dead centre of the free range, less = sloppier).
  function autosteer(level, orbX, orbY, speed, lookSeconds, skill, route) {
    const sk = skill === undefined ? 1 : skill;
    const look = speed * (lookSeconds || 1.2);
    const list = [];
    const segs = level.segments;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      if (!s.active || s.kind === 'barrier') continue;
      if (s.kind === 'gate' ? s.y > orbY + R : s.resolved) continue;
      if (s.lane && (route === 'L' || route === 'R' ? s.lane !== route : s.role !== (route || 'safe'))) continue; // the other lane's note
      if (s.y + s.h < orbY - look) continue;
      list.push(s);
    }
    if (!list.length) return C.orb.x;
    list.sort((a, b) => b.y - a.y); // nearest the orb first
    const span = (s) => {
      if (s.kind === 'pickup') return [s.x, s.x];
      if (s.fork) {
        const o = openingOf(s, sideOf(s, route));
        const r = o.half < R + C.lateral.minWindow ? C.orb.minRadius : R;
        return [o.gapL + r, o.gapR - r];
      }
      const small = s.half < R + C.lateral.minWindow;
      const r = small ? C.orb.minRadius : R;
      const dist = Math.max(0, orbY - (s.y + s.h / 2));
      const g = level.gapAt(s, level.time + dist / speed);
      return [g.gapL + r, g.gapR - r];
    };
    const first = list.find((s) => s.kind === 'gate' || s.variant === 'energy') || list[0];
    const [lo, hi] = span(first);
    let aim = (lo + hi) / 2;
    const next = list.find((s) => s !== first && s.y < first.y && (s.kind === 'gate' || s.variant === 'energy'));
    if (next) {
      const [l2, h2] = span(next);
      const want = (l2 + h2) / 2;
      const room = Math.max(0, (hi - lo) / 2 - 4) * sk;
      aim = clamp(want, (lo + hi) / 2 - room, (lo + hi) / 2 + room);
    }
    return clamp(aim, S.margin, level.width - S.margin);
  }

  // Endless scoring, shared by the game and the tests. Values are unchanged from v1:
  // +1 × multiplier per wall passed or barrier smashed; gold or mint adds +1 to the multiplier
  // (max ×5); missing gold resets it, missing mint does not. Returns feedback flags only.
  const Scoring = {
    create() {
      return { score: 0, multiplier: 1, maxStreak: 0, combo: 0 };
    },
    apply(st, event, seg) {
      const out = {};
      const max = C.multiplierMax;
      // The combo counts consecutive successes (never affects score); any miss or crash resets it.
      if (event === 'pass' || event === 'break' || event === 'collect') st.combo++;
      else if ((event === 'miss' && (!seg || seg.variant !== 'bonus')) || event === 'crash') st.combo = 0;
      out.combo = st.combo;
      if (event === 'pass' || event === 'break') {
        st.score += st.multiplier;
        if (st.multiplier === max) {
          st.maxStreak++;
          if (st.maxStreak % C.maxStreakCallout === 0) out.streak = st.maxStreak;
        }
      } else if (event === 'collect') {
        const before = st.multiplier;
        st.multiplier = Math.min(max, st.multiplier + 1);
        out.gained = st.multiplier > before;
        if (st.multiplier === max && before < max) {
          out.reachedMax = true;
          st.maxStreak = 0;
        }
      } else if (event === 'miss' && seg.variant !== 'bonus' && st.multiplier > 1) {
        st.multiplier = 1;
        st.maxStreak = 0;
        out.reset = true;
      }
      return out;
    },
  };

  Pulse.Level = Level;
  Pulse.circleRect = circleRect;
  Pulse.setGap = setGap;
    Pulse.isCharged = isCharged;
  Pulse.Orb = Orb;
  Pulse.Scoring = Scoring;
  Pulse.Track = { openingOf, openingAt, sideOf, laneView, placeItem, validateItems, clearTime, spaceFor, demand, itemHeight, gateSpan, fairState, floorSpace, commitFair, advanceFair };
  Pulse.autopilot = autopilot;
  Pulse.autosteer = autosteer;
})();
