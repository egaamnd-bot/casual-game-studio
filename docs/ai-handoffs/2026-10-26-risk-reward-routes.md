# Handoff: risk-and-reward routes (stage 4 prototype) — 2026-10-26

- Branch: `feature/pulse-risk-reward-routes`
- PR: [#17](https://github.com/egaamnd-bot/casual-game-studio/pull/17) (not merged)
- Base branch: `feature/pulse-musical-combos-overdrive` (PR #16), base SHA `32dbf3f4bf841c0b4ba9613e82268463be3be474` (verified live head at start and before opening this PR)
- Code head SHA: `2127b54ffa10d105d710ab0c3145421edd5a8bac` (handoff commits after it are docs-only)
- Dependency chain: **#9 (`3593160`, clean, awaiting review) → #15 (`576e30b`, currently GitHub "dirty" against #9's new head; needs main's docs merged after #9 lands) → #16 → #17**. Nothing approved or merged. Merge strictly in this order, each with its own exact-SHA approval.

## Summary
Fork rows: one wall, two openings, solid 64 px divider. Safe lane wide (passable at full size, 1 optional note); risk lane tight (must shrink, zig-zag, 3-4 optional mint notes) with ROUTE CLEAR (phrase + ring + one-off Overdrive award 12) when all risk notes are taken. Prototype only in stage 4 (fork A forgiving, fork B demanding, opposite sides). Per-lane fairness in `Track.validateItems` and the campaign compiler. Preview: corridor tint, chevrons, note dots, hint card. See `docs/ROUTES.md`.

## Changed files
`src/js/level.js, campaign.js, stages.js, config.js, render.js, sprite-view.js, game-scene.js, melody.js, overdrive.js`; tests `routes.html` (new), `campaign.html`, `scene.html`; docs `ROUTES.md`, `DECISIONS.md` (#15), this note, `AI_HANDOFF.md`.

## Tests (headless Chromium, software rendering; actual results)
| Page | Result |
|---|---|
| routes.html (540x960) | PASS 326 |
| campaign.html | PASS 1827 |
| scene.html (sprites + `?noassets=1`) | PASS |
| overdrive.html / melody.html / rhythm.html | PASS 1690 / 809 / 9845 |
| logic.html, assets.html, portrait.html | PASS |
| portrait, scene, assets @412x915 | PASS |
| 360x640 viewport run | UNKNOWN at time of writing (see PR comment for update) |
| gameplay.html | manual bot page; FAIL (CRASH at 3.4 s) without `?bot=1`, bot run NOT RUN to completion |
| Physical device | **NOT DEVICE-TESTED** |

## Build
CI [run #49](https://github.com/egaamnd-bot/casual-game-studio/actions/runs/40279857946): success. Artifact `pulse-debug-apk-run49` (id 12631553122), source SHA `2127b54…` (verified: run head_sha equals the code SHA).

## Changes to existing tests (disclosed)
`campaign.html` mechanic-introduction rule: a mint inside a fork (`it.route`) no longer counts as the stage-8 "greed is optional" mint; added `route: 4` introduction and a first-fork gentleness assertion. No assertion was weakened otherwise.

## Known issues / honesty notes
- Safe lane is easier than the stage's old ordinary gaps; the trade is fewer notes, smaller combo, slower Overdrive. Whether the choice feels real is unverified on a phone.
- Bots tune fairness, not feel. Audio phrase level, preview readability, performance NOT DEVICE-TESTED.
- Lane switching between rows is possible if steering allows; not designed or validated as a path.
- Endless untouched; stages 5-12 not adapted.

## Approval
Producer approval **required**: phone-test run #49 and decide. Independent review of this exact head by ChatGPT (author does not self-approve). No merge requested.

## Next recommended task
Tune from phone feedback; then extend to one middle-campaign stage (forks combined with barriers) before any Endless work.
