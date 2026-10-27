# World Shift prototype

Status: **experiment, one Lab stage. NOT DEVICE-TESTED.** Producer decision 2026-10-26, GitHub Issue #33 (master tracker #28). Open it from **LAB -> World Shift**.

## What the player sees and hears

One stage of about 65 s in three movements. Between movements the world changes, behind a signal, and a calm recovery follows each change.

| Movement | Look | Pattern family | Musical layer |
|----------|------|----------------|---------------|
| I  NEON CIRCUIT | Neon Circuit backdrop, blue lane rails (the normal world-1 look) | the drum: gap, barrier, gap, barrier | none |
| II CHROMATIC OVERDRIVE | Chromatic Overdrive backdrop, violet rails | sway and slalom: moving / breathing gaps, snaking weaves, no barriers | the world-1 Overdrive stem layered under the music |
| III PULSE COLLAPSE (finale) | Pulse Collapse backdrop, icy-white rails | a short gentle phrase: one charged flourish, then a trail of gold | stem stays |

Each shift, in order:

1. **Telegraph, 4 beats (1.92 s) before the shift.** A banner ("MOVEMENT II" / the movement name; the last one reads "MOVEMENT III - FINALE") fades in, a bright head sweeps down both lane rails drawing the NEW rail colour as it goes (it reaches the bottom exactly at the shift), and a soft ping sounds, then two more on the last two beats. The telegraph plays over a lead-in of one wide gap and notes only.
2. **Shift.** The rails are the new colour, the existing `WORLD_TRANSITION` sting plays quietly under the music (gain 0.4), the world's Overdrive stem fades in (movements II and III), and the backdrop crossfades over 4 beats (smoothstep, never a flash). Movement III also adds the existing max-multiplier sting one beat later.
3. **Recovery.** The next four items are two wide gaps (half-width 84, the same as the campaign's `wide()`) with a note after each, spaced further apart than in the movement before. No barrier, no moving gap, no gap that needs shrinking. Then the next pattern family starts.

Finishing is unchanged: the end screen says "Prototype clear" (in the finale colour), shows stars, offers Lab, and nothing is saved.

## Rules it keeps

- Presentation only. It reads `level.travelled`, `level.progress` and the compiled track; it never writes to the level, the orb, the score, collision, stars or the save. Lab runs never write the save (docs/LAB.md).
- Hazards stay readable: every layer it adds (banner, rail sweep, crossfade layer) is **behind** the gameplay layer (depth < 2), so a gate, barrier or note always draws over them. Nothing is added above the world.
- No pause of input, no tempo change: the run clock and `Music.play` are untouched (no BPM change; the stem is the 125 BPM world-1 stem and is started by the existing stem code, in phase with the run clock).
- Nothing on a timer or tween: all animation runs from the run's own `dt` inside the playing step, so pause freezes the crossfade and the telegraph, retry restarts at movement I with the original backdrop, and there is nothing to leak.
- Kept separate from the audio theme `stage.world` and from the arc mapping of docs/CAMPAIGN_30.md: the table below names its backdrops directly.

## Movement table (owned by `Pulse.WorldShift`, `src/js/worldshift.js`)

Keyed by the stage's own progress measure, `level.travelled / (finishAt + orbY)`, the one the HUD bar and the finish use. The stage DSL has no place for it, so each shift is anchored to an ITEM of the lab stage (a note that reaches the orb at the shift) and `Pulse.WorldShift.resolve(track, orbY)` turns that into `travelled` and `progress` for the screen's length:

```
{ id, numeral, name, backdrop, rail, layer, finale, travelled, progress,
  tele: { travelled, progress },              // 4 beats of distance before the shift
  recovery: { from, to, firstItem, lastItem } }   // shift moment .. last recovery item
```

Resolved values at a 960 px screen: shift I->II at progress 0.334 (23.7 s), II->III at 0.730 (about 50 s); the numbers move by under 0.01 at 860 and 1200 px (tests check all three).

## Assets reused (no new art or audio)

Backdrops `bg_portrait_w1_neon_circuit`, `bg_portrait_w2_chromatic_overdrive`, `bg_portrait_w3_pulse_collapse` (existing Gemini portrait set); sounds `telegraphPing`, `worldIntro` (WORLD_TRANSITION), `milestone`, and the world-1 Overdrive stem; the banner is code text. Rails and the sweep are code-drawn. **No asset gap.** (A hand-made short "shift" sting that is not the 4.8 s WORLD_TRANSITION, and per-movement rail art, would be nice to have but are not needed to judge the idea.)

## Contrast of hazards over the backdrops

Measured in `tests/worldshift.html` from the loaded backdrop pixels, at every 10% step of both crossfades (blended in sRGB like the renderer): the contrast ratio of the wall rim colour over the 95th-percentile backdrop pixel must stay at or above **3:1** (measured worst case about 4.9:1), and the share of pixels brighter than the rim may not exceed the worst of the six backdrops the game already ships. The amber gap strips are brighter than the rim, so they pass when the rim does. (The grid and streak layers above the backdrop are not part of this measure; they are the same as in every stage.)

## Seams in shared files (all guarded by `if (Pulse.WorldShift)`)

`src/js/game-scene.js`: `attach` after `createButtons()`; `detach` in the existing shutdown handler; `reset` after `view.spawn()` in `startRun`; `update(this, dt)` right after `this.level.update(...)` in `step`; `wantsStem` inside the `want` expression of `updateStem`; `completeStyle` after the complete-title `show(...)` (lab only). `src/index.html`: one script tag after `trail.js`. `src/js/sprite-view.js`: **not touched** (the module adds its own crossfade layer between the world backdrop and the grid and reads `view.worldBg`, `view.rails`). `config.js`, `stages.js`, `campaign.js`, `level.js`, save schema: untouched; the config block is `Pulse.CONFIG.worldShift` at the top of the module.

## Limits worth knowing

- With the code-drawn fallback (no sprites) there is no backdrop and no rails to change: the banner, pings, stings and stem layer still run.
- The stem layer reuses the Overdrive stem, so while it plays the stem cannot also be an "Overdrive" cue; Overdrive keeps working (it simply finds the stem already on). The stem only starts when the music is known to be in step with the run clock, like Overdrive. A phone listen is needed to judge the mix. The stem has its fixed 0.12 s fade-in.
- The telegraph is distance-keyed, so its lead is 1.92 s at the speed there (measured 1.8 to 2.05 s).

## Turning it off

`Pulse.CONFIG.worldShift.enabled = false`: the Lab entry still opens the stage but plays it exactly like an ordinary stage (no banner, no sweep, no crossfade, no stem layer). Removing the `worldshift.js` script tag removes the Lab entry and all hooks (every one is guarded).

## Tests (`tests/worldshift.html`)

Table valid at 860 / 960 / 1200 px (ordered, inside the stage, telegraph before shift, recovery after each, 60-75 s); recovery items from the compiled data: only wide gaps and notes, calmer (density at most 70% of the movement before, gaps further apart, wider than every shrink gap before), lead-in calm; movement families differ; backdrop contrast over every crossfade step; layers behind gameplay; at 30 / 60 / 144 fps: telegraph, shift, faded fire once each in order, at the resolved distance, lead 1.8-2.05 s, crossfade complete, cues present and quiet; crossfade alpha monotonic with no step over 0.03; rail colour per movement; stem layer starts after shift I, stops on pause, restarts, dropped on retry; pause mid-telegraph and mid-crossfade; six retries and crashes in different phases leave state reset and add no objects, textures or tweens, and no more timers than the game does without the module; finishing and leaving the scene; no save write; real stages: ids / order pinned, same state and frame-by-frame hash with and without the module on stages 1, 10 and 12; enabled vs config off vs module absent on the lab stage at 30 / 60 / 144 fps: identical state, score, energy, time, stars and hash; a Lab entry without the flag is the old game; Endless untouched.

## For the Producer to judge on a phone

Does the sweep + banner + ping read as "something is about to change" without distracting from the gates? Is 1.9 s the right lead? Does the crossfade feel smooth (not a flash)? Is the breather after each shift welcome or boring? Is the stem layer in movements II and III audible and pleasant, or muddy? Is the finale phrase a satisfying end? If it works, a future stage could carry its own movement table; if not, delete the script tag.
