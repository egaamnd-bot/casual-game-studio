# AI Handoff Protocol

**Purpose:** Make every coding iteration self-contained and reviewable by Claude, ChatGPT, Gemini, and the human producer without depending on private chat history.

## Required records

1. `docs/AI_HANDOFF.md` — current status snapshot. Update it at the end of every coding iteration that is ready for review. It describes the latest handoff.
2. `docs/ai-handoffs/YYYY-MM-DD-<short-task-name>.md` — append-only historical note for each review-ready coding iteration. Use a distinct descriptive filename if more than one handoff occurs on a date; never overwrite an older note.
3. Pull request description or PR comment — copy the concise summary, tests, artifact, dependencies, and exact decision requested so the producer can review it on a phone.

Do not create a dated note for every tiny intermediate edit. Create it when an iteration reaches a meaningful checkpoint, especially when requesting review, phone testing, or approval. If work is paused unexpectedly, update the current snapshot with the incomplete state and what blocks it.

## Mandatory handoff template

Use all headings. If something does not apply, write `N/A`; if it has not been verified, write `UNKNOWN`, `NOT RUN`, `NOT BUILT`, or `NOT DEVICE-TESTED`. Never leave uncertainty implicit or claim success without evidence.

```markdown
# Handoff — <task / iteration>

- Updated: YYYY-MM-DD HH:MM UTC
- Project: PULSE / Heartvile / shared tooling
- Status: IN PROGRESS / READY FOR REVIEW / BLOCKED / NEEDS PRODUCER DECISION
- Branch:
- PR:
- Head commit SHA:
- Base branch and base SHA:
- Depends on PRs/issues:
- Is it safe to merge now? YES / NO / UNKNOWN
- Producer decision needed: NONE / REVIEW / PHONE TEST / APPROVE MERGE / CHOOSE OPTION / OTHER

## Executive summary
<What changed and why, in plain language.>

## Changed files
- `path` — purpose and notable behaviour change.

## Behaviour and design impact
- Player-facing changes:
- Controls/gameplay/scoring/save compatibility:
- Visual/audio/accessibility/performance:
- Approved decision changed? If yes, cite the producer approval. Otherwise state NONE.

## Validation evidence
| Check | Exact command or workflow | Result | Evidence / commit |
|---|---|---|---|
| Automated tests | ... | PASS / FAIL / NOT RUN | ... |
| Build | ... | PASS / FAIL / NOT BUILT | ... |
| CI | workflow URL | status | run URL |
| Device test | device + steps | PASS / FAIL / NOT DEVICE-TESTED | notes/video |
| Regression checks | ... | ... | ... |

Report actual counts, failures, skipped tests, warnings, environment caveats, and whether a browser was hidden/zero-sized. Distinguish a verified environment issue from a code regression; don't dismiss failures without evidence.

## Android artifact (if applicable)
- APK URL:
- Workflow/run URL:
- Artifact filename:
- Exact commit SHA the APK was built from:
- Install/launch verification:
- If unavailable, say NOT BUILT or NOT ATTACHED.

## Known limitations and risks
- ...

## Remaining work
- ...

## What the producer should check on phone
1. ...
2. ...

## Explicit decision requested
<State one clear question. For example: "Please install this APK and approve/reject the gameplay feel. Do not merge until phone approval.">

## Next recommended task
<One small next step; do not start it unless authorized by the current task.>
```

## PULSE-specific safeguards

- Preserve the current working landscape gameplay and hold-to-shrink / release-to-grow mechanic unless explicitly approved otherwise.
- Do not silently change controls, collision rules, scoring, star thresholds, stage IDs, save format/compatibility, or the approved campaign structure.
- Keep new obstacles incremental. State how each obstacle is taught, its deterministic/fair collision rule, and the relevant test coverage.
- Do not add audio quantization or other timing that delays control response.
- Automated browser checks do not replace real Android phone testing for touch response, audio latency, readability, performance, pause/resume, and landscape layout.
- The APK must be linked to the exact commit SHA that produced it. Do not imply an artifact came from the PR head unless verified.

## Approval and merge rules

- "Continue", "proceed", or approval of a coding plan authorizes only the scope clearly stated by the producer; it is not blanket permission to merge or release.
- Do not merge into `main`, release a build, delete important work, change secrets/account configuration, or alter approved decisions without the required explicit approval.
- If a PR depends on another PR, state the dependency prominently and do not merge out of order.
- If approval is pending, set status to `NEEDS PRODUCER DECISION` or `READY FOR REVIEW`, list the exact decision, and stop at that checkpoint.
- If no approval is needed, explicitly state why the task can continue safely.

## End-of-iteration checklist

1. Verify branch name, PR URL, base/head commit SHAs, and PR dependencies from GitHub.
2. Run tests/builds and capture their actual results and URLs.
3. Update `docs/AI_HANDOFF.md`.
4. Add a dated historical note under `docs/ai-handoffs/`.
5. Copy a concise version into the PR description or comment.
6. Ensure all three records agree. Commit and push these notes on the same feature branch as the code they describe.
7. Tell the producer the exact PR, commit, test result, artifact link, requested decision, and whether work is blocked pending approval.
