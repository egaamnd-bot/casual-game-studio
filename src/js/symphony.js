// Shatter Symphony (docs/SHATTER_SYMPHONY.md): a director that makes the existing synthwave score feel
// performed by the player. AUDIO ONLY: it reads the scene and never writes to it, so a run is bit-for-bit
// the same with it on or off (tests/symphony.html proves it on bot runs).
//
// What it adds, all from audio that already ships:
//   1. An event ledger. One gameplay moment makes at most ONE big cue: combo 4 / 8 / 16, a risk-route
//      clear, Overdrive start / end that land in the same frame (or within `window` s of run time) are
//      resolved by priority; the others keep their visuals but not their sound. The cue that wins plays in
//      the same frame, at the same audio time, as it always did: nothing is delayed or quantised.
//   2. An intensity level (0..3) that eases up with a clean streak, route clears and Overdrive and decays
//      on a miss. From level 2 a quiet pentatonic arpeggio (the world's own scale) joins on the beat grid
//      of the run clock; it thins out during dense hazard sequences and stays out of Overdrive, whose stem
//      carries the groove.
//   3. Restraint: while the next ~1.5 s holds `denseCount` or more walls / barriers the arpeggio is off,
//      the quietest cue (combo 4) is skipped and the others are a little softer. Big cues gently dip the
//      streamed music (the existing Music.pulseDuck).
//   4. Smoother Overdrive stems: equal-power entry (0.4 s) and exit, ending at the same level as before.
//
// It is attached by GameScene.create (`Pulse.Symphony.attach(this)`) only for a Lab run whose entry has
// `flags.symphony` (or a forced attach in tests), and detached on shutdown. It wraps the scene's own event
// methods on the INSTANCE (so the class and every other scene are untouched) and restores them on detach.
(function () {
  const C = Pulse.CONFIG;
  C.symphony = {
    enabled: true,
    window: 0.4, // s of run time during which a big cue must outrank the previous one to sound
    arp: true, // the rising arpeggio layer
    arpGain: 0.045, // peak of one arpeggio note (before the music-volume bus); Melody.GAIN_CEILING is 0.62 for a whole cue
    lookahead: 0.09, // s ahead on the audio clock that an arpeggio note may be queued
    riseTau: 0.9, // s, intensity easing up
    fallTau: 0.6, // s, intensity easing down after a miss
    routeBoostBeats: 8, // a cleared risk route holds the intensity at 2 for this many beats
    denseLookahead: 1.5, // s of track examined for density
    denseCount: 3, // walls / barriers inside that window that count as dense (hysteresis: off again at <= 1)
    denseGain: 0.75, // factor on big cues while dense
    duck: true, // dip the streamed music under route / combo 16 / Overdrive cues
    smoothStem: true, // equal-power stem fades
  };

  const LAB_ID = 'shatter-symphony';
  const LAB_BASE = 's14-safe-or-sorry';

  // Priority of a big cue (higher wins the moment).
  const PRIORITY = { odStart: 5, combo16: 4, route: 3, combo8: 2, odEnd: 2, combo4: 1 };
  const comboType = (m) => (m >= C.combo.flourish ? 'combo16' : m >= C.combo.layerB ? 'combo8' : 'combo4');

  // ---- Pure pieces (no audio, no scene: tests read them directly) ----

  // Intensity target 0..3 from the streak (4 / 8 / 16 -> 1 / 2 / 3), Overdrive (3) and a fresh route clear (>= 2).
  function targetLevel(combo, odActive, boosted) {
    let t = combo >= C.combo.flourish ? 3 : combo >= C.combo.layerB ? 2 : combo >= C.combo.layerA ? 1 : 0;
    if (boosted && t < 2) t = 2;
    if (odActive) t = 3;
    return t;
  }

  // Frame-rate independent easing: up slowly with good play, down a little faster after a miss.
  function ease(v, target, dt) {
    const tau = target >= v ? C.symphony.riseTau : C.symphony.fallTau;
    return v + (target - v) * (1 - Math.exp(-Math.max(0, dt) / tau));
  }

  // 0 = no arpeggio, 1 = eighth notes, 2 = sixteenth notes.
  const arpMode = (v) => (v >= 2.55 ? 2 : v >= 1.75 ? 1 : 0);

  // Arpeggio shape over one bar (16 sixteenths), as scale degrees above the world's root (0 = root, 5 = octave).
  const ARP_LOW = [0, 2, 4, 2, 1, 3, 5, 3]; // eighths: 8 notes per bar
  const ARP_HIGH = [0, 1, 2, 3, 4, 3, 2, 1, 0, 2, 4, 5, 6, 5, 4, 2]; // sixteenths: 16 per bar
  // Scale degree for sixteenth `k` of the track (null = rest). Every fourth bar the figure lifts a scale step.
  function arpDegree(mode, k) {
    if (mode <= 0) return null;
    const i = ((k % 16) + 16) % 16;
    const lift = Math.floor(k / 16) % 4 === 3 ? 1 : 0;
    if (mode === 1) return i % 2 === 0 ? ARP_LOW[i / 2] + lift : null;
    return ARP_HIGH[i] + lift;
  }

  // The next sixteenth to queue: its track time and how far ahead of `t` it is, or null when it is not
  // inside the lookahead or was already queued (`lastAt` = the track time of the last one queued).
  function nextStep(t, stepS, lastAt, look) {
    const k = Math.ceil(t / stepS - 1e-9);
    const at = k * stepS;
    const delay = Math.max(0, at - t);
    if (delay > look || at <= lastAt + stepS * 0.5) return null;
    return { k, at, delay };
  }

  // Is the next stretch of track dense with hazards? Counts walls and barriers not yet resolved that lie
  // within `speed * seconds` px above the orb (or are on it).
  function hazardCount(segs, orbY, speed, seconds) {
    const reach = speed * seconds;
    let n = 0;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      if (!s.active || s.scored || s.resolved || s.broken) continue;
      if (s.kind !== 'gate' && s.kind !== 'barrier') continue;
      if (s.y <= orbY && s.y + s.h >= orbY - reach) n++; // y grows downward: upcoming walls are above the orb
    }
    return n;
  }
  const isDense = (n, was) => (was ? n > 1 : n >= C.symphony.denseCount);

  // The ledger rule. `pending` are this frame's cues ({ type, prio }), `last` the previous played cue
  // ({ prio, at } or null), `now` run time in s. Returns { play, dropped: [{ cue, reason }] }.
  function resolve(pending, last, now, dense) {
    const dropped = [];
    if (!pending.length) return { play: null, dropped };
    const order = pending.slice().sort((a, b) => b.prio - a.prio); // stable: earlier arrival first on a tie
    const win = order[0];
    for (let i = 1; i < order.length; i++) dropped.push({ cue: order[i], reason: 'same-moment' });
    if (last && now - last.at < C.symphony.window && win.prio <= last.prio) {
      dropped.push({ cue: win, reason: 'window' });
      return { play: null, dropped };
    }
    if (dense && win.prio <= PRIORITY.combo4) {
      dropped.push({ cue: win, reason: 'dense' });
      return { play: null, dropped };
    }
    return { play: win, dropped };
  }

  // ---- The director ----

  let current = null;

  function attach(scene, opts) {
    const cfg = C.symphony;
    const force = !!(opts && opts.force);
    if (!cfg.enabled) return null;
    if (!force && !(scene.lab && scene.lab.flags && scene.lab.flags.symphony)) return null;
    if (scene._symphony) return scene._symphony;
    const Sfx = Pulse.Sfx;
    const Rh = Pulse.Rhythm;
    const restore = [];
    const d = {
      scene,
      v: 0, // eased intensity 0..3
      boostUntil: -1,
      seenRoutes: scene.routeClears || 0,
      lastArpAt: -1,
      dense: false,
      denseAcc: 0,
      pending: [],
      last: null,
      depth: 0,
      log: [], // played / dropped cues, newest last (diagnostics and tests)
      stats: { played: 0, dropped: 0, ducks: 0, arp: 0 },
    };

    const wrap = (name, fn) => {
      const had = Object.prototype.hasOwnProperty.call(scene, name);
      const orig = scene[name];
      restore.push(() => { if (had) scene[name] = orig; else delete scene[name]; });
      scene[name] = function (...args) { return fn.call(this, orig, args); };
    };

    const note = (entry) => { d.log.push(entry); if (d.log.length > 60) d.log.shift(); };

    function emit(cue) {
      const f = d.dense ? cfg.denseGain : 1;
      for (const c of cue.calls) {
        if (c[0] === 'play') {
          const o = Object.assign({}, c[2]);
          if (f !== 1) o.gain = (o.gain === undefined ? 1 : o.gain) * f;
          Sfx.play(c[1], o);
        } else {
          const specs = f === 1 ? c[1] : c[1].map((sp) => Object.assign({}, sp, { gain: sp.gain * f }));
          Sfx.notes(specs, c[2]);
        }
      }
      if (cfg.duck && cue.prio >= PRIORITY.route && !d.dense) { Pulse.Music.pulseDuck(); d.stats.ducks++; }
    }

    function flush() {
      if (!d.pending.length) return;
      const list = d.pending;
      d.pending = [];
      const now = scene.elapsed || 0;
      const r = resolve(list, d.last, now, d.dense);
      for (const x of r.dropped) { d.stats.dropped++; note({ type: x.cue.type, played: false, reason: x.reason, at: now }); }
      if (r.play) {
        d.stats.played++;
        d.last = { prio: r.play.prio, at: now, type: r.play.type };
        note({ type: r.play.type, played: true, at: now });
        emit(r.play);
      }
    }

    // Wraps one of the scene's cue methods: its visuals run at once; its sounds are collected, then resolved
    // against the rest of the frame's cues and played in the same frame.
    function cue(name, typeOf) {
      wrap(name, function (orig, args) {
        const type = typeOf(args);
        const entry = { type, prio: PRIORITY[type], calls: [] };
        const prev = Sfx.getHook();
        Sfx.setHook({
          play(n, o) { entry.calls.push(['play', n, o]); return true; },
          notes(sp, ld) { entry.calls.push(['notes', sp, ld]); return true; },
        });
        let out;
        try { out = orig.apply(this, args); } finally { Sfx.setHook(prev); }
        d.pending.push(entry);
        if (d.depth === 0) flush();
        return out;
      });
    }
    cue('comboMilestone', (a) => comboType(a[0]));
    cue('routeClear', () => 'route');
    cue('overdriveStarted', () => 'odStart');
    cue('overdriveEnded', () => 'odEnd');

    // The per-frame work, after the scene's own step: ledger flush, intensity, density, arpeggio.
    wrap('step', function (orig, args) {
      d.depth++;
      try { orig.apply(this, args); } finally { d.depth--; }
      if (d.depth === 0) { flush(); if (scene.state === 'playing') tick(args[0]); }
    });

    function tick(dt) {
      const od = scene.od;
      const beatS = Rh.beatSeconds(scene.clock.bpm || 125);
      if ((scene.routeClears || 0) !== d.seenRoutes) {
        d.seenRoutes = scene.routeClears || 0;
        d.boostUntil = (scene.elapsed || 0) + cfg.routeBoostBeats * beatS;
      }
      const combo = scene.scoring ? scene.scoring.combo : 0;
      d.v = ease(d.v, targetLevel(combo, !!(od && od.active), (scene.elapsed || 0) < d.boostUntil), dt);

      d.denseAcc += dt;
      if (d.denseAcc >= 0.1) {
        d.denseAcc = 0;
        const n = hazardCount(scene.level.segments, scene.orbY, scene.speedNow || 0, cfg.denseLookahead);
        d.dense = isDense(n, d.dense);
      }

      const mode = arpMode(d.v);
      const tt = Rh.trackTime(scene.clock);
      // The beat count restarted (Endless moved to the next world's track): forget the old track's times. A queued step is
      // at most `lookahead` ahead of the clock, so anything further back than that is a restart, not a queued step.
      if (tt < d.lastArpAt - cfg.lookahead - beatS / 4) d.lastArpAt = prevGrid(tt);
      if (!cfg.arp || !mode || (od && od.active) || d.dense || !scene.aligned()) {
        d.lastArpAt = Math.max(d.lastArpAt, prevGrid(tt)); // never back-fill what was held back
        return;
      }
      const stepS = beatS / 4;
      const st = nextStep(tt, stepS, d.lastArpAt, cfg.lookahead);
      if (!st) return;
      const deg = arpDegree(mode, Math.round(st.at / stepS));
      d.lastArpAt = st.at;
      if (deg === null) return;
      const mix = Math.max(0.35, Math.min(1, (d.v - 1.4) / 1.2));
      const w = scene.worldIndex();
      const accent = Math.round(st.at / stepS) % 16 === 0 ? 1.25 : 1;
      if (Sfx.layerNote({ freq: Pulse.Melody.hz(w, deg), dur: stepS * 1.4, wave: 'triangle', gain: cfg.arpGain * mix * accent, cutoff: 2600 }, st.delay)) d.stats.arp++;
    }

    // The sixteenth-note grid point just before the next one (what counts as "already queued" after a gap).
    function prevGrid(tt) {
      const stepS = Rh.beatSeconds(scene.clock.bpm || 125) / 4;
      return (Math.ceil(tt / stepS - 1e-9) - 1) * stepS;
    }

    function halt(state) {
      Sfx.layerStop(state === 'paused' ? 40 : 60);
      d.pending = [];
      if (state !== 'paused') { d.v = 0; d.dense = false; }
    }

    wrap('setState', function (orig, args) {
      const out = orig.apply(this, args);
      if (args[0] !== 'playing') halt(args[0]);
      else d.lastArpAt = Math.max(d.lastArpAt, prevGrid(Rh.trackTime(scene.clock))); // resume in phase: nothing back-filled
      return out;
    });
    wrap('startRun', function (orig, args) {
      const out = orig.apply(this, args);
      d.v = 0; d.boostUntil = -1; d.seenRoutes = scene.routeClears || 0; d.lastArpAt = -1; d.dense = false; d.denseAcc = 0;
      d.pending = []; d.last = null;
      return out;
    });
    // An Overdrive that ends hands the arrangement back at level 2 at most; it must earn the top again.
    wrap('overdriveEnded', function (orig, args) { d.v = Math.min(d.v, 2); return orig.apply(this, args); });

    Sfx.stemShape(cfg.smoothStem);

    d.detach = () => {
      for (let i = restore.length - 1; i >= 0; i--) restore[i]();
      restore.length = 0;
      Sfx.setHook(null);
      Sfx.layerStop(0);
      Sfx.stemStop(0); // a scene shut down in the middle of Overdrive must not leave its stem looping
      Sfx.stemShape(false);
      if (scene._symphony === d) delete scene._symphony;
      if (current === d) current = null;
    };
    scene._symphony = d;
    current = d;
    return d;
  }

  function detach(scene) {
    if (scene && scene._symphony) scene._symphony.detach();
  }

  // The Lab entry: stage 14 (Safe or Sorry: two risk forks, barriers, a breathing gap, long gold streaks) as a
  // separate stage id, so campaign stage 14 is untouched. Registered once everything is loaded.
  function register() {
    if (!Pulse.Lab || !Pulse.STAGES || Pulse.Lab.find(LAB_ID)) return;
    Pulse.Lab.register({
      id: LAB_ID,
      title: 'Shatter Symphony',
      desc: 'Stage 14 with a score that builds as you play: combos, smashes and risk routes add layers.',
      base: LAB_BASE,
      stage: Pulse.Lab.derive(LAB_BASE, { id: 'lab-shatter-symphony', name: 'Shatter Symphony' }),
      flags: { symphony: true },
    });
  }
  if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', register);

  Pulse.Symphony = {
    LAB_ID, PRIORITY, attach, detach, register,
    current: () => current,
    pure: { targetLevel, ease, arpMode, arpDegree, nextStep, hazardCount, isDense, resolve, comboType },
  };
})();
