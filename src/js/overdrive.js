// Overdrive meter and combo milestones (docs/OVERDRIVE.md). Pure rules, no Phaser and no audio, so
// tests can drive them. The scene feeds it successful contacts and the frame time; it answers with
// what happened (charge added, Overdrive started/ended, milestone reached) and keeps an eased
// 0..1 intensity `fx` for the visuals.
//
// Feedback only. Nothing here changes collision, orb size, obstacle layout, score or stars.
//   charge(od, kind, info)  a successful contact: kinds pickup / bonus / pass / break / chargedBreak
//   miss(od, bonus)         a gold note was missed (a missed mint costs nothing)
//   tick(od, dt)            advances the clock; dt = 0 while paused, so nothing moves
//   crash(od) / reset(od)   a crash or a new run ends everything
//   fraction(od)            what the meter shows: filling 0..1, or the time left while active
//   milestone(prev, next)   which of the combo milestones (4 / 8 / 16) a combo step crossed
(function () {
  const C = Pulse.CONFIG;

  function create() {
    return { meter: 0, active: false, remaining: 0, activations: 0, fx: 0, lastKind: null, run: 0, chargedTotal: 0 };
  }

  function reset(od) {
    od.meter = 0;
    od.active = false;
    od.remaining = 0;
    od.activations = 0;
    od.fx = 0;
    od.lastKind = null;
    od.run = 0;
    od.chargedTotal = 0;
  }

  // Charge for one contact: base × variety × quality × combo. Pure.
  function amount(kind, info, runLength) {
    const O = C.overdrive;
    const base = O.charge[kind] || 0;
    const o = info || {};
    const variety = Math.max(O.minRepeat, 1 - O.repeatDrop * Math.max(0, (runLength || 1) - 1));
    const quality = o.quality === 'perfect' ? O.perfectMult : 1;
    const combo = 1 + Math.min(O.comboMaxBonus, O.comboBonus * Math.floor(Math.max(0, o.combo || 0) / O.comboStep));
    return base * variety * quality * combo;
  }

  // A successful contact. While Overdrive is active nothing is added (no chaining straight into
  // another one); the run-length memory still updates so a farmed pattern stays weak afterwards.
  function charge(od, kind, info) {
    const O = C.overdrive;
    od.run = od.lastKind === kind ? od.run + 1 : 1;
    od.lastKind = kind;
    if (od.active) return { added: 0, started: false };
    const added = amount(kind, info, od.run);
    od.meter = Math.min(O.threshold, od.meter + added);
    od.chargedTotal += added;
    if (od.meter >= O.threshold) {
      od.active = true;
      od.remaining = O.duration;
      od.activations++;
      od.meter = O.threshold;
      return { added, started: true };
    }
    return { added, started: false };
  }

  // A one-off reward (a fully collected risk route): adds `units` to the meter without touching the
  // repeat memory of ordinary contacts. Nothing is added while Overdrive is active. Bounded: the
  // campaign places each route once, so it cannot be repeated for charge.
  function award(od, units) {
    if (od.active) return { added: 0, started: false };
    const O = C.overdrive;
    od.meter = Math.min(O.threshold, od.meter + units);
    od.chargedTotal += units;
    if (od.meter >= O.threshold) {
      od.active = true;
      od.remaining = O.duration;
      od.activations++;
      od.meter = O.threshold;
      return { added: units, started: true };
    }
    return { added: units, started: false };
  }

  function miss(od, bonus) {
    if (bonus || od.active) return 0;
    const lost = Math.min(od.meter, C.overdrive.missPenalty);
    od.meter -= lost;
    od.run = 0;
    od.lastKind = null;
    return lost;
  }

  // Advances Overdrive. Returns { ended } when it ran out this step. `fx` eases with an exponential,
  // so the look is the same at 30, 60 or 144 fps.
  function tick(od, dt) {
    const O = C.overdrive;
    let ended = false;
    if (dt > 0) {
      if (od.active) {
        od.remaining -= dt;
        if (od.remaining <= 0) {
          od.remaining = 0;
          od.active = false;
          od.meter = 0;
          od.run = 0;
          od.lastKind = null;
          ended = true;
        }
      }
      const target = od.active ? 1 : 0;
      od.fx += (target - od.fx) * (1 - Math.exp(-dt * (target > od.fx ? O.fxIn : O.fxOut)));
      if (Math.abs(od.fx - target) < 0.0005) od.fx = target;
    }
    return { ended };
  }

  // A crash ends the run: everything is cleared at once (the retry starts clean).
  function crash(od) {
    const was = od.active;
    reset(od);
    return was;
  }

  function fraction(od) {
    const O = C.overdrive;
    return od.active ? Math.max(0, od.remaining / O.duration) : Math.min(1, od.meter / O.threshold);
  }

  // true during the last `warn` seconds of Overdrive
  const warning = (od) => od.active && od.remaining <= C.overdrive.warn;

  // The milestone (4 / 8 / 16) crossed when the combo goes from `prev` to `next`, or 0.
  function milestone(prev, next) {
    const K = C.combo;
    if (next <= prev) return 0;
    for (const m of [K.flourish, K.layerB, K.layerA]) if (prev < m && next >= m) return m;
    return 0;
  }

  Pulse.Overdrive = { create, reset, amount, charge, award, miss, tick, crash, fraction, warning, milestone };
})();
