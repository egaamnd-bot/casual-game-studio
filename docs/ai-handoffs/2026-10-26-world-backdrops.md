# Handoff: Gemini portrait world backdrops (Phase 2A)

- Date: 2026-10-26 (UTC). Branch `feature/world-backdrops`, base `main` @ `21f4bc2` (PR #21 comet trail merged; integrated run #69 success, artifact `pulse-debug-apk-run69`).
- PR / head SHA / CI run / APK artifact: recorded in [AI_HANDOFF.md](../AI_HANDOFF.md) after the build.

## Integrated
The six 540x960 backdrops as a tile layer under the grid (arc look; arc finale on stage 10; ready for 20 and 30). Optional load, Endless unchanged. Details and mapping: [ASSET_MANIFEST.md](../ASSET_MANIFEST.md).

## Deliberately NOT integrated (see manifest)
Wall caps, mirror caps, route marks, axis tile: the shipping comet look draws these procedurally from collision numbers, and the prism/reactor caps have edges up to 6 px inside the collision edge. No collision or wall geometry was touched.

## Tests (headless Chromium; 540x960, 360x640, 412x915)
New `tests/worldart.html` (72 checks) and `?noart=1` (23): backdrop files (size, darkness, 192 px repeat so no seam), stage to backdrop mapping for all 18 stages, layering, scroll, Endless, identical results with and without the backdrop on stages 7 and 16. Full regression (assets, campaign, logic, melody, mirror, overdrive, portrait, rhythm, routes, scene, scene?noassets=1, trail): PASS. Screenshots reviewed by eye.
NOT DEVICE-TESTED: readability on a phone screen.

## Producer approval
Not required. Next: skins (4 + 21-frame atlas), then audio.
