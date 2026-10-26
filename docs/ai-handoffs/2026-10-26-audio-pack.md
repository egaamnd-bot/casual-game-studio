# Handoff: Gemini audio pack (Phase 2C)

- Branch `feature/audio-gemini-pack`, base `main` @ `e42fbe0`. PR, head SHA, CI run and APK artifact: see the PR description / `docs/AI_HANDOFF.md` (UNKNOWN when this file was written).
- Integrated: 10 OGG one-shots + 3 world Overdrive stems (table in `docs/ASSET_MANIFEST.md`). Not integrated: `sfx_mirror_sync_pulse`, `sfx_pickup_chain_sparkle` (duplicate cues). WAV masters stay out of the repo.
- Design: samples are short layers (gain 0.6-0.65) on combo 4/8/16, route clear, fork discover, Mirror warning/appear/exit, Overdrive on/off; the melody phrases are untouched. Stems decode on demand per world, start in phase with the run clock, stop on pause/crash/clear/retry/mute/end, play only if the stage bpm fits (16 beats).
- Fix: `Music.play` early-return and `Music.duck` could cancel a pending track change and leave `started=false`; now guarded.
- Tests: new `tests/audio.html` (104 checks: file decode/length/peak/level, ending click, no WAV or unwired file fetched, event wiring once per event, melody still plays, samples/stems off switches, stem phase/pause/resume/crash/mute/tempo-mismatch/worlds 1-3, 15 retries decode nothing, voice cap, identical gameplay with the pack on/off on stages 1, 4, 7, 9). All other suites PASS at 540x960 and 360x640 (gameplay.html manual, known). `assets.html` now decodes 53 sounds.
- NOT DEVICE-TESTED: balance and taste. Tuning knobs: per-sample `gain` in `sfx.js` SFX table, `STEM_LEVEL`, `CONFIG.audioPack`.
- Missing from Gemini's proposal (not supplied): alternate base loops, finale tracks, world/campaign completion stings, completion UI art.
- Producer approval: none needed. Next: campaign Batch 2 (stages 19-24).
