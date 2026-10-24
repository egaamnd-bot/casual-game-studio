# Contributing

Thanks for helping build Casual Game Studio! This guide explains how we work together.

## Workflow

1. **Pick or create an issue.** Every change should link to an issue describing the bug, feature, or task.
2. **Create a branch** from `main`:
   - `feature/<short-description>` for new features
   - `fix/<short-description>` for bug fixes
   - `art/<short-description>` for art or audio assets
   - `docs/<short-description>` for documentation
3. **Commit small, focused changes** (see commit style below).
4. **Open a pull request** into `main` and request at least one review.
5. **Merge** once the review is approved and checks pass. Prefer squash merges.

## Commit Messages

Use short, imperative messages with an optional prefix:

```
feat: add combo multiplier to scoring
fix: prevent double tap from skipping tutorial
art: add level 3 background
docs: update build instructions
```

## Pull Requests

A good PR:

- Describes **what** changed and **why**
- Links the related issue (`Closes #12`)
- Includes screenshots or a short clip for any gameplay or UI change
- Lists how it was tested (device, platform, build type)

## Code Style

TODO: Fill in once the engine and language are chosen. For example:

- Follow the engine's official style guide
- Keep scripts small and single-purpose
- No magic numbers in gameplay code; put tunable values in config or data assets

## Assets

- Follow naming and format rules in [docs/ART_AUDIO.md](docs/ART_AUDIO.md)
- Do not commit source files larger than TODO MB without Git LFS
- Only commit assets you have the right to use, and record third-party licenses in TODO (e.g. `ASSET_CREDITS.md`)

## Reporting Bugs

Open an issue with:

- Steps to reproduce
- Expected vs. actual behaviour
- Platform, device, and build version
- Screenshots, video, or logs if available

## Questions

TODO: Where to ask (e.g. team chat channel, discussions tab, or a contact email).
