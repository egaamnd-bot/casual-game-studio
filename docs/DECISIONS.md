# Decision Log

Approved decisions only. Recommendations and open proposals belong in GitHub Issues or PR comments until the human producer approves them.

Add new entries at the top.

| # | Date | Decision | Approved by | Link |
|---|------|----------|-------------|------|
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
