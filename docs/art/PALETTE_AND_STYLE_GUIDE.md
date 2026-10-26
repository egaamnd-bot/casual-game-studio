# PULSE — Final Palette, Campaign Visual Themes & Cosmetic Skin Style Guide (v2.0)

**Approved Art Direction:** Direction A — *Kinetic Vector / Precision Cyber-Grid*  
**Target Platform & Engine:** Android Portrait (`1080 × 1920`, 9:16) | Phaser `3.90.0`

## 1. Master Color Palette (HEX & RGB Specifications)

| Category | Token Name | HEX | RGB | Intended Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Core Background** | `bg-obsidian` | `#0B0F19` | `11, 15, 25` | Default canvas clear color and Endless Mode base void |
| **Core Grid Primary** | `bg-grid-main` | `#162033` | `22, 32, 51` | Primary 128px blueprint grid lines |
| **Core Grid Sub** | `bg-grid-sub` | `#1E2D47` | `30, 45, 71` | Crosshair nodes, modal borders, and velocity ticks |
| **Player (Default)** | `player-cyan` | `#00F0FF` | `0, 240, 255` | Default orb expanded plasma core and trail sparks |
| **Player (Shrunk)** | `player-overcharge` | `#E0FFFF` | `224, 255, 255` | Compressed hold-state core, tension arcs, and near-miss graze wave |
| **Player (Rim)** | `player-ring` | `#7DF9FF` | `125, 249, 255` | Crisp `3px` outer containment ring (`r = 46px` exact collider edge) |
| **Hazard (Primary)** | `hazard-crimson` | `#FF2A54` | `255, 42, 84` | Solid lethal barrier rims and hazard stripes |
| **Hazard (Interior)** | `hazard-chassis` | `#2B111B` | `43, 17, 27` | Recessed barrier hull fill |
| **Hazard (Gap Tip)** | `hazard-amber` | `#FF7A00` | `255, 122, 0` | Gap-facing emitter strips on `wall_cap_left` and `wall_cap_right` |
| **Collectible (Gold)** | `energy-gold` | `#FFB800` | `255, 184, 0` | Standard diamond energy collectible (`+100` score) |
| **Collectible (Mint)** | `energy-mint` | `#00FF9D` | `0, 255, 157` | Bonus hexagonal energy collectible (`+250` score) |
| **Collectible (Dimmed)** | `energy-dim` | `#475569` | `71, 85, 105` | Tint (`0x475569` @ `45%` alpha) applied while player holds touch |
| **UI Text Primary** | `ui-white` | `#F8FAFC` | `248, 250, 252` | Dynamic Phaser Text headers, scores, and button labels |
| **UI Text Muted** | `ui-slate` | `#94A3B8` | `148, 163, 184` | Subtitles, secondary stats, and locked stage labels |

## 2. Campaign Visual Themes (Stages 1–3)

All three Campaign stages preserve 100% obstacle/collectible contrast by keeping background luminance below 18% while evolving the cyber-grid geometry:

| Stage | Theme Title | Background & Tick Textures | Palette HEX Codes | Visual Composition & Motion Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Stage 1** | **First Pulse** | `bg_stage1_first_pulse.png` (`512×512`)<br>`bg_stage1_ticks.png` (`128×512`) | Base `#090E1A`<br>Grid `#142238`<br>Nodes `#26446C`<br>Ticks `#00F0FF` | **Clean, calm, generous visual space.** Wide 128px blueprint cells with subtle crosshair intersections and steady 32px edge velocity ticks (`0.22×` scroll speed). Gives new players maximum breathing room to learn hold-to-shrink timing. |
| **Stage 2** | **Find the Rhythm** | `bg_stage2_find_rhythm.png` (`512×512`)<br>`bg_stage2_ticks.png` (`128×512`) | Base `#0C1021`<br>Lanes `#0F152A`<br>Grid `#1D264D`<br>Cadence `#00D2BE` | **Alternating geometry & rhythm cues.** Vertical 64px alternating cadence lanes paired with horizontal downbeat bars (every `128px`), upward teal chevrons, and diamond beat markers on the side tick rails (`0.30×` scroll speed) that visually pace alternating gate weaves. |
| **Stage 3** | **Controlled Overload** | `bg_stage3_overload.png` (`512×512`)<br>`bg_stage3_ticks.png` (`128×512`) | Base `#100B1C`<br>Grid `#2A163B`<br>Traces `#5C2076`<br>Ticks `#C026D3` | **Denser circuit patterns & energetic effects without sacrificing clarity.** Tight 32px/64px circuit-matrix sub-grid with diagonal violet/magenta data conduits and double-density 16px edge velocity ticks (`0.38×` scroll speed). Deep violet/magenta hues stay cool and dark so `#FF2A54` crimson barriers and `#FFB800` gold orbs remain unmistakably legible. |

## 3. Cosmetic Orb Skins Specification

All three unlockable/selectable skins are packed into `pulse_skins_atlas.png` / `.json` (and provided as standalone PNGs in `assets/sprites/skins/`). Every skin uses the **exact same sprite dimensions, center pivot `(0.5, 0.5)`, and physics collider radii (`r = 46px` normal, `r = 20px` shrunk)** as the default cyan orb:

| Skin Name | Frame Prefix | Palette HEX | Silhouette & Internal Geometry |
| :--- | :--- | :--- | :--- |
| **Default (Kinetic Cyan)** | `player_orb_` *(in `pulse_gameplay_atlas`)* | Core `#00F0FF`, Hot `#E0FFFF`, Rim `#7DF9FF` | Concentric plasma sphere with an internal 8-sided geometric facet ring and segmented cardinal reticle. |
| **Solar Flare** | `skin_solar_flare_` | Core `#FF7A00`, Corona `#FFB703`, Hot `#FFF3B0`, Shell `#441A06` | High-energy stellar plasma core featuring an internal 16-point solar corona starburst inside the `46px` containment rim. |
| **Void Prism** | `skin_void_prism_` | Core `#A855F7`, Rim `#E879F9`, Hot `#F3E8FF`, Singularity `#16062A` | Dark-matter singularity surrounded by dual interlocking hexagram prism triangles and ultraviolet containment arcs. |
| **Retro Green** | `skin_retro_green_` | Core `#00FF66`, Rim `#39FF14`, Hot `#CCFFE0`, Phosphor `#063014` | Classic vector-oscilloscope phosphor sphere with internal horizontal CRT scanlines and a precision radar crosshair. |
