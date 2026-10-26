# Risk-and-reward routes

Status: prototype in stage 4 (`s4-split-decision`) on branch `feature/pulse-risk-reward-routes`. Not merged; awaiting
independent review and phone testing. See `docs/AI_HANDOFF.md` for the exact commit, tests and APK.

## The idea

At a fork the lane splits in two. The player has to choose a side before the rows arrive, and the choice is a real
trade-off:

| | Safe route | Risk route |
|---|---|---|
| Openings | wide, passable at full size (half-width 70–72) | narrow, must be shrunk for (half-width 40–46) |
| Steering | steady, small shifts | zig-zags inside the lane, tighter timing |
| Optional notes | 1 mint note | 3–4 mint notes (every row but the last) |
| Reward | the stage as usual | bigger combo, faster Overdrive charge, and **ROUTE CLEAR** (a rising phrase of the world's scale + a one-off Overdrive award of `overdrive.routeBonus` = 12) when every risk note is taken |

Nothing else about the game changes: hold shrinks, release grows, drag steers. There is no second control scheme.

## How it works

* **Fork row** (`stages.js: forkRow`): one gate item with two openings, `L` and `R`, separated by a divider pillar at least
  `route.divider` (64) px wide on the lane centre. `fork.risk` ('L' or 'R') names the demanding side. The engine stores the
  second opening as `gap2L / gap2R / cx2 / need2` (`level.js: setFork`).
* **Collision** (`Level.hitsWall`): three solid blocks, the left wall, the divider and the right wall, so the divider is
  physically solid. A row is **one** pass (`Level.resolve`), never two; the segment records which opening the orb used
  (`seg.side`) and Perfect is measured against that opening.
* **Route notes**: optional `bonus` (mint) items with `route`, `lane` ('L'/'R') and `role` ('risk'/'safe'). They never
  constrain the path, never count for stars (`energyTotal` is gold only) and missing one costs nothing, exactly like any mint.
* **Fairness** (`Track.validateItems`): a fork is two tracks sharing their start and finish. The validator checks **each lane
  on its own** (size-switch time, steering reach, aiming room, spacing, minimum walls) and the divider and edge walls. The campaign
  compiler floors the spacing against both lanes (`fairs.L` and `fairs.R`), so a stage cannot ask for a move that is unfair on
  either side. `Campaign.validate` rejects malformed forks (missing route id, bad `risk`, a non-bonus lane note, a moving fork).
* **Preview** (`Render.forkGate`): both routes are visible before the player must commit. The corridor under each opening is
  tinted (cyan = safe, pink = risk) and runs back toward the previous row; ahead of the first row there is a preview of chevrons
  (three = risky, one = safe) and one mint dot per optional note. A hint card ("THE LANE SPLITS") fades in while the first row
  descends and is gone well before it reaches the orb (`stage.routeHints`).
* **Feedback** (`game-scene.js: routePassed / routeClear`): a small RISK ROUTE / SAFE ROUTE cue when the first row is cleared; on
  the last row, if the risk lane was taken with every note collected, ROUTE CLEAR with a rising phrase
  (`Melody.routeClear`, all `layer: true` accompaniment, within the gain ceiling), a ring round the orb and
  `Overdrive.award`. The lead notes, collisions and score updates are never delayed.
* **Music**: collected risk notes are ordinary `bonus` hits, so they continue the world's melody with the combo; the rows are
  beat-aligned (`grid 0.25`) like the rest of the stage.

## Anti-farming and bounds

* Every route note is a one-off item in a fixed track; there is no repeatable loop to farm.
* `Overdrive.award` adds nothing while Overdrive is active, does not touch the repeat memory of ordinary contacts, and is capped
  at the threshold. A stage can pay at most one award per route (2 in stage 4, 24 charge before combo bonus, far less than the 100 needed).
* A crash clears Overdrive and the route state as before; retry resets `scene.routes`.

## Campaign plan

* Stage 4: fork A (forgiving: roomy risk gaps, 3 notes, right side) then fork B (demanding: tighter gaps, zig-zag, 4 notes, left
  side). The two forks put the risk on opposite sides on purpose.
* Later stages (not built): mix forks with barriers and moving gaps (middle campaign), tighter risk lanes needing shrink/grow
  rhythm (late campaign). Endless is deliberately not touched until the campaign version is stable.
* Difficulty: the risk lane is tighter than the stage's ordinary gaps (40–46 vs 44–46); the safe lane is easier. The stage's gold,
  star thresholds and pace are unchanged. Honest caveat: a player who always chooses safe meets an easier stretch than before;
  the trade is fewer notes, a smaller combo and slower Overdrive. Phone testing should confirm that the choice feels real.

## Tests

`tests/routes.html` (geometry, collision boundaries, per-lane fairness and validator negatives, both routes completable at six
portrait heights and at 30/60/144 fps by steady, cautious and sloppy bots, reward resolution, combo/Overdrive interplay, music
phrase, save/stars/score integrity), plus route sections in `tests/campaign.html` and `tests/scene.html`.
