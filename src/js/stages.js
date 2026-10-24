// Campaign stage definitions. Data only: src/js/campaign.js validates and runs them.
//
// Schema (all distances in game pixels on the 540 px wide field; speeds in px per second):
//   id        stable string, used as the save-data key. Never rename a shipped id.
//   name      display name
//   sector    { id, name } chapter the stage belongs to
//   intro     one-line guidance shown before the stage starts
//   speed     { start, end } forward speed, interpolated linearly over the stage's length
//   stars     optional { two, three } share of energy pairs needed (defaults in config.js)
//   visual    optional { background, ticks, bgSpeed, tickSpeed } background image keys (assets.js)
//             and their scroll speed relative to the walls
//   exit      { type: 'finish', runout } finish line `runout` px after the last item
//   items     ordered list; each item's `space` is the clear distance from the previous item:
//     { type: 'gate', space, need, shift?, length? }  wall with a gap. `need` = clearance on the
//                                  tight side of the orb's path (below 56 = must shrink);
//                                  `shift` widens the gap right (+) or left (-), visual only;
//                                  `length` makes it a tunnel you must hold through
//     { type: 'barrier', space }   full-width cyan barrier: smash it at full size
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
    // Shrink basics: easy and tighter gaps, gold between them, then a first hold-through
    // (two gaps too close to let go between).
    id: 's1-first-pulse',
    name: 'First Pulse',
    sector: { id: 'sector-1', name: 'Sector 1' },
    intro: 'Hold anywhere to shrink. Release to grow and catch gold.',
    speed: { start: 220, end: 240 },
    visual: { background: 'bg_stage1_first_pulse', ticks: 'bg_stage1_ticks', bgSpeed: 0.22, tickSpeed: 0.5 },
    exit: { type: 'finish', runout: 360 },
    items: [
      { type: 'gate', space: 420, need: 76 },
      { type: 'energy', space: 220 },
      { type: 'gate', space: 240, need: 48 },
      { type: 'energy', space: 220 },
      { type: 'gate', space: 240, need: 46 },
      { type: 'gate', space: 300, need: 76 },
      { type: 'energy', space: 200 },
      { type: 'gate', space: 240, need: 44 },
      { type: 'energy', space: 200 },
      { type: 'gate', space: 220, need: 42 },
      // Hold through: two gaps back to back.
      { type: 'gate', space: 160, need: 46 },
      { type: 'energy', space: 220 },
      { type: 'gate', space: 220, need: 44 },
      { type: 'gate', space: 150, need: 44 },
      { type: 'energy', space: 200 },
    ],
  },
  {
    // Barriers: the opposite demand. First alone (you're already big), then after a gap
    // (let go in time), then alternating squeeze/smash at a steady beat.
    id: 's2-find-the-rhythm',
    name: 'Find the Rhythm',
    sector: { id: 'sector-1', name: 'Sector 1' },
    intro: 'Cyan barriers shatter only at full size. Shrink for gaps, grow for barriers.',
    speed: { start: 260, end: 300 },
    visual: { background: 'bg_stage2_find_rhythm', ticks: 'bg_stage2_ticks', bgSpeed: 0.3, tickSpeed: 0.65 },
    exit: { type: 'finish', runout: 360 },
    items: [
      { type: 'barrier', space: 420 },
      { type: 'energy', space: 220 },
      { type: 'gate', space: 260, need: 50, shift: 60 },
      { type: 'barrier', space: 300 },
      { type: 'energy', space: 200 },
      { type: 'gate', space: 240, need: 46, shift: -60 },
      { type: 'barrier', space: 280 },
      { type: 'gate', space: 280, need: 46, shift: 70 },
      { type: 'energy', space: 220 },
      { type: 'barrier', space: 200 },
      { type: 'gate', space: 250, need: 44, shift: -70 },
      { type: 'energy', space: 200 },
      // The rhythm run: squeeze, smash, squeeze, smash.
      { type: 'barrier', space: 120 },
      { type: 'gate', space: 240, need: 44, shift: 60 },
      { type: 'barrier', space: 230 },
      { type: 'gate', space: 230, need: 46, shift: -60 },
      { type: 'energy', space: 210 },
    ],
  },
  {
    // Combinations, faster: quick release into a barrier, hold-throughs, a long hold (tunnel),
    // and two mint dares where holding through is the safe choice.
    id: 's3-controlled-overload',
    name: 'Controlled Overload',
    sector: { id: 'sector-1', name: 'Sector 1' },
    intro: 'Everything, faster. Mint hexagons are risky bonus energy: holding through is safe.',
    speed: { start: 300, end: 400 },
    visual: { background: 'bg_stage3_overload', ticks: 'bg_stage3_ticks', bgSpeed: 0.38, tickSpeed: 0.8 },
    exit: { type: 'finish', runout: 420 },
    items: [
      { type: 'gate', space: 420, need: 46, shift: 60 },
      { type: 'barrier', space: 260 },
      { type: 'energy', space: 200 },
      { type: 'gate', space: 260, need: 42, shift: -60 },
      { type: 'gate', space: 170, need: 40, shift: 70 },
      { type: 'barrier', space: 280 },
      { type: 'gate', space: 270, need: 40, shift: -70 },
      // Mint dare: a quick release between two gaps.
      { type: 'bonus', space: 190 },
      { type: 'gate', space: 190, need: 38, shift: 60 },
      { type: 'energy', space: 240 },
      { type: 'barrier', space: 160 },
      // Long hold.
      { type: 'gate', space: 270, need: 38, length: 220 },
      { type: 'energy', space: 240 },
      { type: 'gate', space: 250, need: 36, shift: -80 },
      { type: 'barrier', space: 260 },
      { type: 'gate', space: 270, need: 36, shift: 80 },
      { type: 'barrier', space: 260 },
      { type: 'gate', space: 270, need: 34, shift: -60 },
      // Second mint dare.
      { type: 'bonus', space: 190 },
      { type: 'gate', space: 190, need: 34, shift: 60 },
      { type: 'energy', space: 240 },
      { type: 'barrier', space: 160 },
      { type: 'gate', space: 270, need: 36, shift: -70 },
      { type: 'energy', space: 240 },
    ],
  },
];
