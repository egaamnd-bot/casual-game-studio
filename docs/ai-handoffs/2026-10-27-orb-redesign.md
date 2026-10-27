# 2026-10-27 Player orb redesign (Issue #42)

- Branch `feature/orb-redesign`, base main `af84b28b` (docs) / code base `2147b2c7`. Tested src head `f2d706a31ab107cbb09a79af02f1c72a4ced7799`; later head adds only a merge of main and these docs (src/ and tests/ identical, verified by diff).
- Change (visual only, `src/js/sprite-view.js`, `src/js/config.js` flag `comet.symmetricOrb`): removed the attached taper and fine streak (running path is the comet atlas renderer, not the sprite fallback); round disc (stretch cut to 20%, still covers the collision circle); crisp rim plus eight-segment slowly rotating halo; ribbon wake fades in from the orb edge so it reads as a separate afterimage. No change to coordinates, collision radius, controls, thresholds, stages, scoring, stars, saves or audio.
- Tests: new `tests/orb.html` 19 checks (also verified to FAIL with the flag off). Full suite on f2d706a: 540x960 25 pass / 1 fail, 360x640 26/26, 412x915 26/26 (counts include orb.html). The 540x960 failure was `symphony.html` "leaving mid-entry starts from the entry's level (0.927)", a wall-clock audio-decay margin; rerun alone on the same head: PASS 146 checks. Treat as a load-sensitive flake (orb change does not touch audio); not fixed here.
- Screenshots (before/after, 540x1200) checked by eye; automated layouts at 540x960, 360x640, 412x915.
- APK: run #127 (success) on f2d706a, artifact `pulse-debug-apk-run127`. NOT DEVICE-TESTED.
- Producer decision requested: phone-test run #127 and say accept / tune (halo, rim, wake gap) / revert. Not claimed accepted. Merge only after that.
