# Development Guide

> Owner: Claude (Lead Developer). Fill in once the technology stack is fully approved (see [DECISIONS.md](DECISIONS.md)).

## Prerequisites

- [GitHub Desktop](https://desktop.github.com/) to clone, commit, push, and open pull requests
- An Android phone for physical-device testing
- TODO: Anything else, added only after producer approval. No local engine, SDK, or package manager is required at this stage.

Git LFS is **not** used. Keep binary assets small; ask the producer before adding Git LFS or any other tool.

## Setup

1. In GitHub Desktop: **File → Clone repository** → `egaamnd-bot/casual-game-studio`.
2. Create a branch from `main` for each task (see [CONTRIBUTING.md](../CONTRIBUTING.md)).

TODO: Project-specific steps once the stack is validated.

## Running the Game

TODO: How to run it in the editor, on an emulator, or on a device.

## Building

| Platform | Steps | Output |
|----------|-------|--------|
| Android | TODO | `.apk` (testing) / `.aab` (Play Store) |
| iOS | Deferred (needs a Mac and a paid Apple developer account) | n/a |

## Testing

- **Automated tests:** TODO (framework, plus the command to run them)
- **Manual checklist** before a release:
  - [ ] Fresh install launches and the tutorial completes
  - [ ] Progress saves and loads after the app restarts
  - [ ] Target frame rate on the minimum-spec device (TODO: device)
  - [ ] Audio, haptics, pause / resume, and backgrounding behave correctly
  - [ ] Ads and purchases work in test mode (if monetized)
  - [ ] TODO: game-specific checks

Report the results in the PR. If any check fails, say so; don't mark the task complete.

## Configuration & Secrets

- Never commit API keys, signing keys, keystores, or passwords.
- TODO: Where secrets live (e.g. a local, git-ignored config file; CI secrets) and how to get them.

## Releases

1. Producer approves the release.
2. Bump the version in TODO.
3. Run the manual test checklist.
4. Tag the release `vX.Y.Z` (GitHub Desktop or a GitHub release)
5. TODO: Store submission steps.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| TODO | TODO |
