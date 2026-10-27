# 2026-10-27 Developer Gauntlet (QA)

Branch: `feature/dev-gauntlet` (base main 938d3e37). PR / head SHA / run / APK: filled in on the PR and in `docs/AI_HANDOFF.md` once pushed and built (UNKNOWN in this file until then; the PR description is authoritative for the exact tested head).

Summary: QA-only Gauntlet reachable from the LAB, nine curated sections (core, hazards, barriers, routes, mirror, near-miss, Resonance, Shatter Symphony, World Shift) through the real game systems, direct select, retry, next-section chaining, per-section proof line. No save/score/star/unlock changes, no stage ID changes, flags are per-run and torn down.

Changed: new `src/js/gauntlet.js`, `src/js/gauntlet-scene.js`, `tests/gauntlet.html`, `tests/gauntlet-off.html`; guarded hooks in `game-scene.js`, `lab-scene.js`, `main.js`, `index.html`; `docs/DEV_GAUNTLET.md`.

Tests so far: `gauntlet.html` PASS 124 checks and `gauntlet-off.html` PASS 7 checks at 540x960. Full suite at three viewports: NOT RUN yet when this note was written. APK: NOT BUILT. NOT DEVICE-TESTED.

Producer approval: none needed to continue; merge only after the full suite and exact-head APK. Device test of the Gauntlet is requested after the APK exists.
Next: orb redesign (Issue #42) on a separate branch.
