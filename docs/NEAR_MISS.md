# Near-miss -> Overdrive prototype

Status: **experiment, stage 10 (Precision) only. NOT DEVICE-TESTED.** Approved direction: GitHub Issue #24, priority B.

## What the player feels

On stage 10, squeezing past a gate wall with almost no room (the orb's edge within 8 px of the wall, never touching) now shows the existing graze arc and plays the existing near-miss sound, as before, **and** fills the existing Overdrive meter by a little (3 units, "GRAZE" text). Total from grazes is capped at 15 units per run, so grazing alone can never fill the meter (it needs 100 units by default; see `CONFIG.overdrive.threshold`). While Overdrive is already running, grazes show the effect but add nothing. Nothing about completing the stage or earning stars depends on it.

## Rules

- **Graze** = at its closest during the whole time the gate overlaps the orb vertically, the gap between the orb's collision circle and the nearest wall rectangle was `0 <= gap <= margin` (8 px, the existing `nearMissMargin`).
- **Never a hit.** The gap uses the exact rectangles of `Level.hitsWall` (including the three rectangles of fork gates) and the same strict `distance < radius` rule, so `gap < 0` is true exactly when the collision rule says the orb died. A crash never pays.
- **Once per gate.** One value per gate (the minimum over the crossing), paid when the gate is cleared. A tall tunnel hugged for its whole length, or many frames of overlap, pay once.
- **Frame-rate independent.** Each frame the orb, orb radius and the (possibly sliding) gap are interpolated and sampled every 4 px of wall travel, so 30, 60, 144 fps and a 50 ms hitch give the same closest approach.
- **Existing meter only.** Uses `Overdrive.award` (already used for risk routes): no new currency, no change to the repeat memory of ordinary contacts, nothing while active.
- **Isolated.** `CONFIG.graze = { enabled, stageIds: ['s10-precision'], margin: 8, charge: 3, runCap: 15 }`. Any other stage, Endless, or `enabled: false` uses the old cosmetic `checkNearMiss` unchanged.

## Why the old check was not reused for charge

`checkNearMiss` looks once, at the moment the wall has fully passed. It can miss a real graze (brushed the wall, then drifted away) and, for a sliding gap, judges the wrong moment. Good enough for a flash, not for a reward.

## Files

`src/js/graze.js` (pure geometry), `src/js/level.js` (reset on spawn), `src/js/game-scene.js` (observe each frame; `graze()` on a cleared gate), `src/js/config.js`, `tests/graze.html`.

## Tests (`tests/graze.html`)

Clearance agrees with `Level.hitsWall` over 6000 random plain and fork cases; exact boundaries (-0.01, 0, 0.01, 8, 8.01 px); both walls and both sides; orb radii 20 / 30 / 45 / 56; fork divider; same closest approach at 30 / 60 / 144 / 250 fps and with a 50 ms frame; moving orb and swaying gap; brush-then-drift; exactly `charge` more Overdrive than a clean pass; a lethal overlap pays nothing; tall tunnel pays once; pause mid-crossing; cap; no charge during Overdrive; retry resets; five repeated runs identical; other stages, Endless and `enabled: false` unchanged; a bot run of stage 10 (and stages 9 and 11) has identical state, score, energy, time and stars with the prototype on and off, and is deterministic.

## For the Producer to judge on a phone

Does stage 10 feel better with grazes charging Overdrive? Is 3 per graze (cap 15) too little or too much? Does "GRAZE" read clearly? If it feels good, the stage list can be widened in config; if not, set `enabled: false`.
