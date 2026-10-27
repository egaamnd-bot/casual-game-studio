# Shatter Symphony (Lab prototype, issue #32)

Status: **prototype in the Lab. Automated tests only. NOT DEVICE-TESTED: nobody has listened to it.** Producer decision 2026-10-26 (Issues #28 / #32).

AUDIO ONLY. Collision, scoring, stars, stage ids, saves, controls and Endless are untouched; a run is bit-for-bit identical with the director on or off (`tests/symphony.html` proves it on bot runs).

## What the player hears (before / after)

Play **LAB > Shatter Symphony** (stage 14's layout, new stage id `lab-shatter-symphony`, never saved).

| Moment | Before (stage 14 today) | After (director on) |
|---|---|---|
| Clean streak, combo 0-3 | the melody note per hit | same |
| Combo 4 | chime phrase + sample | same, skipped only in a dense stretch |
| Combo 8 and up | arpeggio phrase + sample | same, **plus a quiet eighth-note pentatonic arpeggio in the world's scale, on the beat grid of the run clock, under the music** |
| Combo 16 | rising run + sample | same, **the arpeggio goes to sixteenth notes** |
| Risk route cleared | rising phrase + sample | same, **the arpeggio enters for about 8 beats even without a streak**; the music dips for 160 ms |
| Several big moments in one frame (combo 16 + route clear + Overdrive start) | three stacked cues | **one cue**: Overdrive start wins, the others keep their labels and rings but make no sound |
| Overdrive | stem fades in over 0.12 s | stem fades in over 0.4 s on an equal-power curve (same final level); the arpeggio steps aside for the stem and returns at level 2 at most afterwards |
| Miss / crash | streak phrase breaks | the level decays over about 2 s and the arpeggio thins out and stops; a crash stops it at once |
| Dense walls ahead (3 or more inside 1.5 s) | n/a | the arpeggio is off, the combo-4 chime is skipped, other cues are 25% softer, no music dip |

## Design

`src/js/symphony.js` (the director), `Pulse.CONFIG.symphony` (its config, top of that file), seams in `sfx.js`, two guarded lines in `game-scene.js`, one tag in `index.html`.

1. **Event ledger.** The scene's cue methods (`comboMilestone`, `routeClear`, `overdriveStarted`, `overdriveEnded`) are wrapped on the scene *instance*. Their visuals run at once; their sounds are captured through a hook in `Sfx.play` / `Sfx.notes` (null unless the director is attached), resolved at the end of the same `step()` by priority (Overdrive start 5, combo 16 4, route clear 3, combo 8 and Overdrive end 2, combo 4 1), and the winner is replayed in the same JS task with the same arguments. A cue inside `window` (0.4 s of run time) of the previous one plays only if it outranks it (an escalation), otherwise it is a repeat and is dropped. **Lead notes of a hit (`hitFeedback`) are never captured**: they play exactly as before.
2. **Intensity** `v` 0..3: target from the streak (4 / 8 / 16 -> 1 / 2 / 3), a cleared risk route (>= 2 for 8 beats) and Overdrive (3); eased with rise 0.9 s / fall 0.6 s time constants (frame-rate independent). Arpeggio: `v` >= 1.75 eighths, >= 2.55 sixteenths. Read-only: it reads `scoring.combo`, `od`, `routeClears`.
3. **Arpeggio.** Scale degrees of the world's palette (`Melody.hz`, so every pitch is in key; tested for all three worlds), triangle with a low-pass, peak 0.045 (x1.25 on the bar's downbeat), scheduled on the AudioContext clock at the next 16th of the run clock inside a 90 ms lookahead: **only while the streamed music is in step with the run clock (`aligned()`)**, never in Overdrive, never when dense, never when music volume is 0. Own bus (`layerBus`) into the existing limiter, scaled by the music volume. At most 6 notes in flight.
4. **Density-aware restraint.** Every 0.1 s: walls and barriers not yet resolved within `speed x 1.5 s` above the orb (`level.segments`). On at 3, off again at 1 (hysteresis).
5. **Ducking.** Route clear, combo 16 and Overdrive start call the existing `Music.pulseDuck()` (x0.72 for 160 ms); not while dense.
6. **Stem fades.** `Sfx.stemShape(true)` while attached: 16-piece sin / cos ramps (no `setValueCurveAtTime`, which throws on overlap). Entry ends at exactly 1.0 (the old level); exit starts from the entry's current level, so leaving mid-entry never jumps.

### Rejected ideas (and why)

- **Pitching the pack samples to the harmony** (`playbackRate`): the source pitch of the Gemini samples is unknown (the world tracks' keys are only 0.44-0.56 correlated, see PORTRAIT_REWORK.md) and I cannot listen. The synthesized phrases and the arpeggio are already in key.
- **Quantising event cues to the beat**: they already wait for the next 16th (<= 80 ms) in the existing code; the director adds **no** wait and no new quantisation. Arpeggio notes are the only things placed on the grid, and they are accompaniment, not feedback.
- **A new meter or currency:** none. The intensity level is not shown anywhere.

## Why audio cannot change gameplay

The director only reads scene fields and calls Sfx. It never writes scene state, never calls `Math.random`, `scene.time` timers or tweens, and never plays, stops or seeks a music track (tested). `Pulse.Symphony.attach(scene)` returns null unless `CONFIG.symphony.enabled` **and** `scene.lab.flags.symphony`; with no director attached the hook is null and `stemShape` is off, so every shared-code path is the old one.

## Files and shared-file lines touched

| File | Change |
|---|---|
| `src/js/symphony.js` | new: director, pure rules, Lab registration (on `DOMContentLoaded`, because `Pulse.Lab` and the stages load later) |
| `src/js/sfx.js` | `setHook/getHook`, `stemShape`, `layerNote/layerStop/layerCount`, hook checks at the top of `Sfx.play` and `Sfx.notes`, `equalPower` ramps in `stemStart/stemStop` (only when shaped), `layerStop` on suspend and music mute, layer bus volume in `setVolume` |
| `src/js/game-scene.js` | 2 lines in `create`: `if (Pulse.Symphony) Pulse.Symphony.detach(this);` inside the existing `shutdown` handler, and `if (Pulse.Symphony) Pulse.Symphony.attach(this);` just before `this.setState('ready')` |
| `src/index.html` | `<script src="js/symphony.js"></script>` right after the `melody.js` tag |
| `tests/symphony.html` | new |

## How to turn it off

`Pulse.CONFIG.symphony.enabled = false` (the director never attaches), or remove the Lab entry. Individual parts: `arp: false`, `duck: false`, `smoothStem: false`.

## Tests (`tests/symphony.html`, see the handoff note for the latest counts)

Pure rules (targets, easing at 30 / 60 / 144 / 250 fps, arpeggio degrees in every world's scale, one queue per 16th at four fps/tempo pairs, hitch, density, ledger table); Lab entry and attach rules; same-frame de-duplication with visuals preserved; repeats and escalation; voice cap; lead note immediate; **latency: the cue starts exactly when the existing groove wait says, with and without the director**; intensity 0 -> 3 and decay; arpeggio on the grid, <= 90 ms ahead, peaks <= 0.056, <= 6 in flight; route boost; Overdrive step-aside; density restraint (synthetic and in the real stage); music dip; stem fades (monotone, <= 1, ends at 1, gentler slope than the old ramp, exit from mid-entry, still in phase with the run clock); music 0 / sfx 0 / restore; pause / resume in phase with nothing back-filled; background suspend creates no nodes; 12 retry cycles with no growth; crash; scene transitions (game, menu, lab, restart); track-change races (unaligned, tempo change, no `Music.play/stop` calls); loudness ceilings; **gameplay equivalence on bot runs (Lab stage with two bots, stages 1, 4, 7, 10, 12): state, score, energy, bonus, time, stars, Overdrive count, route clears, combo identical on and off**, Lab stage 14 equals campaign stage 14, deterministic, 30 / 60 / 144 fps.

Test limits worth knowing: the headless browser plays real audio nodes in real time, so tests that step many simulated seconds pace themselves with short real waits; `GameScene.aligned()` is stubbed to "playing" in most tests (the streamed music is not reliably in step in a headless browser), and `audio.html` / `scene.html` cover the real alignment.

## What was verified numerically, and what needs the Producer's ears

Verified: event counts, priorities, timings relative to the audio clock, gain ceilings (arpeggio peak 0.056 x bus; one cue's notes <= `Melody.GAIN_CEILING` 0.62; combined same-frame cue gain is about a third of the old stacked sum), ramp shapes, in-key pitches, grid alignment, resource cleanup.

**Not verified (NOT DEVICE-TESTED):** whether the arpeggio sounds good or is annoying, its loudness against the real tracks on phone speakers and earbuds, whether the music dip is audible or pumping, whether the 0.4 s stem entry feels late, the 0.4 s ledger window, the density threshold (3 in 1.5 s) against how stage 14 actually feels, any real-time latency on a device (the limiter's look-ahead is unmeasured, as before).

### For the Producer to judge on a phone

1. Does a clean run feel like you are playing the arrangement (combo 8 / 16, route clears), or is the arpeggio noise? 2. Is it too quiet / too loud over World 2's track? 3. Overdrive stem entry: smoother or too slow? 4. In the fork rows, does the layer drop out when it should? 5. Any doubled or missing sound at the big moments? If yes, set `arp: false` first.

### Gaps (requests, only after the prototype proves them)

None needed. If the arpeggio works but wants a better timbre, a short pitched pluck sample (OGG, mono, 44.1 kHz, < 0.3 s, in the world's key) would replace the triangle oscillator; not requested now.
