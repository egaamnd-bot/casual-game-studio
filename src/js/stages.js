// Campaign stage definitions. Data only: src/js/campaign.js validates and runs them.
//
// Schema (all distances in game pixels on the 540 px wide field; speeds in px per second):
//   id        stable string, used as the save-data key. Never rename a shipped id.
//   name      display name
//   sector    { id, name } chapter the stage belongs to
//   intro     one-line guidance shown before the stage starts
//   speed     { start, end } forward speed, interpolated linearly over the stage's length
//   stars     optional { two, three } share of energy pairs needed (defaults in config.js)
//   visual    optional { background, mid, rail, bgSpeed, midSpeed, railSpeed } landscape
//             background keys (assets.js) and their scroll speed relative to the obstacles
//   exit      { type: 'finish', runout } finish line `runout` px after the last item
//   items     ordered list; each item's `space` is the clear distance from the previous item:
//     { type: 'gate', space, need, shift?, length? }  wall with a gap. `need` = clearance on the
//                                  tight side of the orb's path (below 56 = must shrink);
//                                  `shift` widens the gap toward one edge (+ down / − up on the
//                                  landscape screen), visual only;
//                                  `length` makes it a tunnel you must hold through
//     { type: 'barrier', space }   full-width cyan barrier: smash it at full size
//     { type: 'barrier', space, charged: true }  charged barrier: also needs a full charge ring,
//                                  i.e. the orb must have been full size for 0.3 s
//     { type: 'energy', space }    gold energy pair; counts toward stars
//     { type: 'bonus', space }     mint bonus pair; tighter timing, optional, extra only
//
// Spacing rule of thumb: space = 56 per wall/barrier + 35 per pickup + seconds × speed.
// Pulse.Track.validateItems (level.js) enforces the minimum seconds to switch size.
//
// To add a stage: append an object here with a new id. Tests in tests/campaign.html check
// every stage for required fields, fairness and that the autopilot can finish it.
Pulse.STAGES = [
  {
    // Learn the rules: shrink for gaps, then barriers introduced on their own (you're already
    // big), then after a gap with plenty of time, then one short combination.
    id: 's1-first-pulse',
    name: 'First Pulse',
    sector: { id: 'sector-1', name: 'Sector 1' },
    intro: 'Hold to shrink through gaps. Release to grow, catch gold and smash cyan barriers.',
    speed: { start: 220, end: 240 },
    visual: { background: 'bg_stage1_first_pulse', mid: 'bg_stage1_mid_parallax', rail: 'bg_stage1_rail_horiz', bgSpeed: 0.22, midSpeed: 0.4, railSpeed: 0.5 },
    exit: { type: 'finish', runout: 360 },
    items: [
      { type: 'gate', space: 420, need: 76 },
      { type: 'energy', space: 220 },
      { type: 'gate', space: 240, need: 48 },
      { type: 'energy', space: 220 },
      { type: 'gate', space: 240, need: 46 },
      { type: 'energy', space: 200 },
      // First barrier: alone, and you're already full size.
      { type: 'barrier', space: 320 },
      { type: 'energy', space: 200 },
      { type: 'gate', space: 260, need: 46 },
      // Then after a gap, with plenty of time to let go.
      { type: 'barrier', space: 320 },
      { type: 'energy', space: 200 },
      // One short combination: hold through two gaps, then let go for a barrier.
      { type: 'gate', space: 240, need: 44 },
      { type: 'gate', space: 150, need: 44 },
      { type: 'barrier', space: 300 },
      { type: 'energy', space: 200 },
    ],
  },
  {
    // Build rhythm: squeeze/smash at a steady beat, then the charged barrier: first alone
    // (you're already charged), then after a gap with a generous lead, then in short combos.
    id: 's2-find-the-rhythm',
    name: 'Find the Rhythm',
    sector: { id: 'sector-1', name: 'Sector 1' },
    intro: 'Keep the beat. Double-edged barriers need a full charge ring: let go early.',
    speed: { start: 260, end: 300 },
    visual: { background: 'bg_stage2_find_rhythm', mid: 'bg_stage2_mid_parallax', rail: 'bg_stage2_rail_horiz', bgSpeed: 0.3, midSpeed: 0.5, railSpeed: 0.65 },
    exit: { type: 'finish', runout: 360 },
    items: [
      { type: 'gate', space: 420, need: 50, shift: 60 },
      { type: 'barrier', space: 260 },
      { type: 'gate', space: 250, need: 46, shift: -60 },
      { type: 'energy', space: 200 },
      { type: 'barrier', space: 140 },
      // The beat: squeeze, smash, squeeze.
      { type: 'gate', space: 240, need: 46, shift: 60 },
      { type: 'barrier', space: 230 },
      { type: 'gate', space: 230, need: 44, shift: -60 },
      { type: 'energy', space: 210 },
      // First charged barrier: alone; staying big fills the ring.
      { type: 'barrier', space: 360, charged: true },
      { type: 'energy', space: 200 },
      { type: 'gate', space: 250, need: 46, shift: 60 },
      // After a gap: let go early so the ring fills.
      { type: 'barrier', space: 360, charged: true },
      { type: 'gate', space: 250, need: 44, shift: -60 },
      { type: 'energy', space: 200 },
      { type: 'barrier', space: 140 },
      { type: 'gate', space: 250, need: 44, shift: 60 },
      { type: 'barrier', space: 320, charged: true },
      { type: 'energy', space: 210 },
    ],
  },
  {
    // Mastery: combinations of everything, a long hold that ends in a charged barrier, and two
    // optional mint dares where holding through is the safe choice.
    id: 's3-controlled-overload',
    name: 'Controlled Overload',
    sector: { id: 'sector-1', name: 'Sector 1' },
    intro: 'Everything, faster. Mint hexagons are risky bonus energy: holding through is safe.',
    speed: { start: 300, end: 400 },
    visual: { background: 'bg_stage3_overload', mid: 'bg_stage3_mid_parallax', rail: 'bg_stage3_rail_horiz', bgSpeed: 0.38, midSpeed: 0.6, railSpeed: 0.8 },
    exit: { type: 'finish', runout: 420 },
    items: [
      { type: 'gate', space: 420, need: 46, shift: 60 },
      { type: 'barrier', space: 260 },
      { type: 'energy', space: 200 },
      { type: 'gate', space: 260, need: 42, shift: -60 },
      { type: 'gate', space: 170, need: 40, shift: 70 },
      { type: 'barrier', space: 380, charged: true },
      { type: 'gate', space: 270, need: 40, shift: -70 },
      // Mint dare: a quick release between two gaps.
      { type: 'bonus', space: 190 },
      { type: 'gate', space: 190, need: 38, shift: 60 },
      { type: 'energy', space: 240 },
      { type: 'barrier', space: 160 },
      // Long hold, recovery gold, then a charged barrier: don't stay small out of habit.
      { type: 'gate', space: 270, need: 38, length: 220 },
      { type: 'energy', space: 240 },
      { type: 'barrier', space: 200, charged: true },
      { type: 'gate', space: 270, need: 36, shift: -80 },
      { type: 'barrier', space: 260 },
      { type: 'gate', space: 270, need: 36, shift: 80 },
      { type: 'barrier', space: 260 },
      { type: 'gate', space: 270, need: 34, shift: -60 },
      // Second mint dare.
      { type: 'bonus', space: 190 },
      { type: 'gate', space: 190, need: 34, shift: 60 },
      { type: 'energy', space: 240 },
      { type: 'barrier', space: 160, charged: true },
      { type: 'gate', space: 270, need: 36, shift: -70 },
      { type: 'energy', space: 240 },
    ],
  },
];