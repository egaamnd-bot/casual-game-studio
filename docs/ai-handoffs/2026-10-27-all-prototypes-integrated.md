# Handoff — all four workstreams integrated; combined APK for the Producer

- Date: 2026-10-27 (Asia/Jakarta evening). Documentation checkpoint; no game code changed here.
- `main` @ `7f535350e64adca141e50d76ffc75eadc3482496` (merge of PR #46). **APK for the Producer:** [run #122](https://github.com/egaamnd-bot/casual-game-studio/actions/runs/40484771154), artifact `pulse-debug-apk-run122`, built from that exact main commit. Browser tests, build and device testing are separate below.

## Merge state
| Work | PR | Tested head | Merge commit | Browser tests on tested head | Integrated main build | Device |
|------|----|-------------|--------------|------------------------------|------------------------|--------|
| Campaign Batch 3 (stages 25-30) | #41 | `bdf0d83` | `a7a7d685` | 18/18 pages x3 viewports | run #107 | Producer: went as intended |
| World Shift #33 (Lab) | #44 | `ba8a84c9` | `ea2880a7` | 19/19 x3 | run #113 | NOT DEVICE-TESTED |
| Resonance Gates #31 (Lab, Producer KEEP) | #40 | `c84cf94f` | `eacdb4cc` | 21/21 x3 | run #116 | old head `0e0b8172` (run #105): "went good no issue"; merged head NOT DEVICE-TESTED |
| Shatter Symphony #32 (Lab) | #46 | `e7d8d7ab` | `7f535350` | 23/23 x3 (includes all the above prototypes' tests) | run #122 | NOT DEVICE-TESTED |

Viewports are 540x960, 360x640 and 412x915; `gameplay.html` (manual, fails on main) is skipped by the runner. The merged `src/` and `tests/` of each merge are byte-identical to the tested head (GitHub compare API). Because the Symphony tested head already contained the other three, its 23/23 run is the combined regression of the whole integrated tree.

## Test-only fixes found during integration (no gameplay code changed)
`resonance.html` and `symphony.html` still asserted 24 campaign stages after Batch 3 (now 30 and stricter: unique ids in order 1..30). `symphony.html`'s route-clear arpeggio check sat on a timing margin and failed once at 540x960; it now waits for the first note inside the same boost window with the same total frame count. The runs that failed are superseded and were never counted as passes.

## What the Producer should check on the phone (run #122)
LAB menu: World Shift (does the shift read clearly, are recoveries calm), Resonance Gates (already liked on the old head), Shatter Symphony (is the arpeggio pleasant, never late or in the way of effects). Also play a few campaign stages to confirm nothing changed for normal play.

## Open
- Keep / tune / drop for World Shift and Shatter Symphony after the phone test.
- Near-miss graze scope (stage 10 only vs wider) is still undecided.
- **Developer Campaign / QA Gauntlet** (`feature/dev-gauntlet`): NOT STARTED, NOT BUILT. Spec in `docs/DEV_GAUNTLET.md`; all three prototypes are now integrated, so its sections cover them.
- **Orb redesign (Issue #42):** NOT STARTED, NOT BUILT, after the Gauntlet.

## Producer approval
None required for this documentation.
