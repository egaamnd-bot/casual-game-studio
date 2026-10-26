// PULSE v5.0 — 12-Stage Rhythm/Motion Campaign Proposal (Drop-in Reference for src/js/stages.js)
// Preserves all 12 stage IDs ('s1-first-pulse' .. 's12-the-final-pulse'), world assignments,
// star rules, and passes 100% of Pulse.Campaign.validate(stage, 540) fairness checks.
(function () {
  const gap = (need, t, shift) => ({ type: 'gate', need, t, shift: shift || 0 });
  const wide = (t) => ({ type: 'gate', need: 76, t });
  const tunnel = (need, length, t) => ({ type: 'gate', need, length, t });
  const bar = (t) => ({ type: 'barrier', t });
  const charged = (t) => ({ type: 'barrier', charged: true, t });
  const gold = (t) => ({ type: 'energy', t });
  const mint = (t) => ({ type: 'bonus', t });

  // v5.0 Motion & Rhythm Obstacle Helpers (backward-compatible with Pulse.Track.validateItems)
  const slide = (need, t, fromShift, toShift) => ({
    type: 'gate', need, t, shift: toShift || 0,
    motion: { kind: 'slide', fromShift: fromShift === undefined ? 90 : fromShift, duration: 0.72 },
  });
  const oscillate = (need, t, amp, shift) => ({
    type: 'gate', need, t, shift: shift || 0,
    motion: { kind: 'oscillate', amp: amp || 12, freq: 4.4 },
  });
  const rotor = (need, t, dir, shift) => ({
    type: 'gate', need, t, shift: shift || 0,
    motion: { kind: 'rotor', dir: dir || 1, pinch: 6 },
  });
  const waveTunnel = (need, length, t, amp) => ({
    type: 'gate', need, length, t,
    motion: { kind: 'wave', amp: amp || 12 },
  });
  const pulseBar = (t, isCharged) => ({
    type: 'barrier', charged: !!isCharged, t,
    motion: { kind: 'pulse' },
  });
  const hybrid = (need, t, shift, dir) => ({
    type: 'gate', need, t, shift: shift || 0,
    motion: { kind: 'hybrid', dir: dir || 1 },
  });

  Pulse.WORLDS = [
    {
      index: 1, id: 'world-1', name: 'Neon Circuit', bpm: 125, music: 'WORLD_1_GAMEPLAY', banner: 'bg_world1_intro_banner',
      visual: { background: 'bg_world1_far', mid: 'bg_world1_mid', rail: 'bg_world1_fg_rail', bgSpeed: 0.22, midSpeed: 0.4, railSpeed: 0.5 },
    },
    {
      index: 2, id: 'world-2', name: 'Chromatic Overdrive', bpm: 133, music: 'WORLD_2_GAMEPLAY', banner: 'bg_world2_intro_banner',
      visual: { background: 'bg_world2_far', mid: 'bg_world2_mid', rail: 'bg_world2_fg_rail', bgSpeed: 0.3, midSpeed: 0.5, railSpeed: 0.65 },
    },
    {
      index: 3, id: 'world-3', name: 'Pulse Collapse', bpm: 140, music: 'WORLD_3_GAMEPLAY', banner: 'bg_world3_intro_banner',
      visual: { background: 'bg_world3_far', mid: 'bg_world3_mid', rail: 'bg_world3_fg_rail', bgSpeed: 0.38, midSpeed: 0.6, railSpeed: 0.8 },
    },
  ];
  const [W1, W2, W3] = Pulse.WORLDS;
  const RUNOUT = { type: 'finish', runout: 360 };

  Pulse.STAGES = [
    // ---------------- World 1 · Neon Circuit (125 BPM, 0.48s/beat) — learn the pulse, build the rhythm ----------------
    {
      id: 's1-first-pulse', name: 'First Contact', world: W1,
      intro: 'Hold anywhere to shrink through gaps. Release to grow and catch gold.',
      teaches: 'Shrinking through static and gentle sliding gaps; releasing to collect gold.',
      speed: { start: 200, end: 220 }, exit: RUNOUT,
      items: [
        wide(1.44), gold(0.60),
        gap(50, 0.75), gold(0.65), gap(48, 0.75), gold(0.65),
        wide(0.80), slide(48, 0.72, 70, 0), gold(0.65),
        gap(46, 0.72), gold(0.65), slide(46, 0.75, -70, 0), gold(0.60),
      ],
    },
    {
      id: 's2-find-the-rhythm', name: 'Break the Barrier', world: W1,
      intro: 'Cyan barriers shatter only at full size. Let go before you reach them.',
      teaches: 'Standard barriers combined with telegraphed sliding gates at a half-note cadence.',
      speed: { start: 220, end: 240 }, exit: RUNOUT,
      items: [
        gap(48, 1.20), gold(0.60),
        bar(0.96), gold(0.50),
        slide(48, 0.80, 80, 0), bar(0.96), gold(0.50),
        gap(46, 0.80), gold(0.60), bar(0.50),
        slide(46, 0.85, -80, 0), bar(0.80), gold(0.50),
        gap(46, 0.75), gold(0.60),
      ],
    },
    {
      id: 's3-controlled-overload', name: 'Alternating Rhythm', world: W1,
      intro: 'Shrink, smash, shrink, smash. Follow the breathing gates on the beat.',
      teaches: 'Oscillating pinch jaws alternating with barriers in a steady 125 BPM rhythm.',
      speed: { start: 240, end: 260 }, exit: RUNOUT,
      items: [
        gap(48, 1.10), bar(0.72), oscillate(46, 0.72, 8), gold(0.55),
        bar(0.48), oscillate(46, 0.65, 10), bar(0.60), gap(46, 0.60), gold(0.55),
        bar(0.48), oscillate(44, 0.60, 10), bar(0.60), slide(44, 0.60, 75, 0), gold(0.55),
        bar(0.48), gold(0.42), oscillate(44, 0.60, 10), gold(0.55),
      ],
    },
    {
      id: 's4-split-decision', name: 'Split Decision', world: W1,
      intro: 'Quicker switches. A short release between sliding gaps grabs the gold.',
      teaches: 'Faster shrink/grow switches and gold dares between sliding offset gates.',
      speed: { start: 255, end: 280 }, exit: RUNOUT,
      items: [
        gap(46, 0.96), bar(0.55), gap(44, 0.55), gold(0.45), slide(44, 0.48, 85, 0),
        bar(0.55), oscillate(44, 0.55, 10), gold(0.42), gap(42, 0.45),
        bar(0.55), slide(42, 0.55, -90, 60), bar(0.50), gold(0.40),
        slide(44, 0.50, 90, -60), gold(0.42), slide(42, 0.45, -90, 60), bar(0.50), gold(0.40),
      ],
    },

    // ---------------- World 2 · Chromatic Overdrive (133 BPM, 0.451s/beat) — new mechanics & combinations ----------------
    {
      id: 's5-charged-energy', name: 'Charged Energy', world: W2,
      intro: 'Double-edged barriers need a full charge ring. Stay big until the ring closes.',
      teaches: 'Charged barriers and pulsating energy barriers after sliding/oscillating gates.',
      speed: { start: 270, end: 290 }, exit: RUNOUT,
      items: [
        gap(46, 1.00), gold(0.60),
        charged(1.00), gold(0.60),
        gap(46, 0.80), charged(1.15), gold(0.50),
        oscillate(44, 0.70, 12), pulseBar(0.55, false), slide(44, 0.55, 85, 0), gold(0.50),
        pulseBar(0.50, true), slide(44, 0.70, -90, 60), charged(0.85), gold(0.50),
        oscillate(44, 0.60, 12, -60), gold(0.55),
      ],
    },
    {
      id: 's6-the-long-hold', name: 'The Long Hold', world: W2,
      intro: 'Wave tunnels: keep holding all the way through, then release to breathe.',
      teaches: 'Sustained tunnels and undulating wave corridors with barrier recoveries.',
      speed: { start: 280, end: 305 }, exit: RUNOUT,
      items: [
        gap(46, 1.00), gold(0.60),
        tunnel(46, 200, 0.90), gold(0.55), gold(0.30),
        bar(0.45), slide(44, 0.60, 85, 0), waveTunnel(42, 280, 0.60, 12), gold(0.45), pulseBar(0.42, false),
        oscillate(44, 0.55, 12, 60), charged(0.80), slide(44, 0.50, 90, -60), waveTunnel(42, 320, 0.25, 14),
        gold(0.45), gold(0.30), bar(0.42), gold(0.40),
      ],
    },
    {
      id: 's7-double-trouble', name: 'Double Trouble', world: W2,
      intro: 'Moving gaps back to back. Hold through them both.',
      teaches: 'Opposite-sliding double and triple squeezes mixed with pulsating barriers.',
      speed: { start: 290, end: 315 }, exit: RUNOUT,
      items: [
        gap(46, 1.00), slide(46, 0.32, 75, 0), gold(0.60),
        bar(0.50), slide(44, 0.60, -85, 0), slide(44, 0.24, 95, 60), pulseBar(0.50, false), gold(0.40),
        slide(44, 0.60, 90, -60), oscillate(42, 0.20, 10), slide(42, 0.20, -90, 60), gold(0.45),
        charged(0.75), slide(42, 0.50, 85, -60), gap(42, 0.20), pulseBar(0.50, false), gold(0.40),
        oscillate(42, 0.55, 12), slide(40, 0.18, -90, 60), gold(0.45), bar(0.40), gold(0.40),
      ],
    },
    {
      id: 's8-greed-is-optional', name: 'Greed Is Optional', world: W2,
      intro: 'Rotating rings align on the beat. Mint hexagons are a risky bonus.',
      teaches: 'Rotating gates/rings paired with optional mint dares and safe hold-throughs.',
      speed: { start: 300, end: 325 }, exit: RUNOUT,
      items: [
        rotor(46, 1.00, 1), mint(0.34), rotor(46, 0.34, -1), gold(0.60),
        bar(0.55), rotor(44, 0.65, 1), mint(0.28), slide(44, 0.28, 85, 0), gold(0.50),
        charged(0.80), rotor(44, 0.65, -1, 60), mint(0.26), pulseBar(0.26, false),
        slide(42, 0.60, 90, -60), gold(0.45), rotor(42, 0.50, 1), mint(0.24), slide(42, 0.24, -90, 60),
        gold(0.50), bar(0.45), gold(0.40),
      ],
    },

    // ---------------- World 3 · Pulse Collapse (140 BPM, 0.429s/beat) — high-tempo mastery ----------------
    {
      id: 's9-overload', name: 'Overload', world: W3,
      intro: '140 BPM overdrive. Pulsating barriers, rotors and wave tunnels at speed.',
      teaches: 'All moving archetypes combined at World 3 tempo and higher density.',
      speed: { start: 320, end: 360 }, exit: RUNOUT,
      items: [
        slide(44, 1.00, 90, 0), pulseBar(0.42, false), rotor(42, 0.42, 1, 60), gold(0.38), pulseBar(0.70, true),
        slide(42, 0.42, 95, -60), oscillate(42, 0.18, 12), bar(0.42), rotor(40, 0.42, -1, 60), gold(0.36),
        pulseBar(0.30, false), slide(40, 0.42, 95, -60), waveTunnel(40, 260, 0.20, 14), gold(0.36), charged(0.70),
        rotor(40, 0.42, 1, 60), mint(0.24), oscillate(40, 0.24, 12), gold(0.40), pulseBar(0.30, false),
        slide(40, 0.42, 95, -60), gold(0.40),
      ],
    },
    {
      id: 's10-precision', name: 'Precision', world: W3,
      intro: 'Hybrid locks and tight apertures. Shrink late, release right on the beat.',
      teaches: 'Static + moving hybrid obstacles and narrow 34-38px transition windows.',
      speed: { start: 335, end: 365 }, exit: RUNOUT,
      items: [
        hybrid(40, 1.00, 0, 1), pulseBar(0.36, false), slide(38, 0.38, -95, 60), bar(0.35), slide(38, 0.38, 95, -60), gold(0.35),
        rotor(36, 0.35, 1), pulseBar(0.65, true), hybrid(36, 0.38, 60, -1), bar(0.35), oscillate(36, 0.38, 14, -60), gold(0.35),
        slide(34, 0.35, 90, 0), rotor(34, 0.16, -1, 60), charged(0.65), hybrid(34, 0.38, -60, 1), gold(0.36),
        pulseBar(0.30, false), oscillate(36, 0.38, 14), gold(0.36), bar(0.30), gold(0.30),
      ],
    },
    {
      id: 's11-final-circuit', name: 'Final Circuit', world: W3,
      intro: 'Charged pulse barriers, rotors and mint dares, with a breather in the middle.',
      teaches: 'Full moving repertoire in two intense phrases separated by a harmonic recovery.',
      speed: { start: 345, end: 385 }, exit: RUNOUT,
      items: [
        rotor(42, 1.00, 1), pulseBar(0.70, true), slide(40, 0.42, -95, 60), oscillate(40, 0.18, 12), gold(0.38),
        bar(0.30), hybrid(38, 0.42, -60, -1), mint(0.24), rotor(38, 0.24, 1), gold(0.40),
        wide(0.50), gold(0.30), gold(0.30), // 2-bar harmonic recovery breather
        slide(38, 0.60, -95, 60), pulseBar(0.68, true), rotor(36, 0.40, -1, -60), slide(36, 0.16, 85, 0), pulseBar(0.40, false),
        hybrid(36, 0.40, 60, 1), mint(0.23), pulseBar(0.26, false), gold(0.40),
        waveTunnel(36, 300, 0.45, 15), gold(0.38), pulseBar(0.42, true), slide(36, 0.42, 95, -60), gold(0.40),
      ],
    },
    {
      id: 's12-the-final-pulse', name: 'The Final Pulse', world: W3,
      intro: 'The last run. Every moving hazard at full speed. Breathe when the gold comes.',
      teaches: 'Grand finale: 8-bar build-up, 2-bar recovery, and 12-bar mastery gauntlet.',
      speed: { start: 355, end: 410 }, exit: { type: 'finish', runout: 420 },
      items: [
        // Act 1: Build-up
        hybrid(42, 1.00, 0, 1), pulseBar(0.42, false), slide(40, 0.42, -95, 60), gold(0.36), pulseBar(0.68, true),
        rotor(38, 0.40, -1, -60), oscillate(38, 0.16, 14), pulseBar(0.38, false), slide(38, 0.40, -95, 60), gold(0.36),
        // Act 2: Harmonic Recovery
        wide(0.55), gold(0.30), gold(0.30), gold(0.30),
        // Act 3: Final Gauntlet
        hybrid(36, 0.60, -60, 1), pulseBar(0.36, false), rotor(36, 0.38, -1, 60), pulseBar(0.64, true),
        slide(34, 0.38, 95, -60), oscillate(34, 0.15, 14), mint(0.23), rotor(34, 0.23, 1, 60), gold(0.36),
        pulseBar(0.30, false), waveTunnel(34, 340, 0.38, 16), gold(0.36), pulseBar(0.36, true),
        hybrid(34, 0.38, -60, -1), bar(0.34), slide(34, 0.38, -95, 60), gold(0.36),
        // Finale
        pulseBar(0.66, true), gold(0.30),
      ],
    },
  ];

  for (const s of Pulse.STAGES) s.sector = s.world;
})();
