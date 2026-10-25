# Current AI Handoff

> This is the current status snapshot. Claude must update it at every review-ready coding checkpoint. Historical handoffs belong in [`docs/ai-handoffs/`](ai-handoffs/) and must not be overwritten. The required structure is in [AI_HANDOFF_PROTOCOL.md](AI_HANDOFF_PROTOCOL.md). The dated note for this snapshot is [`2026-10-26-pulse-integration-and-automerge-audit.md`](ai-handoffs/2026-10-26-pulse-integration-and-automerge-audit.md). It supersedes the PR-state section of the earlier `2026-10-26-pulse-status-audit.md` (PR #11 has since been merged into the PR #9 branch).


- Updated: 2026-10-25 19:18 UTC
- Project: PULSE / shared tooling
- Status: NEEDS PRODUCER DECISION
- Branch: notes on `docs/pulse-handoff-audit-2026-10-26` (docs only). Audited code branch: `feature/pulse-12-stage-campaign`
- PR: notes in [PR #14](https://github.com/egaamnd-bot/casual-game-studio/pull/14). Audited code: [PR #9](https://github.com/egaamnd-bot/casual-game-studio/pull/9)
- Head commit SHA: audited PR #9 head = `a4f5cf6d7a06ac3a3c1466da7ff380fd3c262fed`. The docs branch head SHA is in PR #14 (a commit cannot contain its own SHA).
- Base branch and base SHA: PR #9 → `main` @ `29700b4969f6100938978b64f76622bec1bb6df7`
- Depends on PRs/issues: PR #9 now **contains** the former PR #11 work. Nothing of PULSE is on `main`.
- Is it safe to merge now? **NO.** PR #9: GitHub reports conflicts (`dirty`); head not phone-tested; Auto-merge is not available (below).
- Producer decision needed: **PHONE TEST** (blocks any merge) and **CHOOSE OPTION** for the merge workflow (below)

## Executive summary

Read-only audit; no gameplay code changed, no merge, no settings changed, Auto-merge not enabled. Tests and builds below are read from GitHub; **this audit ran none of them.**

1. **The earlier audit note (`2026-10-26-pulse-status-audit.md`) is out of date.** After it was written, **PR #11 was merged at 2026-10-25 19:12:00 UTC into `feature/pulse-12-stage-campaign` (the PR #9 branch), not into `main`.** It was done through GitHub as the shared account `egaamnd-bot`; this session did not do it, and who did is UNKNOWN. PR #9's head moved from `deb067096822` to merge commit `a4f5cf6d7a06`. Its tree (`b594cd1f299f6aefd11f7bf5f5f56b3fe019a27a`) is **identical** to the tree of the old PR #11 head `4e8ba1ac88`, so the code is the same code the earlier APK was built from.
2. **PR #9 conflict:** GitHub says `dirty`, but git's own merge finds **zero conflicts** (details below). The cause is a criss-cross history, not real content disagreement. A plain merge of `main` into the PR #9 branch is expected to resolve it, adding only 7 docs files.
3. **Auto-merge is not safely available.** The repo is private on a personal account that cannot use branch protection or rulesets, so no required check or review can be set. Details and options below.

## Changed files

Docs only: `docs/AI_HANDOFF.md` (replaced), `docs/ai-handoffs/2026-10-26-pulse-integration-and-automerge-audit.md` (this note). Earlier dated notes are untouched.

## Live status (verified from GitHub, 2026-10-25 ~19:20 UTC)

| Item | State |
|---|---|
| `main` | `29700b4969f6100938978b64f76622bec1bb6df7`. Still the pipeline smoke test plus handoff docs. Its last two commits (`334347a`, `29700b4`, 19:07 UTC) were **pushed directly to `main`**, not through a PR. |
| [PR #9](https://github.com/egaamnd-bot/casual-game-studio/pull/9) | open, base `main`, head `a4f5cf6d7a06ac3a3c1466da7ff380fd3c262fed`, GitHub: `mergeable=false`, `dirty` |
| [PR #11](https://github.com/egaamnd-bot/casual-game-studio/pull/11) | **closed, merged** 19:12:00 UTC into the PR #9 branch (merge commit `a4f5cf6d`; parents `deb067096822` and `4e8ba1ac88`) |
| [PR #10](https://github.com/egaamnd-bot/casual-game-studio/pull/10) | open duplicate: head `4e8ba1ac88f4673cd6adf47007ef3362512263f8`, base `main`. Do not merge. |
| PRs #4–#8 | open, stale; their branches are contained in the PR #9 history |
| [PR #14](https://github.com/egaamnd-bot/casual-game-studio/pull/14) | this docs PR, open, clean |

**Merge order now:** PR #9 is the single integration PR. Resolve its conflict, get phone approval, then merge. PR #10 and PRs #4–#8 are redundant; closing them is the Producer's call.

## PR #9 conflict: exact files, cause, proposed resolution

**Evidence.** I ran object-level trial merges of `main` (`29700b49`) and PR #9 (`a4f5cf6d`) in a local clone (`git merge-tree`). It writes no branch, merge commit or push.

| Merge-base used | Result | Conflicting files |
|---|---|---|
| Both bases, as `git merge` does (ort) | **Clean, 0 conflicts**, result tree `1b3ba1b6ff90c6270460aad7566880ba6ae401ce` | none |
| Only `a04844117e` (Merge of PR #2) | 5 add/add conflicts | `.github/workflows/android-debug-apk.yml`, `capacitor.config.json`, `docs/ANDROID_PIPELINE_TEST.md`, `package.json`, `src/index.html` |
| Only `aa8a2b1768` (pipeline commit) | 4 content conflicts | `CONTRIBUTING.md`, `README.md`, `docs/DECISIONS.md`, `docs/DEVELOPMENT.md` |

The earlier note's "six overlapping files" list was a filename-overlap heuristic and is superseded by the table above.

**Why.** The PULSE branches were stacked on the not-yet-merged `chore/android-pipeline` branch and also merged `main` after PR #2. PR #3 later merged the same pipeline commits into `main`. That leaves two merge bases (a criss-cross merge). Against either base alone, the files look changed on both sides; git combines both bases and finds nothing to conflict. GitHub's `dirty` flag most likely reflects a single-base check. That is my inference; GitHub's method is UNKNOWN.

**Proposed resolution (NOT executed; needs Producer approval):**
1. On the PR #9 branch, run a normal `git merge main` (merge commit; no rebase; no force-push; nothing else rewritten).
2. Expected result: tree `1b3ba1b6…`. Compared with the current PR #9 tree it adds/changes **only 7 docs files** (`AI_TEAM.md`, `CONTRIBUTING.md`, `docs/AI_HANDOFF.md`, `docs/AI_HANDOFF_PROTOCOL.md`, `docs/AI_HANDOFF_QUICKSTART.md`, and the two `docs/ai-handoffs/` notes already on `main`). `src/`, `tests/`, `scripts/`, `package.json`, `capacitor.config.json`, `.gitignore`, `.github/` and the PULSE workflow (artifact `pulse-debug-apk-run…`, "Lock landscape orientation" step) are **byte-identical** to PR #9's. `docs/DECISIONS.md` keeps PR #9's fuller decision log (#4–#13); only two obsolete "pending" bullets from `main` disappear.
3. After the push, `main` is an ancestor of the PR #9 head, so GitHub's check has a single base and should turn clean. CI then builds a new APK for the new head; the code is unchanged, but the new APK link and SHA must be recorded before any merge approval.
4. Rejected: rebase (rewrites 20+ commits and breaks the APK-to-commit record), force-push, resolving by hand.

## Android artifact

- **Recommended for the phone test:** run #41, built from the **current PR #9 head** `a4f5cf6d7a06ac3a3c1466da7ff380fd3c262fed` (same code tree as run #23).
  - Run: https://github.com/egaamnd-bot/casual-game-studio/actions/runs/40224887324 (success)
  - Artifact `pulse-debug-apk-run41`: https://github.com/egaamnd-bot/casual-game-studio/actions/runs/40224887324/artifacts/12611485109 (11,159,719 bytes, sha256 `54e421aeaca3f979cb3ce947c12cd8724224d23325262e909404cc2d3be4ba5c`, expires 2026-11-08 19:14 UTC)
- Equivalent earlier build: run #23 / `4e8ba1ac88f4673cd6adf47007ef3362512263f8`, artifact `pulse-debug-apk-run23` (id 12608335871, sha256 `726e4d1d662829d3a096e11c23189125905f10ab729e92852804e3b177b045b3`, expires 2026-11-08 17:29 UTC). Same code tree.
- Install: open the artifact link (GitHub login required) on the phone or a computer, download the zip, extract `app-debug.apk`, install it (allow "install unknown apps" when prompted). It is a debug-signed build, not a release.
- Install/launch verification: **UNKNOWN.** Artifact downloads are blocked from this environment, so I did not read the commit stamp inside the APK; the game does not display it. APK-to-commit matching rests on the run's `head_sha`.

## Validation evidence

| Check | Exact command or workflow | Result | Evidence / commit |
|---|---|---|---|
| Browser test pages | Author ran them; command not recorded | **NOT RUN by this audit.** Author reports rhythm 4,870, campaign 647/647, logic, assets, scene, landscape passing at 960x540 | `docs/RHYTHM.md` on the PR #9 branch. Not in CI. Self-reported. |
| Build / CI | Workflow "Android debug APK" | **PASS** (read, not re-run) | Run #41 on `a4f5cf6d` (success); run #23 on `4e8ba1ac88` (success) |
| Trial merge | `git merge-tree --write-tree` (local, throwaway) | **Run by this audit**: clean with both bases; conflicts with either base alone (table above) | Local objects only; nothing pushed |
| Tree comparison | GitHub commits API | **Run by this audit**: tree of `a4f5cf6d` == tree of `4e8ba1ac88` | `b594cd1f299f6aefd11f7bf5f5f56b3fe019a27a` |
| Device test | — | **NOT DEVICE-TESTED** for the current code | Producer's earlier playtest ("still feels stiff") was on an earlier build, SHA UNKNOWN |

## Auto-merge audit

### What I could verify (GitHub REST, read-only)

| Setting | Value |
|---|---|
| Repo | `egaamnd-bot/casual-game-studio`, **private**, user-owned (no organisation) |
| `allow_auto_merge` | **false** |
| Merge methods allowed | merge commit, squash, rebase (all on) |
| `delete_branch_on_merge` | false |
| `allow_update_branch` | false |
| Branch protection on `main` | **Not available**: GitHub returns "Upgrade to GitHub Pro or make this repository public". `main` is unprotected; no branch is protected. |
| Rulesets | **Not available** (same message) |
| Required checks / required reviews | **Cannot be configured** under the current plan; none exist |
| Reviews on PRs #9, #11, #14 | none |
| CI | One workflow, job `build`, triggers on `push` and manual run. It builds the APK; it runs **no** gameplay tests. |
| Who acts | The token, every PR author and every event, including PR #11's merge and direct pushes to `main`, is the single account `egaamnd-bot`. |
| UNKNOWN (API blocked by this environment's proxy) | collaborators, Actions workflow permissions, environments, webhooks/apps, the account's exact plan |

### Verdict

Auto-merge is **not available in a safe form right now**:
- GitHub only holds an Auto-merge for something to wait on (required checks or reviews). With no protection rules available, enabling it on a clean PR would merge immediately; I have not tested this, and deliberately did not try, because the test could merge a PR.
- `gh pr merge --auto` uses GraphQL, which this session cannot call (HTTP 403). The only route offered is a REST endpoint (`PUT …/pulls/{n}/ccr/auto_merge`), untested (UNKNOWN).
- A green build is not QA. The only check possible is "the APK compiled"; it says nothing about game feel, which stays a Producer phone decision.
- `main` can currently take direct pushes and force-pushes. Two direct pushes landed at 19:07 UTC; who pushed is UNKNOWN.

### Options (the Producer decides; nothing has been changed)

| Option | What it takes | Pros | Risks |
|---|---|---|---|
| **A. Stay manual, tighter routine** (no cost, available now) | Claude never merges without a chat approval naming PR and SHA; every review checkpoint ends with a verified "merge-ready" block (head SHA, CI result, mergeable state, dependency order). | Zero setup | Still a manual merge tap; nothing technical stops a wrong merge or a direct push to `main` |
| **B. GitHub Pro, then protect `main`** (recommended if you want automation; **paid; price UNKNOWN, verify before buying**) | Upgrade the account; ruleset on `main`: require PR, require status check, block force-push and deletion, require conversation resolution; then turn on Auto-merge. | Real enforcement; Auto-merge works; closes the direct-push hole | Costs money (needs your approval per `docs/DECISIONS.md` constraints); requires the steps below |
| **C. Make the repo public** (free) | Same rules as B become available | No cost | Publishes unreleased game code and assets before launch; licensing of assets must be checked. Not recommended. |
| **D. A DIY merge-bot workflow** | An Action merges when conditions hold | Free | Cannot be enforced; it runs as the same account; a bug merges unreviewed code. Not recommended. |

### Recommended settings if B is chosen

1. **Protect `main`:** require a PR; require status check; block force pushes and deletions; require conversation resolution.
2. **Give the check a unique name.** Rename the job `build` to something specific like `android-debug-apk`, because a required check named `build` is easy to collide with future workflows.
3. **Producer approval needs a second GitHub identity.** GitHub does not let an account approve its own PR, and every PR here is authored by `egaamnd-bot`. If you use a separate personal account, add it as collaborator and use a CODEOWNERS file plus "require review from code owners"; then your Approve tap on the phone *is* the phone-QA sign-off and Auto-merge follows when CI is green. If you only ever use `egaamnd-bot`, no technical approval gate is possible; then Claude may enable Auto-merge only after your chat approval at an exact SHA, and must disable it before any further push, because Auto-merge would otherwise merge unapproved later commits.
4. **Merge method: merge commit; disable rebase merge.** A merge commit keeps the PR head commit in history, so the APK-to-commit record in the protocol stays traceable; rebase merging rewrites SHAs. Squash is the alternative for tidy history, but the squash commit's SHA is new, and stacked PRs conflict afterwards (that is how this criss-cross problem arises).
5. **No more stacked PRs.** GitHub has no native PR dependency. With Auto-merge, a PR based on a feature branch merges into that branch (as PR #11 did), not into `main`. Base every PR on `main` and merge one at a time. Leave "delete branch on merge" off until that is the habit.
6. **Add real tests to CI (a separate task, not started):** run the `tests/*.html` pages headless at a fixed 960x540 viewport as a second required check. Until then, "checks passed" means only "APK compiles". It still does not replace phone QA.

### Honest note on savings

Auto-merge removes the final Merge tap and the "wait for CI" step. It does **not** remove your phone test or your approval, and with a second account an Approve tap replaces the Merge tap, so the click count is about the same. The real bottleneck is the manual phone QA loop, not the merge.

## Known limitations and risks

1. PR #11 was merged into the PR #9 branch by an unidentified actor after the earlier audit. If that was not intended, say so; it can be reverted on that branch with a revert commit (Producer decision; not done).
2. PR #9 stays unmergeable on GitHub until the proposed `main`→PR #9 merge is done and GitHub recomputes.
3. The head code is NOT DEVICE-TESTED; tests are self-reported and not in CI.
4. `main` is unprotected and received two direct pushes (UNKNOWN who).
5. Several GitHub endpoints are blocked from this environment, so collaborators, Actions permissions and environments were not audited.
6. APK artifacts expire 2026-11-08.

## Remaining work

1. Producer phone-tests run #41.
2. Producer chooses the workflow option (A or B), and approves or declines the `main`→PR #9 merge for the conflict.
3. After approval: perform that merge, record the new head and APK, and request merge approval for PR #9.
4. Close or retarget redundant PRs #4–#8 and #10 (Producer's call).

## What the producer should check on phone

1. Landscape layout and touch response: starts in landscape, stays landscape after pause/resume; shrink/release respond instantly.
2. Shrink/grow fluidity and collision fairness: motion smooth, never floaty; passes and hits feel fair.
3. Moving gaps (stage 3 onward) and the rotating ring (stage 4 onward): readable at phone size; opening and ghost brackets clear.
4. Sound: shrink/release sounds instant; pickup/pass sounds musical, not late; music stays aligned after pause and retry.
5. Pause, resume, retry and stage transitions work; progress and stars still save.
6. Frame rate and readability on your phone model; note any stutter.

## Explicit decision requested

Please install the APK from run #41 and tell me: **approve the game feel, request adjustments, or block?** Separately, tell me which merge workflow you want (**A manual, B GitHub Pro + protection, or neither yet**) and whether I may do the `main`→PR #9 merge (it is only a plan so far). No merge and no setting change happens until you say so.

## Next recommended task

After your phone feedback: either tune game feel, or (approved) do the `main`→PR #9 merge and request merge approval with the new APK. Neither has been started.
