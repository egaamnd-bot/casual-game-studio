# AI Handoff Quickstart

Use this checklist whenever a meaningful coding iteration is ready for review.

## Before coding
- [ ] Read `AI_TEAM.md`, `CONTRIBUTING.md`, `docs/AI_HANDOFF_PROTOCOL.md`, and the current `docs/AI_HANDOFF.md`.
- [ ] Inspect current GitHub branches, open PRs, dependencies, and approval status.
- [ ] Confirm the task, scope, acceptance criteria, and producer constraints.

## Before requesting review
- [ ] Update `docs/AI_HANDOFF.md` with the latest status.
- [ ] Add a new dated note under `docs/ai-handoffs/`; never overwrite an older note.
- [ ] Verify branch, PR URL, base/head SHAs, and dependency order.
- [ ] Record actual test commands/results and CI links. Mark anything not run explicitly.
- [ ] Link the APK and identify its exact source commit, if a build is applicable.
- [ ] Record known issues, unfinished work, and what the producer should test.
- [ ] State the exact decision needed and whether merging is prohibited pending approval.
- [ ] Keep the PR description/comment and handoff files consistent.

## Required status vocabulary
Use precise states: `IN PROGRESS`, `READY FOR REVIEW`, `BLOCKED`, or `NEEDS PRODUCER DECISION`.

Use `NOT RUN`, `NOT BUILT`, `NOT DEVICE-TESTED`, or `UNKNOWN` whenever evidence is unavailable. Never convert an intended action into a claimed result.

## PULSE safeguards
- Preserve landscape gameplay and hold-to-shrink / release-to-grow unless explicitly approved otherwise.
- Do not silently change controls, collision rules, scoring, star thresholds, stage IDs, save compatibility, or approved campaign structure.
- Automated browser tests do not replace phone testing.
- A coding approval is not merge/release approval.

## Review response format
When reporting to the producer, include:
1. Summary of changes.
2. PR and exact commit SHA.
3. Tests/builds and evidence.
4. APK link and source SHA, if applicable.
5. Known risks and remaining work.
6. Exact approval or phone test needed.
7. Recommended next step.

This quickstart supplements, and does not replace, the full [AI Handoff Protocol](AI_HANDOFF_PROTOCOL.md).
