// Endless mode: a stream of short, named patterns instead of independent random walls. Each
// pattern asks a different question of the same one-touch control (when to shrink, how long to
// hold, when to let go, whether to risk a bonus). Every generated item passes the same fairness
// rules as campaign stages (Pulse.Track.validateItems); tests/logic.html checks long seeded runs.
//
// Pattern fields:
//   id         name (logged, used for "no back-to-back repeats" and prerequisites)
//   unlock     seconds into the run before it can appear
//   requires   another pattern that must have appeared first (teach before combining)
//   intensity  0 = recovery, 1 = single decision, 2 = pair, 3+ = combo; intense stretches are
//              followed by a recovery pattern once their total passes a budget
//   recovery   true for patterns that can serve as that recovery
//   build(rng, d, first) → steps { type, t, need?, length?, charged? }; `t` is the clear time in
//              seconds before the step (Pulse.Track.spaceFor); `first` is true the first time
//              the pattern appears in a run, for a gentler introduction.
(function () {
  const C = Pulse.CONFIG;
  const R = C.orb.radius;
  const lerp = (a, b, t) => a + (b - a) * t;
  const MIN_NEED = C.orb.minRadius + C.fairMargin;

  // Gap clearances. `tight` gets narrower more often as difficulty rises; `easy` needs only a
  // short tap; `wide` needs no shrink at all.
  const tight = (rng, d) => (R - 8) - (R - 8 - MIN_NEED) * Math.pow(rng(), lerp(1.4, 0.55, d));
  const easy = (rng) => R - 10 - rng() * 6;
  const wide = (rng) => R + 14 + rng() * 30;
  const gate = (rng, d, t) => ({ type: 'gate', need: tight(rng, d), t });

  const PATTERNS = [
    // ---- Single decisions ----
    { id: 'squeeze', unlock: 0, weight: 3, intensity: 1, build: (rng, d) => [gate(rng, d)] },
    { id: 'smash', unlock: 0, weight: 2, intensity: 1, build: () => [{ type: 'barrier' }] },

    // ---- Recovery ----
    { id: 'breather', unlock: 0, weight: 1, intensity: 0, recovery: true,
      build: (rng) => [{ type: 'gate', need: wide(rng) }, { type: 'energy', t: 0.34 }] },
    { id: 'gold-run', unlock: 15, weight: 1, intensity: 0, recovery: true,
      build: () => [{ type: 'energy' }, { type: 'energy', t: 0.25 }, { type: 'energy', t: 0.25 }] },

    // ---- Pairs ----
    // Release timing: let go right after the gap so you're full size for the barrier.
    { id: 'squeeze-smash', unlock: 6, weight: 3, intensity: 2, build: (rng, d) => [
      gate(rng, d), { type: 'barrier', t: lerp(0.6, 0.36, d) },
    ] },
    // Shrink timing: stay big through the barrier, then shrink fast.
    { id: 'smash-squeeze', unlock: 6, weight: 3, intensity: 2, build: (rng, d) => [
      { type: 'barrier' }, gate(rng, d, lerp(0.65, 0.4, d)),
    ] },
    // Gold dare: a short release between two gaps grabs gold and keeps the multiplier.
    { id: 'gold-dare', unlock: 10, weight: 2, intensity: 2, build: (rng, d) => {
      const t = lerp(0.5, 0.34, d);
      return [gate(rng, d), { type: 'energy', t }, gate(rng, d, t)];
    } },
    // Hold through: two or three gaps too close to let go between.
    { id: 'double-squeeze', unlock: 12, weight: 2, intensity: 2, build: (rng, d) => {
      const steps = [gate(rng, d), gate(rng, d, lerp(0.24, 0.12, d))];
      if (d > 0.5 && rng() < 0.5) steps.push(gate(rng, d, 0.14));
      return steps;
    } },
    // Long hold: a tunnel; letting go early crashes. Gold waits at the exit.
    { id: 'long-hold', unlock: 18, weight: 2, intensity: 2, build: (rng, d) => [
      { type: 'gate', need: tight(rng, d) + 4, length: lerp(160, 360, rng()) * (0.8 + 0.4 * d) },
      { type: 'energy', t: 0.36 },
    ] },
    // Mint dare: the bonus sits in a gap too tight to be comfortable. Holding through is safe.
    { id: 'mint-dare', unlock: 20, weight: 2, intensity: 2, build: (rng, d) => {
      const t = lerp(0.32, 0.23, d);
      return [gate(rng, d), { type: 'bonus', t }, gate(rng, d, t)];
    } },

    // ---- Combo sequences ----
    { id: 'squeeze-smash-squeeze', unlock: 15, weight: 2, intensity: 3, build: (rng, d) => [
      gate(rng, d), { type: 'barrier', t: lerp(0.55, 0.36, d) }, gate(rng, d, lerp(0.6, 0.4, d)),
    ] },
    // Smash, catch the gold you're already big for, then hold through two gaps.
    { id: 'smash-gold-double', unlock: 18, weight: 2, intensity: 3, build: (rng, d) => [
      { type: 'barrier' }, { type: 'energy', t: 0.3 },
      gate(rng, d, lerp(0.45, 0.34, d)), gate(rng, d, lerp(0.22, 0.12, d)),
    ] },
    // Long hold, a recovery beat with gold, then a barrier: don't stay small out of habit.
    { id: 'hold-recover-smash', unlock: 22, weight: 2, intensity: 3, build: (rng, d) => [
      { type: 'gate', need: tight(rng, d) + 4, length: lerp(160, 300, rng()) },
      { type: 'energy', t: 0.36 }, { type: 'barrier', t: 0.3 },
    ] },
    // Squeeze, an optional mint just after it, then a barrier.
    { id: 'squeeze-mint-smash', unlock: 24, weight: 2, intensity: 3, build: (rng, d) => [
      gate(rng, d), { type: 'bonus', t: lerp(0.3, 0.23, d) }, { type: 'barrier', t: 0.2 },
    ] },
    // Rhythm: alternate squeeze and smash; easy gaps so the challenge is the beat.
    { id: 'rhythm', unlock: 25, weight: 2, intensity: 3, build: (rng, d) => {
      const t = lerp(0.6, 0.4, d);
      const steps = [];
      const n = d > 0.6 ? 5 : 4;
      for (let i = 0; i < n; i++) steps.push(i % 2 ? { type: 'barrier', t } : { type: 'gate', need: easy(rng), t });
      return steps;
    } },

    // ---- Charged barriers (need a full charge ring) ----
    // Taught alone first, with a long lead the first time.
    { id: 'charged-smash', unlock: 30, weight: 2, intensity: 2, build: (rng, d, first) => [
      { type: 'barrier', charged: true, t: first ? 1.1 : 0.8 },
    ] },
    // Let go early: the ring must fill before impact.
    { id: 'squeeze-charged', unlock: 40, requires: 'charged-smash', weight: 2, intensity: 3, build: (rng, d) => [
      gate(rng, d), { type: 'barrier', charged: true, t: lerp(0.95, 0.66, d) },
    ] },
    { id: 'charged-squeeze', unlock: 40, requires: 'charged-smash', weight: 2, intensity: 3, build: (rng, d) => [
      { type: 'barrier', charged: true, t: 0.8 }, gate(rng, d, lerp(0.6, 0.4, d)),
    ] },
    // The hardest sequence: every demand in a row, then forced recovery (high intensity).
    { id: 'gauntlet', unlock: 55, requires: 'squeeze-charged', weight: 1, intensity: 5, build: (rng, d) => [
      gate(rng, d), { type: 'barrier', t: 0.42 }, gate(rng, d, 0.44),
      { type: 'barrier', charged: true, t: 0.72 }, gate(rng, d, 0.44),
    ] },
  ];

  // Fixed opening so every run shows both basic rules before mixing them.
  const OPENING = [
    { type: 'gate', need: R - 16, t: 0.9, pattern: 'opening' },
    { type: 'energy', t: 0.5, pattern: 'opening' },
    { type: 'barrier', t: 0.7, pattern: 'opening' },
  ];

  class EndlessLevel extends Pulse.Level {
    constructor(width, height, rng) {
      super(width, height);
      this.rng = rng || Math.random;
      this.resetPatterns();
    }

    reset() {
      super.reset();
      this.items = [];
      this.resetPatterns();
    }

    resetPatterns() {
      this.genTop = 0;
      this.lastType = 'start';
      this.lastPattern = null;
      this.patternLog = [];
      this.patternTimes = []; // run time when each logged pattern was chosen (for tests)
      this.seen = new Set();
      this.heat = 0;
      this.queue = OPENING.slice();
    }

    // Intensity a stretch may build before a recovery pattern is forced (grows with difficulty).
    heatBudget(d) {
      return lerp(7, 11, d);
    }

    // Keeps items generated ~1.5 screens ahead of the orb.
    fill(elapsed, speed) {
      if (!this.rng) return;
      while (this.genTop < this.travelled + this.height * 1.5) {
        if (!this.queue.length) this.queue = this.nextPattern(elapsed);
        this.append(this.queue.shift(), elapsed, speed);
      }
    }

    choose(options) {
      let total = 0;
      for (const p of options) total += p.weight;
      let pick = this.rng() * total;
      for (const p of options) {
        pick -= p.weight;
        if (pick < 0) return p;
      }
      return options[options.length - 1];
    }

    nextPattern(elapsed) {
      const d = this.difficulty(elapsed);
      const available = PATTERNS.filter((p) => p.unlock <= elapsed && p.id !== this.lastPattern &&
        (!p.requires || this.seen.has(p.requires)));
      const needRecovery = this.heat >= this.heatBudget(d);
      const options = needRecovery ? available.filter((p) => p.recovery) : available;
      const chosen = this.choose(options.length ? options : available);
      this.heat = chosen.recovery ? 0 : this.heat + chosen.intensity;
      const first = !this.seen.has(chosen.id);
      this.seen.add(chosen.id);
      this.lastPattern = chosen.id;
      this.patternLog.push(chosen.id);
      this.patternTimes.push(elapsed);
      const steps = chosen.build(this.rng, d, first).map((s) => Object.assign({ pattern: chosen.id }, s));
      // Gap before the pattern: a breather that shrinks with difficulty, sometimes with gold.
      const between = lerp(0.9, 0.55, d);
      if (this.rng() < 0.45 && steps[0].type !== 'energy' && !steps[0].charged) {
        steps.unshift({ type: 'energy', t: Math.max(0.36, between / 2), pattern: 'between' });
        steps[1].t = Math.max(0.36, between / 2);
      } else {
        steps[0].t = Math.max(steps[0].t || 0, between);
      }
      return steps;
    }

    // Converts a step's clear time to a distance using the speed the orb will have when it gets
    // there (rounded up, so real reaction time is never less than designed).
    append(step, elapsed, speed) {
      const ahead = (this.genTop - this.travelled + this.height) / Math.max(1, speed);
      const speedThere = this.speedAt(elapsed + ahead + 1);
      const shift = step.type === 'gate' ? (this.rng() * 2 - 1) * C.gate.maxShift : 0;
      const src = Object.assign({ shift }, step, {
        space: Pulse.Track.spaceFor(this.lastType, step.type, step.t || 0, speedThere),
      });
      const item = Pulse.Track.placeItem(src, this.genTop, this.width);
      item.speed = speedThere;
      this.items.push(item);
      this.genTop = item.at + item.h;
      this.lastType = step.type;
    }
  }

  Pulse.PATTERNS = PATTERNS;
  Pulse.EndlessLevel = EndlessLevel;
})();
