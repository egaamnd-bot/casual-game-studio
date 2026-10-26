# Mirror Pulse (prototype)

Status: built on `feature/pulse-mirror-break`; **NOT DEVICE-TESTED**. Prototype scope: stage 7 (`s7-double-trouble`), two zones. Later stages and Endless are untouched.

## What the player sees

1. **Telegraph** (about 1.9 s at 300 px/s). A dashed centreline appears behind the hazards and a hint card says `MIRROR PULSE · YOUR ECHO MIRRORS YOU · FIND A GAP FOR BOTH` (second zone: `TWO ORBS · ONE FINGER`). A rising synth cue plays once. No echo exists yet and nothing flashes.
2. **Intro** (0.6 s). A violet echo orb grows out of the centreline to its mirrored position. An activation chord plays once.
3. **Active.** The echo is always at `echoX = 2 * laneCentre - orbX`: every move of the finger moves the echo the opposite way. The echo has the orb's size and charge (it is the same radius, so hold-to-shrink shrinks both). It trails a short tail, so it is easy to tell from the orb.
4. **Outro** (0.5 s). The echo folds back into the centreline, `IN SYNC` appears and an ending cue plays once.

Controls are unchanged: hold to shrink, release to grow, drag to steer. There is no second control.

## Obstacles in a zone

- **Mirrored pair** (`mgate(need, t, x)` in `stages.js`): one wall with two equal openings that are exact reflections of each other (`gapL + gap2R = 540`, `gapR + gap2L = 540`), separated by a solid divider (at least 64 px) with an outer wall on each side. The orb takes the left opening and the echo the right one, or the other way round if the player steers to the right opening; because the pair is symmetric both orbs always have a path. It reuses the two-opening geometry of risk routes (`fork` rows) but is tagged `mirror` and carries **no route data**, so it is drawn in the Mirror violet, shows no risk/safe colours or previews, and pays nothing.
- **Plain gate** (centred): both orbs fit the same gap.
- **Barrier** (plain or charged): full width, so the same for both orbs; the echo hits it exactly when the orb would (same size and charge).
- **Mint note** (plain bonus): either orb can collect it, once.
- **Not allowed in a zone:** gold notes (stars must never depend on the echo), sliding gates, rings, tunnels and route forks. `Campaign.validate` rejects them, so an unsupported obstacle can never reach a player. Nothing is silently moved into the player's path.

## Collision

The orb is checked exactly as before (`Level.resolve`). If the orb did not crash, the echo is checked on its own with `Level.resolveEcho`, and **only** against segments tagged `zone`, so the rest of the game is untouched. Either orb crashing is a crash with the same result: the crash message names the echo when it was the echo (`Your echo hit a wall: find a gap for both orbs.`). A note collected by either orb is resolved once (`resolved` flag), so there is no duplicate reward.

## Edges and the centreline

The steering margin is symmetric about the centre (44 px each side), so a player inside it always has an echo inside it. At the lane edge the orb is at 44 and the echo at 496, and vice versa. When the orb crosses the centreline the echo crosses it the other way at the same moment; at exactly the centre both orbs overlap, which is why the pairs have a divider there: standing on the centreline is never safe in a pair.

## Timing (and why)

Everything is a function of the distance travelled (`Pulse.Mirror.phase`), so pausing, focus loss, retry and any frame rate cannot desync it, and there are no timers to forget.

| Part | Distance | At 300 px/s | Reason |
|---|---|---|---|
| Telegraph | 560 px | 1.9 s | long enough to read the hint card once and see the dashed line, short enough to feel like an event |
| Lead (intro start → first paired row) | 420 px | 1.4 s | the echo is fully formed (`introEnd`, 170 px) well before the first paired row reaches the orb |
| Intro | 170 px | 0.6 s | quick growth that looks intentional |
| Outro | 140 px | 0.5 s | clear ending |

The active part is the paired rows only: zone 1 is about 4.0 s, zone 2 about 5.1 s; including the intro/outro the echo is on for 5.4 s and 6.5 s. Zones need about 1100 px of road between them (validated).

Audio cues are scheduled with the usual beat-aware delay, **but only the sound is delayed, never input, collision or the visual state**.

## Progression

Stage 7 ("Double Trouble") is where the campaign already asks the player to track two things at once, and it comes after the core mechanics (gates, barriers, charged barriers) and the first two-opening fork (stage 4) have been taught. Zone 1 is approachable (wide openings 72/68/56 and a single centre gate); zone 2 is more demanding (openings 54/52/48/46 with a barrier) and is only reached after zone 1 has been cleared in the same run. Gold count (9), stage ids, unlock order, star thresholds and the save format are unchanged.

## Rewards

Mirror Pulse pays nothing itself: no score, no combo step, no Overdrive. Passing a mirrored row scores exactly like any wall pass, and mint notes in a zone behave like mint notes anywhere. The event cannot be re-triggered (cues are tracked per zone per run in `mirrorSeen`, reset on retry).

## Tests

`tests/mirror.html` (reflection, timeline, pair symmetry, collisions, unsupported obstacles, fairness at six portrait heights and 30/60/144 fps, scoring/stars/save), `tests/scene.html` (real scene: telegraph, mirrored echo, pause/focus loss/resume, completion, retry, crash, stage change), `tests/campaign.html`, `tests/routes.html`.

## Ideas for later (backlog only, not built)

- Near-Miss Rewards
- Collectible Chains
- World Finale Sequences
- A combined test where a safe lane and a Mirror/paired-obstacle risk lane are offered together (only after this prototype is validated on a phone)
