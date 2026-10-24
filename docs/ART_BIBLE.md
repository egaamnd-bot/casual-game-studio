# Art Bible & Asset Specifications

> Owner: Gemini (Creative Director). **Direction approved by the producer:** Direction A, *Kinetic Vector / Precision Cyber-Grid* (see DECISIONS.md #7).
>
> **Artwork status: provisional.** The game on `main` and on `feature/pulse-campaign-system` still uses placeholder shapes drawn in code. Gemini's v2.0 asset pack is being integrated separately. Nothing below counts as in the game until those files are merged and tested on the phone.

## Visual Identity

- **Mood:** precise, energetic, high-contrast; a dark blueprint grid with bright plasma and hazard accents
- **Style:** clean vector shapes with glow, geometric reticles and circuit traces
- **Core palette (from Gemini's v2.0 style guide):**

| Role | Hex |
|------|-----|
| Background | `#0B0F19` |
| Grid lines | `#162033` / `#1E2D47` |
| Player orb (default) | `#00F0FF`, shrunk core `#E0FFFF`, rim `#7DF9FF` |
| Hazard walls | rim `#FF2A54`, body `#2B111B`, gap-edge strip `#FF7A00` |
| Energy (standard) | `#FFB800` |
| Bonus energy | `#00FF9D` |
| Dimmed pickups | `#475569` tint at 45% opacity |
| Text | `#F8FAFC`, muted `#94A3B8` |

- **Stage themes:** Stage 1 calm blue grid; Stage 2 teal rhythm lanes; Stage 3 dense violet circuits. All keep background brightness low so walls and energy stay readable.
- **Skins:** Classic (Kinetic Cyan), Solar Flare, Void Prism and Retro Green. All four share the same sprite sizes and pivot.
- **Typography:** game text is rendered by the game (UI images contain no text). TODO: choose and license a font.
- **References:** Gemini's full guide and contact sheet will be committed with the asset pack.

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
