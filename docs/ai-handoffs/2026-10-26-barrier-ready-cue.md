# Handoff: barrier-ready cue

- Branch `feature/barrier-ready-cue`, base `main` after Batch 2 (`ca46b33`). PR, head SHA, CI run, APK: see the PR description / `docs/AI_HANDOFF.md` (UNKNOWN when this file was written).
- Audit result and design: `docs/BARRIER_CUE.md`. The rule `r > R - sizeTolerance` (radius 48) is unchanged and is the single source for both collision and the cue.
- Player-visible: thin corona + white-hot core on the orb while it could smash the barrier ahead; one short existing sound per plain barrier. Switch: `CONFIG.barrierCue`.
- Tests: new `tests/barriercue.html` (92 checks) + all other suites (see PR). Visual check: headless screenshots of ready (radius 56), exactly at the threshold (48, no cue, red barrier), 48.5 (cue), 30 (no cue).
- NOT DEVICE-TESTED: whether the corona is noticeable but not distracting on a phone; sound level.
- Producer approval: none needed to merge. Please judge the cue on the phone.
- Next: isolated near-miss -> Overdrive-charge prototype on its own branch (Issue #24, priority B), then Batch 3.
