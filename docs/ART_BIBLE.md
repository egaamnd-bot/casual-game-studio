# Art Bible & Asset Specifications

> Owner: Gemini (Creative Director). **Direction approved by the producer:** Direction A, *Kinetic Vector / Precision Cyber-Grid* (see DECISIONS.md #7).
>
> **Artwork status:** Gemini's v2.0 asset pack is integrated on branch `feature/pulse-art-v2` and passes automated checks. It is **not yet tested on the phone or merged**. Gemini's own documents: [art/PALETTE_AND_STYLE_GUIDE.md](art/PALETTE_AND_STYLE_GUIDE.md), [art/GEMINI_INTEGRATION_GUIDE_v2.md](art/GEMINI_INTEGRATION_GUIDE_v2.md), [art/PULSE_v2_Asset_Contact_Sheet.png](art/PULSE_v2_Asset_Contact_Sheet.png).

## Integration Rules (v2.0)

Gemini authored the art for a 1080 px wide screen; the game is 540 px wide. **Gameplay sizes never change to fit the art. The art is scaled to fit the gameplay** (producer decision, DECISIONS.md #8). Scale factors are measured from the files and kept in `Pulse.ART` (`src/js/config.js`):

| Art | Measured in file | Drawn so that |
|-----|------------------|---------------|
| `*_normal` orb | solid radius 46 px | its edge = the orb's collision radius (56 px full size, shrinking smoothly) |
| `*_shrunk` orb, tension arcs | solid radius 22 px | its edge = 20 px when fully shrunk; fades in as the orb shrinks |
| `wall_body_tile`, `wall_cap_left/right` | 72 px hazard band, 12 px margin | band = the 36 px collision wall; cap edges sit exactly on the gap edges |
| `orb_energy_gold_*` (standard energy) | solid radius 24 px | 16 px on screen (collection radius unchanged at 14 px plus orb) |
| `orb_energy_mint_*` (bonus energy) | solid radius 28 px | 16 px on screen |
| UI frames, backgrounds | 1080-space | half size; buttons use nine-slice so corners stay crisp |

Mapping decisions:
- Gold = standard energy, mint = bonus (campaign only).
- Gemini's suggested point values (+100 / +250) are **not used**: Endless keeps its multiplier, Campaign keeps stars.
- Gemini's code samples assume Phaser's Arcade Physics; the game keeps its own collision. Only the visuals were adopted.
- Near-miss arc: cosmetic only, shown when the orb passes a wall with 8 px or less to spare. It never changes score; a test checks this.
- Endless tunnels are taller than the wall art, so they're drawn in code using the same palette.
- If any asset fails to load, the game falls back to the code-drawn shapes in the same palette.

Not used yet: tutorial hands, audio toggle icons, HUD brackets, header banners and badges, `wall_joint_divider`, and the separate `bg_speed_ticks` variants beyond Endless. There's no audio in the pack; sounds remain synthesized placeholders.

Feedback for Gemini:
- `ui_icon_status_lock` looks like an *open* padlock; a closed one would read better for locked stages.
- New art request: a **cyan barrier** (full-width tileable energy membrane, 44 px tall in 1080-space; charged-cyan and danger-red states; shatter effect) and optionally a height-tileable tunnel body. Both are code-drawn for now. See [GAMEPLAY_VARIETY.md](GAMEPLAY_VARIETY.md).

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

```
src/assets/
├── atlases/       pulse_gameplay, pulse_skins, pulse_ui (.png + .json, Phaser JSON hash)
└── backgrounds/   bg_grid_tile, bg_speed_ticks, bg_stage1..3 + ticks
```

Only atlases and backgrounds ship in the app. The pack's loose per-sprite PNGs duplicate the atlas contents and aren't copied. `tests/assets.html` checks that every frame the code uses exists.

## Credits

All v2.0 artwork was produced by Gemini (Creative Director) for this project. There are no third-party assets.
