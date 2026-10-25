# Contributing

This guide turns the rules in [AI_TEAM.md](AI_TEAM.md) into a day-to-day workflow. If the two ever disagree, `AI_TEAM.md` wins.

## Source of Truth

- Repository documents are the shared source of truth. Conversations with an AI assistant are not.
- Approved decisions go in [docs/DECISIONS.md](docs/DECISIONS.md). Recommendations and open proposals stay in GitHub Issues or PR comments until the producer approves them.
- Every coding task ready for review must have the required handoff described in [docs/AI_HANDOFF.md](docs/AI_HANDOFF.md).

## Workflow

1. **Start from an issue or explicit producer task.** Record the objective and acceptance criteria.
2. **Inspect the current state** before editing: default branch, active PRs/dependencies, relevant docs, working tree, and current tests.
3. **Create or use a dedicated branch** and do not mix unrelated changes:
   - `feature/<short-description>` for gameplay or app features
   - `fix/<short-description>` for bug fixes
   - `art/<short-description>` for art, animation, or audio assets
   - `docs/<short-description>` for documentation
4. **Commit small, focused changes** (see the commit style below).
5. **Run relevant tests and builds** before asking for review. Until automated tests exist, describe the manual checks actually run.
6. **Complete the handoff files** required by [docs/AI_HANDOFF.md](docs/AI_HANDOFF.md).
7. **Open or update a pull request** into the appropriate base branch. Link dependencies and state explicitly whether the PR must wait for another PR.
8. **The human producer approves the merge.** Nobody merges into `main` without that explicit approval. Approval to continue coding is not approval to merge.

## Commit Messages

Short, imperative, with a prefix:

```
feat: add combo multiplier to scoring
fix: prevent double tap from skipping tutorial
art: add level 3 background
docs: update build instructions
```

## Pull Requests

Every PR includes:

- **What** changed and **why**
- The linked issue or task
- Exact branch and head commit SHA
- Dependencies and correct merge order
- How it was tested (commands, platform, device, build type) and actual result
- CI workflow/run links and status
- APK/artifact link and exact commit it was built from, if applicable
- Screenshots or a short clip for gameplay/UI changes when available
- Anything unfinished, known broken, or not tested
- The specific producer decision requested: review only, approve merge, choose between options, or phone-test approval
- Link to the latest [AI handoff](docs/AI_HANDOFF.md) and dated handoff note

## Handoffs Between AI Assistants

Assistants do not share conversations. Each handoff must state the task/objective, relevant files, constraints/dependencies, acceptance criteria, completed work, remaining work, test evidence, and requested decision. Follow [docs/AI_HANDOFF.md](docs/AI_HANDOFF.md) exactly.

## Assets

- Follow the formats and naming rules in [docs/ART_BIBLE.md](docs/ART_BIBLE.md).
- Deliver assets with filenames, formats, dimensions, and integration notes.
- An asset counts as integrated only once it is merged into the repository.
- Only commit assets you have the right to use. Record third-party sources and licenses.
- Git LFS is not used. Keep files small and ask the producer before adding large binaries.

## Secrets

Never commit API keys, passwords, tokens, signing keys, or keystores. If one is committed by mistake, tell the producer at once so it can be rotated.

## Reporting Bugs

Open an issue with steps to reproduce, expected vs. actual behaviour, platform/device/build version, and screenshots, video, or logs if available.
