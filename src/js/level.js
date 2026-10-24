// Obstacle generation and collision. Pure logic with no Phaser dependency, so it can be
// tested on its own (see tests/logic.html).
(function () {
  const C = Pulse.CONFIG;

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function circleRect(cx, cy, r, rx, ry, rw, rh) {
    const dx = cx - clamp(cx, rx, rx + rw);
    const dy = cy - clamp(cy, ry, ry + rh);
    return dx * dx + dy * dy < r * r;
  }

  // Pickups sit this far left and right of the orb's path, reachable only near full size.
  const PICKUP_OFFSET = C.orb.radius + C.pickup.radius - C.pickup.sizeTolerance;

  // Gap edges around the orb's path. `need` is the clearance on the tight side; `shift` widens
  // the gap to the right (positive) or left (negative) without changing that clearance.
  function setGap(seg, need, shift, width) {
    const ox = C.orb.x;
    seg.gapL = Math.max(C.wallMinWidth, ox - need + Math.min(0, shift));
    seg.gapR = Math.min(width - C.wallMinWidth, ox + need + Math.max(0, shift));
    seg.need = Math.min(ox - seg.gapL, seg.gapR - ox);
  }

  // Segments are pooled objects, reused to avoid allocations during play:
  //   gate / tunnel: walls from x=0..gapL and gapR..width, spanning y..y+h.
  //   pickup: a pair of energy pickups at x = orb.x ± offset, centered on y.
  class Level {
    constructor(width, height, rng) {
      this.width = width;
      this.height = height;
      this.rng = rng || Math.random;
      this.segments = [];
      this.reset();
    }

    reset() {
      for (let i = 0; i < this.segments.length; i++) this.segments[i].active = false;
      this.spawnCount = 0;
      this.lastKind = null;
      this.distanceToNext = C.speed.start * C.firstObstacleDelay;
    }

    difficulty(elapsed) {
      return clamp(elapsed / C.spacing.rampSeconds, 0, 1);
    }

    speedAt(elapsed) {
      return Math.min(C.speed.start + C.speed.perSecond * elapsed, C.speed.max);
    }

    update(dt, speed, elapsed) {
      const dy = speed * dt;
      this.moveSegments(dy);
      this.distanceToNext -= dy;
      while (this.distanceToNext <= 0) this.spawn(speed, elapsed, -this.distanceToNext);
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

    // Gap half-width the orb must fit through. Gets tighter more often as difficulty rises.
    shrinkNeed(d) {
      const lo = C.orb.minRadius + C.fairMargin;
      const hi = C.orb.radius - 8;
      return hi - (hi - lo) * Math.pow(this.rng(), lerp(1.4, 0.55, d));
    }

    spawn(speed, elapsed, overshoot) {
      const d = this.difficulty(elapsed);
      const R = C.orb.radius;
      const index = this.spawnCount++;

      let kind = 'gate';
      if (index >= 2 && elapsed >= C.tunnel.unlockSeconds && this.lastKind !== 'tunnel' &&
          this.rng() < C.tunnel.chance + C.tunnel.chanceGrowth * d) {
        kind = 'tunnel';
      }

      // The first two gates teach: one gentle shrink, then a wide gap with a pickup.
      let need;
      if (index === 0) need = R - 16;
      else if (index === 1) need = R + 30;
      else if (kind === 'tunnel') need = this.shrinkNeed(d) + C.tunnel.extraClearance;
      else if (this.rng() < C.gate.shrinkChance + C.gate.shrinkChanceGrowth * d) need = this.shrinkNeed(d);
      else need = R + 12 + this.rng() * 36;

      const seg = this.obtain();
      seg.active = true;
      seg.kind = kind;
      seg.scored = false;
      seg.resolved = false;
      seg.taken = false;
      seg.h = kind === 'tunnel'
        ? lerp(C.tunnel.minLength, C.tunnel.maxLength, this.rng()) * (0.8 + 0.4 * d)
        : C.gate.thickness;
      this.placeGap(seg, need, kind === 'tunnel' ? C.tunnel.maxOffset : C.gate.maxOffset);
      seg.y = -seg.h + overshoot;

      let space = 2 * R + C.spacing.padding + speed * lerp(C.spacing.startTime, C.spacing.minTime, d);

      // A pickup goes halfway to the next obstacle. The gap widens if needed so there is time
      // to regrow before the pickup and to shrink again after it.
      if (index >= 1 && this.rng() < C.pickup.chance) {
        space = Math.max(space, 2 * (R + 2.5 * C.pickup.radius + C.pickup.minReactTime * speed));
        const p = this.obtain();
        p.active = true;
        p.kind = 'pickup';
        p.variant = 'energy';
        p.scored = false;
        p.resolved = false;
        p.taken = false;
        p.h = 0;
        p.y = seg.y - space / 2;
        p.offset = PICKUP_OFFSET;
      }

      this.distanceToNext = seg.h + space - overshoot;

      this.lastKind = kind;
    }

    // One side of the gap sits exactly `need` from the orb's path; the other is offset
    // randomly, so gaps look varied while the requirement stays readable.
    placeGap(seg, need, maxOffset) {
      const offset = this.rng() * maxOffset;
      const tightLeft = this.rng() < 0.5;
      setGap(seg, need, tightLeft ? offset : -offset, this.width);
    }

    hitsWall(seg, x, y, r) {
      if (seg.kind === 'pickup') return false;
      if (y + r < seg.y || y - r > seg.y + seg.h) return false;
      return circleRect(x, y, r, 0, seg.y, seg.gapL, seg.h) ||
        circleRect(x, y, r, seg.gapR, seg.y, this.width - seg.gapR, seg.h);
    }

    touchesPickup(seg, y, r) {
      const dy = seg.y - y;
      const reach = r + C.pickup.radius;
      return seg.offset * seg.offset + dy * dy < reach * reach;
    }
  }

  Pulse.Level = Level;
  Pulse.circleRect = circleRect;
  Pulse.setGap = setGap;
  Pulse.PICKUP_OFFSET = PICKUP_OFFSET;
})();
