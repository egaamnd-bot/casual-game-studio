# Current AI Handoff

> Status snapshot. Historical handoffs live in [`docs/ai-handoffs/`](ai-handoffs/); structure per [AI_HANDOFF_PROTOCOL.md](AI_HANDOFF_PROTOCOL.md). Latest notes: [parallel prototypes kickoff](ai-handoffs/2026-10-26-parallel-prototypes-kickoff.md), [near-miss](ai-handoffs/2026-10-26-near-miss-overdrive.md), [barrier-ready cue](ai-handoffs/2026-10-26-barrier-ready-cue.md), [campaign batch 2](ai-handoffs/2026-10-26-campaign-batch-2.md), [audio pack](ai-handoffs/2026-10-26-audio-pack.md). Assets: [ASSET_MANIFEST.md](ASSET_MANIFEST.md). Master tracker: [Issue #28](https://github.com/egaamnd-bot/casual-game-studio/issues/28).

- Updated: 2026-10-26 (UTC)
- Project: PULSE
- Status: MERGED AND BUILT. Audio pack (PR #25), Campaign Batch 2 / stages 19-24 (PR #26), barrier-ready cue (PR #27), near-miss → Overdrive prototype on stage 10 (PR #34) and the Prototype Lab foundation (PR #35). THREE PROTOTYPE TRACKS IN PROGRESS IN PARALLEL (Resonance Gates #31, Shatter Symphony #32, World Shift #33), plus barrier palette comfort (#29) and Campaign Batch 3 (stages 25-30) queued on the master tracker.
- `main` @ `4b0681470131d7c4cc83f58f491e579b71d4f823` (PR #35 merge of head `461b75c`). Build history: run #81 = near-miss head `7dcab297` (Producer phone-tested); run #82 = main `0ac1aeb` (near-miss merge), success; run #83 = Lab head `461b75c`, success. Main `4b06814` (Lab merge) is built by [run #84](https://github.com/egaamnd-bot/casual-game-studio/actions/runs/40356974974), success.
- Campaign: 24 stages (worlds 1-2 complete, world 3 starts at stage 21). Stage 30 finale ("Campaign complete") not built yet.

## Evidence, by type (kept separate)
- **Automated tests (browser, headless):** near-miss head `7dcab297` full suite at 540×960, 360×640, 412×915: `graze.html` PASS at all three; every other suite PASS except (a) `gameplay.html` FAIL at all viewports — a manual-play page that fails identically on main (known, not a regression) and (b) `audio.html` at 360×640 failed one check once in a full run and passed 3 of 3 when rerun alone (test race, fixed in PR #35). Lab head (PR #35): full suite at 540×960 17/18 PASS (`gameplay.html` known); `lab.html`, `audio.html`, `portrait.html` PASS at the other two viewports; full suites for the Lab tree at 360×640 and 412×915 were run after the merge: 17/18 pages PASS at each, `gameplay.html` FAIL (known).
- **Producer phone tests:** run #49 (routes) fun and fair; the skin build worked as intended; **run #81 (near-miss prototype, stage 10) "went well"** (Producer feedback 2026-10-26). Run #81 also contains the audio pack, Batch 2 stages and barrier-ready cue, but the Producer's feedback covers the near-miss feel only: those items are NOT SPECIFICALLY DEVICE-TESTED. Mirror Pulse tuning, stages 13-24 difficulty and the comet ribbon trail beyond "worked" remain without detailed device feedback.
- **Barrier palette (#29, PR #36):** full suite at all three viewports PASS (18/18 pages incl. new `palette.html`, `gameplay.html` skipped by default in full runs from now on); NOT DEVICE-TESTED.
- **Not built / not tested:** nothing from the three new prototypes or Campaign Batch 3 exists on main yet.

## Rules in force
Claude is Lead Developer, reviewer and merge operator (self-review, full regression, exact-SHA merge, verify main build, update this file); ChatGPT is a report reviewer, not a merge gate; the Producer decides product/gameplay and releases. Prototypes are flagged and playable only from LAB until the Producer approves wider use. Browser suites share a single lock on the 2-core machine (`/home/claude/bin/pulse-test`).

## Known limitations
Mirror/route/Overdrive/graze tuning is by reasoning and bots, refined only by the Producer's phone feedback so far; echo readability and cue loudness not measured on a device; `gameplay.html` is a manual page that always fails headless; the barrier-ready corona and sound level have no specific device feedback.

## Next recommended tasks
1. Merge the three prototype PRs one at a time (each after its own checks), combined regression after each, then one combined APK for the Producer's phone assessment (keep / tune / discard per prototype).
2. Barrier palette comfort (#29), then Campaign Batch 3 (stages 25-30, `docs/CAMPAIGN_30.md`).
3. Producer decision pending: widen the near-miss graze beyond stage 10, or tune the numbers (3 per graze, 15 per run).
