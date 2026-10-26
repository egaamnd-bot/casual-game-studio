# Handoff: near-miss -> Overdrive prototype

- Branch `feature/near-miss-overdrive`, base `main` `dc55dd2` (barrier cue). PR, head SHA, CI run, APK: see the PR description / `docs/AI_HANDOFF.md` (UNKNOWN when this file was written).
- Design and rules: `docs/NEAR_MISS.md`. Stage 10 only, behind `CONFIG.graze`. 3 Overdrive units per graze, 15 per run, none during Overdrive, once per gate, decided by the swept closest approach of the real collision circle.
- Not changed: collision, orb size and rates, score, stars, saves, other stages, Endless, Overdrive rules.
- Tests: new `tests/graze.html` + all other suites (results in the PR).
- NOT DEVICE-TESTED: feel on a phone (is the reward noticeable, is 3 / 15 right, does stage 10 still feel like itself).
- Producer decision requested: play stage 10 on the APK from this PR and say keep / tune / turn off. Do not widen to other stages before that.
- Next: Campaign Batch 3 (stages 25-30).
