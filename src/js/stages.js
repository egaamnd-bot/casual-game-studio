// Campaign: 12 stages in three worlds. Data only: src/js/campaign.js validates and runs them.
//
// Stage fields:
//   id        stable string, used as the save-data key. Never rename a shipped id (the first
//             three keep their original ids so existing saves and stars carry over).
//   name      display name
//   world     the world it belongs to (WORLDS below: art, music, banner); `sector` = world
//   intro     one-line guidance shown before the stage starts
//   teaches   what the stage is for (documentation and tests)
//   speed     { start, end } forward speed (px/s), interpolated over the stage's length
//   stars     optional { two, three } share of gold needed (defaults in config.js)
//   exit      { type: 'finish', runout } finish line `runout` px after the last item
//   items     ordered list built with the helpers below. `t` = seconds of clear time before the
//             item (converted at the stage's top speed, so the real time is never shorter).
//             Pulse.Track.validateItems (level.js) enforces the minimum time to switch size:
//             to shrink 0.35 s, to grow for a barrier or gold 0.32 s, to fill the charge ring
//             0.62 s, either side of a mint 0.22 s. Two gaps in a row may be close (hold through).
//
// Item helpers:
//   gap(need, t, shift)     gap wall; `need` = clearance (below 56 = must shrink); `shift`
//                           moves where the gap sits (visual only)
//   wide(t)                 gap wide enough to pass at full size (a breather)
//   tunnel(need, length, t) long gap: keep holding for its whole length
//   bar(t) / charged(t)     barrier: smash at full size; charged also needs a full charge ring
//   gold(t) / mint(t)       gold energy (counts for stars) / optional mint bonus
//
// To add a stage: append an object with a new id. tests/campaign.html checks every stage for
// fields, fairness, completion with all gold at three screen sizes, cautious play, the
// difficulty curve and the order mechanics are introduced in.
(function () {
  const gap = (need, t, shift) => ({ type: 'gate', need, t, shift: shift || 0 });
  const wide = (t) => ({ type: 'gate', need: 76, t });
  const tunnel = (need, length, t) => ({ type: 'gate', need, length, t });
  const bar = (t) => ({ type: 'barrier', t });
  const charged = (t) => ({ type: 'barrier', charged: true, t });
  const gold = (t) => ({ type: 'energy', t });
  const mint = (t) => ({ type: 'bonus', t });
  // Moving gap: the gap swings `amp` px either side of the lane centre every `beats` beats.
  // `need` is the clearance at its tightest. `phase` (0..1 of the swing) is where it is when it
  // reaches the orb: 0 = passing through the middle, 0.25 / 0.75 = at an end of its swing.
  const slide = (need, t, amp, beats, phase) => ({ type: 'gate', need, t, slide: { amp, beats, phase: phase || 0 } });
  // Breathing gap (pinch): stays centred and opens and closes every `beats` beats. `need` is the
  // clearance at its tightest, `amp` how much wider it opens. `phase` 0 = tightest as it reaches the orb.
  const breathe = (need, t, amp, beats, phase) => ({ type: 'gate', need, t, slide: { kind: 'breathe', amp, beats, phase: phase || 0 } });
  // Beat-aligns an item: it reaches the orb on a multiple of `sub` beats (default every beat).
  // Only ever delays an item, so the clear time is never shorter than written.
  const on = (item, sub) => Object.assign(item, { beat: sub || 1 });

  // Gemini v4 worlds: backgrounds, intro banner, and music track (assets/audio/music/).
  Pulse.WORLDS = [
    {
      index: 1, id: 'world-1', name: 'Neon Circuit', music: 'WORLD_1_GAMEPLAY', bpm: 125, banner: 'bg_world1_intro_banner',
      visual: { background: 'bg_world1_far', mid: 'bg_world1_mid', rail: 'bg_world1_fg_rail', bgSpeed: 0.22, midSpeed: 0.4, railSpeed: 0.5 },
    },
    {
      index: 2, id: 'world-2', name: 'Chromatic Overdrive', music: 'WORLD_2_GAMEPLAY', bpm: 133, banner: 'bg_world2_intro_banner',
      visual: { background: 'bg_world2_far', mid: 'bg_world2_mid', rail: 'bg_world2_fg_rail', bgSpeed: 0.3, midSpeed: 0.5, railSpeed: 0.65 },
    },
    {
      index: 3, id: 'world-3', name: 'Pulse Collapse', music: 'WORLD_3_GAMEPLAY', bpm: 140, banner: 'bg_world3_intro_banner',
      visual: { background: 'bg_world3_far', mid: 'bg_world3_mid', rail: 'bg_world3_fg_rail', bgSpeed: 0.38, midSpeed: 0.6, railSpeed: 0.8 },
    },
  ];
  const [W1, W2, W3] = Pulse.WORLDS;
  const RUNOUT = { type: 'finish', runout: 360 };

  Pulse.STAGES = [
    // ---------------- World 1 · Neon Circuit — learn the pulse, build the rhythm ----------------
    {
      id: 's1-first-pulse', name: 'First Contact', world: W1,
      intro: 'Hold anywhere to shrink through gaps. Release to grow and catch gold.',
      teaches: 'Shrinking through gaps and releasing to collect gold. No barriers.',
      speed: { start: 200, end: 220 }, exit: RUNOUT,
      hints: [
        { from: 0.4, to: 4.2, title: 'ONE TOUCH.', sub: 'HOLD TO SHRINK  ·  RELEASE TO GROW' },
        { from: 4.8, to: 9.5, title: 'MASTER THE TIMING.', sub: 'SLIP THROUGH GAPS  ·  COLLECT THE GOLD' },
      ],
      items: [
        wide(1.4), gold(0.6),
        gap(50, 0.75), gold(0.65), gap(48, 0.75), gold(0.65),
        wide(0.8), gap(48, 0.7), gold(0.65),
        gap(46, 0.7), gold(0.65), gap(46, 0.75), gold(0.6),
      ],
    },
    {
      id: 's2-find-the-rhythm', name: 'Break the Barrier', world: W1,
      intro: 'Cyan barriers shatter only at full size. Let go before you reach them.',
      teaches: 'Standard barriers: first alone while already big, then after a gap with lots of time.',
      speed: { start: 220, end: 240 }, exit: RUNOUT,
      hints: [{ from: 0.4, to: 4.5, title: 'SHATTER THE BARRIERS.', sub: 'FULL SIZE SMASHES CYAN  ·  SHRUNK CRASHES' }],
      items: [
        gap(48, 1.2), gold(0.6),
        bar(0.9), gold(0.5), // first barrier: you're already full size
        gap(48, 0.8), bar(1.0), gold(0.5), // after a gap, with plenty of time to let go
        gap(46, 0.8), gold(0.6), bar(0.5),
        gap(46, 0.85), bar(0.8), gold(0.5),
        gap(46, 0.75), gold(0.6),
      ],
    },
    {
      id: 's3-controlled-overload', name: 'Alternating Rhythm', world: W1,
      intro: 'Shrink, smash, shrink, smash. Find the beat. Swaying gaps move with the music.',
      teaches: 'Gaps and barriers alternating at a steady beat; first gently swaying (moving) gaps.',
      speed: { start: 240, end: 260 }, exit: RUNOUT,
      hints: [{ from: 0.4, to: 4.5, title: 'FEEL THE BEAT.', sub: 'SWAYING GAPS MOVE WITH THE MUSIC' }],
      items: [
        gap(48, 1.1), bar(0.7), gap(46, 0.7), gold(0.55),
        bar(0.4), gap(46, 0.65), bar(0.6), gap(46, 0.6), gold(0.55),
        bar(0.4), on(slide(44, 0.6, 14, 4, 0), 0.5), bar(0.6), gap(44, 0.6), gold(0.55), // first moving gap: gentle
        bar(0.4), gold(0.4), on(slide(44, 0.6, 14, 4, 0), 0.5), gold(0.55),
      ],
    },
    {
      id: 's4-split-decision', name: 'Split Decision', world: W1,
      intro: 'Quicker switches. A short release between two gaps grabs the gold. Some gaps now pinch shut.',
      teaches: 'Faster shrink/grow switches and gold dares (a short release between gaps).',
      speed: { start: 255, end: 280 }, exit: RUNOUT,
      hints: [{ from: 0.4, to: 4.5, title: 'EVERY SECOND COUNTS.', sub: 'PINCHING GAPS  ·  QUICK RELEASES' }],
      items: [
        gap(46, 1.0), bar(0.55), gap(44, 0.55), gold(0.45), gap(44, 0.45), // first gold dare
        bar(0.55), on(breathe(44, 0.55, 10, 4, 0), 0.5), gold(0.42), gap(42, 0.45), // first breathing gap: gentle
        bar(0.55), on(slide(42, 0.55, 20, 4, 0.25), 0.5), bar(0.5), gold(0.4),
        gap(44, 0.5, -60), gold(0.42), on(slide(42, 0.45, 20, 4, 0.75), 0.5), bar(0.5), gold(0.4),
      ],
    },

    // ---------------- World 2 · Chromatic Overdrive — new mechanics, taught then combined ----------------
    {
      id: 's5-charged-energy', name: 'Charged Energy', world: W2,
      intro: 'Double-edged barriers need a full charge ring. Stay big until the ring closes.',
      teaches: 'Charged barriers: first while already charged, then after a gap with a long lead.',
      speed: { start: 270, end: 290 }, exit: RUNOUT,
      items: [
        gap(46, 1.0), gold(0.6),
        charged(1.0), gold(0.6), // first charged barrier: you're already full and charged
        gap(46, 0.8), charged(1.15), gold(0.5), // after a gap: let go early
        gap(44, 0.7), bar(0.55), gap(44, 0.55), gold(0.5),
        charged(0.5), on(slide(44, 0.7, 16, 4, 0.25), 0.5), charged(0.85), gold(0.5),
        gap(44, 0.6, -60), gold(0.55),
      ],
    },
    {
      id: 's6-the-long-hold', name: 'The Long Hold', world: W2,
      intro: 'Long gaps: keep holding all the way through, then breathe.',
      teaches: 'Tunnels (sustained holds) with recovery sections and barriers after them.',
      speed: { start: 280, end: 305 }, exit: RUNOUT,
      items: [
        gap(46, 1.0), gold(0.6),
        tunnel(46, 200, 0.9), gold(0.55), gold(0.3), // first tunnel: generous, then recovery
        bar(0.45), on(breathe(44, 0.6, 10, 4, 0), 0.5), tunnel(42, 280, 0.6), gold(0.45), bar(0.4),
        on(slide(44, 0.55, 18, 4, 0.25), 0.5), charged(0.8), gap(44, 0.5, -60), tunnel(42, 320, 0.25),
        gold(0.45), gold(0.3), bar(0.4), gold(0.4),
      ],
    },
    {
      id: 's7-double-trouble', name: 'Double Trouble', world: W2,
      intro: 'Gaps back to back. Hold through them both.',
      teaches: 'Double and triple squeezes (hold through), mixed with barriers.',
      speed: { start: 290, end: 315 }, exit: RUNOUT,
      items: [
        gap(46, 1.0), gap(46, 0.32), gold(0.6), // first double: roomy
        bar(0.5), on(breathe(44, 0.6, 12, 4, 0), 0.5), gap(44, 0.24, 60), bar(0.5), gold(0.4),
        on(slide(44, 0.6, 20, 4, 0.75), 0.5), gap(42, 0.2), gap(42, 0.2, 60), gold(0.45), // triple
        charged(0.75), on(slide(42, 0.5, 20, 4, 0.25), 0.5), gap(42, 0.2), bar(0.5), gold(0.4),
        gap(42, 0.55), gap(40, 0.18, 60), gold(0.45), bar(0.4), gold(0.4),
      ],
    },
    {
      id: 's8-greed-is-optional', name: 'Greed Is Optional', world: W2,
      intro: 'Mint hexagons are a risky bonus. Holding through is always safe.',
      teaches: 'Optional mint dares: a quick release for a bonus, or a safe hold-through.',
      speed: { start: 300, end: 325 }, exit: RUNOUT,
      items: [
        gap(46, 1.0), mint(0.34), gap(46, 0.34), gold(0.6), // first mint: roomy
        bar(0.55), gap(44, 0.65), mint(0.28), gap(44, 0.28), gold(0.5),
        charged(0.8), gap(44, 0.65, 60), mint(0.26), bar(0.26),
        on(slide(42, 0.6, 20, 4, 0.75), 0.5), gold(0.45), on(breathe(42, 0.5, 12, 4, 0), 0.5), mint(0.24), gap(42, 0.24, 60),
        gold(0.5), bar(0.45), gold(0.4),
      ],
    },

    // ---------------- World 3 · Pulse Collapse — test the skill, then mastery ----------------
    {
      id: 's9-overload', name: 'Overload', world: W3,
      intro: 'Everything you know, faster and closer together.',
      teaches: 'Known mechanics combined at a higher speed and density.',
      speed: { start: 320, end: 360 }, exit: RUNOUT,
      items: [
        gap(44, 1.0), bar(0.42), gap(42, 0.42, 60), gold(0.38), charged(0.7),
        on(slide(42, 0.42, 22, 4, 0.25), 0.5), gap(42, 0.18), bar(0.42), gap(40, 0.42, 60), gold(0.36),
        bar(0.3), on(breathe(40, 0.42, 12, 4, 0), 0.5), tunnel(40, 260, 0.2), gold(0.36), charged(0.7),
        on(slide(40, 0.42, 22, 4, 0.75), 0.5), mint(0.24), gap(40, 0.24), gold(0.4), bar(0.3),
        gap(40, 0.42, -60), gold(0.4),
      ],
    },
    {
      id: 's10-precision', name: 'Precision', world: W3,
      intro: 'Tight gaps, short windows. Shrink late, let go early.',
      teaches: 'Accurate transitions: switch windows close to the fair minimum, narrow gaps.',
      speed: { start: 335, end: 365 }, exit: RUNOUT,
      items: [
        gap(40, 1.0), bar(0.36), gap(38, 0.38, 60), bar(0.35), gap(38, 0.38, -60), gold(0.35),
        gap(36, 0.35), charged(0.65), on(breathe(36, 0.38, 12, 4, 0), 0.5), bar(0.35), gap(36, 0.38, -60), gold(0.35),
        on(slide(34, 0.35, 22, 4, 0.25), 0.5), gap(34, 0.16, 60), charged(0.65), gap(34, 0.38, -60), gold(0.36),
        bar(0.3), gap(36, 0.38), gold(0.36), bar(0.3), gold(0.3),
      ],
    },
    {
      id: 's11-final-circuit', name: 'Final Circuit', world: W3,
      intro: 'Charged barriers, double gaps and mint dares, with a breather in the middle.',
      teaches: 'Every mechanic in combination, with a recovery section.',
      speed: { start: 345, end: 385 }, exit: RUNOUT,
      items: [
        gap(42, 1.0), charged(0.7), on(slide(40, 0.42, 22, 4, 0.25), 0.5), gap(40, 0.18), gold(0.38),
        bar(0.3), on(breathe(38, 0.42, 12, 4, 0), 0.5), mint(0.24), gap(38, 0.24), gold(0.4),
        wide(0.5), gold(0.3), gold(0.3), // recovery
        gap(38, 0.6, 60), charged(0.68), on(slide(36, 0.4, 22, 4, 0.75), 0.5), gap(36, 0.16), bar(0.4),
        gap(36, 0.4, 60), mint(0.23), bar(0.26), gold(0.4),
        tunnel(36, 300, 0.45), gold(0.38), charged(0.42), gap(36, 0.42, -60), gold(0.4),
      ],
    },
    {
      id: 's12-the-final-pulse', name: 'The Final Pulse', world: W3,
      intro: 'The last run. Everything, at full speed. Breathe when the gold comes.',
      teaches: 'Climax: a build-up, a recovery, then a final gauntlet of every mechanic.',
      speed: { start: 355, end: 410 }, exit: { type: 'finish', runout: 420 },
      items: [
        // Build-up
        gap(42, 1.0), bar(0.42), on(breathe(40, 0.42, 12, 4, 0), 0.5), gold(0.36), charged(0.68),
        on(slide(38, 0.4, 22, 4, 0.25), 0.5), gap(38, 0.16), bar(0.38), gap(38, 0.4, 60), gold(0.36),
        // Recovery
        wide(0.55), gold(0.3), gold(0.3), gold(0.3),
        // Final gauntlet
        gap(36, 0.6, -60), bar(0.36), on(slide(36, 0.38, 24, 4, 0.75), 0.5), charged(0.64),
        on(breathe(34, 0.38, 12, 4, 0), 0.5), gap(34, 0.15), mint(0.23), gap(34, 0.23, 60), gold(0.36),
        bar(0.3), tunnel(34, 340, 0.38), gold(0.36), charged(0.36),
        gap(34, 0.38, -60), bar(0.34), gap(34, 0.38, 60), gold(0.36),
        // Finale
        charged(0.66), gold(0.3),
      ],
    },
  ];

  // `sector` is the world (the stage-select screen and older code group by it).
  for (const s of Pulse.STAGES) s.sector = s.world;
})();
