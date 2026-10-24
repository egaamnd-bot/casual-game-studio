# Art Bible & Asset Specifications

> Owner: Gemini (Creative Director). Status: **Draft, not approved.** All assets follow this document once the producer approves it.

## Visual Identity

- **Mood:** TODO (e.g. bright, friendly, cozy)
- **Style:** TODO (e.g. flat vector, soft 3D, pixel art)
- **Color palette:** TODO (hex codes)
- **Typography:** TODO (fonts and licenses)
- **References:** TODO (links or images in `docs/references/`)

## Technical Specs

| Asset type | Format | Size / resolution | Notes |
|------------|--------|-------------------|-------|
| Sprites / UI | PNG | TODO | Transparent background; atlas-friendly |
| App icon | PNG | TODO (store requirements) | |
| Animation | TODO (e.g. sprite sheet, Spine, Lottie) | TODO | Frame rate: TODO |
| Music | MP3 | TODO | Loopable, normalized |
| SFX | MP3 | TODO | Short, silence trimmed |

MP3 is used because OGG is not reliably supported by Safari / iOS web views. Keep lossless (WAV) masters outside the game folder.

## Naming Convention

Lowercase with underscores: `<type>_<name>_<variant>.<ext>`

```
spr_player_idle_01.png
ui_button_play.png
anim_coin_spin.png
sfx_coin_pickup.mp3
mus_main_theme.mp3
```

## Asset Delivery Checklist

Each asset hand-off includes:

- [ ] Final files that follow the specs and naming above
- [ ] Filename, format, and dimensions
- [ ] Where the asset goes and how it's used (integration notes)
- [ ] Generation prompt or source file, if the asset was AI-generated or edited
- [ ] License or source, for any third-party material

An asset counts as integrated only once it is merged into the repository.

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

## Credits

TODO: Keep the third-party asset sources and licenses in `ASSET_CREDITS.md`.
