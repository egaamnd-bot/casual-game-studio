// Campaign stage definitions. Data only: src/js/campaign.js validates and runs them.
//
// Schema (all distances in game pixels on the 540 px wide field; speeds in px per second):
//   id        stable string, used as the save-data key. Never rename a shipped id.
//   name      display name
//   sector    { id, name } chapter the stage belongs to
//   intro     one-line guidance shown before the stage starts
//   speed     { start, end } forward speed, interpolated linearly over the stage's length
//   stars     optional { two, three } share of energy pairs needed (defaults in config.js)
//   visual    optional { wallEdge } colour overrides for the placeholder renderer
//   exit      { type: 'finish', runout } finish line `runout` px after the last item
//   items     ordered list; each item's `space` is the clear distance from the previous item:
//     { type: 'gate',  space, need, shift }  wall with a gap. `need` = clearance on the tight
//                                            side of the orb's path; `shift` widens the gap
//                                            right (+) or left (-), moving where the gap sits
//     { type: 'energy', space }              energy pair; counts toward stars
//     { type: 'bonus',  space }              bonus diamond pair; tighter timing, extra only
//
// To add a stage: append an object here with a new id. Tests in tests/campaign.html check
// every stage for required fields, fairness and that the autopilot can finish it.
Pulse.STAGES = [
  {
    id: 's1-first-pulse',
    name: 'First Pulse',
    sector: { id: 'sector-1', name: 'Sector 1' },
    intro: 'Hold anywhere to shrink. Release to grow and catch energy.',
    speed: { start: 220, end: 240 },
    exit: { type: 'finish', runout: 360 },
    items: [
      { type: 'gate', space: 420, need: 76, shift: 0 },
      { type: 'energy', space: 220 },
      { type: 'gate', space: 260, need: 48, shift: 0 },
      { type: 'energy', space: 240 },
      { type: 'gate', space: 300, need: 48, shift: 0 },
      { type: 'gate', space: 300, need: 76, shift: 0 },
      { type: 'energy', space: 200 },
      { type: 'gate', space: 260, need: 44, shift: 0 },
      { type: 'energy', space: 240 },
      { type: 'gate', space: 260, need: 46, shift: 0 },
      { type: 'energy', space: 240 },
      { type: 'gate', space: 300, need: 42, shift: 0 },
      { type: 'energy', space: 240 },
      { type: 'gate', space: 300, need: 44, shift: 0 },
      { type: 'energy', space: 240 },
    ],
  },
  {
    id: 's2-find-the-rhythm',
    name: 'Find the Rhythm',
    sector: { id: 'sector-1', name: 'Sector 1' },
    intro: 'Gaps now shift left and right. Watch the tight edge.',
    speed: { start: 260, end: 300 },
    exit: { type: 'finish', runout: 360 },
    items: [
      // Gentle examples first: one shift at a time, with room to breathe.
      { type: 'gate', space: 400, need: 50, shift: 60 },
      { type: 'energy', space: 220 },
      { type: 'gate', space: 260, need: 50, shift: -60 },
      { type: 'energy', space: 220 },
      // Then left/right pairs.
      { type: 'gate', space: 240, need: 44, shift: 70 },
      { type: 'gate', space: 300, need: 44, shift: -70 },
      { type: 'energy', space: 200 },
      { type: 'gate', space: 240, need: 40, shift: 60 },
      { type: 'energy', space: 200 },
      { type: 'gate', space: 240, need: 40, shift: -60 },
      // Then quicker alternation with tighter gaps.
      { type: 'gate', space: 260, need: 38, shift: 70 },
      { type: 'gate', space: 260, need: 38, shift: -70 },
      { type: 'energy', space: 200 },
      { type: 'gate', space: 240, need: 36, shift: 80 },
      { type: 'energy', space: 200 },
      { type: 'gate', space: 240, need: 36, shift: -80 },
      { type: 'gate', space: 240, need: 40, shift: 60 },
      { type: 'energy', space: 200 },
      { type: 'gate', space: 240, need: 38, shift: -70 },
      { type: 'energy', space: 220 },
    ],
  },
  {
    id: 's3-controlled-overload',
    name: 'Controlled Overload',
    sector: { id: 'sector-1', name: 'Sector 1' },
    intro: 'Everything you learned, faster. Diamonds are risky bonus energy.',
    speed: { start: 300, end: 400 },
    exit: { type: 'finish', runout: 420 },
    items: [
      { type: 'gate', space: 420, need: 46, shift: 60 },
      { type: 'energy', space: 230 },
      { type: 'gate', space: 270, need: 42, shift: -60 },
      { type: 'gate', space: 290, need: 40, shift: 70 },
      { type: 'energy', space: 230 },
      { type: 'gate', space: 270, need: 40, shift: -70 },
      // First bonus: squeezed between two tight walls.
      { type: 'bonus', space: 190 },
      { type: 'gate', space: 190, need: 38, shift: 60 },
      { type: 'energy', space: 230 },
      { type: 'gate', space: 280, need: 38, shift: -80 },
      { type: 'gate', space: 280, need: 36, shift: 80 },
      { type: 'energy', space: 230 },
      { type: 'gate', space: 270, need: 36, shift: -60 },
      { type: 'energy', space: 230 },
      { type: 'gate', space: 270, need: 40, shift: 70 },
      { type: 'gate', space: 280, need: 34, shift: -70 },
      { type: 'bonus', space: 200 },
      { type: 'gate', space: 200, need: 36, shift: 80 },
      { type: 'energy', space: 230 },
      { type: 'gate', space: 280, need: 34, shift: -80 },
      { type: 'energy', space: 230 },
      { type: 'gate', space: 270, need: 36, shift: 60 },
      { type: 'gate', space: 280, need: 34, shift: -60 },
      { type: 'energy', space: 230 },
      { type: 'gate', space: 270, need: 38, shift: 80 },
      { type: 'bonus', space: 200 },
      { type: 'gate', space: 200, need: 34, shift: -80 },
      { type: 'energy', space: 240 },
    ],
  },
];
