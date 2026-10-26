# Decision Log

Approved decisions only. Recommendations and open proposals belong in GitHub Issues or PR comments until the human producer approves them.

Add new entries at the top.

| # | Date | Decision | Approved by | Link |
|---|------|----------|-------------|------|
| 17 | 2026-10-26 | **30-stage campaign** (producer brief, milestone 3): the 12 shipped stages stay as the foundation (ids, order, saves unchanged); stages 13-30 are appended in three batches. Because the shipped worlds are 4/4/4, **progression worlds ("arcs") of ten stages** drive stage select, banners, look and finales, while each stage's `world` stays its audio theme, so legacy stages sound and play identically. Default the Producer may change: arcs 1-3 = stages 1-10 / 11-20 / 21-30. Batch 1 (stages 13-18) built. Not phone-tested. | Producer brief; Claude (design default) | [CAMPAIGN_30.md](CAMPAIGN_30.md) |
| 16 | 2026-10-26 | **Mirror Pulse** (producer brief "Mirror Break", milestone 2): a short telegraphed event in stage 7 in which an echo orb mirrors the player across the lane centreline (`echoX = 2 * centre - playerX`) and the hazards are laid out as mirrored pairs. Prototype only: stage 7, two zones. The event never pays rewards of its own; stage ids, stars, scoring, Overdrive and the save format are unchanged. Not yet phone-tested. | Producer brief; Claude (implementation) | [MIRROR.md](MIRROR.md) |
| 15 | 2026-10-26 | **Risk-and-reward routes** (producer brief "Next feature"): a fork row is one wall with two openings and a divider; the safe lane is wide with few optional notes, the risk lane is tighter with more notes and a one-off Overdrive award when fully collected. Prototype in stage 4 only (two forks, forgiving then demanding). Controls, collision rules, scoring, stars, stage ids and the save format are unchanged; route notes are optional mint notes and never count for stars. **Status: built, awaiting independent review and phone test; not merged.** | Producer brief; approval pending | [ROUTES.md](ROUTES.md) |
| 14 | 2026-10-26 | **Portrait transformation** (producer brief "Full trailer-inspired gameplay transformation"): portrait gameplay and menus, one-finger lateral steering on top of hold-to-shrink / release-to-grow, denser and fairer obstacle layouts, musical hit feedback. Supersedes #9 (landscape) for the new branch only; the landscape build stays in history. Intentional rule change: **gold notes are collected at any orb size** (no longer "must be full size"). Barriers, charged barriers, scoring, stage ids, star thresholds and save format are unchanged. Not merged; awaits Producer phone test and approval. | Human Producer (brief); merge NOT approved | [PORTRAIT_REWORK.md](PORTRAIT_REWORK.md) |
| 13 | 2026-10-25 | Monetization **after** gameplay and content are polished. Target audience: children and teens with general appeal, which means Google Play Families requirements apply. Nothing implemented. | Human Producer | [MONETIZATION_FUTURE.md](MONETIZATION_FUTURE.md) |
| 12 | 2026-10-25 | Campaign expands to **12 stages** (3 worlds × 4); balanced priority across gameplay, content and reliability; electronic/synthwave music. Original three stage ids, stars, unlock order and saves preserved. | Human Producer | [CAMPAIGN.md](CAMPAIGN.md) |
| 11 | 2026-10-25 | Integrate Gemini's v4.0 art and audio pack: three worlds, two new cosmetic skins (12★ / 15★), original synthwave music and sound effects | Human Producer | [AUDIO.md](AUDIO.md) |
| 10 | 2026-10-25 | Integrate Gemini's v3.0 asset pack (charged barriers, charge ring, effects, landscape backgrounds and UI), with art scaled to the tested gameplay sizes | Human Producer | [LANDSCAPE.md](LANDSCAPE.md) |
| 9 | 2026-10-25 | **Orientation: landscape.** Obstacles travel right to left, orb toward the left, landscape HUD and menus, Android locked to landscape. Gameplay mechanics, difficulty, scoring, charge duration, collision, stage ids, stars, unlocks and saves unchanged. Replaces the portrait layout. | Human Producer | [LANDSCAPE.md](LANDSCAPE.md) |
| 8 | 2026-10-25 | Integrate Gemini's v2.0 asset pack by **scaling the art to the current tested gameplay sizes** (no collision or timing changes). Keep existing scoring (no +100/+250 values). Gold = standard energy, mint = bonus. | Human Producer | [ART_BIBLE.md](ART_BIBLE.md) |
| 7 | 2026-10-25 | Art direction: **Direction A, Kinetic Vector / Precision Cyber-Grid** (Gemini). Artwork stays provisional until integrated and tested on the phone. | Human Producer | [ART_BIBLE.md](ART_BIBLE.md) |
| 6 | 2026-10-25 | Game structure: **Campaign + existing Endless**; gradual difficulty; stars (1 = finish, 2 = 60% energy, 3 = 90% energy); cosmetic orb skins (Solar Flare 3★, Void Prism 6★, Retro Green 9★; names provisional). First scope: a data-driven stage system and 3 stages. No shop, purchases or ads. | Human Producer | [CAMPAIGN.md](CAMPAIGN.md) |
| 5 | 2026-10-25 | Android pipeline **provisionally validated**: the GitHub Actions debug APK installed and ran on the producer's Android phone (matching touch-down/up counts, about 61 FPS). Future changes must keep this build working. | Human Producer | [ANDROID_PIPELINE_TEST.md](ANDROID_PIPELINE_TEST.md) |
| 4 | 2026-10-25 | Game concept for the first prototype: **Pulse** (hold to shrink, release to grow), with the prototype scope as proposed. Placeholder art until Gemini's art direction is approved. | Human Producer | [PULSE_PROTOTYPE.md](PULSE_PROTOTYPE.md) |
| 3 | 2026-10-25 | **Provisional** technology direction: Phaser 3 + JavaScript, wrapped with Capacitor, Android builds on GitHub Actions. Becomes final only after the Android build pipeline is validated on a physical phone. | Human Producer | TODO: link PR / issue |
| 2 | 2026-10-25 | Strategy: arcade-first, Android-first. A small, polished, highly replayable game inspired by the simplicity of Flappy Bird and Geometry Dash without copying their distinctive designs or mechanics. iOS deferred. | Human Producer | TODO: link PR / issue |
| 1 | 2026-10-25 | Adopt the team roles and operating rules in `AI_TEAM.md` | Human Producer | [AI_TEAM.md](../AI_TEAM.md) |

## Constraints

- Tools limited to Claude, Gemini, ChatGPT, and GitHub unless the producer approves otherwise.
- No software installs or costs without producer approval.

## Pending Decisions

- Gameplay variety v1 (cyan barriers, pattern-based Endless, redesigned stages, Endless mint-miss no longer resets the multiplier): built on `feature/pulse-gameplay-variety` (`648dcf5`); the producer reported it fun on the phone ([GAMEPLAY_VARIETY.md](GAMEPLAY_VARIETY.md))
- Gameplay evolution v2 (charged barriers with charge ring, combo sequences with recovery, multiplier milestones, stage refinements): built on `feature/pulse-gameplay-evolution`, awaiting phone playtest ([GAMEPLAY_EVOLUTION.md](GAMEPLAY_EVOLUTION.md)). Pulse Fields deferred.

- Pulse as the commercial game (after playtesting the prototype and campaign)
- Final technology stack (pipeline provisionally validated; see #5)
- Android app ID: currently `com.casualgamestudio.pipelinetest`. It must be final before the first Play Store upload, because it can't change afterwards
- Phaser 3.90.0 is the final Phaser 3 release; whether to move to Phaser 4 later
- Art and audio direction (art bible)
- Monetization model
- License
