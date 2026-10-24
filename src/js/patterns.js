// Endless mode: a stream of short, named patterns instead of independent random walls. Each
// pattern asks a different question of the same one-touch control (when to shrink, how long to
// hold, when to let go, whether to risk a bonus). Patterns unlock over time and never repeat
// back to back. Every generated item passes the same fairness rules as campaign stages
// (Pulse.Track.validateItems); tests/logic.html checks long seeded runs.
//
// Pattern steps: { type, t, need?, length?, shift? } where `t` is the clear time in seconds
// before the step (see Pulse.Track.spaceFor). `need` values come from the helpers below.
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

  const PATTERNS = [
    // Single decisions.
    { id: 'squeeze', unlock: 0, weight: 3, build: (rng, d) => [{ type: 'gate', need: tight(rng, d) }] },
    { id: 'smash', unlock: 0, weight: 2, build: () => [{ type: 'barrier' }] },
    { id: 'breather', unlock: 0, weight: 1, build: (rng) => [{ type: 'gate', need: wide(rng) }, { type: 'energy', t: 0.34 }] },
    // Release timing: let go right after the gap so you're full size for the barrier.
    { id: 'squeeze-smash', unlock: 6, weight: 3, build: (rng, d) => [
      { type: 'gate', need: tight(rng, d) },
      { type: 'barrier', t: lerp(0.6, 0.36, d) },
    ] },
    // Shrink timing: stay big through the barrier, then shrink fast.
    { id: 'smash-squeeze', unlock: 6, weight: 3, build: (rng, d) => [
      { type: 'barrier' },
      { type: 'gate', need: tight(rng, d), t: lerp(0.65, 0.4, d) },
    ] },
    // Hold through: two or three gaps too close to let go between.
    { id: 'double-squeeze', unlock: 12, weight: 2, build: (rng, d) => {
      const steps = [{ type: 'gate', need: tight(rng, d) }, { type: 'gate', need: tight(rng, d), t: lerp(0.24, 0.12, d) }];
      if (d > 0.5 && rng() < 0.5) steps.push({ type: 'gate', need: tight(rng, d), t: 0.14 });
      return steps;
    } },
    // Long hold: a tunnel; letting go early crashes. Gold waits at the exit.
    { id: 'long-hold', unlock: 18, weight: 2, build: (rng, d) => [
      { type: 'gate', need: tight(rng, d) + 4, length: lerp(160, 360, rng()) * (0.8 + 0.4 * d) },
      { type: 'energy', t: 0.36 },
    ] },
    // Gold dare: a short release between two gaps grabs gold and keeps the multiplier.
    { id: 'gold-dare', unlock: 10, weight: 2, build: (rng, d) => {
      const t = lerp(0.5, 0.34, d);
      return [{ type: 'gate', need: tight(rng, d) }, { type: 'energy', t }, { type: 'gate', need: tight(rng, d), t }];
    } },
    // Mint dare: the bonus sits in a gap too tight to be comfortable. Holding through is safe.
    { id: 'mint-dare', unlock: 20, weight: 2, build: (rng, d) => {
      const t = lerp(0.32, 0.23, d);
      return [{ type: 'gate', need: tight(rng, d) }, { type: 'bonus', t }, { type: 'gate', need: tight(rng, d), t }];
    } },
    // Rhythm: alternate squeeze and smash; easy gaps so the challenge is the beat.
    { id: 'rhythm', unlock: 25, weight: 2, build: (rng, d) => {
      const t = lerp(0.6, 0.4, d);
      const steps = [];
      const n = d > 0.6 ? 5 : 4;
      for (let i = 0; i < n; i++) {
        steps.push(i % 2 ? { type: 'barrier', t } : { type: 'gate', need: easy(rng), t });
      }
      return steps;
    } },
  ];

  // Fixed opening so every run shows both rules before mixing them.
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
      this.queue = OPENING.slice();
    }

    // Keeps items generated ~1.5 screens ahead of the orb.
    fill(elapsed, speed) {
      if (!this.rng) return;
      while (this.genTop < this.travelled + this.height * 1.5) {
        if (!this.queue.length) this.queue = this.nextPattern(elapsed);
        this.append(this.queue.shift(), elapsed, speed);
      }
    }

    nextPattern(elapsed) {
      const d = this.difficulty(elapsed);
      const options = PATTERNS.filter((p) => p.unlock <= elapsed && p.id !== this.lastPattern);
      let total = 0;
      for (const p of options) total += p.weight;
      let pick = this.rng() * total;
      let chosen = options[options.length - 1];
      for (const p of options) {
        pick -= p.weight;
        if (pick < 0) {
          chosen = p;
          break;
        }
      }
      this.lastPattern = chosen.id;
      this.patternLog.push(chosen.id);
      const steps = chosen.build(this.rng, d).map((s) => Object.assign({ pattern: chosen.id }, s));
      // Gap before the pattern: a breather that shrinks with difficulty, sometimes with gold.
      const between = lerp(0.9, 0.55, d);
      if (this.rng() < 0.45 && steps[0].type !== 'energy') {
        steps.unshift({ type: 'energy', t: Math.max(0.36, between / 2), pattern: 'between' });
        steps[1].t = Math.max(0.36, between / 2);
      } else if (steps[0].t === undefined) {
        steps[0].t = between;
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
        space: Pulse.Track.spaceFor(this.lastType, step.type, step.t, speedThere),
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
