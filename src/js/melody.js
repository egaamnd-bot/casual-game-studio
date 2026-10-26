// The musical layer of contact feedback (docs/PORTRAIT_REWORK.md). Every successful contact plays
// the NEXT NOTE of a short melody, in the world's own scale, the instant it happens, so a streak
// of hits is a tune that you play by steering. The notes are synthesised (Pulse.Sfx.note), so any
// scale degree is available and nothing depends on a sample being loaded.
//
//   Pulse.Melody.hit(world, kind, info) → list of note specs (pure: no audio, so tests can read it)
//     kind  'pickup' | 'bonus' | 'pass' | 'break' | 'chargedBreak'
//     info  { combo (this hit's position in the streak, from 1), quality ('perfect' | 'good') }
//   Pulse.Melody.lost(world, combo)   a short falling "lost it" phrase when a streak breaks
//   Pulse.Melody.milestone(world, m, {step})   one-shot musical answer to reaching combo 4 / 8 / 16
//   Pulse.Melody.overdriveStart(world) / overdriveEnd(world)   the Overdrive riser and its release
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

  // Keeps the sum of the notes' peak gains under a ceiling, so stacked layers get quieter instead of
  // clipping. The lead is scaled with the rest, so loudness stays level as layers join.
  const GAIN_CEILING = 0.62;
  function budget(list) {
    let sum = 0;
    for (let i = 0; i < list.length; i++) sum += list[i].gain;
    if (sum <= GAIN_CEILING) return list;
    const k = GAIN_CEILING / sum;
    for (let i = 0; i < list.length; i++) list[i].gain *= k;
    return list;
  }

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
      out.push(spec(f * 4, 0.22, 'sine', 0.05, {}));
      out.push(spec(f, 0.2, 'square', 0.1, { cutoff: 3000 }));
    } else if (kind === 'pass') {
      out.push(spec(f, 0.15, 'triangle', 0.13, { cutoff: 2400 }));
    } else {
      // A smash: the chord of this melody note (root, fifth, octave), a stab with a falling filter,
      // and a crack of noise; the charged smash adds a sub-bass.
      const charged = kind === 'chargedBreak';
      out.push(spec(f / 2, charged ? 0.42 : 0.3, 'sawtooth', charged ? 0.17 : 0.13, { cutoff: charged ? 1700 : 1300 }));
      out.push(spec(hz(w, d - 2), 0.3, 'sawtooth', 0.09, { cutoff: 1500 })); // the scale's fifth-ish, below
      out.push(spec(f, 0.26, 'square', 0.09, { cutoff: 2600 }));
      out.push(spec(0, 0.12, 'noise', charged ? 0.2 : 0.14, { noise: true, cutoff: 5200 }));
      if (charged) out.push(spec(f / 4, 0.55, 'sine', 0.24, {}));
    }
    // Streak layers: more of the harmony joins as the combo grows (accompaniment: layer = true).
    // 4: a soft octave above. 8: a fifth under the note and an echo a 16th later, an octave up (the
    // arrangement starts to run). 16: a high shimmer and a second echo. All of it stays in the scale.
    const step = o.step > 0 ? o.step : 0.12;
    const K = C.combo;
    if (combo >= K.layerA) out.push(spec(f * 2, 0.16, 'triangle', 0.06, { layer: true }));
    if (combo >= K.layerB) {
      out.push(spec(hz(w, d - 2), 0.4, 'sawtooth', 0.05, { cutoff: 900, layer: true }));
      out.push(spec(hz(w, d + 2), 0.14, 'triangle', 0.05, { layer: true, at: step }));
    }
    if (combo >= K.flourish) {
      out.push(spec(hz(w, d + 3), 0.12, 'sine', 0.045, { layer: true }));
      out.push(spec(hz(w, d + 4), 0.14, 'sine', 0.045, { layer: true, at: step * 2 }));
    }
    // Perfect: a bright sparkle an octave and a fifth above.
    if (o.quality === 'perfect' && M.perfectLayer) {
      out.push(spec(hz(w, d + 3), 0.14, 'sine', 0.08, { glide: hz(w, d + 3) * 1.006 }));
      out.push(spec(f * 4, 0.1, 'sine', 0.045, {}));
    }
    // Overdrive: a stacked chord on every contact (the melody note with the scale's third and fifth
    // above it) and a bright octave, so each hit rings a little fuller. Accompaniment only.
    if (o.overdrive) {
      out.push(spec(hz(w, d + 2), 0.26, 'triangle', 0.06, { layer: true }));
      out.push(spec(hz(w, d + 4), 0.26, 'sine', 0.05, { layer: true }));
      out.push(spec(f * 2, 0.34, 'sine', 0.05, { layer: true, at: step }));
    }
    return budget(out);
  }

  // The musical answer to reaching combo 4 / 8 / 16 (played once, as accompaniment on top of the hit).
  // 4: a quiet two-note chime. 8: a four-note arpeggio, one note per 16th. 16: a rising run up the
  // scale with a shimmer chord. Every note is a scale degree of the world's palette.
  function milestone(w, m, info) {
    const step = info && info.step > 0 ? info.step : 0.12;
    const K = C.combo;
    const base = LEAD_OCTAVE + 2;
    const out = [];
    if (m === K.layerA) {
      out.push(spec(hz(w, base + 2), 0.2, 'sine', 0.07, { layer: true }));
      out.push(spec(hz(w, base + 4), 0.28, 'sine', 0.06, { layer: true, at: step }));
    } else if (m === K.layerB) {
      for (let i = 0; i < 4; i++) out.push(spec(hz(w, base + i), 0.16, 'triangle', 0.08, { layer: true, at: step * i, cutoff: 3000 }));
      out.push(spec(hz(w, base - 5), 0.5, 'sawtooth', 0.06, { layer: true, cutoff: 800 }));
    } else if (m === K.flourish) {
      for (let i = 0; i < 6; i++) out.push(spec(hz(w, base + i), 0.2, 'square', 0.055, { layer: true, at: step * i * 0.75, cutoff: 3600 }));
      out.push(spec(hz(w, base + 7), 0.7, 'sine', 0.09, { layer: true, at: step * 4.5 }));
      out.push(spec(hz(w, base + 9), 0.7, 'sine', 0.06, { layer: true, at: step * 4.5 }));
      out.push(spec(hz(w, base - 5), 0.8, 'sawtooth', 0.07, { layer: true, cutoff: 900 }));
    }
    return budget(out);
  }

  // A risk route taken in full: five rising notes of the world's scale, one per 16th, ending on a held
  // fifth-above chime. Accompaniment only (layer: true); the notes the player collected on the way
  // were already the lead.
  function routeClear(w, info) {
    const step = info && info.step > 0 ? info.step : 0.12;
    const base = LEAD_OCTAVE + 1;
    const out = [];
    for (let i = 0; i < 5; i++) out.push(spec(hz(w, base + i), 0.18, 'triangle', 0.07, { layer: true, at: step * i * 0.75, cutoff: 3200 }));
    out.push(spec(hz(w, base + 7), 0.55, 'sine', 0.08, { layer: true, at: step * 3.5 }));
    out.push(spec(hz(w, base + 9), 0.55, 'sine', 0.05, { layer: true, at: step * 3.5 }));
    return budget(out);
  }

  // Mirror Pulse cues (accompaniment only, all in the world's scale). Telegraph: a soft two-note call, the
  // second a fifth above the first. Start: the same two notes answered in reverse (a reflection) while a
  // sine glides from the centre pitch out to both an octave above and below. End: the reflection folds
  // back: a falling pair. Nothing here is a lead note and nothing delays play.
  function mirrorTelegraph(w, info) {
    const step = info && info.step > 0 ? info.step : 0.12;
    const b = LEAD_OCTAVE + 1;
    return budget([
      spec(hz(w, b), 0.22, 'sine', 0.06, { layer: true }),
      spec(hz(w, b + 4), 0.34, 'sine', 0.05, { layer: true, at: step * 2 }),
    ]);
  }
  function mirrorStart(w, info) {
    const step = info && info.step > 0 ? info.step : 0.12;
    const b = LEAD_OCTAVE + 1;
    const f = hz(w, b + 2);
    return budget([
      spec(hz(w, b + 4), 0.2, 'triangle', 0.06, { layer: true }),
      spec(hz(w, b), 0.3, 'triangle', 0.06, { layer: true, at: step }),
      spec(f, 0.45, 'sine', 0.05, { layer: true, glide: f * 2 }),
      spec(f, 0.45, 'sine', 0.05, { layer: true, glide: f / 2 }),
    ]);
  }
  function mirrorEnd(w, info) {
    const step = info && info.step > 0 ? info.step : 0.12;
    const b = LEAD_OCTAVE + 1;
    return budget([
      spec(hz(w, b + 4), 0.2, 'sine', 0.06, { layer: true }),
      spec(hz(w, b), 0.34, 'sine', 0.055, { layer: true, at: step }),
    ]);
  }

  // Overdrive starts: a rising sweep and a bright chord of the world's scale. Ends: a falling release.
  function overdriveStart(w) {
    const f = hz(w, LEAD_OCTAVE - 5);
    return budget([
      spec(f, 0.5, 'sawtooth', 0.1, { glide: f * 4, cutoff: 2400 }),
      spec(hz(w, LEAD_OCTAVE), 0.7, 'triangle', 0.08, { layer: true }),
      spec(hz(w, LEAD_OCTAVE + 2), 0.7, 'triangle', 0.07, { layer: true }),
      spec(hz(w, LEAD_OCTAVE + 4), 0.7, 'sine', 0.07, { layer: true }),
      spec(hz(w, LEAD_OCTAVE + 5), 0.9, 'sine', 0.06, { layer: true }),
    ]);
  }

  function overdriveEnd(w) {
    const f = hz(w, LEAD_OCTAVE + 5);
    return budget([
      spec(f, 0.45, 'triangle', 0.08, { glide: f / 3, cutoff: 2200 }),
      spec(hz(w, LEAD_OCTAVE), 0.5, 'sine', 0.06, { layer: true, glide: hz(w, LEAD_OCTAVE - 5) }),
    ]);
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

  Pulse.Melody = { WORLDS, semitone, hz, degree, hit, lost, fail, milestone, routeClear, mirrorTelegraph, mirrorStart, mirrorEnd, overdriveStart, overdriveEnd, budget, GAIN_CEILING };
})();
