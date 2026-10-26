# Handoff — PULSE portrait / steering / density / musical feedback

- Updated: 2026-10-26 (UTC)
- Project: PULSE
- Status: NEEDS PRODUCER DECISION (phone test)
- Branch: `feature/pulse-portrait-trailer-rework`
- PR: [#15](https://github.com/egaamnd-bot/casual-game-studio/pull/15)
- Head commit SHA: code `4fa690a0855e37e026c0e809c23737c04d45d353`; this handoff is a later docs-only commit
- Base branch and base SHA: `feature/pulse-12-stage-campaign` @ `a4f5cf6` (PR #9; contains PR #11's rhythm work)
- Depends on PRs/issues: PR #9 (and its chain). Merge order: #9 first, then retarget #15. `main` has newer docs (handoff protocol); expect a conflict in `docs/AI_HANDOFF.md` when merging.
- Is it safe to merge now? NO — not device-tested, Producer approval pending
- Producer decision needed: PHONE TEST, then APPROVE / request changes

## Executive summary
Transforms PULSE to portrait with one-finger lateral steering (touch+hold shrink, drag steer, lift grow), re-authored denser 12-stage campaign with a reachability fairness floor, and musical hit feedback (immediate per-contact notes, per-world pentatonic palettes, combo layers, Perfect/failure sounds, targets scheduled on the beat grid). Full design: `docs/PORTRAIT_REWORK.md`; decision #14.

## Changed files
- `src/js/config.js`, `level.js`, `patterns.js`, `campaign.js`, `stages.js` — steering physics, fairness floor, density model, note rule, 12 re-authored stages
- `src/js/melody.js` (new), `sfx.js` — musical feedback
- `src/js/game-scene.js`, `sprite-view.js`, `render.js`, `menu-scenes.js`, `ui.js`, `main.js`, `src/index.html` — portrait layouts, steering input, procedural backdrop
- `.github/workflows/android-debug-apk.yml` — portrait orientation lock
- `tests/` — logic, campaign, rhythm, assets, scene, gameplay updated; melody, portrait added; landscape removed
- `docs/` — PORTRAIT_REWORK, GEMINI_MUSIC_BRIEF, DECISIONS #14, LANDSCAPE superseded note; handoff protocol files copied from `main`

## Behaviour and design impact
- Player-facing: portrait, lateral steering, denser stages, melodic hit sounds.
- Controls/gameplay/scoring/save compatibility: hold-to-shrink/release-to-grow kept; **intentional change: gold/mint notes collect at any size**; stage ids, star thresholds, score values, save format unchanged (tested).
- Visual/audio/performance: procedural grid/streak backdrop; frame-rate independent steering (tested 30/60/144 fps); real-device performance NOT DEVICE-TESTED.

## Validation evidence
| Check | Command / workflow | Result |
|---|---|---|
| logic | headless Chromium, `tests/logic.html` | PASS |
| campaign | `tests/campaign.html` | PASS 1791/1791 |
| rhythm | `tests/rhythm.html` | PASS 9669 |
| melody | `tests/melody.html` | PASS 809 |
| assets | `tests/assets.html` | PASS |
| scene | `tests/scene.html` | PASS (failed at baseline in this environment; now steps the scene by hand) |
| portrait | `tests/portrait.html` at 540×960, 360×800, 412×915, 540×1170, 768×1024 | PASS |
| CI | [run #43](https://github.com/egaamnd-bot/casual-game-studio/actions/runs/40263953567) | success @ `4fa690a` |
| Device test | — | NOT DEVICE-TESTED |

## Android artifact
- APK: artifact `pulse-debug-apk-run43` — https://github.com/egaamnd-bot/casual-game-studio/actions/runs/40263953567/artifacts/12625054447
- Source SHA: `4fa690a0855e37e026c0e809c23737c04d45d353` (verified from the workflow run). Later docs-only commits trigger new runs; their APKs contain identical game code.
- APK internals not inspected (download blocked in this environment): UNKNOWN beyond the CI result.

## Known limitations and risks
- Steering feel, music/run sync (0.15 s tolerance) and note latency on Android NOT DEVICE-TESTED.
- Density target (20–30% shorter) met only on stages 1–4 and 11; others 8–19%.
- Endless not beat-aligned; rings disabled; trailer music not integrated (rights unknown); procedural visuals, no new Gemini art.

## Remaining work
Phone-test feedback; tune steering gain/limits; possibly more density once steering feel is confirmed; Gemini music pack (optional); retarget PR after #9 merges; resolve conflict with `main` docs.

## What the producer should check on phone
Portrait fit/safe areas; steering naturalness while holding; lift-to-grow while steering; density fairness stages 1–12; notes immediate and on beat; combo melody; Perfect/failure sounds; volume sliders; pause/resume/retry; frame rate.

## Explicit decision requested
Approve the portrait direction and "notes collectable at any size", or request changes, after phone-testing run #43. No merge is requested.

## Next recommended task
Apply phone feedback to steering and density; then Gemini music pack integration.
