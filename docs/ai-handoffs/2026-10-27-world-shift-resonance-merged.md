# Handoff — World Shift and Resonance Gates merged; Symphony next

- Date: 2026-10-27 (Asia/Jakarta afternoon)
- Type: documentation checkpoint; no game code changed here. Based on `main` @ `eacdb4cc628b4fe17b21309fa48d0b079db64fd8`.

## Merged, with evidence (browser tests, builds and device testing kept separate)
| Work | PR | Tested head | Merge commit | Browser tests on tested head | Build | Device |
|------|----|-------------|--------------|-------------------------------|-------|--------|
| World Shift #33 (Lab only) | #44 | `ba8a84c9` (main merged); final head `707842cf` adds only the handoff note | `ea2880a7` | 19/19 pages at 540x960, 360x640, 412x915; `worldshift.html` 173 checks | PR run #112, integrated main run #113 success | NOT DEVICE-TESTED |
| Resonance Gates #31 (Lab only) | #40 | `c84cf94f` | `eacdb4cc` | 21/21 pages at all three viewports; `resonance.html` 70, `resonance-run.html` 42, `worldshift.html` 173, `campaign.html` 5745, `lab.html` 27 | PR run #115, integrated main run #116 success | Producer phone-tested the OLD head `0e0b8172` (run #105): "went good no issue"; the merged head is not device-tested |

In both cases the merged `src/` and `tests/` are byte-identical to the tested head (GitHub compare API). Resonance's first updated-head run (`5e0560e5`) failed one stale assertion in `tests/resonance.html` (it expected 24 campaign stages; main has 30); the assertion was corrected and made stricter, and the full suite was rerun on the new head. That earlier run is superseded and is not counted as a pass.

## Producer decisions recorded
Resonance Gates: KEEP as a Lab-only prototype, no campaign integration (Decision #28). The tracker first mis-recorded this as final before the Producer chose; the correction and the explicit decision are on Issue #28 and PR #40.

## Open work
- **Shatter Symphony #32:** branch updated onto current main with one conflict in `game-scene.js` (adjacent guarded detach hooks, both kept). Combined regression running at three viewports; PR not opened. Result: UNKNOWN until that run is read. NOT DEVICE-TESTED.
- **Developer Campaign / QA Gauntlet:** NOT BUILT. Sequencing updated in `docs/DEV_GAUNTLET.md`: it covers the approved, integrated mechanics available when built (now including Resonance and World Shift); Symphony joins when merged.
- **Orb redesign (Issue #42):** NOT BUILT, after the Gauntlet is stable.

## Producer approval
None required for this documentation. Pending Producer actions: phone-test the merged Lab prototypes when convenient; near-miss graze scope decision (stage 10 only vs wider) is still open.

## Next recommended task
Open and merge the Symphony PR if its regression passes; then `feature/dev-gauntlet`.
