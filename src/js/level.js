// Shared track core for both modes: item placement, the obstacle pool, collision, the rules for
// what happens when the orb meets each obstacle, fairness validation, and the test autopilot.
// Pure logic with no Phaser dependency, so it can be tested on its own.
//
// Item types (campaign data and Endless patterns use the same ones):
//   gate     wall with a gap; the orb must be no bigger than `need` (or longer: `length` = a tunnel)
//   barrier  full-width cyan barrier; the orb must be charged (near full size) to smash it
//   energy   gold pickup pair; collected only while charged
//   bonus    mint pickup pair; optional extra, allowed tighter timing
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

  // Pickups sit this far left and right of the orb's path, reachable only when charged.
  const PICKUP_OFFSET = R + C.pickup.radius - C.pickup.sizeTolerance;

  // Gap edges around the orb's path. `need` is the clearance on the tight side; `shift` widens
  // the gap to the right (positive) or left (negative) without changing that clearance.
  function setGap(seg, need, shift, width) {
    const ox = C.orb.x;
    seg.gapL = Math.max(C.wallMinWidth, ox - need + Math.min(0, shift));
    seg.gapR = Math.min(width - C.wallMinWidth, ox + need + Math.max(0, shift));
    seg.need = Math.min(ox - seg.gapL, seg.gapR - ox);
  }

  const isPickup = (type) => type === 'energy' || type === 'bonus';
  const itemHeight = (src) => (src.type === 'gate' ? (src.length || C.gate.thickness)
    : src.type === 'barrier' ? C.barrier.thickness : 0);

  // What size an item demands: 'small' (gate narrower than the orb), 'big' (barrier, pickups)
  // or null (wide gate: any size passes).
  function demand(it) {
    if (it.type === 'gate') return it.need < R ? 'small' : null;
    return 'big';
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
    if (src.type === 'gate') Pulse.setGap(item, src.need, src.shift || 0, width);
    if (src.pattern) item.pattern = src.pattern;
    return item;
  }

  // Minimum time to switch from one demand to the other, by what the orb is switching to/from.
  function minSwitchTime(from, to) {
    const T = C.track;
    if (from.type === 'bonus' || to.type === 'bonus') return T.bonusTime;
    if (to.type === 'barrier') return T.toBarrier;
    if (to.type === 'energy') return T.toEnergy;
    return from.type === 'energy' ? T.energyToSmall : T.toSmall;
  }

  // Fairness of a compiled item list. Tracks the last moment the orb had to be small and the last
  // moment it had to be big, and checks there is time to switch between them, however many items
  // sit in between. `speedOf(item)` gives the speed when the item reaches the orb.
  function validateItems(items, speedOf, label) {
    const errors = [];
    const err = (i, msg) => errors.push(`${label}: item ${i} (${items[i].type}): ${msg}`);
    const minNeed = C.orb.minRadius + C.fairMargin;
    // The run starts with a full-size orb.
    let lastBig = { type: 'start', top: 0 };
    let lastSmall = null;
    let prevTop = 0;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const speed = speedOf(it);
      if (it.type === 'gate') {
        if (it.need < minNeed - 1e-9) err(i, `clearance ${it.need.toFixed(1)} below fair minimum ${minNeed}`);
        if (!(it.gapL < C.orb.x && it.gapR > C.orb.x)) err(i, "gap does not contain the orb's path");
      }
      if (i > 0 && it.at - prevTop < (isPickup(it.type) || isPickup(items[i - 1].type) ? 2 * C.pickup.radius : C.track.minWallSpace)) {
        err(i, `only ${(it.at - prevTop).toFixed(0)} px after previous item`);
      }
      const need = demand(it);
      const from = need === 'small' ? lastBig : need === 'big' ? lastSmall : null;
      if (from) {
        const t = clearTime(from.type === 'start' ? 'gate' : from.type, it.type, it.at - from.top, speed);
        const min = minSwitchTime(from, it);
        if (t < min - 1e-9) err(i, `${t.toFixed(2)}s to become ${need} after ${from.type} (min ${min})`);
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
      this.fill(elapsed, speed);
      const items = this.items;
      while (this.nextIndex < items.length && this.travelled >= items[this.nextIndex].at) {
        this.spawnItem(items[this.nextIndex++]);
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
      if (it.type === 'gate') {
        seg.kind = 'gate';
        seg.gapL = it.gapL;
        seg.gapR = it.gapR;
        seg.need = it.need;
      } else if (it.type === 'barrier') {
        seg.kind = 'barrier';
      } else {
        seg.kind = 'pickup';
        seg.variant = it.type;
        seg.offset = PICKUP_OFFSET;
      }
    }

    hitsWall(seg, x, y, r) {
      if (seg.kind !== 'gate') return false;
      if (y + r < seg.y || y - r > seg.y + seg.h) return false;
      return circleRect(x, y, r, 0, seg.y, seg.gapL, seg.h) ||
        circleRect(x, y, r, seg.gapR, seg.y, this.width - seg.gapR, seg.h);
    }

    touchesBarrier(seg, y, r) {
      return circleRect(C.orb.x, y, r, 0, seg.y, this.width, seg.h);
    }

    touchesPickup(seg, y, r) {
      const dy = seg.y - y;
      const reach = r + C.pickup.radius;
      return seg.offset * seg.offset + dy * dy < reach * reach;
    }

    // The game's rules for one segment this frame. Marks the segment and returns what happened:
    // 'crash' | 'pass' (wall cleared) | 'break' (barrier smashed) | 'collect' | 'miss' | null.
    // Shared by the game scene and the tests so they can't drift apart.
    resolve(s, orbY, r) {
      if (s.kind === 'pickup') {
        if (s.resolved) return null;
        if (this.touchesPickup(s, orbY, r)) {
          s.taken = s.resolved = true;
          return 'collect';
        }
        if (s.y - C.pickup.radius > orbY + r) {
          s.resolved = true;
          return 'miss';
        }
        return null;
      }
      if (s.kind === 'barrier') {
        if (s.broken || !this.touchesBarrier(s, orbY, r)) return null;
        if (!isCharged(r)) return 'crash';
        s.broken = s.scored = true;
        return 'break';
      }
      if (this.hitsWall(s, C.orb.x, orbY, r)) return 'crash';
      if (!s.scored && s.y > orbY + r) {
        s.scored = true;
        return 'pass';
      }
      return null;
    }
  }

  // Test autopilot with perfect reading: acts on the nearest obstacle within ~0.3 s.
  // Shrinks for a gate narrower than the orb, stays full size for a barrier, otherwise grows
  // (which collects pickups). It skips mint bonuses that are too tight to reach in time.
  function autopilot(level, orbY, speed) {
    const look = speed * 0.3;
    let nearest = null;
    let nearestBottom = -Infinity;
    const segs = level.segments;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      if (!s.active || s.kind === 'pickup' || s.broken) continue;
      if (s.kind === 'gate' && (s.need >= R || s.y >= orbY + R)) continue;
      const bottom = s.y + s.h;
      if (bottom < orbY - R - look) continue;
      if (bottom > nearestBottom) {
        nearest = s;
        nearestBottom = bottom;
      }
    }
    return !!nearest && nearest.kind === 'gate';
  }

  Pulse.Level = Level;
  Pulse.circleRect = circleRect;
  Pulse.setGap = setGap;
  Pulse.PICKUP_OFFSET = PICKUP_OFFSET;
  Pulse.isCharged = isCharged;
  Pulse.Track = { placeItem, validateItems, clearTime, spaceFor, demand, itemHeight };
  Pulse.autopilot = autopilot;
})();
