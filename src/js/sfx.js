// PLACEHOLDER sound effects: short synthesized tones. Each name is a hook that can later
// play one of Gemini's audio files instead, without touching gameplay code.
Pulse.Sfx = (function () {
  const TONES = {
    start: { freq: 520, to: 780, duration: 0.12, volume: 0.12, type: 'sine' },
    pass: { freq: 360, to: 360, duration: 0.04, volume: 0.05, type: 'triangle' },
    pickup: { freq: 880, to: 1320, duration: 0.09, volume: 0.12, type: 'sine' },
    multiplierLost: { freq: 300, to: 200, duration: 0.12, volume: 0.08, type: 'triangle' },
    crash: { freq: 180, to: 60, duration: 0.3, volume: 0.2, type: 'sawtooth' },
    milestone: { freq: 660, to: 1320, duration: 0.25, volume: 0.12, type: 'triangle' },
    smash: { freq: 900, to: 300, duration: 0.14, volume: 0.13, type: 'square' },
    complete: { freq: 523, to: 1046, duration: 0.35, volume: 0.14, type: 'sine' },
    select: { freq: 600, to: 600, duration: 0.05, volume: 0.06, type: 'triangle' },
  };

  let ctx = null;

  // Browsers only allow audio after a user gesture, so call this from an input handler.
  function unlock() {
    if (!ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      ctx = new Ctx();
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function play(name) {
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
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + tone.duration);
  }

  return { unlock, play };
})();
