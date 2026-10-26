# Handoff: comet-tail ribbon + Mirror echo trail (Gemini comet kit)

- Date: 2026-10-26 (UTC). Branch `feature/comet-tail-ribbon`, base `main` @ `735e02e` (PR #20, run #67 green).
- PR / head SHA / CI run / APK artifact: recorded in [AI_HANDOFF.md](../AI_HANDOFF.md) after the build (not known when this file was written).
- No unfinished Batch 2 (stages 19-24) work existed locally or on the remote; nothing to checkpoint.

## Summary
- The tail is now a curved ribbon along the orb's real recent path (`src/js/trail.js`, `SpriteView.renderComet`), with a white-hot core, short head taper, Overdrive corona and sparks shed from the curve. Mirror Pulse gets a violet echo ribbon, echo orb sprite and fold burst. Details: [COMET_TRAIL.md](../COMET_TRAIL.md).
- Gemini's comet atlas (13 frames) was verified against its PNG and registered as an optional atlas with a procedural fallback. Manifest: [ASSET_MANIFEST.md](../ASSET_MANIFEST.md).
- Gemini's stage matrix was NOT adopted: stage 13 is still Prism Sway; no stage was renamed, renumbered or replaced.
- Unchanged: controls, collision, steering, scoring, stars, skins and unlocks, stage ids, saves, Endless, audio timing.

## Tests (actual results, headless Chromium; commands: `node run.mjs <repo> <w> <h> <pages>`)
- New `tests/trail.html` (111 checks) and `trail.html?novfx=1` (69 checks, fallback path): PASS at 540x960, 360x640, 412x915. Path error vs ground truth: 0.2-2.8 px; stamps never reach ahead of the orb; 60 crash/retry cycles add no objects, textures or tweens; stages 1, 7 and 12 give identical score/stars/time/distance with and without the trail.
- Full regression at all three sizes: assets, campaign (3073), logic, melody (809), mirror (1083), overdrive (1720), portrait, rhythm (16754), routes (382), scene, scene?noassets=1: PASS.
- Existing flaky check hardened: `scene.html` "resume restores the music level" could fail about 1 run in 8 (a hit right after resume dips the music for 160 ms and the check looked after 100 ms). It now waits up to 600 ms for the level to return to 1; the assertion is unchanged. It also failed once at 540x960 and once at 412x915 during this work before the change; 8/8 passes after.
- Screenshots of S-turns, Overdrive and the Mirror echo were reviewed by eye in headless Chromium. `gameplay.html` (manual) NOT RUN.

## Not verified
NOT DEVICE-TESTED: fluidity, brightness/readability on a phone screen, GPU cost (about 52 additive sprites for the trails), battery. 60-120 fps is not claimed.

## Producer approval
Not required to merge. Please judge the look on a phone: does the tail feel fluid, is it too bright or too long, is the echo distinguishable? Tunables: `CONFIG.comet.ribbon`.

## Next
Phase 2 batches: world backgrounds and obstacle silhouettes; skins; audio. Then campaign stages 19-30.
