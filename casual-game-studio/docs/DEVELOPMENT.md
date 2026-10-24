# Development Guide

## Prerequisites

- TODO: Engine and exact version (e.g. Unity 2022.3 LTS, Godot 4.x)
- TODO: Language toolchain / SDKs (e.g. Android SDK, Xcode, Node.js)
- Git and [Git LFS](https://git-lfs.com/) for large binary assets
- TODO: Any other tools (IDE, texture packer, audio tools)

## Setup

```bash
git clone https://github.com/egaamnd-bot/casual-game-studio.git
cd casual-game-studio
git lfs install
git lfs pull
```

TODO: Engine-specific steps (open the project, install packages, configure keys).

## Running the Game

TODO: How to run in the editor or locally (scene to open, command to run, URL to visit).

## Building

| Platform | Steps | Output |
|----------|-------|--------|
| TODO: Android | TODO | TODO: `.apk` / `.aab` |
| TODO: iOS | TODO | TODO: Xcode project |
| TODO: Web | TODO | TODO: static files |

## Testing

- **Automated tests:** TODO (framework and how to run)
- **Manual test checklist** before a release:
  - [ ] Fresh install launches and tutorial completes
  - [ ] Save / load works after closing the app
  - [ ] Game runs at target frame rate on the minimum-spec device
  - [ ] Audio, haptics, and pause / resume behave correctly
  - [ ] TODO: Game-specific checks

## Configuration & Secrets

- Never commit API keys, signing keys, or passwords.
- TODO: Where secrets live (e.g. local `.env`, CI secrets) and which config files are git-ignored.

## Releases

1. Update the version number in TODO
2. Run the manual test checklist
3. Tag the release: `git tag vX.Y.Z`
4. TODO: Store submission steps

## Troubleshooting

| Problem | Fix |
|---------|-----|
| TODO | TODO |
