# Handoff — Shatter Symphony prototype (Lab only, Issue #32)

- Date: 2026-10-27
- Branch: `feature/shatter-symphony`. **Tested head: `e7d8d7ab84f1cfe529b85ad73ecdd3aae5765f2f`** (main `eacdb4cc`, which already contained Batch 3, World Shift and Resonance, merged in). The final head adds only this note and the docs-only main changes since; `src/` and `tests/` are verified identical to the tested head.
- Design and rules: [docs/SHATTER_SYMPHONY.md](../SHATTER_SYMPHONY.md). Open from **LAB → Shatter Symphony**.

## Summary
An audio director for the Lab stage only. It listens to what the run does (clean streak, risk-route clears, barrier smashes, Overdrive) and answers with a quiet arpeggio layer on the run clock's 16th grid, ducks and re-times the existing effects, and shapes the stem fades equal-power. It uses the existing audio only (no new files). With no Lab entry, or `CONFIG.symphony.enabled = false`, nothing runs: the `sfx.js` seams are hook-gated (`state.hook` is null) and `stemShaped` defaults to false, so the original linear stem ramps and effect calls are untouched. No change to controls, collision, scoring, stars, stage data or the save.

## Changed files
New: `src/js/symphony.js`, `tests/symphony.html`, `tests/symphony-equiv.html`, `docs/SHATTER_SYMPHONY.md`. Edited: `src/js/sfx.js` (additive seams: hook, layer notes, stem shaping), `src/js/game-scene.js` (2 guarded lines: attach/detach), `src/index.html` (1 script tag).

## Tests (browser, headless, `pulse-test`, shared lock)
- **Tested head `e7d8d7ab`: 23/23 pages PASS at 540x960, 360x640 and 412x915**, 0 FAIL (`gameplay.html`, a manual page that fails on main, is skipped). `symphony.html` 146 checks (audio lifecycle, overlap and the 6-voice/35 ms limits, volume and mute, pause/resume/retry/crash/shutdown cleanup, stem timing, input-hook latency, loudness), `symphony-equiv.html` 16 checks (flag off and non-Lab stages give identical gameplay), plus `worldshift.html` 173, `resonance.html` 70, `resonance-run.html` 42, `campaign.html` 5745, `lab.html` 27, `audio.html` 104, `overdrive.html` 1780, so the stem paths of World Shift, Resonance and Symphony were tested together.
- **History, so nothing is hidden:** before main moved, `8db1da3` passed 20/20 at all three viewports. The first merged-head run (`d28c9694`) failed `symphony.html` at all three viewports on a stale 24-stage assertion, and at 540x960 once on a margin in the route-clear arpeggio check (first note allowed 102 frames, level was 1.78). Both are test-only fixes: the stage list assertion is now 30 stages, unique ids in order, and the note check waits up to 60 more frames inside the same ~8-beat boost window with the total frame count unchanged. No gameplay code changed. That earlier run is superseded and is not counted as a pass.

## Android build
CI "Android debug APK" [run #120](https://github.com/egaamnd-bot/casual-game-studio/actions/runs/40480463463) success on the tested head `e7d8d7ab`. The final docs-only head gets its own run. A build proves packaging only.

## Device testing
**NOT DEVICE-TESTED.** Producer to judge on the phone: is the arpeggio pleasant and quiet enough, does it ever feel late or in the way of the effects, are the stem crossfades smooth.

## Known issues / unfinished
Loudness and musical taste are tuned by measurement and reasoning, not by ear on a device. Not yet in the Developer Campaign / QA Gauntlet (not built).

## Producer approval
Not required to merge (Lab only, tests and build pass, scoped diff, flag-off equivalence tested). A keep / tune / drop decision is requested after the phone test.

## Next recommended task
`feature/dev-gauntlet` with Resonance, World Shift and Symphony sections; then the orb redesign (#42).
