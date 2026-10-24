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

No local install is needed. Game code lives in `src/` as plain JavaScript (no bundler); GitHub Actions installs Phaser and Capacitor during the build.

## Running the Game

- **On a phone:** install the debug APK from GitHub Actions (see Building).
- **In a desktop browser:** open `tests/gameplay.html?start=0` (Phaser loads from a CDN, so you need internet). Mouse button or touch = hold.

## Building

| Platform | Steps | Output |
|----------|-------|--------|
| Android (testing) | Push any branch → **Actions → Android debug APK** → download the artifact `pulse-debug-apk-run<N>`. Install steps: [ANDROID_PIPELINE_TEST.md](ANDROID_PIPELINE_TEST.md) | Debug-signed `.apk` |
| Android (Play Store) | TODO: release workflow and signing key (not set up) | `.aab` |
| iOS | Deferred (needs a Mac and a paid Apple developer account) | n/a |

## Testing

- **Automated tests:** plain HTML test pages in `tests/`. Open each in a desktop browser; the tab title shows PASS/FAIL or the result. Details: [PULSE_PROTOTYPE.md](PULSE_PROTOTYPE.md#testing)
  - `tests/assets.html`: Gemini's asset pack loads, every used frame exists, art lines up with collision sizes
  - `tests/campaign.html`: campaign stages, stars, skins, save data
  - Pages that load the game's images need Chrome/Edge started with `--allow-file-access-from-files` when opened as local files. `scene.html?noassets=1` and `gameplay.html?noassets=1` test the shape fallback
  - `tests/scene.html`: the real game driven by simulated input (touch release, pause, retry, saving)
  - `tests/logic.html`: collision and fairness of the Endless obstacle generator
  - `tests/gameplay.html?bot=1&seconds=60`: the real game played by an autopilot
  - `tests/gameplay.html?seconds=10`: the real game with no input (should crash at the first wall)
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
