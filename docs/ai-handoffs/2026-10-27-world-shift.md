# Handoff — World Shift prototype (Lab only, Issue #33)

- Date: 2026-10-27
- Branch: `feature/world-shift`. Tested head: `ba8a84c9ca25f5cf2c295994035ae131170f023f` (main `a7a7d685` merged in). Final head adds only this note and is checked docs-only against the tested head.
- Design and rules: [docs/WORLD_SHIFT.md](../WORLD_SHIFT.md). Open from **LAB → World Shift**.

## Summary
One Lab stage of about 65 s in three movements (Neon Circuit, Chromatic Overdrive, Pulse Collapse). Between movements: a 4-beat telegraph, the world changes (rails, backdrop crossfade, existing transition sting at low gain, world Overdrive stem layered in), then a short calm recovery of wide gaps. Presentation only: it never writes the level, orb, score, collision, stars or the save. All animation runs on the run's own `dt`, so pause freezes it and retry restarts at movement I. No new art or audio. Not part of the campaign; Lab runs never write the save.

## Changed files
`src/js/worldshift.js` (new), `tests/worldshift.html` (new), `docs/WORLD_SHIFT.md` (new), and guarded hooks in `src/js/game-scene.js` (7 lines, all `if (Pulse.WorldShift)` / `this.lab`) and `src/index.html` (1 script tag). No change to config, stages, campaign, level, save, sfx.

## Tests (browser, headless, through `pulse-test`, shared lock)
- Before main moved, head `ab69090`: 19/19 pages PASS at 540x960, 360x640 and 412x915 (the 360x640 run was split by a container restart: 15 pages, then the remaining 4 on the same SHA).
- Combined regression on the tested head `ba8a84c9` (current main merged): **19/19 pages PASS at 540x960, 360x640 and 412x915**, 0 FAIL (`gameplay.html`, a manual page that fails on main, is skipped by the runner). `worldshift.html` 173 checks, `campaign.html` 5745/5745, `lab.html` 27 at each viewport.
- `worldshift.html` covers movement timing and the telegraph, recovery windows, pause/retry/restart/scene-shutdown cleanup, the Overdrive stem hook (false off the Lab), and enabled-vs-disabled equivalence.

## Android build
CI "Android debug APK" run #108 success on the tested head `ba8a84c9`. The final docs-only head gets its own run; links are in the PR. A build proves packaging only.

## Device testing
**NOT DEVICE-TESTED.** Producer to judge on the phone: does the shift read clearly, are the recoveries calm, is the stem layer pleasant.

## Known issues / unfinished
Presentation-only prototype tuned by reasoning; hazard readability over the new backdrops is checked by tests, not by eye on a device. Not wired into the Developer Campaign / QA Gauntlet yet (Gauntlet not built).

## Producer approval
Not required to merge (Lab-only, tests and build pass, scoped diff). A keep / tune / drop decision is requested after the phone test.

## Next recommended task
Merge order: World Shift, then Resonance Gates (PR #40), then Shatter Symphony; each later branch is updated onto the new main and tested once. Then `feature/dev-gauntlet`.
