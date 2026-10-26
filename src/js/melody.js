// The musical layer of contact feedback (docs/PORTRAIT_REWORK.md). Every successful contact plays
// the NEXT NOTE of a short melody, in the world's own scale, the instant it happens, so a streak
// of hits is a tune that you play by steering. The notes are synthesised (Pulse.Sfx.note), so any
// scale degree is available and nothing depends on a sample being loaded.
//
//   Pulse.Melody.hit(world, kind, info) → list of note specs (pure: no audio, so tests can read it)
//     kind  'pickup' | 'bonus' | 'pass' | 'break' | 'chargedBreak'
//     info  { combo (this hit's position in the streak, from 1), quality ('perfect' | 'good') }
//   Pulse.Melody.lost(world, combo)   a short falling "lost it" phrase when a streak breaks
//   Pulse.Melody.fail(world)          the failure sound (crash): dissonant, falling, always the same shape
//
// The note palettes. Gemini's world tracks were analysed (FFT chroma, first 60 s): their tempos are
// 125 / 133 / 140 BPM, but their tonal centres are NOT clear-cut (best key-profile correlations only
// 0.44-0.56), so each palette is a PENTATONIC scale built from the strongest pitch classes of that
// track, which avoids the ambiguous notes (docs/PORTRAIT_REWORK.md has the numbers). Replace
// `root`/`scale` here if Gemini confirms the real keys.
//   World 1 · Bb major pentatonic  (track energy: A#, C, D, A, D#)
//   World 2 · D minor pentatonic   (track energy: A, A#, D, C)
//   World 3 · A minor pentatonic   (track energy: A, A#, B, E)
(function () {
  const C = Pulse.CONFIG;

  const WORLDS = {
    1: { name: 'Bb major pentatonic', root: 58, scale: [0, 2, 4, 7, 9], motif: [0, 1, 2, 4, 3, 2, 1, 1] },
    2: { name: 'D minor pentatonic', root: 62, scale: [0, 3, 5, 7, 10], motif: [0, 2, 3, 4, 3, 2, 1, 1] },
    3: { name: 'A minor pentatonic', root: 57, scale: [0, 3, 5, 7, 10], motif: [0, 1, 3, 4, 5, 4, 3, 1] },
  };
  // The phrase: 16 steps, the motif twice, the second time a scale step higher, so it lifts.
  const LEAD_OCTAVE = 5; // degrees: the lead sits one octave above the root

  const world = (w) => WORLDS[w] || WORLDS[1];
  const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // Semitones above the root of scale degree `d` (any integer; 5 degrees per octave).
  function semitone(w, d) {
    const sc = world(w).scale;
    const n = sc.length;
    const oct = Math.floor(d / n);
    return sc[((d % n) + n) % n] + 12 * oct;
  }

  const hz = (w, d) => midiToHz(world(w).root + semitone(w, d));

  // The melody degree for the nth hit of a streak (n from 1).
  function degree(w, n) {
    const motif = world(w).motif;
    const i = Math.max(0, n - 1);
    const lift = Math.floor(i / motif.length) % 2 ? 1 : 0;
    return LEAD_OCTAVE + motif[i % motif.length] + lift;
  }

  // Note spec fields: freq (Hz), dur (s), wave, gain, cutoff (lowpass Hz), glide (end freq), attack,
  // layer (true = an accompaniment the scene may land on the next 16th note; the lead never waits),
  // noise (true = filtered noise instead of an oscillator).
  const spec = (freq, dur, wave, gain, extra) => Object.assign({ freq, dur, wave, gain }, extra);

  function hit(w, kind, info) {
    const o = info || {};
    const combo = Math.max(1, o.combo || 1);
    const d = degree(w, combo);
    const f = hz(w, d);
    const M = C.music;
    const out = [];
    if (kind === 'pickup') {
      out.push(spec(f, 0.24, 'square', 0.17, { cutoff: 3400 }));
      out.push(spec(f * 1.005, 0.2, 'triangle', 0.1, {}));
    } else if (kind === 'bonus') {
      out.push(spec(f * 2, 0.4, 'sine', 0.15, {}));
      out.push(spec(f * 2 * 3.01, 0.22, 'sine', 0.05, {}));
      out.push(spec(f, 0.2, 'square', 0.1, { cutoff: 3000 }));
    } else if (kind === 'pass') {
      out.push(spec(f, 0.15, 'triangle', 0.13, { cutoff: 2400 }));
    } else {
      // A smash: the chord of this melody note (root, fifth, octave), a stab with a falling filter,
      // and a crack of noise; the charged smash adds a sub-bass.
      const charged = kind === 'chargedBreak';
      out.push(spec(f / 2, charged ? 0.42 : 0.3, 'sawtooth', charged ? 0.17 : 0.13, { cutoff: charged ? 1700 : 1300 }));
      out.push(spec((f / 2) * Math.pow(2, 7 / 12), 0.3, 'sawtooth', 0.09, { cutoff: 1500 }));
      out.push(spec(f, 0.26, 'square', 0.09, { cutoff: 2600 }));
      out.push(spec(0, 0.12, 'noise', charged ? 0.2 : 0.14, { noise: true, cutoff: 5200 }));
      if (charged) out.push(spec(f / 4, 0.55, 'sine', 0.24, {}));
    }
    // Streak layers: more of the harmony joins as the combo grows (accompaniment: layer = true).
    if (combo >= M.comboLayerA) out.push(spec(f * 2, 0.16, 'triangle', 0.07, { layer: true }));
    if (combo >= M.comboLayerB) out.push(spec(f / 2 * Math.pow(2, 7 / 12), 0.4, 'sawtooth', 0.06, { cutoff: 900, layer: true }));
    if (combo >= M.comboLayerB * 2) out.push(spec(f * 3, 0.12, 'sine', 0.05, { layer: true }));
    // Perfect: a bright sparkle an octave and a fifth above.
    if (o.quality === 'perfect' && M.perfectLayer) {
      out.push(spec(f * 3, 0.14, 'sine', 0.09, { glide: f * 3.02 }));
      out.push(spec(f * 4, 0.1, 'sine', 0.05, {}));
    }
    return out;
  }

  // A streak broke (missed gold): two short falling notes, soft. Silent for streaks too short to matter.
  function lost(w, combo) {
    if (combo < 3) return [];
    const d = degree(w, Math.max(1, combo));
    return [spec(hz(w, d), 0.16, 'triangle', 0.1, { cutoff: 1600, glide: hz(w, d - 2) }),
      spec(hz(w, d - 3), 0.22, 'triangle', 0.09, { cutoff: 1200, layer: true })];
  }

  // The crash: nothing in it is in the scale. A heavy falling sawtooth pair a tritone apart plus a
  // noise burst. Always the same shape, so failure is recognisable at once.
  function fail(w) {
    const f = hz(w, 0);
    return [
      spec(f * 4, 0.7, 'sawtooth', 0.2, { glide: f * 0.5, cutoff: 1800 }),
      spec(f * 4 * Math.SQRT2, 0.6, 'sawtooth', 0.14, { glide: f * 0.5 * Math.SQRT2, cutoff: 1500 }),
      spec(0, 0.35, 'noise', 0.22, { noise: true, cutoff: 3200 }),
    ];
  }

  Pulse.Melody = { WORLDS, semitone, hz, degree, hit, lost, fail };
})();
