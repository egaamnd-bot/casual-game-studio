# Handoff: campaign Batch 2 (stages 19-24)

- Branch `feature/campaign-batch-2`, base `main` @ the audio-pack merge. PR, head SHA, CI run and APK artifact: see the PR description / `docs/AI_HANDOFF.md` (UNKNOWN when this file was written).
- Added stages 19 Off-Beat, 20 Chromatic Overload (arc 2 finale), 21 Static, 22 Fracture, 23 Feedback, 24 Cascade, appended; ids, order, saves, unlocks of 1-18 unchanged. Table of measured values and deviations: `docs/CAMPAIGN_30.md` ("Batch 2 as built").
- Also: "World n complete" clear panel + sting on stage 10 / 20 (and 30 later); test updates: mirror/route stage lists now include 20, 22, 23; stage 20 allowed one zone / one fork; world art mapping for stages 20-24.
- Tests: campaign 4364 checks (validation, perfect/cautious/sloppy bots at six lengths, 30/60/144 fps, difficulty curve, distinct profiles), mirror 1219, routes 470, worldart 90, plus all other suites (see the PR for the viewport results). `gameplay.html` manual (known).
- Limits: all bot-tuned, NOT DEVICE-TESTED; Mirror stages 20/23 depend on the unplayed-on-phone Mirror Pulse; stage 20 is 48 s (design said 70) and 23 is 27 s; speeds capped at 430 for zone stages.
- Producer decision: none required to merge. Please phone-test stages 19-24 (feel, fairness of 21's narrow gates, 22's forks, 23's pinch).
- Next: barrier-ready feedback PR, then the isolated near-miss experiment, then Batch 3 (25-30).
