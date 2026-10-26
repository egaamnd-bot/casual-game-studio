# Musical Combos + Overdrive

> Status: **built and tested automatically; NOT DEVICE-TESTED; not merged.** Branch `feature/pulse-musical-combos-overdrive`, started from `576e30b` (head of PR #15, `feature/pulse-portrait-trailer-rework`). PR #15 is based on `feature/pulse-12-stage-campaign` (PR #9). **Dependency chain: #9 → #15 → this PR. Nothing is merged and nothing may be merged out of order.**

Feedback only. Collision, orb size, obstacle layout and speed, difficulty, scoring, stars, stage ids, campaign, Endless and the save format are unchanged. Tests prove it: with the Overdrive code observing a bot run, the run, gold count and score are identical to a run without it (`tests/overdrive.html`).

## Combo (existing rules, upgraded sound)

The combo counts successful contacts (gold note, mint, gate pass, smash) and resets exactly as before (a missed gold note or a crash; a missed mint does not). Only the musical answer and the readout are new.

| Combo | Musical layer (all notes are degrees of the world's pentatonic palette) | Visual |
|---|---|---|
| 1–3 | the melody note only (the lead, always immediate) | "N IN A ROW" from 3 |
| **4** | a quiet octave above on every hit, plus a two-note chime once when reached | one ring round the orb, "LAYER" |
| **8** | adds a fifth-ish note below and an echo one 16th later; a four-note arpeggio once when reached, with a low pedal | two rings, larger combo text, "ENERGY!" |
| **16** | adds a high shimmer and a second echo; a six-note rising run with a shimmer chord once when reached | three rings (the last gold), sparks, gold combo text, "FLOURISH!" |

All layers are accompaniment: they may wait for the next 16th (≤ 80 ms) and use small `at` offsets (≤ 0.6 s). The lead note is never delayed (tested). Every layer's gain is scaled so the sum of peak gains stays under 0.62 (`Melody.budget`), and the effects bus now ends in a soft limiter (DynamicsCompressor, −10 dB threshold, ratio 8), so stacked layers cannot clip.
Chord-ish layers now use scale degrees (`hz(world, degree)`) instead of fixed intervals, so the layers stay in the world's key (a test checks every pitched note against the scale, all worlds and all combos).

## Overdrive meter

HUD: a slim bar under the campaign progress bar (x 100–350, y 48): it does not cover the lane or the hint card, and works in Endless too. Blue while filling (brighter near full), **gold while active, draining with the time left**, with an "OVERDRIVE 5.5" label; in the last 1.6 s it blinks gently (time-based).

**Charge per successful contact** (meter = 100):

| Contact | Base |
|---|---|
| gate pass | 2.5 |
| gold note | 4.5 |
| smash | 6 |
| mint bonus | 8 |
| charged smash | 10 |

Multipliers: **Perfect ×1.4**; **combo** +10% for every 4 in a row, capped at +30%; **variety**: repeating the same kind of contact earns 12% less each time (floor 50%; a different kind, a miss, or the end of Overdrive resets the run), so spamming one easy action is weak.
Measured (tests): plain passes alone need 78 contacts to fill, plain notes alone 42, Perfect passes at combo 16 alone 42, mixed play 22. No single contact can add more than 30 units.

**Losses:** a missed gold note drains 20 (never below 0); a missed mint costs nothing (same spirit as the combo rule); a crash clears everything; a retry starts clean. A combo break does *not* end Overdrive. **Nothing is added while Overdrive is active**, so it cannot chain into the next one; after it ends the meter is empty.

**Activation:** automatic when the meter reaches 100 (no new control: the one-finger drag/hold scheme is unchanged). **Duration: 6 s of run time**, frozen while paused or out of focus. **Score bonus: none** (so Endless scores, campaign stars and saves are untouched); the bounded-bonus option was deliberately not used.
Bot measurements on the 12 stages (clean play): 1–2 Overdrives per stage, first one after 11–21 s, active 16–29% of the run.

## What Overdrive does

- **Comet:** brighter (colour mixed toward warm white), longer and wider tail, bigger glow, a slight shimmer on the streak, more sparks. The collision radius and the drawn-size rule (never smaller than the collision circle) are untouched.
- **World:** rails and grid a little brighter; the speed streaks in the backdrop move faster (their offset accumulates, so it never jumps). Obstacle speed is unchanged.
- **Sound:** every contact rings fuller (a stacked chord from the scale plus a bright octave, accompaniment only; the melody note is identical to normal); a rising sweep and chord on start, a falling release on end.
- **Transitions:** one eased intensity `fx` (exponential, rates 5 /s in, 3 /s out), identical at 20–240 fps (tested). A crash resets everything at once; completing a stage clears the meter and the glow eases out.
- **State safety:** `startRun` resets it; pause and blur freeze it; mute does not affect it; a Stage/scene change creates a fresh state; an Endless track change leaves it alone. Tests cover each.

## Files

`src/js/overdrive.js` (pure rules, new), `src/js/melody.js` (milestones, Overdrive accents, gain budget), `src/js/sfx.js` (`at` offsets, limiter), `src/js/game-scene.js` (wiring, HUD bar), `src/js/sprite-view.js` (visuals), `src/js/config.js` (`overdrive`, `combo`), `tests/overdrive.html` (new), `tests/scene.html`, `tests/melody.html`.

## Known limitations

- NOT DEVICE-TESTED: how the layers sound on phone speakers/earbuds, the limiter's effect, readability of the glow in sunlight, frame rate on mid-range Android.
- The limiter adds a few ms of look-ahead on the effects bus (browser-dependent); inputs and lead notes still start immediately, but this is unmeasured on a device.
- Overdrive thresholds were tuned with a bot; humans may trigger it more or less often.
- Endless is not beat-aligned, so its arpeggio steps use the track tempo only.
