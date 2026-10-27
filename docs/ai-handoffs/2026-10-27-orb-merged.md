# 2026-10-27 Orb redesign accepted and merged

- Producer decision: ACCEPT, after phone-testing APK run #127 (real-device test, tested src head `f2d706a31ab107cbb09a79af02f1c72a4ced7799`).
- PR #50 merged by exact SHA `e7c0a4fcd9c1de20872a98301278eaed694d6a95` (base was main `af84b28b`, mergeable clean, push run #131 success). `src/` and `tests/` in the PR head are identical to the tested head (compare shows no src/tests files changed; later commits are a main merge and docs). Merge commit `dc27d6390e4edc1dcf6fefc576ac2d3c821b7a74`.
- Integrated main build: run #132 on `dc27d639`: not finished when this note was written (UNKNOWN); see the run link. https://github.com/egaamnd-bot/casual-game-studio/actions/runs/40498350834
- Known: `symphony.html` has a load-sensitive audio-decay margin check that failed once under load at 540x960 and passed alone; not changed.
- Next: Producer phone test of the Gauntlet and decisions on World Shift / Symphony keep-tune-drop.
