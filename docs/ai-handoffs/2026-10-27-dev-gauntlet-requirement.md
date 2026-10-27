# Handoff — Developer Campaign / QA Gauntlet requirement recorded

- Date: 2026-10-27 (Asia/Jakarta morning)
- Type: documentation only. No game code, tests or assets changed.
- Branch: `docs/dev-gauntlet-requirement`, based on `main` @ `9b6191bf079305020daa5dc7682264be65c88622`
- PR / head SHA / merge: filled in the PR description and Issue #28 after opening (a note cannot contain its own commit SHA)

## Summary
The Producer added a permanent requirement on Issue #28: a dedicated Developer Campaign / QA Gauntlet so the Producer can test all existing and approved mechanics in one short session without playing 30 stages. This change records it: spec, integration seam, planned section table and acceptance evidence in `docs/DEV_GAUNTLET.md`; the permanent rule in `docs/AI_HANDOFF_PROTOCOL.md` and `CONTRIBUTING.md`; Decision #25; a pointer in `docs/LAB.md`; the status line in `docs/AI_HANDOFF.md`.

## Changed files
`docs/DEV_GAUNTLET.md` (new), `docs/AI_HANDOFF_PROTOCOL.md`, `CONTRIBUTING.md`, `docs/DECISIONS.md`, `docs/LAB.md`, `docs/AI_HANDOFF.md`, this note.

## Behaviour impact
None. Campaign stage IDs, rules, controls, collision, scoring, stars and `pulse.save.v1` untouched.

## Tests / build
NOT RUN (documentation only; no source change). APK: NOT BUILT for this branch, and not needed. The four feature workstreams' browser-test queue was not touched.

## Dependencies and merge order
None to merge. The Gauntlet implementation itself must come after #31, #32, #33 and Campaign Batch 3 reach safe integration checkpoints and merge one at a time.

## Known issues / unfinished
The Gauntlet is not implemented. Sections for Resonance, Symphony and World Shift depend on their PRs merging. Real-device validation: NOT DEVICE-TESTED.

## Producer approval
Not required for this documentation change; it records the Producer's own approved requirement. Decision requested: none.

## Next recommended task
Implement `feature/dev-gauntlet` after the current workstreams merge.
