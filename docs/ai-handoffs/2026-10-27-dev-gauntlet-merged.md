# 2026-10-27 Developer Gauntlet merged

- PR: #48, merged by exact SHA. Tested head `84fd3a329f6c4f83fd0bd0058ddd13a21f5e23f2`, base `938d3e37c6943304c75a0090280432852570917b`, merge commit `2147b2c74252d413f085d3007a99df052da1f72e`.
- Tests (headless browser, exact tested head): full suite 25/25 pages at each of 540x960, 360x640, 412x915, 0 failures (`gameplay.html` is a manual page and skipped). New: `tests/gauntlet.html` 124 checks, `tests/gauntlet-off.html` 7 checks (production guard).
- Builds: push-build run #125 on the tested head, success. Integrated main build run #126 on `2147b2c7`, success.
- Visual check: screenshots at 540x960 and 540x1200; fixed an overlap between the Lab button and the title and between the prompt "Try" line and the start hint before the final head.
- NOT DEVICE-TESTED. Producer: please phone-test Lab > Developer Gauntlet (QA) using the run #126 APK; nothing needs approval for the merge itself.
- Known: the Gauntlet proof lines are browser-verified with the test bot only; routes needs the full risk lane for "Triggered".
- Next: orb redesign (Issue #42, `feature/orb-redesign`), tested APK, then Producer phone review.
