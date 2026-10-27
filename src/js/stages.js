// Campaign: stages in three worlds of ten (see Pulse.ARCS at the end). Data only: src/js/campaign.js validates and runs them.
// The game is PORTRAIT: obstacles fall from the top, the orb steers left and right (docs/PORTRAIT_REWORK.md).
//
// Stage fields:
//   id        stable string, used as the save-data key. Never rename a shipped id (the first
//             three keep their original ids so existing saves and stars carry over).
//   name      display name
//   world     the world it belongs to (WORLDS below: art, music, banner); `sector` = world
//   intro     one-line guidance shown before the stage starts
//   teaches   what the stage is for (documentation and tests)
//   profile   one line: what makes this stage feel different from its neighbours
//   speed     { start, end } forward speed (px/s), interpolated over the stage's length
//   stars     optional { two, three } share of gold needed (defaults in config.js)
//   exit      { type: 'finish', runout } finish line `runout` px after the last item
//   pace      multiplies every `t` (default 1; below 1 = closer together). Validation still applies.
//   spread    multiplies every lateral offset `x` and swing `amp` (default 1; below 1 = a narrower weave)
//   grid      beat grid for item arrivals, in beats (default 0.5 = every eighth note): every item is
//             nudged LATER to reach the orb on the grid, so clear times only ever grow
//   items     ordered list built with the helpers below. `t` = seconds of clear time before the
//             item (converted at the stage's top speed, so the real time is never shorter).
//             `x` = how far left (-) or right (+) of the lane centre the gap or note sits, in px.
//             Pulse.Track.validateItems (level.js) enforces (a) the minimum time to switch size and
//             (b) that the orb, drifting at only config.steer.fairSpeed after a short reaction pause,
//             can always reach the next gap or gold note from the last one.
//
// Item helpers (each returns ONE item; the phrase helpers return a list and are spread with ...):
//   gap(need, t, x)         gap wall; `need` = half-width of the opening (below 70 = must shrink)
//   wide(t, x)              gap wide enough to pass at full size (a breather)
//   tunnel(need, length, t, x)  long gap: keep holding for its whole length
//   bar(t) / charged(t)     barrier: smash at full size, anywhere in the lane; charged also needs a full ring
//   gold(t, x) / mint(t, x) gold note (counts for stars) / optional mint bonus note
//   slide(need, t, x, amp, beats, phase)   gap swinging `amp` px either side of x
//   breathe(need, t, x, amp, beats, phase) gap opening and closing between need and need + amp
//   zig(n, need, t, amp, s) / snake(n, need, t, x0, x1) / trail(n, t, x0, x1, make) phrases
//
// To add a stage: append an object with a new id. tests/campaign.html checks every stage for
// fields, fairness, completion with all gold at three screen sizes, cautious play, the
// difficulty curve and the order mechanics are introduced in.
(function () {
  const gap = (need, t, x) => ({ type: 'gate', need, t, x: x || 0 });
  const wide = (t, x) => ({ type: 'gate', need: 84, t, x: x || 0 });
  const tunnel = (need, length, t, x) => ({ type: 'gate', need, length, t, x: x || 0 });
  const bar = (t) => ({ type: 'barrier', t });
  const charged = (t) => ({ type: 'barrier', charged: true, t });
  const gold = (t, x) => ({ type: 'energy', t, x: x || 0 });
  const mint = (t, x) => ({ type: 'bonus', t, x: x || 0 });
  // Moving gap: swings `amp` px either side of x every `beats` beats. `phase` (0..1 of the swing)
  // is where it is when it reaches the orb: 0 = passing through the middle, 0.25 / 0.75 = at an end.
  const slide = (need, t, x, amp, beats, phase) => ({ type: 'gate', need, t, x: x || 0, slide: { amp, beats, phase: phase || 0 } });
  // Breathing gap: opens and closes every `beats` beats between half-width `need` and `need + amp`.
  const breathe = (need, t, x, amp, beats, phase) => ({ type: 'gate', need, t, x: x || 0, slide: { kind: 'breathe', amp, beats, phase: phase || 0 } });
  // Route fork (docs/ROUTES.md): one wall with TWO openings kept apart by a divider pillar, so the
  // player must choose a side before the rows arrive. `L` / `R` = [need, x] of the left / right
  // opening; `risk` says which side is the demanding route. `end` marks the fork's last row.
  const forkRow = (route, risk, t, L, R, end) => ({
    type: 'gate', need: L[0], x: L[1], t, route, routeEnd: !!end, fork: { need: R[0], x: R[1], risk },
  });
  // An optional mint note that belongs to one lane of a fork ('risk' = on the demanding route).
  const routeNote = (route, role, t, x) => ({ type: 'bonus', t, x, route, role, lane: x < 0 ? 'L' : 'R' });
  // Mirror Pulse (docs/MIRROR.md). `mgate` is a MIRRORED PAIR of openings: the left opening sits `x` px
  // left of the lane centre and the right one the same distance right, both `need` half-width, so when
  // the main orb is in one the echo (its reflection) is in the other. A centred gap is its own mirror
  // image: use gap(need, t, 0) or wide() for a pinch where both orbs meet in the middle. `mirrorZone`
  // tags a run of items as one telegraphed mirror event: gates, mirrored pairs, barriers and mint notes only.
  const mgate = (need, t, x) => ({ type: 'gate', need, t, x: -Math.abs(x), mirror: true, fork: { need, x: Math.abs(x), risk: 'R', mirror: true } });
  const mirrorZone = (id, items) => items.map((it) => Object.assign(it, { zone: id }));
  // Beat-aligns an item to a coarser grid than the stage's (`sub` beats). Only ever delays an item.
  const on = (item, sub) => Object.assign(item, { beat: sub || 1 });
  // Where a swaying gap is when it reaches the orb (offset = amp * sin(2*pi*phase), see Rhythm.motionOffset):
  // gold placed there sits on the gap's path through the wall.
  const crest = (x, amp, phase) => Math.round(x + amp * Math.sin(2 * Math.PI * phase));
  // A travelling wave: `n` swaying gaps whose phases step by `step` of a cycle, each followed by a gold
  // note on its path. (The sway is on the off-beat grid like every moving gap.)
  const wave = (n, need, t, x, amp, beats, p0, step) => Array.from({ length: n }, (_, i) => {
    const ph = p0 + i * step;
    return [on(slide(need, t, x, amp, beats, ph), 0.5), gold(0.4, crest(x, amp, ph))];
  }).flat();
  // n gates alternating left and right of the lane centre by `amp` (first one on side `s`).
  const zig = (n, need, t, amp, s) => Array.from({ length: n }, (_, i) => gap(need, t, ((i % 2 ? -1 : 1) * (s || 1)) * amp));
  // n gates sweeping from x0 to x1 (a slalom curve).
  const snake = (n, need, t, x0, x1) => Array.from({ length: n }, (_, i) => gap(need, t, Math.round(x0 + ((x1 - x0) * i) / Math.max(1, n - 1))));
  // n notes sweeping from x0 to x1; `make` = gold or mint.
  const trail = (n, t, x0, x1, make) => Array.from({ length: n }, (_, i) => (make || gold)(t, Math.round(x0 + ((x1 - x0) * i) / Math.max(1, n - 1))));

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
      intro: 'Hold to shrink, slide to steer, release to grow. Follow the notes.',
      teaches: 'Steering to a gap and to notes, then shrinking through narrow gaps. No barriers.',
      profile: 'Slow and wide: steering first, then the first narrow gaps. Notes lead the way.',
      speed: { start: 205, end: 235 }, exit: RUNOUT,
      pace: 0.7,
      hints: [
        { from: 0.4, to: 4.2, title: 'ONE TOUCH.', sub: 'HOLD TO SHRINK  ·  RELEASE TO GROW' },
        { from: 4.6, to: 9.0, title: 'SLIDE TO STEER.', sub: 'DRAG LEFT AND RIGHT  ·  FOLLOW THE NOTES' },
        { from: 10.0, to: 14.0, title: 'MASTER THE TIMING.', sub: 'SHRINK THROUGH NARROW GAPS' },
      ],
      items: [
        wide(1.2), gold(0.5), ...trail(3, 0.4, -50, -150),
        wide(0.7, -150), gold(0.45, -150), ...trail(3, 0.4, -100, 100),
        wide(0.7, 110), gold(0.45, 110), ...trail(3, 0.4, 60, -60),
        gap(52, 0.7, -50), gold(0.45, -20), gold(0.45, 40),
        gap(50, 0.6, 70), gold(0.45, 80),
        gap(48, 0.6, -70), gold(0.45, -80),
        wide(0.6, 0), gold(0.4, 0), gold(0.4, 60),
        gap(48, 0.55, 60), gold(0.45, 40), gap(48, 0.55, -20), gold(0.45, -60),
        gap(46, 0.55, -80), gold(0.45, -30), gap(46, 0.55, 40), gold(0.45, 70),
        gap(46, 0.55, 90), gold(0.45, 40), gold(0.4, -20),
      ],
    },
    {
      id: 's2-find-the-rhythm', name: 'Break the Barrier', world: W1,
      intro: 'Cyan barriers shatter only at full size. Let go before you reach them.',
      teaches: 'Standard barriers: first alone while already big, then after a gap with lots of time.',
      profile: 'Barriers arrive. Each one is a stop in the weave: steer, let go, smash, steer again.',
      speed: { start: 225, end: 250 }, exit: RUNOUT,
      pace: 0.7,
      hints: [{ from: 0.4, to: 4.5, title: 'SHATTER THE BARRIERS.', sub: 'FULL SIZE SMASHES  ·  SHRUNK CRASHES' }],
      items: [
        gap(50, 1.0, 40), gold(0.45, 50), gold(0.4, 10),
        bar(0.75), gold(0.4, -40), gold(0.4, -80),
        gap(48, 0.65, -90), gold(0.45, -70), bar(0.8), gold(0.4, 40),
        gap(48, 0.6, 70), gold(0.45, 60), gap(48, 0.55, 0), bar(0.7), gold(0.4, -50),
        gap(46, 0.6, -90), bar(0.6), gap(46, 0.6, 90), gold(0.45, 80), bar(0.6),
        ...zig(3, 46, 0.55, 80), gold(0.45, -60), bar(0.55), gold(0.4, 0),
        gap(46, 0.6, -70), gold(0.45, -40), bar(0.5), ...trail(3, 0.4, 60, -100),
        gap(46, 0.6, -110), bar(0.55), gap(46, 0.6, 110), gold(0.45, 100), gold(0.4, 40),
      ],
    },
    {
      id: 's3-controlled-overload', name: 'Alternating Rhythm', world: W1,
      intro: 'Shrink, smash, shrink, smash. Find the beat. Swaying gaps move with the music.',
      teaches: 'Gaps and barriers alternating at a steady beat; first gently swaying (moving) gaps.',
      profile: 'A steady drum: gap, barrier, gap, barrier. Swaying gaps arrive on the beat.',
      speed: { start: 245, end: 275 }, exit: RUNOUT,
      pace: 0.65,
      hints: [{ from: 0.4, to: 4.5, title: 'FEEL THE BEAT.', sub: 'SWAYING GAPS MOVE WITH THE MUSIC' }],
      items: [
        gap(48, 0.9, -70), bar(0.55), gap(46, 0.55, 70), gold(0.4, 60), bar(0.5),
        gap(46, 0.55, -70), gold(0.4, -60), bar(0.45), gap(46, 0.55, 40), bar(0.45),
        on(slide(46, 0.6, 0, 40, 6, 0.25), 0.5), bar(0.5), gold(0.4, 0), gap(44, 0.55, -80), bar(0.45),
        gap(44, 0.55, 80), gold(0.4, 70), gold(0.35, 0), bar(0.45),
        on(slide(44, 0.6, -30, 50, 6, 0.75), 0.5), gold(0.4, -60), bar(0.45), on(slide(44, 0.55, 30, 50, 6, 0.25), 0.5),
        gold(0.4, 60), bar(0.45), ...zig(2, 44, 0.55, 90), bar(0.45), gold(0.4, 0), gold(0.35, 60),
        gap(44, 0.55, 60), bar(0.4), gap(44, 0.55, -60), gold(0.4, -50), bar(0.4), gold(0.35, 0),
      ],
    },
    {
      id: 's4-split-decision', name: 'Split Decision', world: W1,
      intro: 'Slalom! Sweep from side to side. When the lane splits, pick a route: safe, or risky with more notes.',
      teaches: 'Side-to-side slalom gaps, gold trails across the lane, the first breathing gaps and the first route forks (safe or risky).',
      profile: 'Wide, flowing slalom. The lane is used edge to edge; breathing gaps pulse with the beat.',
      speed: { start: 260, end: 290 }, exit: RUNOUT,
      pace: 0.58, grid: 0.25,
      hints: [{ from: 0.4, to: 4.5, title: 'EVERY SECOND COUNTS.', sub: 'SWEEP FROM SIDE TO SIDE' }],
      routeHints: { 's4-a': { title: 'THE LANE SPLITS', sub: 'LEFT SAFE · RIGHT RISKY (MORE NOTES)' }, 's4-b': { title: 'CHOOSE YOUR ROUTE', sub: 'LEFT RISKY (MORE NOTES) · RIGHT SAFE' } },
      items: [
        gap(46, 0.9, -110), gold(0.4, -90),
        // ROUTE A: the first fork, forgiving. Left = safe (wide, steady, one note); right = risk
        // (narrow gaps you must shrink for, three extra notes).
        wide(0.7, 0),
        forkRow('s4-a', 'R', 0.9, [72, -135], [46, 135]), routeNote('s4-a', 'risk', 0.35, 150),
        forkRow('s4-a', 'R', 0.5, [72, -135], [46, 175]), routeNote('s4-a', 'risk', 0.35, 150), routeNote('s4-a', 'safe', 0.1, -135),
        forkRow('s4-a', 'R', 0.5, [72, -135], [46, 120]), routeNote('s4-a', 'risk', 0.35, 135),
        forkRow('s4-a', 'R', 0.5, [72, -135], [46, 150], true),
        gold(0.4, 100),
        bar(0.55), ...snake(4, 44, 0.5, 100, -100), gold(0.4, -100), gold(0.35, -40),
        on(breathe(40, 0.55, 0, 26, 4, 0), 0.5), bar(0.5), ...zig(3, 44, 0.5, 100, -1), gold(0.4, 90),
        bar(0.5), ...trail(3, 0.35, 60, -110), gap(44, 0.5, -110), on(breathe(40, 0.55, -40, 26, 4, 0.5), 0.5),
        gold(0.4, 0), bar(0.45),
        // ROUTE B: the second fork, demanding. Left = risk (tighter gaps that zig-zag, four extra
        // notes); right = safe (wide, easy to read, one note).
        wide(0.7, 0),
        forkRow('s4-b', 'L', 0.9, [40, -150], [70, 130]), routeNote('s4-b', 'risk', 0.35, -130),
        forkRow('s4-b', 'L', 0.5, [40, -110], [70, 150]), routeNote('s4-b', 'risk', 0.35, -135),
        forkRow('s4-b', 'L', 0.5, [40, -160], [70, 120]), routeNote('s4-b', 'risk', 0.35, -137), routeNote('s4-b', 'safe', 0.1, 135),
        forkRow('s4-b', 'L', 0.5, [40, -115], [70, 150]), routeNote('s4-b', 'risk', 0.35, -127),
        forkRow('s4-b', 'L', 0.5, [40, -140], [70, 130], true),
        bar(0.5), gold(0.4, 100), gold(0.35, 20),
        gap(44, 0.5, -50), on(breathe(40, 0.55, 70, 26, 4, 0), 0.5), gold(0.4, 60), bar(0.45),
      ],
    },

    // ---------------- World 2 · Chromatic Overdrive — new mechanics, taught then combined ----------------
    {
      id: 's5-charged-energy', name: 'Charged Energy', world: W2,
      intro: 'Double-edged barriers need a full charge ring. Stay big until the ring closes.',
      teaches: 'Charged barriers: first while already charged, then after a gap with a long lead.',
      profile: 'Heavier beats: charged barriers force you to let go early and pre-steer while you wait.',
      speed: { start: 275, end: 310 }, exit: RUNOUT,
      pace: 0.62, grid: 0.25,
      items: [
        gap(46, 0.9, 50), gold(0.45, 40),
        charged(0.9), gold(0.4, -60), gold(0.4, -100),
        gap(46, 0.7, -100), charged(1.0), gold(0.4, 50), gold(0.4, 90),
        gap(44, 0.6, 90), bar(0.5), gap(44, 0.55, -40), gold(0.4, -30), charged(0.9), gold(0.4, 0),
        ...zig(2, 44, 0.55, 90), bar(0.5), gold(0.4, -60), charged(0.85), gold(0.4, 60),
        on(slide(44, 0.6, 0, 50, 6, 0.25), 0.5), charged(0.85), gold(0.4, -50), gap(44, 0.55, -90), bar(0.5),
        ...snake(3, 44, 0.5, -80, 80), charged(0.85), gold(0.4, 0), gold(0.35, -70),
        gap(44, 0.55, -100), bar(0.5), gap(44, 0.55, 100), gold(0.4, 90), charged(0.8),
      ],
    },
    {
      id: 's6-the-long-hold', name: 'The Long Hold', world: W2,
      intro: 'Long gaps: keep holding all the way through, then breathe.',
      teaches: 'Tunnels (sustained holds) with recovery sections and barriers after them.',
      profile: 'Long corridors that bend: hold through a tunnel, then a run of notes to catch your breath.',
      speed: { start: 285, end: 320 }, exit: RUNOUT,
      pace: 0.58, grid: 0.25,
      items: [
        gap(46, 0.9, 0), gold(0.45, 0),
        tunnel(48, 240, 0.8, 0), gold(0.45, 0), ...trail(3, 0.35, 0, -120),
        bar(0.5), gap(44, 0.55, -120), tunnel(44, 280, 0.45, -120), gold(0.45, -120), ...trail(3, 0.35, -90, 100),
        bar(0.5), on(breathe(42, 0.55, 0, 28, 4, 0), 0.5), tunnel(42, 300, 0.45, 0), gold(0.45, 0), bar(0.4),
        on(slide(44, 0.55, 0, 50, 6, 0.25), 0.5), charged(0.8), gap(44, 0.55, 110), tunnel(42, 320, 0.4, 110),
        gold(0.45, 100), ...trail(4, 0.32, 90, -110), bar(0.45), gap(44, 0.55, -110), tunnel(42, 260, 0.4, -110),
        gold(0.4, -90), gold(0.35, 0), bar(0.4), gold(0.4, 60),
      ],
    },
    {
      id: 's7-double-trouble', name: 'Double Trouble', world: W2,
      intro: 'Gaps back to back and bending the other way. Twice, an echo copies you in reverse: find a gap for both.',
      teaches: 'Double and triple squeezes (hold through) bending across the lane, mixed with barriers; the first Mirror Pulse (an echo orb reflects your position, obstacles come in mirrored pairs).',
      profile: 'Tight S-bends: gaps stacked close with opposite offsets, barriers as the only rests.',
      speed: { start: 295, end: 335 }, exit: RUNOUT,
      pace: 0.45, grid: 0.25, spread: 0.5,
      mirrorHints: { 's7-m1': { title: 'MIRROR PULSE', sub: 'YOUR ECHO MIRRORS YOU · FIND A GAP FOR BOTH' }, 's7-m2': { title: 'MIRROR PULSE', sub: 'TWO ORBS · ONE FINGER' } },
      items: [
        gap(46, 0.9, -50), gap(46, 0.5, 60), gold(0.45, 60), gold(0.4, 0),
        bar(0.45), gap(44, 0.5, 100), gap(44, 0.5, -20), gap(44, 0.5, -100), gold(0.4, -90), bar(0.45),
        ...snake(4, 44, 0.5, -90, 90), gold(0.4, 90), charged(0.8),
        on(slide(44, 0.55, 0, 45, 6, 0.75), 0.5), gap(42, 0.5, 90), gap(42, 0.5, -90), gold(0.4, -80), bar(0.45),
        ...zig(4, 42, 0.5, 90, -1), gold(0.4, 80), gold(0.35, 0), charged(0.75),
        // MIRROR PULSE 1: the first echo. Wide mirrored pairs, a centre pinch, one pair that needs a shrink.
        ...mirrorZone('s7-m1', [
          mgate(72, 0.9, 140), mint(0.35, 140), mgate(68, 0.5, 105), wide(0.5, 0), mgate(56, 0.5, 150), mint(0.35, -150),
        ]),
        bar(0.5), gap(42, 0.5, -90), gap(42, 0.5, 20), gap(42, 0.5, 100), gold(0.4, 90), bar(0.4), gap(44, 0.5, -60),
        // MIRROR PULSE 2: tighter, with a barrier in the middle of the pairs.
        ...mirrorZone('s7-m2', [
          mgate(54, 0.9, 150), mgate(52, 0.5, 95), bar(0.55), mgate(48, 0.6, 130), mint(0.35, 130), mgate(46, 0.5, 165), gap(56, 0.5, 0),
        ]),
        bar(0.4), gold(0.4, 0),
      ],
    },
    {
      id: 's8-greed-is-optional', name: 'Greed Is Optional', world: W2,
      intro: 'Mint notes are a risky bonus off the safe line. The safe line is always open.',
      teaches: 'Optional mint notes off the main path: a detour for a bonus, or the safe line.',
      profile: 'Risk and reward: mint notes sit on the edges, away from the safe line through the gaps.',
      speed: { start: 305, end: 345 }, exit: RUNOUT,
      pace: 0.55, grid: 0.25, spread: 0.6,
      items: [
        gap(46, 0.9, 0), mint(0.4, -140), gap(46, 0.55, 0), gold(0.45, 20),
        bar(0.5), gap(44, 0.55, 30), mint(0.35, 150), gold(0.4, 40), gap(44, 0.55, -30), bar(0.45),
        charged(0.8), ...trail(3, 0.35, -130, 130, mint), gap(44, 0.5, 100), gold(0.4, 90),
        on(breathe(42, 0.55, 0, 30, 4, 0), 0.5), mint(0.35, -150), gap(42, 0.5, -90), gold(0.4, -80), bar(0.45),
        gap(42, 0.55, 60), mint(0.3, 160), gold(0.4, 100), gap(42, 0.5, -60), mint(0.3, -150), gold(0.4, -60),
        charged(0.8), gold(0.4, 0), ...zig(3, 42, 0.5, 100), mint(0.35, 150), gold(0.4, 50), bar(0.4), gold(0.4, 0),
      ],
    },

    // ---------------- World 3 · Pulse Collapse — test the skill, then mastery ----------------
    {
      id: 's9-overload', name: 'Overload', world: W3,
      intro: 'Everything you know, faster and closer together.',
      teaches: 'Known mechanics combined at a higher speed and density.',
      profile: 'Fast and busy: every mechanic so far, back to back, with one clear breather.',
      speed: { start: 345, end: 395 }, exit: RUNOUT,
      pace: 0.45, grid: 0.25, spread: 0.45,
      items: [
        gap(44, 0.8, -60), bar(0.4), ...zig(2, 42, 0.5, 90), gold(0.38, 80), charged(0.7),
        on(slide(42, 0.5, 0, 50, 6, 0.25), 0.5), gap(42, 0.5, 80), bar(0.4), gap(40, 0.5, -90), gold(0.38, -80),
        bar(0.35), on(breathe(40, 0.5, 40, 28, 4, 0), 0.5), tunnel(40, 260, 0.4, 40), gold(0.38, 40), charged(0.7),
        ...snake(4, 40, 0.5, -100, 100), mint(0.3, 150), gold(0.38, 90), bar(0.35),
        wide(0.5, 0), ...trail(4, 0.3, 90, -110),
        gap(40, 0.5, -100), bar(0.4), gap(40, 0.5, 100), gold(0.38, 90), charged(0.65), gold(0.35, 0),
        ...zig(3, 40, 0.5, 100, -1), bar(0.35), gold(0.38, 90),
      ],
    },
    {
      id: 's10-precision', name: 'Precision', world: W3,
      intro: 'Tight gaps, short windows. Shrink late, let go early.',
      teaches: 'Accurate transitions: switch windows close to the fair minimum, narrow gaps.',
      profile: 'Narrow and exact: small openings, small moves, and a quick rhythm of gap and barrier.',
      speed: { start: 355, end: 405 }, exit: RUNOUT,
      pace: 0.45, grid: 0.25, spread: 0.4,
      items: [
        gap(40, 0.8, 0), bar(0.4), gap(38, 0.5, 50), bar(0.38), gap(38, 0.5, -50), gold(0.36, -40),
        gap(36, 0.45, 40), gap(36, 0.45, -30), charged(0.7), on(breathe(36, 0.5, 0, 24, 4, 0), 0.5), bar(0.38),
        gap(36, 0.5, -70), gold(0.36, -60), gap(36, 0.45, 60), gap(36, 0.45, -10), bar(0.35), gold(0.36, 0),
        ...snake(5, 36, 0.45, -60, 60), charged(0.7), gap(36, 0.5, 80), bar(0.35), gap(36, 0.5, -80), gold(0.36, -70),
        on(slide(36, 0.5, 0, 36, 6, 0.25), 0.5), bar(0.35), gap(36, 0.45, 50), gap(36, 0.45, -50), gold(0.36, -40), bar(0.32),
        ...zig(3, 36, 0.45, 60), charged(0.65), gold(0.36, 0), bar(0.3), gold(0.3, 50),
      ],
    },
    {
      id: 's11-final-circuit', name: 'Final Circuit', world: W3,
      intro: 'Charged barriers, double gaps and mint dares, with a breather in the middle.',
      teaches: 'Every mechanic in combination, with a recovery section.',
      profile: 'A full lap: a heavy opening, a breathing section of notes in the middle, then a hard second half.',
      speed: { start: 365, end: 420 }, exit: RUNOUT,
      pace: 0.42, grid: 0.25, spread: 0.4,
      items: [
        gap(42, 0.8, -60), charged(0.7), ...zig(2, 40, 0.5, 90), gold(0.38, 80),
        bar(0.35), on(breathe(38, 0.5, -40, 26, 4, 0), 0.5), mint(0.3, 150), gap(38, 0.5, 90), gold(0.38, 80),
        wide(0.5, 0), ...trail(5, 0.3, 80, -120), ...trail(3, 0.3, -60, 100),
        gap(38, 0.55, 100), charged(0.68), gap(38, 0.5, -100), gap(36, 0.5, 20), bar(0.4),
        ...snake(4, 36, 0.5, 100, -100), mint(0.3, -150), gold(0.38, -90), bar(0.3),
        tunnel(36, 300, 0.45, -90), gold(0.38, -90), charged(0.45), gap(36, 0.5, 60), gold(0.38, 50),
        ...zig(3, 36, 0.5, 100, -1), bar(0.32), gold(0.38, 90), gold(0.35, 0),
      ],
    },
    {
      id: 's12-the-final-pulse', name: 'The Final Pulse', world: W3,
      intro: 'A big one. Everything you know, at full speed. Breathe when the gold comes.',
      teaches: 'Climax: a build-up, a recovery, then a final gauntlet of every mechanic.',
      profile: 'The finale: a build-up, one breather of gold, then the densest gauntlet in the game.',
      speed: { start: 375, end: 440 }, exit: { type: 'finish', runout: 420 },
      pace: 0.42, grid: 0.25, spread: 0.4,
      items: [
        // Build-up
        gap(42, 0.8, 0), bar(0.4), on(breathe(40, 0.5, 60, 26, 4, 0), 0.5), gold(0.36, 60), charged(0.68),
        on(slide(38, 0.5, 0, 56, 6, 0.25), 0.5), gap(38, 0.5, -90), bar(0.36), gap(38, 0.5, 90), gold(0.36, 80),
        // Recovery
        wide(0.5, 0), ...trail(5, 0.3, 80, -100), gold(0.3, 0),
        // Final gauntlet
        gap(36, 0.55, -100), bar(0.34), ...zig(2, 36, 0.5, 100), charged(0.66),
        on(breathe(34, 0.45, 0, 24, 4, 0), 0.5), gap(34, 0.45, 80), mint(0.3, 150), gap(34, 0.5, -60), gold(0.36, -50),
        bar(0.3), tunnel(34, 340, 0.4, -50), gold(0.36, -50), charged(0.4),
        ...snake(4, 34, 0.45, 100, -100), bar(0.34), ...zig(3, 34, 0.45, 100, -1), gold(0.36, 90),
        // Finale
        charged(0.6), ...trail(3, 0.3, 60, -60),
      ],
    },

    // ---------------- World 2 (continued) · Chromatic Overdrive: mastery through variation (docs/CAMPAIGN_30.md) ----------------
    {
      id: 's13-prism-sway', name: 'Prism Sway', world: W2,
      intro: 'Gates that sway in opposite directions. Follow the notes through the gap.',
      teaches: 'Counter-sway: two moving gates swaying in opposite directions, read by their phase; gold follows the gap.',
      profile: 'Calm speed, busy eyes: pairs of swaying gates that open where the last one closed.',
      speed: { start: 360, end: 405 }, exit: RUNOUT,
      pace: 0.5, grid: 0.25, spread: 0.6,
      hints: [{ from: 0.4, to: 4.5, title: 'TWO GATES, OPPOSITE WAYS.', sub: 'THE NOTES SHOW THE GAP' }],
      items: [
        wide(1.0, 0), gold(0.45, 0), gold(0.4, 60),
        on(slide(52, 0.7, 0, 60, 6, 0.25), 0.5), gold(0.45, 0), bar(0.55), gold(0.4, -60),
        on(slide(50, 0.6, -40, 60, 6, 0.25), 0.5), on(slide(50, 0.6, 40, 60, 6, 0.75), 0.5), gold(0.45, 0), wide(0.5, 0),
        gold(0.4, 80), gold(0.4, -80), mint(0.35, 150),
        on(slide(48, 0.6, 0, 70, 6, 0.75), 0.5), bar(0.5), on(slide(48, 0.6, 0, 70, 6, 0.25), 0.5), gold(0.45, 0), gold(0.4, -70),
        gap(46, 0.55, -80), on(slide(46, 0.55, 40, 60, 6, 0.25), 0.5), on(slide(46, 0.85, -40, 60, 6, 0.75), 0.5), gold(0.45, 0),
        wide(0.5, 0), gold(0.4, 70), bar(0.5), gold(0.4, -70),
        on(slide(46, 0.55, -50, 70, 6, 0.25), 0.5), on(slide(46, 0.55, 50, 70, 6, 0.75), 0.5), bar(0.5), mint(0.35, -150), gold(0.4, 0),
        on(slide(46, 0.55, 0, 70, 6, 0.75), 0.5), gold(0.4, 70), gap(46, 0.55, 90), gold(0.4, 40), bar(0.5), gold(0.4, -40),
        on(slide(44, 0.55, -40, 60, 6, 0.25), 0.5), on(slide(44, 0.55, 40, 60, 6, 0.75), 0.5), gold(0.45, 0), wide(0.5, 0), gold(0.4, 0),
        // Second half: the same two ideas, closer together, with a mint at the far end of the sway.
        gap(46, 0.6, 80), gold(0.4, 70), on(slide(44, 0.6, -30, 70, 6, 0.75), 0.5), on(slide(44, 0.85, 30, 70, 6, 0.25), 0.5), gold(0.45, 0), bar(0.5), gold(0.4, 40),
        mint(0.35, -150), on(slide(44, 0.6, 0, 80, 6, 0.25), 0.5), gold(0.4, 0), wide(0.5, 0), gold(0.4, -70),
        on(slide(44, 0.6, 50, 70, 6, 0.75), 0.5), on(slide(44, 0.85, -50, 70, 6, 0.25), 0.5), bar(0.5), gold(0.4, 0), gold(0.4, 60),
        on(slide(44, 0.6, 0, 80, 6, 0.75), 0.5), gold(0.4, 0), bar(0.5), gold(0.4, -60),
      ],
    },
    {
      id: 's14-safe-or-sorry', name: 'Safe or Sorry', world: W2,
      intro: 'Two forks, and the risky lanes are longer. Take them for the notes, or stay safe.',
      teaches: 'Route economy: long risk lanes full of notes that charge Overdrive, short wide safe lanes. Stars never depend on the route.',
      profile: 'Forks you can read from far away: a short fork, then a long one, each paying more for the longer way.',
      speed: { start: 370, end: 415 }, exit: RUNOUT,
      pace: 0.5, grid: 0.25, spread: 0.6,
      routeHints: { 's14-a': { title: 'THE LANE SPLITS', sub: 'LEFT SAFE · RIGHT RISKY (MORE NOTES)' }, 's14-b': { title: 'A LONG FORK', sub: 'LEFT RISKY (MANY NOTES) · RIGHT SAFE' } },
      items: [
        gap(48, 0.9, 90), gold(0.4, 80), gold(0.4, 20), bar(0.5), gold(0.4, -50),
        wide(0.7, 0),
        forkRow('s14-a', 'R', 0.9, [72, -135], [48, 150]), routeNote('s14-a', 'risk', 0.35, 150),
        forkRow('s14-a', 'R', 0.5, [72, -135], [48, 120]), routeNote('s14-a', 'risk', 0.35, 135), routeNote('s14-a', 'safe', 0.1, -135),
        forkRow('s14-a', 'R', 0.5, [72, -135], [46, 170]), routeNote('s14-a', 'risk', 0.35, 160),
        forkRow('s14-a', 'R', 0.5, [72, -135], [46, 130], true),
        gold(0.4, 100), bar(0.5), gold(0.4, 40), ...snake(3, 46, 0.5, 90, -90), gold(0.4, -80), gold(0.4, -20),
        bar(0.5), gap(46, 0.55, 60), gold(0.4, 60), on(breathe(42, 0.55, -40, 26, 4, 0), 0.5), gold(0.4, -40),
        wide(0.7, 0),
        forkRow('s14-b', 'L', 0.9, [44, -150], [70, 130]), routeNote('s14-b', 'risk', 0.35, -140),
        forkRow('s14-b', 'L', 0.5, [44, -110], [70, 150]), routeNote('s14-b', 'risk', 0.35, -130),
        forkRow('s14-b', 'L', 0.5, [44, -160], [70, 120]), routeNote('s14-b', 'risk', 0.35, -140), routeNote('s14-b', 'safe', 0.1, 135),
        forkRow('s14-b', 'L', 0.5, [42, -115], [70, 150]), routeNote('s14-b', 'risk', 0.35, -130),
        forkRow('s14-b', 'L', 0.5, [42, -150], [70, 120]), routeNote('s14-b', 'risk', 0.35, -140),
        forkRow('s14-b', 'L', 0.5, [42, -120], [70, 140], true),
        bar(0.5), gold(0.4, 90), gold(0.4, 20), gap(46, 0.5, -60), gold(0.4, -60), bar(0.45), gold(0.4, 0),
      ],
    },
    {
      id: 's15-bend', name: 'Bend', world: W2,
      intro: 'Keep holding through the long gaps, and steer while you hold.',
      teaches: 'Bent tunnels: chains of long gaps at shifting positions, each chain closed by a charged barrier.',
      profile: 'Long holds that curve: three tunnels, each shifted from the last, then a charged barrier to smash.',
      speed: { start: 375, end: 420 }, exit: RUNOUT,
      pace: 0.5, grid: 0.25, spread: 0.6,
      hints: [{ from: 0.4, to: 4.5, title: 'HOLD AND BEND.', sub: 'STEER WHILE SHRUNK  ·  THEN LET GO' }],
      items: [
        wide(1.0, 0), gold(0.4, 0), gap(48, 0.6, -70), gold(0.4, -60),
        tunnel(46, 280, 0.7, -60), gold(0.4, -60), gap(46, 0.6, 60), gold(0.4, 60),
        tunnel(46, 280, 0.6, 60), gold(0.4, 60), bar(0.6), gold(0.4, 0),
        gap(46, 0.55, 80), tunnel(44, 300, 0.55, 80), gold(0.4, 70), gap(44, 0.55, -70), tunnel(44, 300, 0.55, -70), gold(0.4, -70),
        charged(0.8), gold(0.4, 0), wide(0.5, 0), gold(0.4, 80),
        gap(44, 0.55, -90), gold(0.4, -80), tunnel(44, 260, 0.55, -90), gold(0.4, -90), gap(44, 0.55, 20), tunnel(44, 260, 0.55, 20), gold(0.4, 20),
        gap(44, 0.55, 90), tunnel(42, 300, 0.55, 90), gold(0.4, 90), charged(0.8), gold(0.4, 0),
        ...zig(2, 44, 0.55, 90), bar(0.5), gold(0.4, 80), gold(0.4, 0),
        tunnel(42, 320, 0.6, -60), gold(0.4, -60), gap(42, 0.55, 70), tunnel(42, 320, 0.55, 70), gold(0.4, 70), charged(0.8), gold(0.4, 0), gold(0.4, -60),
      ],
    },
    {
      id: 's16-echo-chamber', name: 'Echo Chamber', world: W2,
      intro: 'Your echo mirrors you, three times, each a little harder. Find a gap for both.',
      teaches: 'Mirror Pulse mastery: a gentle zone of barriers and centred gates, a zone with a centre pinch, and a weave of pairs. Provisional until phone-tested.',
      profile: 'Three echoes, each longer and tighter than the last, with a clear road between them.',
      speed: { start: 380, end: 425 }, exit: RUNOUT,
      pace: 0.45, grid: 0.25, spread: 0.5,
      mirrorHints: {
        's16-m1': { title: 'MIRROR PULSE', sub: 'YOUR ECHO MIRRORS YOU · BARRIERS HIT BOTH' },
        's16-m2': { title: 'THE ECHO RETURNS', sub: 'MEET IN THE MIDDLE · OR TAKE A SIDE' },
        's16-m3': { title: 'LAST ECHO', sub: 'TWO ORBS · ONE FINGER' },
      },
      items: [
        wide(1.0, 0), gold(0.4, 0), gap(46, 0.6, -80), gold(0.4, -70), bar(0.55), gold(0.4, 60), ...zig(2, 46, 0.55, 80), gold(0.4, 0),
        ...mirrorZone('s16-m1', [mgate(78, 0.9, 140), bar(0.6), mgate(74, 0.55, 120), mint(0.35, 130), wide(0.5, 0), mgate(70, 0.55, 140)]),
        gold(0.4, 0), bar(0.5), gap(44, 0.5, -90), gold(0.4, -80), gap(44, 0.5, 20), gold(0.4, 20), gap(44, 0.5, 100), gold(0.4, 90), bar(0.45), gold(0.4, -40),
        gap(44, 0.5, -60), gold(0.4, -60), ...zig(2, 44, 0.5, 90), bar(0.45), gold(0.4, 80), gap(44, 0.5, 60),
        ...mirrorZone('s16-m2', [mgate(60, 0.9, 140), mgate(58, 0.5, 100), wide(0.5, 0), mgate(56, 0.5, 150), bar(0.55), mgate(54, 0.5, 110), mint(0.35, 110)]),
        gold(0.4, 0), bar(0.5), gap(44, 0.5, 90), gold(0.4, 80), gap(44, 0.5, -80), gold(0.4, -70), gap(44, 0.5, 40), bar(0.45), gold(0.4, 0),
        gap(44, 0.5, -90), gold(0.4, -80), gap(44, 0.5, 70), gold(0.4, 60), ...zig(2, 44, 0.5, 100, -1), gold(0.4, 90), bar(0.4), gold(0.4, -30),
        ...mirrorZone('s16-m3', [mgate(54, 0.9, 150), mgate(52, 0.5, 100), mgate(50, 0.5, 160), bar(0.55), mgate(48, 0.55, 120), mint(0.35, 120), mgate(48, 0.5, 150), gap(58, 0.5, 0)]),
        bar(0.45), gold(0.4, 0), gold(0.4, 60),
      ],
    },
    {
      id: 's17-charge-chain', name: 'Charge Chain', world: W2,
      intro: 'Barriers that need a full ring, one after another. Stay big while the ring fills.',
      teaches: 'Charge management: chains of two or three charged barriers separated by short windows, with notes that reward staying big.',
      profile: 'Heavy and rhythmic: chains of charged barriers with narrow gaps in between to shrink through.',
      speed: { start: 385, end: 430 }, exit: RUNOUT,
      pace: 0.45, grid: 0.25, spread: 0.5,
      hints: [{ from: 0.4, to: 4.5, title: 'CHAIN THE CHARGES.', sub: 'STAY BIG  ·  LET THE RING CLOSE' }],
      items: [
        wide(1.0, 0), gold(0.4, 0), gap(46, 0.6, 70), gold(0.4, 60), charged(0.9), gold(0.4, 0),
        gap(44, 0.55, -80), gold(0.4, -70), charged(0.8), gold(0.45, 40), charged(0.7), gold(0.4, 0),
        ...zig(2, 44, 0.55, 90), gold(0.4, 80), bar(0.5), gold(0.4, 0),
        charged(0.8), gold(0.4, -60), charged(0.65), gold(0.4, 60), bar(0.5), gold(0.4, 0), gap(42, 0.55, -70), gold(0.4, -60),
        wide(0.5, 0), gold(0.4, 70), gold(0.4, -70), mint(0.35, 150),
        charged(0.8), gold(0.4, 0), charged(0.65), gold(0.4, 0), charged(0.65), gold(0.4, 60), gap(42, 0.55, 90), gold(0.4, 80),
        gap(42, 0.55, -90), gold(0.4, -80), bar(0.5), gold(0.4, 0), on(breathe(42, 0.55, 0, 26, 4, 0), 0.5), gold(0.4, 0),
        charged(0.8), gold(0.4, -50), charged(0.65), gold(0.4, 50), gap(42, 0.55, 0), gold(0.4, 0), charged(0.8), gold(0.4, 0), gold(0.4, 60),
      ],
    },
    {
      id: 's18-mint-rush', name: 'Mint Rush', world: W2,
      intro: 'Trails of mint notes on the beat. Chain them for a big streak. The gold is on the safe line.',
      teaches: 'Groove: mint trails across the lane, gates and barriers to keep a streak, Overdrive from a clean run. Gold stays on the safe line.',
      profile: 'The rhythm stage: long mint trails and an easy gold line; a hard-to-perfect, easy-to-finish run.',
      speed: { start: 385, end: 430 }, exit: RUNOUT,
      pace: 0.5, grid: 0.25, spread: 0.6,
      hints: [{ from: 0.4, to: 4.5, title: 'RIDE THE GROOVE.', sub: 'TRAILS OF MINT  ·  KEEP THE STREAK' }],
      items: [
        wide(1.0, 0), gold(0.4, 0), ...trail(4, 0.3, -80, 80, mint), gold(0.4, 80),
        gap(46, 0.55, -70), gold(0.4, -60), ...trail(4, 0.3, -60, 100, mint), bar(0.5), gold(0.4, 0),
        gap(46, 0.55, 80), gold(0.4, 70), ...trail(4, 0.3, 90, -90, mint), gap(46, 0.55, -90), gold(0.4, -80),
        wide(0.5, 0), ...trail(5, 0.3, -100, 100, mint), gold(0.4, 90), bar(0.5), gold(0.4, 0),
        on(slide(46, 0.55, 0, 60, 6, 0.25), 0.5), gold(0.4, 0), ...trail(4, 0.3, 80, -80, mint), gold(0.4, -70), bar(0.5),
        gap(44, 0.55, 90), gold(0.4, 80), ...trail(4, 0.3, 80, -100, mint), gap(44, 0.55, -90), gold(0.4, -80), gold(0.4, 0),
        charged(0.8), ...trail(4, 0.3, -60, 80, mint), gold(0.4, 80), bar(0.5), gold(0.4, 0),
        ...zig(3, 44, 0.55, 90), gold(0.4, 80), ...trail(5, 0.3, 90, -90, mint), gold(0.4, -80), gold(0.4, 0),
      ],
    },

    // ---------------- Batch 2 · stages 19-24 (docs/CAMPAIGN_30.md). Stage 20 closes arc 2; 21 opens arc 3. ----------------
    {
      id: 's19-off-beat', name: 'Off-Beat', world: W2,
      intro: 'Gate, gate, barrier. The phrase repeats once, then it breaks. Feel the beat, not the position.',
      teaches: 'Syncopation: call-and-response phrases (gate, gate, barrier) whose second half lands off the beat; each phrase repeats once before it varies.',
      profile: 'Call and response: three-beat phrases that repeat, then break the pattern, with sways and breathing gates on the off-beats.',
      speed: { start: 390, end: 430 }, exit: RUNOUT,
      pace: 0.5, grid: 0.25, spread: 0.6,
      hints: [{ from: 0.4, to: 4.5, title: 'GATE, GATE, BARRIER.', sub: 'THE PHRASE REPEATS  ·  THEN IT BREAKS' }],
      items: [
        wide(1.0, 0), gold(0.4, 0),
        // Phrase A, called and answered
        gap(46, 0.6, -80), gold(0.4, -70), gap(46, 0.55, 80), gold(0.4, 70), bar(0.5), gold(0.4, 0),
        gap(46, 0.6, -80), gold(0.4, -70), gap(46, 0.55, 80), gold(0.4, 70), bar(0.5), gold(0.4, 0),
        // The break: the barrier comes first
        bar(0.6), gap(46, 0.55, -70), gold(0.4, -60), gap(46, 0.55, 70), gold(0.4, 60), wide(0.5, 0), gold(0.4, 0),
        // Phrase B on the off-beat, with a sway
        on(slide(46, 0.6, 0, 60, 6, 0.25), 0.5), gold(0.4, 0), gap(44, 0.55, -90), gold(0.4, -80), bar(0.5), gold(0.4, 0),
        on(slide(46, 0.6, 0, 60, 6, 0.25), 0.5), gold(0.4, 0), gap(44, 0.55, 90), gold(0.4, 80), bar(0.5), gold(0.4, 0),
        // Break: the breathing gate replaces the second gap
        on(slide(46, 0.6, 0, 60, 6, 0.25), 0.5), gold(0.4, 0), on(breathe(42, 0.55, 40, 26, 4, 0), 0.5), gold(0.4, 40), bar(0.5), gold(0.4, 0),
        wide(0.5, 0), mint(0.35, 150), gold(0.4, 0),
        // Phrase C, tighter
        gap(44, 0.55, -90), gold(0.4, -80), gap(44, 0.5, 90), gold(0.4, 80), bar(0.5), gold(0.4, 0),
        gap(44, 0.55, -90), gold(0.4, -80), gap(44, 0.5, 90), gold(0.4, 80), bar(0.5), gold(0.4, 0),
        gap(44, 0.55, 80), gold(0.4, 70), bar(0.5), gap(44, 0.5, -80), gold(0.4, -70), charged(0.7), gold(0.4, 0),
        on(slide(44, 0.6, 0, 70, 6, 0.75), 0.5), gold(0.4, 0), gap(44, 0.5, -70), gold(0.4, -60), bar(0.45), gold(0.4, 0), gold(0.4, 60),
      ],
    },
    {
      id: 's20-chromatic-overload', name: 'Chromatic Overload', world: W3,
      intro: 'Four movements: sway, echo, charge, fork. Everything you learned in this world.',
      teaches: 'World finale: counter-sway, one Mirror Pulse zone, a charge chain with a tunnel, and a last fork that rewards the long way.',
      profile: 'The arc finale: four movements with a gold recovery between each, ending in a fork and a runout.',
      speed: { start: 395, end: 430 }, exit: { type: 'finish', runout: 420 }, // capped at 430 px/s: a Mirror Pulse telegraph (560 px) must last 1.3 s
      pace: 0.45, grid: 0.25, spread: 0.5,
      mirrorHints: { 's20-m1': { title: 'THE ECHO RETURNS', sub: 'TWO ORBS · ONE FINGER' } },
      routeHints: { 's20-f': { title: 'THE LAST FORK', sub: 'LEFT SAFE · RIGHT RISKY (A TRAIL OF MINT)' } },
      items: [
        // I. Sway
        wide(1.0, 0), gold(0.4, 0),
        on(slide(46, 0.6, -40, 60, 6, 0.25), 0.5), on(slide(46, 0.6, 40, 60, 6, 0.75), 0.5), gold(0.45, 0), bar(0.5),
        on(slide(44, 0.55, -40, 60, 6, 0.75), 0.5), on(slide(44, 0.85, 40, 60, 6, 0.25), 0.5), gold(0.45, 0), gap(44, 0.5, 80), gold(0.4, 70),
        on(slide(44, 0.6, 0, 70, 6, 0.25), 0.5), bar(0.5), gold(0.4, 0), gap(44, 0.5, -90), gold(0.4, -80), bar(0.5),
        on(slide(44, 0.6, 40, 60, 6, 0.75), 0.5), on(slide(44, 0.85, -40, 60, 6, 0.25), 0.5), gold(0.45, 0), gap(44, 0.5, 90), gold(0.4, 80),
        wide(0.5, 0), gold(0.4, -60), gold(0.4, 60),
        // II. Echo
        ...mirrorZone('s20-m1', [mgate(70, 1.0, 140), bar(0.55), mgate(62, 0.5, 120), mint(0.35, 120), wide(0.5, 0), mgate(58, 0.5, 140), gap(60, 0.5, 0)]),
        gold(0.4, 0), gold(0.4, 70), bar(0.5), gold(0.4, -70),
        // III. Charge chain with a tunnel
        gap(44, 0.55, -80), gold(0.4, -70), charged(0.8), gold(0.4, 0), tunnel(44, 280, 0.55, 70), gold(0.4, 70),
        charged(0.8), gold(0.4, 0), gap(42, 0.5, -80), charged(0.7), gold(0.4, -60), bar(0.5), gold(0.4, 0),
        tunnel(42, 300, 0.55, -70), gold(0.4, -70), gap(42, 0.5, 80), charged(0.75), gold(0.4, 60), bar(0.5), gold(0.4, 0), wide(0.5, 0), gold(0.4, 70), gold(0.4, -70),
        // IV. The last fork: left safe, right risky
        wide(0.6, 0),
        forkRow('s20-f', 'R', 0.9, [72, -135], [44, 150]), routeNote('s20-f', 'risk', 0.35, 150),
        forkRow('s20-f', 'R', 0.5, [72, -135], [44, 120]), routeNote('s20-f', 'risk', 0.35, 130), routeNote('s20-f', 'safe', 0.1, -135),
        forkRow('s20-f', 'R', 0.5, [72, -135], [42, 160]), routeNote('s20-f', 'risk', 0.35, 150),
        forkRow('s20-f', 'R', 0.5, [72, -135], [42, 125], true),
        gold(0.4, 90), bar(0.5), gold(0.4, 0), charged(0.8), gold(0.4, -60), gold(0.4, 60), gold(0.3, 0),
      ],
    },

    // ---------------- Arc 3 · Pulse Collapse: precision and sequencing ----------------
    {
      id: 's21-static', name: 'Static', world: W3,
      intro: 'Narrow gaps, one after another. Shrink late, grow early. A wide gate every four.',
      teaches: 'Precision weave: a slalom of narrow gates (half-width 38-40) with a wide recovery gate after every four; gold sits between the narrow gates.',
      profile: 'A quiet slalom: tight gates spaced out, a wide breather after each four, gold between the squeezes.',
      speed: { start: 380, end: 425 }, exit: RUNOUT,
      pace: 0.55, grid: 0.25, spread: 0.6,
      hints: [{ from: 0.4, to: 4.5, title: 'SHRINK LATE, GROW EARLY.', sub: 'GOLD SITS BETWEEN THE SQUEEZES' }],
      items: [
        wide(1.0, 0), gold(0.4, 0),
        gap(40, 0.7, -80), gold(0.45, -70), gap(40, 0.65, 80), gold(0.45, 70), gap(40, 0.65, -80), gold(0.45, -70), gap(40, 0.65, 80), gold(0.45, 70), wide(0.6, 0), mint(0.35, 150),
        gap(40, 0.65, 90), gold(0.45, 80), gap(40, 0.65, -90), gold(0.45, -80), gap(40, 0.65, 40), gold(0.45, 40), gap(40, 0.65, -40), gold(0.45, -40), wide(0.6, 0), gold(0.4, 0),
        gap(38, 0.65, -90), gold(0.45, -80), gap(38, 0.65, 90), gold(0.45, 80), bar(0.55), gap(38, 0.65, -60), gold(0.45, -60), gap(38, 0.65, 60), gold(0.45, 60), wide(0.6, 0), mint(0.35, -150),
        gap(38, 0.65, 80), gold(0.45, 70), gap(38, 0.65, -80), gold(0.45, -70), gap(38, 0.65, 0), gold(0.45, 0), gap(38, 0.65, 90), gold(0.45, 80), wide(0.6, 0), gold(0.4, -40),
        gap(38, 0.65, -90), gold(0.45, -80), gap(38, 0.65, 90), gold(0.45, 80), gap(38, 0.65, -90), gold(0.45, -80), bar(0.55), gap(38, 0.65, 90), gold(0.45, 80), wide(0.6, 0), gold(0.4, 0),
        gap(38, 0.65, 0), gold(0.45, 0), gap(38, 0.65, -80), gold(0.45, -70), gap(38, 0.65, 80), gold(0.45, 70), gap(38, 0.65, 0), gold(0.45, 0), wide(0.6, 0), gold(0.4, 60), gold(0.4, -60),
      ],
    },
    {
      id: 's22-fracture', name: 'Fracture', world: W3,
      intro: 'Every fork has two prices. The left is tight; the right is wide but makes you travel.',
      teaches: 'Two different costs: forks whose tight lane needs a small orb and whose wide lane asks for a long sideways move; mint on both lanes.',
      profile: 'Three forks, no free lane: squeeze through the left or swing across the right, with mint waiting on both.',
      speed: { start: 385, end: 430 }, exit: RUNOUT,
      pace: 0.5, grid: 0.25, spread: 0.6,
      routeHints: {
        's22-a': { title: 'TWO PRICES', sub: 'LEFT TIGHT · RIGHT WIDE, FAR OVER' },
        's22-b': { title: 'AGAIN, REVERSED', sub: 'RIGHT TIGHT · LEFT WIDE, FAR OVER' },
        's22-c': { title: 'ONE MORE', sub: 'TIGHT, OR FAR' },
      },
      items: [
        wide(1.0, 0), gold(0.4, 0), gap(46, 0.6, 80), gold(0.4, 70), bar(0.5), gold(0.4, -40),
        wide(0.7, 0),
        forkRow('s22-a', 'L', 0.9, [40, -90], [76, 150]), routeNote('s22-a', 'risk', 0.35, -90), routeNote('s22-a', 'safe', 0.1, 150),
        forkRow('s22-a', 'L', 0.5, [40, -120], [76, 140]), routeNote('s22-a', 'risk', 0.35, -120),
        forkRow('s22-a', 'L', 0.5, [40, -80], [76, 160]), routeNote('s22-a', 'risk', 0.35, -80), routeNote('s22-a', 'safe', 0.1, 160),
        forkRow('s22-a', 'L', 0.5, [40, -110], [76, 140], true),
        gold(0.4, 80), bar(0.5), gold(0.4, 0), gap(44, 0.55, -80), gold(0.4, -70), gap(44, 0.55, 80), gold(0.4, 70),
        wide(0.7, 0),
        forkRow('s22-b', 'R', 0.9, [76, -150], [40, 90]), routeNote('s22-b', 'risk', 0.35, 90), routeNote('s22-b', 'safe', 0.1, -150),
        forkRow('s22-b', 'R', 0.5, [76, -140], [40, 120]), routeNote('s22-b', 'risk', 0.35, 120),
        forkRow('s22-b', 'R', 0.5, [76, -160], [40, 80]), routeNote('s22-b', 'risk', 0.35, 80), routeNote('s22-b', 'safe', 0.1, -160),
        forkRow('s22-b', 'R', 0.5, [76, -140], [40, 110], true),
        gold(0.4, -80), bar(0.5), gold(0.4, 0), charged(0.8), gold(0.4, 60), gap(44, 0.55, -70), gold(0.4, -60),
        wide(0.7, 0),
        forkRow('s22-c', 'L', 0.9, [38, -100], [76, 150]), routeNote('s22-c', 'risk', 0.35, -100),
        forkRow('s22-c', 'L', 0.5, [38, -80], [76, 160]), routeNote('s22-c', 'risk', 0.35, -80), routeNote('s22-c', 'safe', 0.1, 160),
        forkRow('s22-c', 'L', 0.5, [38, -120], [76, 140]), routeNote('s22-c', 'risk', 0.35, -120),
        forkRow('s22-c', 'L', 0.5, [38, -90], [76, 150], true),
        gold(0.4, 70), bar(0.5), gold(0.4, 0), gold(0.4, -60),
      ],
    },
    {
      id: 's23-feedback', name: 'Feedback', world: W3,
      intro: 'Two echoes, and a barrier rhythm between them. Stay calm while the echo is out.',
      teaches: 'Mirror Pulse under pressure: two zones with a barrier cadence between them; the second has a centre pinch both orbs pass.',
      profile: 'Echo, cadence, echo: a barrier rhythm between two mirror zones, the second ending in a centre pinch.',
      speed: { start: 390, end: 430 }, exit: RUNOUT, // 430 px/s keeps the 560 px mirror telegraph at 1.3 s
      pace: 0.45, grid: 0.25, spread: 0.5,
      mirrorHints: {
        's23-m1': { title: 'THE ECHO IS BACK', sub: 'BARRIERS HIT BOTH · KEEP A FULL RING' },
        's23-m2': { title: 'MEET IN THE MIDDLE', sub: 'A CENTRE GAP FOR BOTH ORBS' },
      },
      items: [
        wide(1.0, 0), gold(0.4, 0), gap(46, 0.6, 80), gold(0.4, 70), bar(0.55), gold(0.4, -60), gap(46, 0.55, -80), gold(0.4, -70),
        ...mirrorZone('s23-m1', [mgate(66, 1.0, 140), bar(0.55), mgate(60, 0.5, 120), mint(0.35, 120), bar(0.5), mgate(56, 0.5, 150), mint(0.3, 140), wide(0.5, 0)]),
        gold(0.4, 0), gold(0.4, 70), bar(0.5), gold(0.4, -70), bar(0.5), gold(0.4, 0), charged(0.8), gold(0.4, 60), bar(0.5), gold(0.4, -60), gap(44, 0.55, 0), gold(0.4, 0),
        ...mirrorZone('s23-m2', [mgate(58, 1.0, 140), bar(0.55), mgate(54, 0.5, 110), mint(0.35, 110), mgate(52, 0.5, 150), bar(0.5), gap(56, 0.55, 0), mint(0.3, 0)]),
        gold(0.4, 0), bar(0.5), gold(0.4, 80), gold(0.4, -80), gap(44, 0.55, 70), gold(0.4, 60), bar(0.5), gold(0.4, 0),
      ],
    },
    {
      id: 's24-cascade', name: 'Cascade', world: W3,
      intro: 'A long unbroken stream. Four phrases, each ends in a trail of gold. Keep your rhythm.',
      teaches: 'Endurance: four long phrases of alternating gaps and barriers with a gold-only recovery trail between them.',
      profile: 'Stamina: four back-to-back phrases of eight to ten walls, each followed by a clear trail of gold.',
      speed: { start: 395, end: 440 }, exit: RUNOUT,
      pace: 0.5, grid: 0.25, spread: 0.6,
      hints: [{ from: 0.4, to: 4.5, title: 'FOUR PHRASES.', sub: 'KEEP THE RHYTHM  ·  GOLD AT THE END OF EACH' }],
      items: [
        wide(1.0, 0), gold(0.4, 0),
        // Phrase 1
        gap(46, 0.6, -80), bar(0.5), gap(46, 0.55, 80), bar(0.5), gap(46, 0.55, -80), bar(0.5), gap(46, 0.55, 80), bar(0.5), gap(44, 0.55, 0), gold(0.45, 0), bar(0.5),
        wide(0.5, 0), ...trail(4, 0.3, 80, -80, gold), gold(0.35, 0),
        // Phrase 2
        gap(44, 0.6, 90), bar(0.5), gap(44, 0.55, -90), bar(0.5), gap(44, 0.55, 60), bar(0.5), on(breathe(42, 0.55, -40, 26, 4, 0), 0.5), bar(0.5), gap(44, 0.55, 80), gold(0.45, 70), bar(0.5), gap(44, 0.5, -80), gold(0.4, -70),
        wide(0.5, 0), ...trail(4, 0.3, -80, 80, gold), gold(0.35, 0),
        // Phrase 3
        gap(42, 0.6, -90), bar(0.5), gap(42, 0.55, 90), charged(0.7), gap(42, 0.55, -60), bar(0.5), gap(42, 0.55, 60), bar(0.5), gap(42, 0.55, -90), gold(0.45, -80), bar(0.5), gap(42, 0.5, 90), gold(0.4, 80), bar(0.5),
        wide(0.5, 0), mint(0.3, 150), ...trail(4, 0.3, 80, -80, gold), gold(0.35, 0),
        // Phrase 4
        gap(42, 0.6, 80), bar(0.5), gap(42, 0.55, -80), bar(0.5), on(breathe(40, 0.55, 40, 26, 4, 0), 0.5), charged(0.7), gap(42, 0.55, -70), bar(0.5), gap(42, 0.55, 70), bar(0.5), gap(42, 0.5, -80), gold(0.45, -70), bar(0.5), gap(42, 0.5, 80), gold(0.4, 70),
        wide(0.5, 0), ...trail(4, 0.3, -80, 80, gold), gold(0.35, 0),
      ],
    },

    // ---------------- Batch 3 · stages 25-30 (docs/CAMPAIGN_30.md). Arc 3 closes with 30, the campaign finale. ----------------
    {
      id: 's25-narrow-margin', name: 'Narrow Margin', world: W3,
      intro: 'The smallest gaps in the game, with time to line up. Gold sits right on the line.',
      teaches: 'Precision peak: the narrowest gaps the game allows (half-width 34-36) and two long tunnels at 34, one narrow gate and one barrier per phrase, gold exactly on the line.',
      profile: 'Spare and exact: one very narrow gate per phrase, a barrier, a breath. Slow enough to aim, so a loose line loses gold.',
      speed: { start: 400, end: 440 }, exit: RUNOUT,
      pace: 1.0, grid: 0.25, spread: 0.9,
      hints: [{ from: 0.4, to: 4.5, title: 'THE SMALLEST GAP.', sub: 'LINE UP EARLY  ·  THE GOLD IS ON THE LINE' }],
      items: [
        wide(1.0, 0), gold(0.4, 0),
        gap(36, 0.9, -70), gold(0.5, -70), bar(0.8), mint(0.4, 150), gold(0.45, 30),
        gap(35, 0.9, 80), gold(0.5, 80), bar(0.8), wide(0.6, 0),
        gap(34, 0.9, -90), gold(0.5, -90), bar(0.8), mint(0.4, 150), gold(0.45, 0),
        gap(36, 0.9, 60), tunnel(34, 260, 0.75, 60), gold(0.5, 60), bar(0.8), wide(0.6, 0),
        gap(34, 0.9, -80), gold(0.5, -80), bar(0.8), mint(0.4, 150), gold(0.45, 40),
        gap(35, 0.9, 90), gold(0.5, 90), bar(0.8), wide(0.6, 0),
        gap(34, 0.9, -60), tunnel(34, 280, 0.75, -60), gold(0.5, -60), bar(0.8), mint(0.4, -150), gold(0.45, 60),
        gap(35, 0.9, -80), gold(0.5, -80), bar(0.8), mint(0.4, 150), wide(0.6, 0),
        gap(34, 0.9, 70), gold(0.5, 70), bar(0.8), gold(0.45, 0), gold(0.4, -60),
      ],
    },
    {
      id: 's26-counterpoint', name: 'Counterpoint', world: W3,
      intro: 'Three swaying gates in a row, each a step behind the last. Ride the wave.',
      teaches: 'Triple sway: waves of three swaying gates with staggered phases (a travelling wave), gold on the wave\'s path, and a charged barrier between waves.',
      profile: 'A rolling sea: seven waves of three swaying gates, a charged barrier to break each one, gold riding the crest.',
      speed: { start: 410, end: 450 }, exit: RUNOUT,
      pace: 0.7, grid: 0.25, spread: 0.9,
      hints: [{ from: 0.4, to: 4.5, title: 'RIDE THE WAVE.', sub: 'EACH GATE A STEP BEHIND  ·  FOLLOW THE GOLD' }],
      items: [
        wide(1.0, 0), gold(0.4, 0),
        ...wave(3, 48, 0.7, 0, 50, 6, 0.0, 1 / 6), charged(0.9), gold(0.4, 0),
        ...wave(3, 48, 0.6, 0, 60, 6, 0.5, -1 / 6), charged(0.8), gold(0.4, -50),
        ...wave(3, 48, 0.6, 0, 60, 6, 0.75, 1 / 6), charged(0.8), gold(0.4, 40),
        ...wave(3, 48, 0.6, 0, 70, 7, 0.25, 1 / 7), charged(0.8), mint(0.35, -150), gold(0.4, 0),
        ...wave(3, 48, 0.6, 0, 70, 6, 0.0, -1 / 6), charged(0.75), gold(0.4, 60),
        ...wave(3, 50, 0.6, 0, 80, 8, 0.5, 1 / 8), charged(0.75), gold(0.4, -40),
        ...wave(3, 50, 0.6, 0, 80, 8, 0.25, -1 / 4), charged(0.75), gold(0.4, 0), gold(0.4, 60),
      ],
    },
    {
      id: 's27-convergence', name: 'Convergence', world: W3,
      intro: 'Your echo and you, drawn together. The openings close in toward the middle, one gap for both.',
      teaches: 'Mirror Pulse pinch: mirrored pairs that converge on the centre, a centred gap both orbs pass through, then diverge; barriers between the zones.',
      profile: 'Three echoes that fold inward: pairs closing on the centre, a pinch, then opening out again, with a barrier cadence between.',
      speed: { start: 395, end: 430 }, exit: RUNOUT, // 430 px/s keeps the 560 px mirror telegraph at 1.3 s
      pace: 0.8, grid: 0.25, spread: 0.6,
      mirrorHints: {
        's27-m1': { title: 'THE ECHO CLOSES IN', sub: 'THE PAIRS DRAW TOWARD THE MIDDLE' },
        's27-m2': { title: 'PINCH, AND AGAIN', sub: 'BOTH ORBS THROUGH THE CENTRE' },
        's27-m3': { title: 'LAST CONVERGENCE', sub: 'TWO ORBS · ONE FINGER · ONE GAP' },
      },
      items: [
        wide(1.0, 0), gold(0.4, 0), gap(46, 0.6, -80), gold(0.4, -70), bar(0.55), gold(0.4, 60), gap(44, 0.55, 80), gold(0.4, 70), bar(0.5), gold(0.4, 0),
        ...mirrorZone('s27-m1', [mgate(64, 1.0, 170), mgate(58, 0.5, 140), mgate(54, 0.5, 115), mgate(50, 0.5, 95), gap(58, 0.5, 0), mgate(50, 0.5, 95), mgate(54, 0.5, 125), mint(0.35, 140), mgate(60, 0.5, 160)]),
        gold(0.4, 0), bar(0.5), gold(0.4, -70), gap(44, 0.55, -80), gold(0.4, -70), gap(44, 0.55, 80), gold(0.4, 70), charged(0.8), gold(0.4, 0),
        ...mirrorZone('s27-m2', [mgate(56, 1.0, 150), mgate(52, 0.5, 110), gap(54, 0.5, 0), bar(0.55), mgate(52, 0.55, 110), gap(52, 0.5, 0), mint(0.35, 0), mgate(54, 0.5, 130), bar(0.5)]),
        gold(0.4, 80), gold(0.4, -80), bar(0.5), gold(0.4, 0), gap(44, 0.55, 70), gold(0.4, 60), gap(44, 0.55, -70), gold(0.4, -60), bar(0.5), gold(0.4, 0),
        ...mirrorZone('s27-m3', [mgate(54, 1.0, 160), mgate(50, 0.5, 120), mgate(48, 0.5, 96), mgate(46, 0.5, 82), gap(50, 0.5, 0), mint(0.35, 0), mgate(46, 0.5, 82), mgate(48, 0.5, 100), bar(0.55), mgate(52, 0.55, 140)]),
        gold(0.4, 0), bar(0.5), gold(0.4, 70), gold(0.4, -70), gold(0.4, 0),
      ],
    },
    {
      id: 's28-overdrive-protocol', name: 'Overdrive Protocol', world: W3,
      intro: 'Long risky lanes pay in mint. Charge up on the climb, then spend it on the dense stretch.',
      teaches: 'Greed chains: three forks whose risk lane is a long ladder of mint notes (a route clear and a run of Overdrive), each followed by a dense stretch to spend it on. The safe lane is always open and stars never need the risk.',
      profile: 'Risk as power: three growing forks (5, 6, 7 rows) paid in mint ladders, each followed by a dense burst of walls.',
      speed: { start: 415, end: 455 }, exit: RUNOUT,
      pace: 0.7, grid: 0.25, spread: 0.6,
      routeHints: {
        's28-a': { title: 'A LADDER OF MINT', sub: 'LEFT SAFE · RIGHT RISKY (LONG LADDER)' },
        's28-b': { title: 'LONGER, AND REVERSED', sub: 'LEFT RISKY (LONG LADDER) · RIGHT SAFE' },
        's28-c': { title: 'THE LONGEST LADDER', sub: 'CLIMB IT, THEN SPEND IT' },
      },
      items: [
        wide(1.0, 0), gold(0.4, 0), gap(46, 0.6, -80), gold(0.4, -70), bar(0.5), gold(0.4, 70),
        wide(0.7, 0),
        forkRow('s28-a', 'R', 0.9, [72, -135], [46, 140]), routeNote('s28-a', 'risk', 0.35, 140),
        forkRow('s28-a', 'R', 0.5, [72, -135], [46, 170]), routeNote('s28-a', 'risk', 0.3, 165), routeNote('s28-a', 'safe', 0.1, -135),
        forkRow('s28-a', 'R', 0.5, [72, -135], [44, 125]), routeNote('s28-a', 'risk', 0.3, 130),
        forkRow('s28-a', 'R', 0.5, [72, -135], [44, 160]), routeNote('s28-a', 'risk', 0.3, 150),
        forkRow('s28-a', 'R', 0.5, [72, -135], [44, 130], true),
        gold(0.4, 90), bar(0.5), gold(0.4, 0), ...zig(2, 42, 0.5, 90), gold(0.4, 80), charged(0.7), gold(0.4, 0), gold(0.4, -60),
        wide(0.7, 0),
        forkRow('s28-b', 'L', 0.9, [44, -150], [70, 130]), routeNote('s28-b', 'risk', 0.35, -140),
        forkRow('s28-b', 'L', 0.5, [44, -115], [70, 150]), routeNote('s28-b', 'risk', 0.3, -125),
        forkRow('s28-b', 'L', 0.5, [42, -165], [70, 120]), routeNote('s28-b', 'risk', 0.3, -160), routeNote('s28-b', 'safe', 0.1, 135),
        forkRow('s28-b', 'L', 0.5, [42, -120], [70, 150]), routeNote('s28-b', 'risk', 0.3, -125),
        forkRow('s28-b', 'L', 0.5, [42, -155], [70, 125]), routeNote('s28-b', 'risk', 0.3, -150),
        forkRow('s28-b', 'L', 0.5, [42, -125], [70, 145], true),
        gold(0.4, -90), bar(0.5), ...snake(3, 40, 0.5, -90, 90), gold(0.4, 80), charged(0.7), gold(0.4, 0), gap(40, 0.5, -80), gold(0.4, -70), bar(0.45), gold(0.4, 0), gold(0.4, 60),
        wide(0.7, 0),
        forkRow('s28-c', 'R', 0.9, [72, -140], [42, 135]), routeNote('s28-c', 'risk', 0.35, 135),
        forkRow('s28-c', 'R', 0.5, [72, -140], [42, 170]), routeNote('s28-c', 'risk', 0.3, 165),
        forkRow('s28-c', 'R', 0.5, [72, -140], [40, 120]), routeNote('s28-c', 'risk', 0.3, 125), routeNote('s28-c', 'safe', 0.1, -140),
        forkRow('s28-c', 'R', 0.5, [72, -140], [40, 165]), routeNote('s28-c', 'risk', 0.3, 160),
        forkRow('s28-c', 'R', 0.5, [72, -140], [40, 125]), routeNote('s28-c', 'risk', 0.3, 125),
        forkRow('s28-c', 'R', 0.5, [72, -140], [40, 160]), routeNote('s28-c', 'risk', 0.3, 155),
        forkRow('s28-c', 'R', 0.5, [72, -140], [40, 130], true),
        gold(0.4, 90), bar(0.5), ...zig(3, 40, 0.5, 90, -1), gold(0.4, 80), charged(0.7), gold(0.4, 0), bar(0.4), gold(0.4, 0), gold(0.4, 60), gold(0.4, -60),
      ],
    },
    {
      id: 's29-call-and-response', name: 'Call and Response', world: W3,
      intro: 'Learn the phrase, then answer it. The reply changes one thing. The gold sits on the change.',
      teaches: 'Sequences: five four-bar motifs, each played once as a call and then repeated as a response with one change (swapped lane, mirrored sway, a different barrier); the gold sits on what changed.',
      profile: 'A memory test: every pattern is shown once, then answered with a twist. Nothing new appears without a first hearing.',
      speed: { start: 420, end: 460 }, exit: RUNOUT,
      pace: 0.7, grid: 0.25, spread: 0.7,
      hints: [{ from: 0.4, to: 4.5, title: 'CALL, THEN RESPONSE.', sub: 'THE REPLY CHANGES ONE THING  ·  GOLD ON THE CHANGE' }],
      items: [
        wide(1.0, 0), gold(0.4, 0), gap(46, 0.7, -60),
        // Motif 1: a left-right pair, a barrier. Response: the pair swaps sides.
        gap(42, 0.7, -85), gap(42, 0.55, 85), bar(0.55), wide(0.5, 0),
        gap(42, 0.65, 85), gold(0.45, 80), gap(42, 0.55, -85), gold(0.45, -80), bar(0.55), gold(0.4, 0),
        // Motif 2: a sway, a charged barrier, a gap. Response: the sway runs the other way, a plain barrier, the gap swaps sides.
        on(slide(44, 0.65, 0, 70, 6, 0.25), 0.5), charged(0.8), gap(42, 0.55, -90), wide(0.5, 0),
        on(slide(44, 0.65, 0, 70, 6, 0.75), 0.5), gold(0.45, -70), bar(0.55), gap(42, 0.55, 90), gold(0.45, 80), mint(0.35, -150), gold(0.4, 0),
        // Motif 3: a gap, a tunnel, a barrier. Response: the tunnel on the other side, closed by a charged barrier.
        gap(42, 0.65, 70), tunnel(40, 260, 0.55, 70), bar(0.55), wide(0.5, 0),
        gap(42, 0.65, -70), tunnel(40, 260, 0.55, -70), gold(0.45, -70), charged(0.75), gold(0.45, 0), gold(0.4, 60),
        // Motif 4: a breathing gate, a narrow gap, a barrier, a narrow gap. Response: the order flips and the barrier is charged.
        on(breathe(40, 0.65, 0, 28, 4, 0), 0.5), gap(38, 0.55, -85), bar(0.55), gap(38, 0.55, 85), wide(0.5, 0),
        gap(38, 0.65, 85), gold(0.45, 80), charged(0.75), gap(38, 0.55, -85), gold(0.45, -80), on(breathe(40, 0.55, 0, 28, 4, 0), 0.5), gold(0.45, 0), mint(0.35, 150), gold(0.4, 0),
        // Motif 5: the finale of the set, a sway into a zig with two barriers. Response: the sway is mirrored, the zig is reversed, one barrier is charged.
        on(slide(42, 0.65, 0, 70, 6, 0.75), 0.5), gap(40, 0.55, 90), bar(0.55), gap(40, 0.55, -90), bar(0.5), wide(0.5, 0),
        on(slide(42, 0.65, 0, 70, 6, 0.25), 0.5), gold(0.45, 70), gap(40, 0.55, -90), gold(0.45, -80), charged(0.75), gap(40, 0.55, 90), gold(0.45, 80), bar(0.5), gold(0.4, 0), gold(0.4, 60), gold(0.4, -60), gold(0.4, 0),
      ],
    },
    {
      id: 's30-pulse-zero', name: 'Pulse Zero', world: W3,
      intro: 'The last run. Everything you have learned, once each: weave, sway, echo, fork, gauntlet.',
      teaches: 'Campaign finale: five movements that each reprise one mechanic once (precision weave, counter-sway, one Mirror Pulse zone, a fork whose risk lane is a long mint ladder, a gauntlet of barriers and a charged chain), a gold recovery before the finish.',
      profile: 'The longest run in the game: five movements with a breath of gold between each, never the fastest, ending on a gold recovery and the finish.',
      speed: { start: 400, end: 430 }, exit: { type: 'finish', runout: 420 }, // 430 px/s keeps the 560 px mirror telegraph at 1.3 s
      pace: 0.9, grid: 0.25, spread: 0.7,
      mirrorHints: { 's30-m1': { title: 'THE LAST ECHO', sub: 'TWO ORBS · ONE FINGER' } },
      routeHints: { 's30-f': { title: 'THE LAST FORK', sub: 'LEFT SAFE · RIGHT RISKY (A LONG LADDER OF MINT)' } },
      items: [
        // I. Precision weave
        wide(1.0, 0), gold(0.4, 0),
        gap(38, 0.7, -80), gold(0.45, -70), gap(38, 0.65, 80), gold(0.45, 70), gap(36, 0.65, -80), gold(0.45, -70), gap(36, 0.65, 80), gold(0.45, 70), wide(0.6, 0), mint(0.35, 150),
        gap(36, 0.65, -60), gold(0.45, -60), bar(0.6), gap(36, 0.65, 60), gold(0.45, 60), gap(36, 0.65, 0), gold(0.45, 0), wide(0.6, 0), gold(0.4, 0), gold(0.4, 60),
        // II. Counter-sway
        on(slide(46, 0.8, -40, 60, 6, 0.25), 0.5), on(slide(46, 0.6, 40, 60, 6, 0.75), 0.5), gold(0.45, 0), bar(0.55),
        on(slide(44, 0.65, -40, 60, 6, 0.75), 0.5), on(slide(44, 0.85, 40, 60, 6, 0.25), 0.5), gold(0.45, 0), gap(42, 0.55, 80), gold(0.4, 70),
        on(slide(44, 0.65, 40, 60, 6, 0.75), 0.5), on(slide(44, 0.85, -40, 60, 6, 0.25), 0.5), gold(0.45, 0), bar(0.55),
        on(slide(44, 0.65, 0, 70, 6, 0.25), 0.5), gold(0.4, 0), wide(0.55, 0), gold(0.4, -60), gold(0.4, 60),
        // III. Echo (one Mirror Pulse zone)
        gap(44, 0.7, -80), gold(0.4, -70),
        ...mirrorZone('s30-m1', [mgate(62, 1.0, 150), bar(0.55), mgate(54, 0.5, 120), mint(0.35, 120), mgate(50, 0.5, 100), gap(54, 0.5, 0), mgate(54, 0.5, 130)]),
        gold(0.4, 0), gold(0.4, 70), bar(0.55), gold(0.4, -70), gap(44, 0.55, 70), gold(0.4, 60),
        // IV. The fork: the risk lane is a long ladder of mint
        wide(0.7, 0),
        forkRow('s30-f', 'R', 0.9, [72, -135], [42, 140]), routeNote('s30-f', 'risk', 0.35, 140),
        forkRow('s30-f', 'R', 0.5, [72, -135], [42, 170]), routeNote('s30-f', 'risk', 0.3, 165), routeNote('s30-f', 'safe', 0.1, -135),
        forkRow('s30-f', 'R', 0.5, [72, -135], [40, 125]), routeNote('s30-f', 'risk', 0.3, 130),
        forkRow('s30-f', 'R', 0.5, [72, -135], [40, 165]), routeNote('s30-f', 'risk', 0.3, 160),
        forkRow('s30-f', 'R', 0.5, [72, -135], [40, 125]), routeNote('s30-f', 'risk', 0.3, 125),
        forkRow('s30-f', 'R', 0.5, [72, -135], [40, 160]), routeNote('s30-f', 'risk', 0.3, 160),
        forkRow('s30-f', 'R', 0.5, [72, -135], [40, 130], true),
        gold(0.4, 90), gold(0.4, 20), gold(0.4, -60),
        // V. Final gauntlet: barriers and a charged chain, then a gold recovery into the finish
        gap(40, 0.7, -80), bar(0.55), gap(40, 0.55, 80), bar(0.5), gap(38, 0.55, -80), bar(0.5), gap(38, 0.55, 80), gold(0.4, 70), bar(0.5), gap(38, 0.55, -60), gold(0.4, -50), bar(0.5),
        charged(0.8), gold(0.4, 0), charged(0.65), gold(0.4, 0), gap(38, 0.55, -80), charged(0.7), gold(0.4, -70), bar(0.5), gap(38, 0.55, 80), charged(0.7),
        wide(0.6, 0), ...trail(5, 0.3, 80, -80, gold), gold(0.3, 0),
      ],
    },
  ];

  // Progression worlds ("arcs", docs/CAMPAIGN_30.md): three of ten stages. An arc owns the stage-select
  // page, the banner, the background LOOK and the world-complete moment. A stage's `world` stays its
  // AUDIO theme (music, bpm, melody palette), so the shipped stages 1-12 sound and play exactly as before;
  // `look` is only the background art, taken from the arc.
  Pulse.ARC_SIZE = 10;
  Pulse.ARCS = [
    { index: 1, id: 'arc-1', name: 'Neon Circuit', banner: W1.banner, look: W1, theme: W1 },
    { index: 2, id: 'arc-2', name: 'Chromatic Overdrive', banner: W2.banner, look: W2, theme: W2 },
    { index: 3, id: 'arc-3', name: 'Pulse Collapse', banner: W3.banner, look: W3, theme: W3 },
  ];
  Pulse.STAGES.forEach((s, i) => {
    const arc = Pulse.ARCS[Math.min(Pulse.ARCS.length - 1, Math.floor(i / Pulse.ARC_SIZE))];
    s.arc = arc;
    s.look = arc.look;
    s.sector = arc; // the stage-select screen and older code group by it
  });
  Pulse.arcStages = (arc) => Pulse.STAGES.map((s, i) => ({ s, i })).filter(({ s }) => s.arc === arc);
  // True for the stage that opens a world: the first stage, a new arc, or a change of music.
  Pulse.isOpener = (i) => i === 0 || Pulse.STAGES[i].arc !== Pulse.STAGES[i - 1].arc || Pulse.STAGES[i].world !== Pulse.STAGES[i - 1].world;
})();
