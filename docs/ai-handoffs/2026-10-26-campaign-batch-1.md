# Handoff: Milestone 3, design + Batch 1 (stages 13-18)

- Date: 2026-10-26 (UTC)
- Branch: `feature/campaign-30-design`; base `main` (`4cd335c`)
- PR / head SHA / CI run / APK artifact: recorded in [AI_HANDOFF.md](../AI_HANDOFF.md) and the PR once the build finishes (not known at the time of writing this file).

## Summary
- Complete 30-stage design: [CAMPAIGN_30.md](../CAMPAIGN_30.md); Gemini art/audio brief: [GEMINI_WORLD_ASSET_BRIEF.md](../GEMINI_WORLD_ASSET_BRIEF.md) (coding does not wait on it).
- Ten-stage progression arcs (Neon Circuit, Chromatic Overdrive, Pulse Collapse) drive stage select (10 per page, arrows), banners and looks; stage `world` still selects the music. DECISIONS #17.
- New stages 13-18: Prism Sway (counter-sway), Safe or Sorry (two route forks), Bend (tunnels into charged barriers), Echo Chamber (three mirror zones), Charge Chain, Mint Rush. All world-2 audio, speeds 360-430 px/s.
- New validator rule: a route's lane note may not follow its last row.
- Unchanged: controls, collision, scoring, star thresholds, stage ids of stages 1-12, save format, Endless.

## Changed files
`src/js/stages.js`, `campaign.js`, `game-scene.js`, `assets.js`, `menu-scenes.js`; tests `campaign`, `routes`, `mirror`, `rhythm`, `assets`, `scene`; docs above.

## Tests (actual results, headless Chromium)
Commands: `node run.mjs <repo> <w> <h> assets campaign logic melody mirror overdrive portrait rhythm routes scene scene?noassets=1`.
- 540x960, 360x640, 412x915: all PASS (campaign 3073, mirror 1083, routes 382, overdrive 1720, melody 809, rhythm 16754, assets 112 frames / 43 sounds, scene incl. stages 13-18 played by the bot with pause/resume and three stars).
- One run of `scene.html?noassets=1` at 540x960 failed `resume restores the music level and releases the hold` (a real-time 100 ms wait, directly after a 68 s assets run); 4 immediate reruns PASS and the code path is untouched. Treated as a timing flake, UNPROVEN cause.
- `gameplay.html` (manual) NOT RUN. Frame rates other than the stepped 60 fps scene tests: campaign bots at 30/60/144 fps via the campaign suite only.

## Known issues / unfinished
- NOT DEVICE-TESTED: feel, readability of the arc banners and stage-select page, durations (29-43 s).
- Stages 19-30, world-finale moments (10/20/30) and Gemini art/audio not yet built.

## Producer approval
Not required to merge. Optional decision: confirm the arc split 10/10/10 (default) vs. alternatives.

## Next recommended task
Batch 2: stages 19-24.
