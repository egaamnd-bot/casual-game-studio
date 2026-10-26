# Handoff — mandatory AI handoff documentation

- Updated: 2026-10-26 (exact time not recorded)
- Project: shared tooling / PULSE workflow
- Status: READY FOR REVIEW
- Branch: `docs/ai-handoff-protocol`
- PR: Pending creation
- Head commit SHA: verify branch head after all documentation commits
- Base branch and base SHA: `main`; verify current base before merge
- Depends on PRs/issues: None
- Is it safe to merge now? REVIEW REQUIRED
- Producer decision needed: REVIEW / APPROVE MERGE

## Executive summary

Added repository-level instructions requiring Claude to leave durable handoff notes after each meaningful coding iteration, so ChatGPT and the producer can review work from the latest repository state without depending on private conversation history.

## Changed files

- `AI_TEAM.md` — makes the handoff protocol mandatory for Claude and clarifies evidence/approval language.
- `CONTRIBUTING.md` — adds handoff and PR requirements to the contributor workflow.
- `docs/AI_HANDOFF_PROTOCOL.md` — defines required fields, test evidence, APK/commit matching, safety constraints, and end-of-iteration checklist.
- `docs/AI_HANDOFF.md` — current PULSE handoff snapshot based on available repository documentation; live PR head and APK SHA are explicitly marked unknown and must be re-verified.
- `docs/ai-handoffs/2026-10-26-handoff-protocol-setup.md` — this historical note.

## Behaviour and design impact

- Player-facing changes: None.
- Controls/gameplay/scoring/save compatibility: None.
- Visual/audio/accessibility/performance: None.
- Approved decision changed? NONE.

## Validation evidence

| Check | Exact command or workflow | Result | Evidence / commit |
|---|---|---|---|
| Documentation review | Read current `AI_TEAM.md`, `CONTRIBUTING.md`, `docs/DECISIONS.md`, and `docs/RHYTHM.md` | Completed | Existing GitHub file contents |
| Automated tests | N/A — documentation-only change | NOT RUN | No gameplay code changed |
| Build | N/A — documentation-only change | NOT BUILT | No gameplay code changed |
| CI | Pending after PR creation | UNKNOWN | Add PR checks after creation |
| Device test | N/A — documentation-only change | NOT DEVICE-TESTED | No gameplay code changed |

## Android artifact

- APK URL: N/A — documentation-only change.
- Exact commit SHA: N/A.

## Known limitations and risks

- Current PULSE PR head SHA and the newest APK-to-commit correspondence were not independently verified as part of this documentation change.
- The current handoff snapshot must be refreshed by Claude after the next coding iteration.
- Documentation is not yet merged into `main`; Claude should follow it immediately when this branch is merged or when the producer asks to adopt it.

## Remaining work

1. Review the documentation PR.
2. Merge only after producer approval.
3. Claude should update `docs/AI_HANDOFF.md` and create a dated handoff note at the end of the next meaningful coding iteration.
4. Confirm the next handoff matches the PR description and exact build commit.

## What the producer should check on phone

N/A — no game build is produced by this documentation change.

## Explicit decision requested

Please review and approve or request changes to the mandatory AI handoff workflow documentation. This PR contains documentation only and does not change gameplay.

## Next recommended task

Use the new protocol for the next PULSE coding iteration and verify that Claude includes exact PR, commit, test, APK, and approval details.
