# Contributing

This guide turns the rules in [AI_TEAM.md](AI_TEAM.md) into a day-to-day workflow. If the two ever disagree, `AI_TEAM.md` wins.

## Source of Truth

- Repository documents are the shared source of truth. Conversations with an AI assistant are not.
- Approved decisions go in [docs/DECISIONS.md](docs/DECISIONS.md). Recommendations stay in issues or PR comments until the producer approves them.

## Workflow

1. **Start from an issue.** Each task needs an objective and acceptance criteria.
2. **Create a branch** from `main`:
   - `feature/<short-description>` for gameplay or app features
   - `fix/<short-description>` for bug fixes
   - `art/<short-description>` for art, animation, or audio assets
   - `docs/<short-description>` for documentation
3. **Commit small, focused changes** (see the commit style below).
4. **Run the relevant tests and builds** before asking for review.
5. **Open a pull request** into `main` that links the issue.
6. **The human producer approves the merge.** Nobody merges into `main` without that approval.

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
- The linked issue (`Closes #12`)
- How it was tested (device, platform, build type) and the result
- Screenshots or a short clip for any gameplay or UI change
- Anything left unfinished or known to be broken

Before you change an approved design decision or remove existing functionality, get the producer's approval and record it in `docs/DECISIONS.md`.

## Handoffs Between AI Assistants

Assistants don't share conversations. Each handoff (in an issue, PR, or comment) states:

- Task and objective
- Relevant repository files
- Constraints and dependencies
- Expected output
- Acceptance criteria
- What is done and what remains

## Assets

- Follow the formats and naming rules in [docs/ART_BIBLE.md](docs/ART_BIBLE.md).
- Deliver assets with filenames, formats, dimensions, and integration notes.
- An asset counts as integrated only once it is merged into the repository.
- Only commit assets you have the right to use. Record third-party sources and licenses.
- Use Git LFS for large binaries (TODO: size limit, e.g. files over 10 MB).

## Secrets

Never commit API keys, passwords, tokens, signing keys, or keystores. If one is committed by mistake, tell the producer at once so it can be rotated.

## Reporting Bugs

Open an issue with:

- Steps to reproduce
- Expected vs. actual behaviour
- Platform, device, and build version
- Screenshots, video, or logs if available
