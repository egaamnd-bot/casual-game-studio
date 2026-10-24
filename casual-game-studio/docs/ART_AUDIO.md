# Art & Audio Guide

## Visual Style

- **Mood:** TODO (e.g. bright, friendly, cozy)
- **Style:** TODO (e.g. flat vector, low-poly 3D, pixel art)
- **Color palette:** TODO (add hex codes or a palette image)
- **References:** TODO (links or images in `docs/references/`)

## Technical Specs

| Asset type | Format | Size / resolution | Notes |
|------------|--------|-------------------|-------|
| Sprites / UI | PNG | TODO | Power-of-two atlases where possible |
| 3D models | TODO (e.g. FBX, glTF) | TODO poly budget | |
| Music | OGG | TODO | Loopable, normalized |
| SFX | WAV / OGG | TODO | Short, trimmed silence |

## Naming Convention

Use lowercase with underscores: `<type>_<name>_<variant>.<ext>`

```
spr_player_idle_01.png
ui_button_play.png
sfx_coin_pickup.wav
mus_main_theme.ogg
```

## Folder Structure

TODO: Match the engine's project layout, for example:

```
assets/
├── art/
│   ├── characters/
│   ├── environments/
│   └── ui/
└── audio/
    ├── music/
    └── sfx/
```

## Source Files

- Keep editable source files (PSD, Aseprite, Blender, DAW projects) in TODO (e.g. `source-assets/` via Git LFS, or a shared drive).
- Export only game-ready files into the project's asset folder.

## Licensing & Credits

Record every third-party asset (source, author, license) in TODO (e.g. `ASSET_CREDITS.md`).
