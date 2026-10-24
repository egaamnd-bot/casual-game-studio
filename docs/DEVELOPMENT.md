# Development Guide

> Owner: Claude (Lead Developer). Fill in once the engine is approved.

## Prerequisites

- TODO: Engine and exact version
- TODO: SDKs (e.g. Android SDK / JDK, Xcode for iOS)
- Git and [Git LFS](https://git-lfs.com/)
- TODO: Other tools

## Setup

```bash
git clone https://github.com/egaamnd-bot/casual-game-studio.git
cd casual-game-studio
git lfs install
git lfs pull
```

TODO: Engine-specific steps (open the project, install packages, local config).

## Running the Game

TODO: How to run it in the editor, on an emulator, or on a device.

## Building

| Platform | Steps | Output |
|----------|-------|--------|
| Android | TODO | `.apk` (testing) / `.aab` (Play Store) |
| iOS | TODO | Xcode archive |

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
4. Tag the release: `git tag vX.Y.Z`
5. TODO: Store submission steps.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| TODO | TODO |
