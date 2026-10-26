# Handoff — Musical Combos + Overdrive

- Updated: 2026-10-26 (UTC)
- Project: PULSE
- Status: NEEDS PRODUCER DECISION (phone test)
- Branch: `feature/pulse-musical-combos-overdrive`
- PR: [#16](https://github.com/egaamnd-bot/casual-game-studio/pull/16) (not merged)
- Head commit SHA: code `7f91a5540705151ca72f95a8127000cefa5e78ea`; this handoff is a later docs-only commit
- Base branch and base SHA: `feature/pulse-portrait-trailer-rework` @ `576e30bdc641b56e83f8da473ae81946dc8edcff` (PR #15)
- Depends on PRs/issues: **PR #9 → PR #15 → PR #16**, merge in that order only. None is approved for merge.
- Is it safe to merge now? NO — not device-tested; Producer approval pending; dependencies unmerged
- Producer decision needed: PHONE TEST, then APPROVE / CHOOSE OPTION (tuning numbers)

## Executive summary
Adds a musical combo progression (milestones at 4 / 8 / 16 with in-key layers) and an automatic Overdrive state (6 s) charged by successful play, with a compact HUD meter, brighter comet/world and richer contact sounds. Feedback only: collision, controls, obstacles, difficulty, score, stars, saves unchanged. Spec: `docs/OVERDRIVE.md`.

## Changed files
- `src/js/overdrive.js` (new) — pure meter/activation/expiry/milestone rules
- `src/js/melody.js` — milestone phrases, Overdrive accents, gain budget; chord layers now use scale degrees (stay in key)
- `src/js/sfx.js` — layer time offsets (`at`), soft limiter on the effects bus
- `src/js/game-scene.js` — wiring (contact → charge/melody/milestone), HUD bar, state resets
- `src/js/sprite-view.js` — Overdrive/milestone visuals
- `src/js/config.js` — `overdrive`, `combo` settings; `src/index.html` — script tag
- `tests/overdrive.html` (new), `tests/scene.html`, `tests/melody.html`, other pages (script tag)
- `docs/OVERDRIVE.md`, this note, `docs/AI_HANDOFF.md`

## Behaviour and design impact
- Player-facing: combo layers at 4/8/16, Overdrive meter and 6 s state.
- Controls/gameplay/scoring/save compatibility: unchanged (tests: identical bot run/gold/score with and without Overdrive; no Overdrive data in saves). No Overdrive score bonus by design.
- Visual/audio/accessibility/performance: brighter comet and rails, faster backdrop streaks, fuller chords; limiter added to SFX bus. Device performance and loudness NOT DEVICE-TESTED.
- Intentional documented changes: melody chord layers moved onto scale degrees (previously fixed intervals could leave the key); bonus bell partial now an octave multiple.

## Validation evidence
| Check | Command / workflow | Result |
|---|---|---|
| logic | headless Chromium `tests/logic.html` | PASS |
| campaign | `tests/campaign.html` | PASS 1791/1791 |
| rhythm | `tests/rhythm.html` | PASS 9669 |
| melody | `tests/melody.html` | PASS 809 |
| overdrive (new) | `tests/overdrive.html` | PASS 1690 |
| assets | `tests/assets.html` | PASS |
| scene | `tests/scene.html` | PASS |
| portrait | `tests/portrait.html` at 540×960, 360×800, 412×915, 540×1170, 768×1024 | PASS (all five) |
| CI | [https://github.com/egaamnd-bot/casual-game-studio/actions/runs/40273594635](https://github.com/egaamnd-bot/casual-game-studio/actions/runs/40273594635) (run #46) | success @ `7f91a55` |
| Device test | — | NOT DEVICE-TESTED |
The full regression ran on the code before the last commit `7f91a55`, which only added two assertions to `tests/scene.html`; `scene.html` was re-run after that and passes. Tuning data (bot, clean play): 1–2 Overdrives per stage, first at 11–21 s, active 16–29% of the run.

## Android artifact
- APK: artifact `pulse-debug-apk-run46` — https://github.com/egaamnd-bot/casual-game-studio/actions/runs/40273594635/artifacts/12629059930
- Source SHA: `7f91a5540705151ca72f95a8127000cefa5e78ea` (verified from the workflow run). Later docs-only commits trigger new runs with identical game code.
- APK contents not inspected: UNKNOWN beyond the CI result.

## Known limitations and risks
- Not device-tested: loudness/clipping on phone speakers, limiter latency (a few ms look-ahead, unmeasured), glow readability in daylight, frame rate.
- Thresholds tuned with a bot; humans may differ.
- Endless is not beat-aligned.

## Remaining work
Phone feedback; tune charge rates, duration and loudness; possibly an optional bounded Overdrive score bonus if wanted (not built); Gemini music pack.

## What the producer should check on phone
Meter pace; 4/8/16 layers restrained → energetic → rewarding, not noisy; any input/note latency; glow readability and no obstruction of hazards; 6 s length; frame rate; pause/resume/retry mid-Overdrive.

## Explicit decision requested
Approve the Overdrive/combo feel, or name the numbers to change, after phone-testing run #46. No merge is requested.

## Next recommended task
Apply phone feedback to tuning, then the Gemini music pack.
