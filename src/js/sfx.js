// Audio: Gemini's v4 synthwave music and sound effects (assets/audio/), with the original
// synthesized tones as a fallback while files load or if they can't (tests, blocked fetch).
//
//   Pulse.Sfx.play(name)       one-shot effect by gameplay name (see SFX below)
//   Pulse.Sfx.startHold() / stopHold()   the soft hum while the player holds to shrink
//   Pulse.Music.play(track)    loop a music track (crossfades from the current one)
//   Pulse.Music.stop()         fade the music out (before a sting)
//   Pulse.Audio.setVolume('music' | 'sfx', 0..1)
//
// Design choices for phones:
//   - Music streams through one HTMLAudioElement. Decoding an 80 s stereo loop into WebAudio
//     would take ~28 MB of RAM per track; streaming takes almost none.
//   - Effects and stings (all under 5 s) are decoded once into WebAudio buffers: no latency.
//   - At most 6 effects play at once; the same effect can't retrigger within 35 ms.
//   - Browsers start audio only after a tap: Pulse.Audio.unlock() runs on every pointerdown.
//   - When the app goes to the background everything pauses, and resumes when it returns.
(function () {
  const MUSIC_LEVEL = 0.55; // Gemini's recommended mix: music 55%, effects 85%
  const SFX_LEVEL = 0.85;
  const MAX_VOICES = 6;
  const RETRIGGER_MS = 35;
  const HOLD_LEVEL = 0.25;
  const ACCENT_MIN_MS = 380;
  const STEM_LEVEL = 0.5; // the Overdrive stem sits well under the music it layers on
  const MAX_LAYER_NOTES = 6; // Shatter Symphony arpeggio notes sounding at once (docs/SHATTER_SYMPHONY.md)

  // Gameplay name → file (assets/audio/sfx/ unless `music`) and relative volume.
  const SFX = {
    start: { file: 'sfx_ui_retry' },
    pass: { file: 'sfx_obstacle_gate_pass', gain: 0.6 },
    pickup: { file: 'sfx_pickup_gold' },
    bonusPickup: { file: 'sfx_pickup_mint_bonus' },
    multUp: { file: 'sfx_multiplier_increase', gain: 0.7 },
    multiplierLost: { file: 'sfx_charge_cancelled', gain: 0.8 },
    crash: { file: 'sfx_player_death_collision' },
    chargedFail: { file: 'sfx_barrier_charged_fail' },
    milestone: { file: 'MAX_MULTIPLIER_STING', music: true },
    streak: { file: 'sfx_multiplier_x5_streak', gain: 0.8 },
    smash: { file: 'sfx_barrier_smash_ordinary' },
    chargedSmash: { file: 'sfx_barrier_smash_charged' },
    chargeStart: { file: 'sfx_charge_start_fill', gain: 0.7 },
    chargeReady: { file: 'sfx_charge_complete' },
    chargeCancel: { file: 'sfx_charge_cancelled', gain: 0.7 },
    nearMiss: { file: 'sfx_near_miss_graze', gain: 0.7 },
    shrinkStart: { file: 'sfx_player_shrink_start', gain: 0.5 },
    expand: { file: 'sfx_player_expand', gain: 0.5 },
    shrinkLoop: { file: 'sfx_player_shrink_loop' },
    finish: { file: 'sfx_stage_finish_line' },
    star: { file: 'sfx_stage_star_earned' },
    stageClear: { file: 'STAGE_CLEAR', music: true },
    clearPanel: { file: 'sfx_ui_stage_clear_panel', gain: 0.8 },
    gameOver: { file: 'GAME_OVER', music: true },
    overPanel: { file: 'sfx_ui_game_over_panel', gain: 0.7 },
    worldIntro: { file: 'WORLD_TRANSITION', music: true },
    unlocked: { file: 'sfx_ui_stage_unlocked' },
    select: { file: 'sfx_ui_button_tap' },
    nav: { file: 'sfx_ui_menu_nav' },
    skin: { file: 'sfx_ui_skin_selected' },
    toggle: { file: 'sfx_ui_settings_toggle' },
    pause: { file: 'sfx_ui_pause' },
    resume: { file: 'sfx_ui_resume' },
    // v5 rhythm pack (docs/RHYTHM.md). The accents are chords in each world's key; the rest cue
    // moving obstacles and phrases.
    barrierReady: { file: 'sfx_barrier_charged_ready', gain: 0.75 },
    approachCue: { file: 'sfx_obstacle_approach_cue', gain: 0.65 },
    maxMultSfx: { file: 'sfx_multiplier_max_x5', gain: 0.9 },
    slideLock: { file: 'sfx_obs_slide_lock', gain: 0.65 },
    rotorWhoosh: { file: 'sfx_obs_rotor_whoosh', gain: 0.6 },
    pulseBeat: { file: 'sfx_obs_pulse_beat', gain: 0.55 },
    telegraphPing: { file: 'sfx_beat_telegraph_ping', gain: 0.6 },
    accentW1: { file: 'sfx_accent_chord_w1', gain: 0.42 },
    accentW2: { file: 'sfx_accent_chord_w2', gain: 0.42 },
    accentW3: { file: 'sfx_accent_chord_w3', gain: 0.42 },
    comboCadence: { file: 'sfx_combo_cadence_hit', gain: 0.55 },
    // Gemini audio pack (docs/ASSET_MANIFEST.md). Short one-shots for rare, big moments only; the
    // sources are ~3 dB quieter than the v4 effects, hence the gains. Skipped when
    // CONFIG.audioPack.samples is false.
    packCombo4: { file: 'sfx_combo_milestone_04', gain: 0.6, pack: true },
    packCombo8: { file: 'sfx_combo_milestone_08', gain: 0.6, pack: true },
    packCombo16: { file: 'sfx_combo_milestone_16', gain: 0.6, pack: true },
    packRouteClear: { file: 'sfx_route_risk_clear', gain: 0.6, pack: true },
    packForkDiscover: { file: 'sfx_route_fork_discover', gain: 0.6, pack: true },
    packMirrorWarn: { file: 'sfx_mirror_pulse_warning', gain: 0.6, pack: true },
    packMirrorAppear: { file: 'sfx_mirror_echo_appear', gain: 0.6, pack: true },
    packMirrorExit: { file: 'sfx_mirror_echo_exit', gain: 0.6, pack: true },
    packOdOn: { file: 'sfx_overdrive_activate', gain: 0.65, pack: true },
    packOdOff: { file: 'sfx_overdrive_deactivate', gain: 0.6, pack: true },
  };

  // Fallback tones (the prototype's placeholder sounds), used when a file isn't loaded.
  const TONES = {
    start: { freq: 520, to: 780, duration: 0.12, volume: 0.12, type: 'sine' },
    pass: { freq: 360, to: 360, duration: 0.04, volume: 0.05, type: 'triangle' },
    pickup: { freq: 880, to: 1320, duration: 0.09, volume: 0.12, type: 'sine' },
    bonusPickup: { freq: 990, to: 1480, duration: 0.11, volume: 0.12, type: 'sine' },
    multiplierLost: { freq: 300, to: 200, duration: 0.12, volume: 0.08, type: 'triangle' },
    crash: { freq: 180, to: 60, duration: 0.3, volume: 0.2, type: 'sawtooth' },
    chargedFail: { freq: 220, to: 70, duration: 0.3, volume: 0.2, type: 'square' },
    milestone: { freq: 660, to: 1320, duration: 0.25, volume: 0.12, type: 'triangle' },
    smash: { freq: 900, to: 300, duration: 0.14, volume: 0.13, type: 'square' },
    chargedSmash: { freq: 1100, to: 200, duration: 0.2, volume: 0.14, type: 'square' },
    complete: { freq: 523, to: 1046, duration: 0.35, volume: 0.14, type: 'sine' },
    stageClear: { freq: 523, to: 1046, duration: 0.35, volume: 0.14, type: 'sine' },
    select: { freq: 600, to: 600, duration: 0.05, volume: 0.06, type: 'triangle' },
  };

  const state = {
    stemBuf: {},
    stemLoading: {},
    stem: null,
    ctx: null,
    sfxGain: null,
    buffers: {},
    failed: [],
    voices: 0,
    lastPlayed: {},
    hold: null,
    volumes: { music: 0.8, sfx: 1 },
    unlocked: false,
    hidden: false,
    hook: null, // Shatter Symphony: sees effect calls first (null = every call plays as it always did)
    stemShaped: false, // Shatter Symphony: equal-power stem fades
    layer: [], // Shatter Symphony arpeggio notes in flight
  };

  const base = () => window.PULSE_ASSET_BASE || '';

  function ensureContext() {
    if (state.ctx) return state.ctx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    state.ctx = new Ctx();
    state.sfxGain = state.ctx.createGain();
    state.sfxGain.gain.value = state.volumes.sfx * SFX_LEVEL;
    // A soft limiter after the effects bus: stacked layers (combo, Overdrive) can never clip.
    state.limiter = state.ctx.createDynamicsCompressor();
    state.limiter.threshold.value = -10;
    state.limiter.knee.value = 12;
    state.limiter.ratio.value = 8;
    state.limiter.attack.value = 0.003;
    state.limiter.release.value = 0.12;
    state.sfxGain.connect(state.limiter);
    state.limiter.connect(state.ctx.destination);
    return state.ctx;
  }

  // The Overdrive stems share a bus after the effects limiter's input, scaled by the music volume.
  function stemBus() {
    if (!state.stemGain) {
      state.stemGain = state.ctx.createGain();
      state.stemGain.connect(state.limiter);
    }
    state.stemGain.gain.value = state.volumes.music * MUSIC_LEVEL * STEM_LEVEL;
    return state.stemGain;
  }

  // Shatter Symphony's arpeggio notes share a bus into the same limiter, scaled by the music volume.
  const layerLevel = () => state.volumes.music * SFX_LEVEL;
  function layerBus() {
    if (!state.layerGain) {
      state.layerGain = state.ctx.createGain();
      state.layerGain.connect(state.limiter);
    }
    state.layerGain.gain.value = layerLevel();
    return state.layerGain;
  }

  // Equal-power fade (a quarter turn of sin when rising, of cos when falling) as 16 short linear pieces,
  // so the summed power of a crossfade stays level and neither end has a corner that clicks. Built from
  // ramps rather than setValueCurveAtTime because a curve throws if it overlaps an earlier automation.
  // Every value lies between `from` and `to`: the fade can never overshoot the level it ends at.
  function equalPower(param, t0, dur, from, to) {
    const n = 16;
    const rising = to > from;
    param.setValueAtTime(from, t0);
    for (let i = 1; i <= n; i++) {
      const p = i / n;
      const v = rising ? from + (to - from) * Math.sin(p * Math.PI / 2) : to + (from - to) * Math.cos(p * Math.PI / 2);
      param.linearRampToValueAtTime(v, t0 + dur * p);
    }
  }

  // Fetch and decode every effect and sting once. Decoding works before the first tap.
  function loadBuffers() {
    const ctx = ensureContext();
    if (!ctx || (window.PULSE_TEST && window.PULSE_TEST.noAudioFiles)) return Promise.resolve();
    const files = {};
    for (const name of Object.keys(SFX)) if (!SFX[name].pack || Pulse.CONFIG.audioPack.samples) files[SFX[name].file] = SFX[name].music;
    return Promise.all(Object.keys(files).map((file) => {
      const url = `${base()}assets/audio/${files[file] ? 'music' : 'sfx'}/${file}.ogg`;
      return fetch(url)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
        .then((data) => new Promise((resolve, reject) => ctx.decodeAudioData(data, resolve, reject)))
        .then((buf) => { state.buffers[file] = buf; })
        .catch(() => { state.failed.push(file); });
    }));
  }

  function playTone(name) {
    const ctx = state.ctx;
    const tone = TONES[name];
    if (!ctx || !tone || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = tone.type;
    osc.frequency.setValueAtTime(tone.freq, now);
    osc.frequency.exponentialRampToValueAtTime(tone.to, now + tone.duration);
    gain.gain.setValueAtTime(tone.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + tone.duration);
    osc.connect(gain).connect(state.sfxGain);
    osc.start(now);
    osc.stop(now + tone.duration);
  }

  // `rate` retunes the sound (1 = as recorded); `delay` starts it that many seconds from now.
  function playBuffer(buf, gainValue, loop, rate, delay) {
    const ctx = state.ctx;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = !!loop;
    if (rate && rate !== 1) src.playbackRate.value = rate;
    const gain = ctx.createGain();
    gain.gain.value = gainValue;
    src.connect(gain).connect(state.sfxGain);
    src.start(delay > 0 ? ctx.currentTime + delay : 0);
    return src;
  }

  // ---- Synthesised notes (Pulse.Melody) ----
  // One oscillator (or filtered noise) through an envelope: a quick attack and an exponential
  // decay. Starts on the AudioContext clock (`currentTime + delay`), so the sound begins in the
  // audio thread the instant it is called. At most MAX_NOTES sound at once; the oldest quiet ones
  // are simply allowed to finish (they are all under a second).
  const MAX_NOTES = 14;
  state.notes = 0;
  state.stats = { notes: 0, dropped: 0, last: null };

  function noiseBuffer(ctx) {
    if (state.noise) return state.noise;
    const len = Math.floor(ctx.sampleRate * 0.6);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    state.noise = buf;
    return buf;
  }

  function playNote(spec, delay) {
    const ctx = state.ctx;
    if (!ctx || ctx.state !== 'running' || state.volumes.sfx <= 0) return false;
    if (state.notes >= MAX_NOTES) {
      state.stats.dropped++;
      return false;
    }
    const t0 = ctx.currentTime + (delay > 0 ? delay : 0);
    const dur = spec.dur || 0.2;
    const peak = spec.gain === undefined ? 0.15 : spec.gain;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.linearRampToValueAtTime(peak, t0 + (spec.attack || 0.004));
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let src;
    if (spec.noise) {
      src = ctx.createBufferSource();
      src.buffer = noiseBuffer(ctx);
    } else {
      src = ctx.createOscillator();
      src.type = spec.wave || 'sine';
      src.frequency.setValueAtTime(spec.freq, t0);
      if (spec.glide) src.frequency.exponentialRampToValueAtTime(Math.max(20, spec.glide), t0 + dur);
    }
    let node = src;
    if (spec.cutoff) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(spec.cutoff, t0);
      if (!spec.noise) f.frequency.exponentialRampToValueAtTime(Math.max(200, spec.cutoff * 0.35), t0 + dur);
      src.connect(f);
      node = f;
    }
    node.connect(env).connect(state.sfxGain);
    state.notes++;
    src.onended = () => { state.notes--; };
    src.start(t0);
    src.stop(t0 + dur + 0.05);
    state.stats.notes++;
    state.stats.last = { freq: spec.freq, wave: spec.wave, delay: delay || 0, at: ctx.currentTime };
    return true;
  }

  const Sfx = {
    // Plays note specs from Pulse.Melody. Leads start at once; `layer` specs (accompaniment) may be
    // given a short `layerDelay` by the scene so they land on the next 16th note.
    notes(specs, layerDelay) {
      if (state.hook && state.hook.notes(specs, layerDelay)) return false;
      let any = false;
      for (let i = 0; i < specs.length; i++) {
        const sp = specs[i];
        if (playNote(sp, (sp.layer ? layerDelay || 0 : 0) + (sp.at || 0))) any = true;
      }
      return any;
    },

    stats() {
      return Object.assign({}, state.stats, { active: state.notes });
    },

    // opts (all optional): rate = pitch factor, delay = seconds to wait (used to land a sound on
    // the beat: see Pulse.Rhythm.Groove), gain = extra volume factor.
    play(name, opts) {
      if (state.hook && state.hook.play(name, opts)) return false;
      const ctx = state.ctx;
      if (!ctx || ctx.state !== 'running' || state.volumes.sfx <= 0) return false;
      const now = performance.now();
      if (now - (state.lastPlayed[name] || 0) < RETRIGGER_MS) return false;
      state.lastPlayed[name] = now;
      const o = opts || {};
      const def = SFX[name];
      if (def && def.pack && (!Pulse.CONFIG.audioPack.samples)) return false;
      const buf = def && state.buffers[def.file];
      if (!buf) {
        if (def && def.pack) return false; // no synthesized stand-in for the pack: the melody cue already covers the moment
        playTone(name);
        return true;
      }
      if (state.voices >= MAX_VOICES) return false;
      state.voices++;
      const gain = (def.gain === undefined ? 1 : def.gain) * (o.gain === undefined ? 1 : o.gain);
      const src = playBuffer(buf, gain, false, o.rate, o.delay);
      src.onended = () => { state.voices--; };
      state.lastPlay = { name, rate: o.rate || 1, delay: o.delay || 0 }; // for tests and diagnostics
      return true;
    },

    // The world's harmonic accent chord (docs/art/v5 brief 4.2): at most one per beat, so a run of
    // pickups never muddies the mix.
    playAccent(world, delay) {
      const now = performance.now();
      if (now - (state.lastAccentAt || 0) < ACCENT_MIN_MS) return false;
      if (!this.play(world === 3 ? 'accentW3' : world === 2 ? 'accentW2' : 'accentW1', { delay })) return false;
      state.lastAccentAt = now;
      return true;
    },

    // Soft looping hum while the player holds (started/stopped on touch, not every frame).
    startHold() {
      if (state.hold || !state.ctx || state.ctx.state !== 'running') return;
      const buf = state.buffers[SFX.shrinkLoop.file];
      if (buf) state.hold = playBuffer(buf, HOLD_LEVEL, true);
    },

    stopHold() {
      if (!state.hold) return;
      try { state.hold.stop(); } catch (e) { /* already stopped */ }
      state.hold = null;
    },

    unlock() {
      Audio.unlock();
    },

    // ---- Shatter Symphony seams (src/js/symphony.js, docs/SHATTER_SYMPHONY.md) ----
    // A hook ({ play(name, opts), notes(specs, layerDelay) }) sees every effect call first; returning true
    // means "taken" (the director plays it itself, later in the same frame, or not at all). With no hook,
    // which is the case unless the director is attached, nothing here runs.
    setHook(h) { state.hook = h || null; },
    getHook() { return state.hook; },
    // Equal-power stem fades (director only; the default linear ramps are untouched).
    stemShape(on) { state.stemShaped = !!on; },

    // One accompaniment note on the AudioContext clock, `delay` seconds from now, on its own bus. False
    // (nothing queued, nothing retained) when audio is not running, the app is hidden, music is muted
    // or MAX_LAYER_NOTES are already in flight.
    layerNote(spec, delay) {
      const ctx = state.ctx;
      if (!ctx || ctx.state !== 'running' || state.hidden || state.volumes.music <= 0) return false;
      if (state.layer.length >= MAX_LAYER_NOTES) return false;
      const t0 = ctx.currentTime + (delay > 0 ? delay : 0);
      const dur = spec.dur || 0.14;
      const peak = spec.gain === undefined ? 0.04 : spec.gain;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, t0);
      env.gain.linearRampToValueAtTime(peak, t0 + (spec.attack || 0.006));
      env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      const osc = ctx.createOscillator();
      osc.type = spec.wave || 'triangle';
      osc.frequency.setValueAtTime(spec.freq, t0);
      let node = osc;
      if (spec.cutoff) {
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(spec.cutoff, t0);
        osc.connect(f);
        node = f;
      }
      node.connect(env).connect(layerBus());
      const rec = { osc, env, peak };
      state.layer.push(rec);
      osc.onended = () => { const i = state.layer.indexOf(rec); if (i >= 0) state.layer.splice(i, 1); };
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
      return true;
    },

    // Fades out and stops every arpeggio note (pause, crash, retry, mute, background).
    layerStop(ms) {
      const ctx = state.ctx;
      const list = state.layer;
      state.layer = [];
      if (!ctx) return;
      const t = Math.max(0.005, (ms === undefined ? 60 : ms) / 1000);
      for (const rec of list) {
        try {
          const now = ctx.currentTime;
          rec.env.gain.cancelScheduledValues(now);
          rec.env.gain.setValueAtTime(Math.max(0.0001, rec.env.gain.value), now);
          rec.env.gain.linearRampToValueAtTime(0.0001, now + t);
          rec.osc.stop(now + t + 0.02);
        } catch (e) { /* already stopped */ }
      }
    },

    layerCount() { return state.layer.length; },
    layerLevel() { return state.layerGain ? state.layerGain.gain.value : layerLevel(); }, // the arpeggio bus gain (music volume x effects level)

    // ---- Overdrive stems (docs/ASSET_MANIFEST.md) ----
    // A 16-beat loop per world, played over the music while Overdrive is on. Decoded only when a
    // run in that world asks for it (stemPrepare), started at the same phase as the run clock
    // (offset = clock time mod loop length), faded in and out, and stopped on pause, crash, clear
    // and retry. `bpm` must match the stem (16 beats long), otherwise it is not played.
    stemPrepare(world) {
      const ctx = state.ctx;
      const file = `WORLD_${world}_OVERDRIVE_STEM`;
      if (!Pulse.CONFIG.audioPack.stems || !ctx || (window.PULSE_TEST && window.PULSE_TEST.noAudioFiles)) return null;
      if (state.stemBuf[file]) return Promise.resolve(state.stemBuf[file]);
      if (state.stemLoading[file]) return state.stemLoading[file];
      state.stemLoading[file] = fetch(`${base()}assets/audio/music/${file}.ogg`)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
        .then((data) => new Promise((resolve, reject) => ctx.decodeAudioData(data, resolve, reject)))
        .then((buf) => { state.stemBuf[file] = buf; return buf; })
        .catch(() => { state.failed.push(file); return null; });
      return state.stemLoading[file];
    },

    stemFits(world, bpm) {
      const buf = state.stemBuf[`WORLD_${world}_OVERDRIVE_STEM`];
      return !!buf && Math.abs((buf.duration * bpm) / 60 - 16) < 0.06;
    },

    // Starts the stem at `clockTime` seconds into the run. False (and nothing plays) when stems are
    // off, the stem is not decoded yet, the tempo does not fit, music is muted or audio is not running.
    stemStart(world, bpm, clockTime) {
      const ctx = state.ctx;
      if (state.stem || !ctx || ctx.state !== 'running' || state.hidden) return false;
      if (!Pulse.CONFIG.audioPack.stems || state.volumes.music <= 0 || !this.stemFits(world, bpm)) return false;
      const buf = state.stemBuf[`WORLD_${world}_OVERDRIVE_STEM`];
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const g = ctx.createGain();
      const now = ctx.currentTime;
      let fadeIn = 0.12;
      if (state.stemShaped) {
        fadeIn = 0.4; // equal-power entry, ending exactly at the level the linear ramp reaches
        equalPower(g.gain, now, fadeIn, 0, 1);
      } else {
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(1, now + fadeIn);
      }
      src.connect(g).connect(stemBus());
      const off = ((clockTime % buf.duration) + buf.duration) % buf.duration;
      src.start(0, off);
      state.stem = { src, g, world, t0: now, fadeIn, shaped: state.stemShaped };
      return true;
    },

    stemStop(ms) {
      const st = state.stem;
      if (!st) return;
      state.stem = null;
      const ctx = state.ctx;
      const t = (ms === undefined ? 250 : ms) / 1000;
      try {
        const now = ctx.currentTime;
        st.g.gain.cancelScheduledValues(now);
        if (st.shaped && t >= 0.1) {
          // Equal-power exit from wherever the entry curve had got to (no jump, never above 1).
          const p = Math.min(1, Math.max(0, (now - st.t0) / st.fadeIn));
          equalPower(st.g.gain, now, t, Math.sin(p * Math.PI / 2), 0);
        } else {
          st.g.gain.setValueAtTime(st.g.gain.value, now);
          st.g.gain.linearRampToValueAtTime(0, now + t);
        }
        st.src.stop(now + t + 0.02);
      } catch (e) { /* already stopped */ }
    },

    stemActive() {
      return state.stem ? state.stem.world : 0;
    },
  };

  // ---- Music: one streaming element, crossfaded between tracks ----
  const Music = {
    el: null,
    track: null,
    wanted: null, // the track that should be playing (kept while hidden or before unlock)
    level: 1, // 0..1 extra factor for ducking (pause screen)
    fadeTimer: null,

    element() {
      if (!this.el && typeof window.Audio === 'function') {
        this.el = new window.Audio();
        this.el.loop = true;
        this.el.preload = 'auto';
      }
      return this.el;
    },

    targetVolume() {
      return Math.max(0, Math.min(1, state.volumes.music * MUSIC_LEVEL * this.level));
    },

    fadeTo(volume, ms, done) {
      const el = this.element();
      if (!el) return;
      clearInterval(this.fadeTimer);
      const start = el.volume;
      const steps = Math.max(1, Math.round(ms / 30));
      let i = 0;
      this.fadeTimer = setInterval(() => {
        i++;
        el.volume = Math.max(0, Math.min(1, start + ((volume - start) * i) / steps));
        if (i >= steps) {
          clearInterval(this.fadeTimer);
          if (done) done();
        }
      }, 30);
    },

    // Where the music is, in seconds into `track`, or null when that can't be known right now
    // (muted, not started, still cross-fading from another track, hidden). The rhythm clock uses
    // it to keep the music in step with the run; null means "nothing to align".
    position(track) {
      const el = this.el;
      if (!el || this.track !== track || !this.started || el.paused || el.readyState < 2) return null;
      return el.currentTime;
    },

    loopLength() {
      const d = this.el ? this.el.duration : 0;
      return Number.isFinite(d) ? d : 0;
    },

    // Moves the music (the run clock is the master; gameplay never waits for the music).
    seek(seconds) {
      if (this.el && Number.isFinite(seconds)) this.el.currentTime = Math.max(0, seconds);
    },

    play(track) {
      this.wanted = track;
      this.level = 1;
      const el = this.element();
      if (!el || (window.PULSE_TEST && window.PULSE_TEST.noAudioFiles)) return;
      if (this.track === track && !el.paused) {
        // Already playing this track. (A second play() during the fade-out of a restart cancels that
        // restart; the music is on the right track, so it counts as started and the run clock re-aligns it.)
        this.started = true;
        this.fadeTo(this.targetVolume(), 200);
        return;
      }
      this.started = false; // not aligned until the new track is actually playing
      const start = () => {
        this.track = track;
        el.src = `${base()}assets/audio/music/${track}.ogg`;
        el.volume = 0;
        this.started = true;
        if (!state.unlocked || state.hidden || state.volumes.music <= 0) return;
        const p = el.play();
        if (p && p.catch) p.catch(() => { /* waits for the next tap */ });
        this.fadeTo(this.targetVolume(), 400);
      };
      if (this.track && !el.paused) this.fadeTo(0, 300, start);
      else start();
    },

    stop(ms) {
      this.wanted = null;
      const el = this.element();
      if (!el || el.paused) return;
      this.fadeTo(0, ms === undefined ? 250 : ms, () => el.pause());
    },

    // A brief dip so a big hit (charged smash, max multiplier) cuts through the track.
    pulseDuck() {
      if (this.level !== 1 || !this.el || this.el.paused) return;
      this.level = 0.72;
      this.fadeTo(this.targetVolume(), 40);
      clearTimeout(this.duckTimer);
      this.duckTimer = setTimeout(() => {
        if (this.level === 0.72) { this.level = 1; this.fadeTo(this.targetVolume(), 220); }
      }, 160);
    },

    // Quieter music behind the pause screen.
    // While paused the track dips and then holds (pauses) where it is, so the run clock and the
    // music stay in step and resuming needs no seek (a seek would click). Coming back picks it up
    // from the same spot.
    duck(on) {
      this.level = on ? 0.4 : 1;
      this.holding = !!on;
      // A track change that is fading out must not be cancelled by a volume fade (it would leave the old track playing).
      if (this.el && !this.el.paused && this.wanted && this.track !== this.wanted) return;
      if (this.el && !this.el.paused) {
        this.fadeTo(this.targetVolume(), 200, () => {
          if (this.holding && this.el) this.el.pause();
        });
      } else if (!on && this.wanted) {
        this.sync();
      }
    },

    // Called on unlock / return from background: start whatever should be playing.
    sync() {
      const el = this.element();
      if (!el || !this.wanted || state.hidden || !state.unlocked) return;
      if (state.volumes.music <= 0) {
        el.pause();
        return;
      }
      if (this.track !== this.wanted) {
        this.play(this.wanted);
        return;
      }
      if (el.paused) {
        const p = el.play();
        if (p && p.catch) p.catch(() => {});
      }
      this.fadeTo(this.targetVolume(), 300);
    },
  };

  const Audio = {
    // Called once from BootScene with the saved settings.
    init(game, settings) {
      if (this.ready) return;
      this.ready = true;
      if (settings) state.volumes = { music: settings.music, sfx: settings.sfx };
      ensureContext();
      this.loading = loadBuffers();
      // App lifecycle: Phaser reports when the page is hidden (home button, screen off).
      game.events.on('hidden', () => this.suspend());
      game.events.on('visible', () => this.resume());
    },

    unlock() {
      const ctx = ensureContext();
      if (ctx && ctx.state === 'suspended' && !state.hidden) ctx.resume();
      state.unlocked = true;
      // Start (or retry) music that a browser autoplay rule held back.
      if (Music.wanted && (!Music.el || Music.el.paused || Music.track !== Music.wanted)) Music.sync();
    },

    suspend() {
      state.hidden = true;
      Sfx.stopHold();
      Sfx.stemStop(0);
      Sfx.layerStop(0);
      if (Music.el && !Music.el.paused) Music.el.pause();
      if (state.ctx && state.ctx.state === 'running') state.ctx.suspend();
    },

    resume() {
      state.hidden = false;
      if (state.ctx && state.unlocked && state.ctx.state === 'suspended') state.ctx.resume();
      Music.sync();
    },

    setVolume(kind, value) {
      state.volumes[kind] = Math.max(0, Math.min(1, value));
      if (kind === 'sfx' && state.sfxGain) state.sfxGain.gain.value = state.volumes.sfx * SFX_LEVEL;
      if (kind === 'sfx' && state.volumes.sfx <= 0) Sfx.stopHold();
      if (kind === 'music') {
        if (state.volumes.music <= 0) { Sfx.stemStop(60); Sfx.layerStop(40); }
        else if (state.stemGain) state.stemGain.gain.value = state.volumes.music * MUSIC_LEVEL * STEM_LEVEL;
        if (state.layerGain) state.layerGain.gain.value = layerLevel();
        if (state.volumes.music <= 0 && Music.el) Music.el.pause();
        else Music.sync();
      }
    },

    volume(kind) {
      return state.volumes[kind];
    },

    // For tests and diagnostics.
    status() {
      return {
        context: state.ctx ? state.ctx.state : 'none',
        buffers: Object.keys(state.buffers).length,
        expected: new Set(Object.values(SFX).filter((d) => !d.pack || Pulse.CONFIG.audioPack.samples).map((d) => d.file)).size,
        failed: state.failed.slice(),
        musicTrack: Music.track,
        musicWanted: Music.wanted,
        musicPaused: Music.el ? Music.el.paused : true,
        musicVolume: Music.el ? Music.el.volume : 0,
        holding: !!state.hold,
        hidden: state.hidden,
        voices: state.voices,
      };
    },

    SFX,
  };

  Pulse.Audio = Audio;
  Pulse.Sfx = Sfx;
  Pulse.Music = Music;
})();
