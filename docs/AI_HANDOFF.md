# Current AI Handoff

> Status snapshot. Historical handoffs live in [`docs/ai-handoffs/`](ai-handoffs/); structure per [AI_HANDOFF_PROTOCOL.md](AI_HANDOFF_PROTOCOL.md). Latest notes: [parallel prototypes kickoff](ai-handoffs/2026-10-26-parallel-prototypes-kickoff.md), [near-miss](ai-handoffs/2026-10-26-near-miss-overdrive.md), [barrier-ready cue](ai-handoffs/2026-10-26-barrier-ready-cue.md), [campaign batch 2](ai-handoffs/2026-10-26-campaign-batch-2.md), [audio pack](ai-handoffs/2026-10-26-audio-pack.md). Assets: [ASSET_MANIFEST.md](ASSET_MANIFEST.md). Master tracker: [Issue #28](https://github.com/egaamnd-bot/casual-game-studio/issues/28).

- Updated: 2026-10-27 (UTC)
- Project: PULSE
- Status: PLAYER ORB REDESIGN ACCEPTED by the Producer (phone-tested APK run #127) and MERGED (PR #50, merge `dc27d639`). Developer Gauntlet merged earlier (PR #48); Gauntlet, World Shift and Symphony remain NOT DEVICE-TESTED (run #126 APK has them). 
- `main` @ `2147b2c74252d413f085d3007a99df052da1f72e` (merge of PR #48). Integrated main build: [run #126](https://github.com/egaamnd-bot/casual-game-studio/actions/runs/40491389525) success. Gauntlet tested head `84fd3a329f6c4f83fd0bd0058ddd13a21f5e23f2`: full suite 25/25 pages at 540x960, 360x640 and 412x915, 0 failures; push-build APK run #125 on that head. Merged `src/` and `tests/` equal the tested head (merge commit only).
- Campaign: 30 stages (worlds 1-3 complete; stage 30 "Pulse Zero" shows "Campaign complete"). Stages 1-24 untouched. Stages 25-30 are bot-tuned; the Producer's run #107 phone test is positive overall, with no stage-specific numbers recorded. One test rule was loosened on purpose: a Mirror Pulse stage is capped at floor(560/1.3) = 430 px/s (`tests/campaign.html`, PR #41).

- **Device status (2026-10-27):** Producer phone-tested Batch 3 (run #107, positive) and the OLD Resonance head (run #105, "went good no issue"). **World Shift, Resonance (merged head) and Shatter Symphony are NOT DEVICE-TESTED**; run #122 contains all of them (LAB menu). Test-only fixes found during integration: stale 24-stage assertions in `resonance.html` and `symphony.html`, and a margin in the Symphony route-clear note check (details in the dated notes).
- **Developer Campaign / QA Gauntlet (Decision #25): BUILT and merged (PR #48).** Open it from the LAB. Checklist table of mechanic, section, trigger and expected proof: [DEV_GAUNTLET.md](DEV_GAUNTLET.md). A newly approved mechanic must add its Gauntlet section. Real-device validation pending.

## Evidence, by type (kept separate)
- **Automated tests (browser, headless):** near-miss head `7dcab297` full suite at 540×960, 360×640, 412×915: `graze.html` PASS at all three; every other suite PASS except (a) `gameplay.html` FAIL at all viewports — a manual-play page that fails identically on main (known, not a regression) and (b) `audio.html` at 360×640 failed one check once in a full run and passed 3 of 3 when rerun alone (test race, fixed in PR #35). Lab head (PR #35): full suite at 540×960 17/18 PASS (`gameplay.html` known); `lab.html`, `audio.html`, `portrait.html` PASS at the other two viewports; full suites for the Lab tree at 360×640 and 412×915 were run after the merge: 17/18 pages PASS at each, `gameplay.html` FAIL (known).
- **Producer phone tests:** run #49 (routes) fun and fair; the skin build worked as intended; **run #81 (near-miss prototype, stage 10) "went well"** (Producer feedback 2026-10-26). Run #81 also contains the audio pack, Batch 2 stages and barrier-ready cue, but the Producer's feedback covers the near-miss feel only: those items are NOT SPECIFICALLY DEVICE-TESTED. Mirror Pulse tuning, stages 13-24 difficulty and the comet ribbon trail beyond "worked" remain without detailed device feedback.
- **Barrier palette (#29, PR #36, MERGED):** full suite at all three viewports PASS on head `51ffe688` (18/18 pages incl. new `palette.html`; `gameplay.html` skipped by default in full runs from now on); the final one-line commit `e742a756` was re-verified with `palette.html` + `scene.html` at 540×960 and CI run #87. NOT DEVICE-TESTED (comfort and readability to be judged on the phone; `CONFIG.palette.soft = false` reverts).
- **Not built / not tested:** nothing from the three new prototypes or Campaign Batch 3 exists on main yet.

## Rules in force
Usage-efficiency rule (2026-10-27): see [AI_HANDOFF_PROTOCOL.md](AI_HANDOFF_PROTOCOL.md#usage-efficiency-permanent-2026-10-27-issue-28). Claude is Lead Developer, reviewer and merge operator (self-review, full regression, exact-SHA merge, verify main build, update this file); ChatGPT is a report reviewer, not a merge gate; the Producer decides product/gameplay and releases. Prototypes are flagged and playable only from LAB until the Producer approves wider use. Browser suites share a single lock on the 2-core machine (`/home/claude/bin/pulse-test`).

## Known limitations
Mirror/route/Overdrive/graze tuning is by reasoning and bots, refined only by the Producer's phone feedback so far; echo readability and cue loudness not measured on a device; `gameplay.html` is a manual page that always fails headless; the barrier-ready corona and sound level have no specific device feedback.

## Next recommended tasks
0. Producer: phone-test the Gauntlet (Lab > Developer Gauntlet) and decide keep/tune/drop for World Shift and Symphony; near-miss graze scope and the loosened Mirror Pulse speed rule still await decisions.
1. Merge the three prototype PRs one at a time (each after its own checks), combined regression after each, then one combined APK for the Producer's phone assessment (keep / tune / discard per prototype).
2. Campaign Batch 3 (stages 25-30, `docs/CAMPAIGN_30.md`).
3. Producer decision pending: widen the near-miss graze beyond stage 10, or tune the numbers (3 per graze, 15 per run).
