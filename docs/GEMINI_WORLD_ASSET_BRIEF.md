# Gemini brief: assets for the 30-stage campaign (Milestone 3)

Coding does **not** wait for this. Batches 1-3 ship with the existing art and music, labelled provisional. Everything below is what is *missing*; do not repaint what exists. Design context: [CAMPAIGN_30.md](CAMPAIGN_30.md). Direction stays Kinetic Vector / Precision Cyber-Grid ([ART_BIBLE.md](ART_BIBLE.md)) and electronic/synthwave audio.

## What exists and will be reused
Per world: far / mid / foreground-rail parallax layers (`bg_worldN_far|mid|fg_rail`), intro banner (`bg_worldN_intro_banner`), a gameplay music track (125 / 133 / 140 bpm), the menu theme, stage plates (a frame colour per world), obstacle, orb, note and effect atlases, UI atlas.

## Why more is needed
The campaign grows from three 4-stage worlds to three 10-stage worlds. One background and one music loop per ten stages will feel repetitive, and the three finales need their own moments.

## Art requests (priority order)
1. **World variants (6 images, 2 per world)**: a second and third *far + mid* background pair for each world (same palette, key shapes and parallax speeds, different composition) so stages 1-10 / 11-20 / 21-30 can rotate looks without leaving the world. Same dimensions as the existing layers (see the files in `src/assets/backgrounds/`). Arc 3 variants should feel progressively more "collapsing" (broken rails, glitch fragments), never darker than the hazards' contrast allows. **Acceptance:** hazards and the orb read clearly over each variant in a screenshot at 540x960, with no area brighter than the notes.
2. **Finale banners and completion plates (3 + 1)**: "WORLD 1 COMPLETE", "WORLD 2 COMPLETE", "WORLD 3 COMPLETE" banners in the style of the existing intro banners, plus one "CAMPAIGN COMPLETE" plate for stage 30. No new text outside the plate. **Acceptance:** legible at 400 px wide.
3. **Mechanic chips (6 icons, 48x48 px)** for stage tiles: mirror, route, charge, tunnel, sway, mint. Single-colour glyphs in the UI atlas style. **Acceptance:** distinguishable at 24 px.
4. **Finale effects (non-flashing)**: a slow build "aura" ring and a soft release burst for the finale drop, as atlas frames; no full-screen flashes, nothing that hides hazards.
5. **Stage tiles for ten per page (optional)**: compact horizontal plates (about 230x84) per world in place of the 280x320 plates, if the compact layout is wanted. Until then the existing plates are scaled.

## Audio requests (priority order)
1. **One alternate gameplay loop per world (3)**: same tempo and key as the world's current track (125 BPM Bb major, 133 BPM D minor, 140 BPM A minor), different arrangement, 32 bars, seamless. Used by the later stages of each world. Same format as [GEMINI_MUSIC_BRIEF.md](GEMINI_MUSIC_BRIEF.md).
2. **Three finale tracks (stages 10, 20, 30)**: 128 / 136 / 140 BPM, keys Bb major / D minor / A minor, a build and a drop, about 90 s, seamless end for the final loop; stage 30 may add a victory sting. No dense lead melody (the game plays melody on contact).
3. **Three world-complete stings and one campaign-complete sting** (2-4 s).
**Acceptance:** loops for 10 minutes without a click or beat shift; levels match the existing tracks (about -14 LUFS, true peak <= -1 dBFS).

## Technical notes for integration
Filenames follow the existing patterns (`bg_world1_far_b.png`, `bg_world1_mid_b.png`, `WORLD_1_GAMEPLAY_B.ogg`, `FINALE_1.ogg` ...). Keep the atlas frame naming style. Report each file's size and, for audio, BPM, key and bar count.
