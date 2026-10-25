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
  };

  const base = () => window.PULSE_ASSET_BASE || '';

  function ensureContext() {
    if (state.ctx) return state.ctx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    state.ctx = new Ctx();
    state.sfxGain = state.ctx.createGain();
    state.sfxGain.gain.value = state.volumes.sfx * SFX_LEVEL;
    state.sfxGain.connect(state.ctx.destination);
    return state.ctx;
  }

  // Fetch and decode every effect and sting once. Decoding works before the first tap.
  function loadBuffers() {
    const ctx = ensureContext();
    if (!ctx || (window.PULSE_TEST && window.PULSE_TEST.noAudioFiles)) return Promise.resolve();
    const files = {};
    for (const name of Object.keys(SFX)) files[SFX[name].file] = SFX[name].music;
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

  function playBuffer(buf, gainValue, loop) {
    const ctx = state.ctx;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = !!loop;
    const gain = ctx.createGain();
    gain.gain.value = gainValue;
    src.connect(gain).connect(state.sfxGain);
    src.start();
    return src;
  }

  const Sfx = {
    play(name) {
      const ctx = state.ctx;
      if (!ctx || ctx.state !== 'running' || state.volumes.sfx <= 0) return false;
      const now = performance.now();
      if (now - (state.lastPlayed[name] || 0) < RETRIGGER_MS) return false;
      state.lastPlayed[name] = now;
      const def = SFX[name];
      const buf = def && state.buffers[def.file];
      if (!buf) {
        playTone(name);
        return true;
      }
      if (state.voices >= MAX_VOICES) return false;
      state.voices++;
      const src = playBuffer(buf, def.gain === undefined ? 1 : def.gain, false);
      src.onended = () => { state.voices--; };
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

    // Quieter music behind the pause screen.
    duck(on) {
      this.level = on ? 0.4 : 1;
      if (this.el && !this.el.paused) this.fadeTo(this.targetVolume(), 200);
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
        expected: new Set(Object.values(SFX).map((d) => d.file)).size,
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
