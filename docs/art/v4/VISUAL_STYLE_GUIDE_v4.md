# PULSE v4.0 — Visual Style Guide: Neon Geometric Precision

**Identity:** *PULSE: Neon Geometric Precision*  
**Platform & Engine:** Mobile Landscape (`16:9` primary `960 × 540` logical / `1920 × 1080` HD, adaptable `18:9`–`21:9`) · Phaser `3.90.0` · Capacitor Android

## 1. Color System & Shape-First Readability

Every critical gameplay state is communicated through **both silhouette geometry and color contrast** (never color alone):

| Role | Token | HEX | Phaser Hex | Geometric Silhouette & Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Deep Void / Navy** | `bg_void` / `w1_bg` | `#070B14` / `#080D1A` | `0x070B14` / `0x080D1A` | High-contrast dark backdrop keeping luminance `< 15%` |
| **Electric Cyan (Safe/Armed)** | `cyan_main` / `cyan_hot` | `#00F0FF` / `#E0FFFF` | `0x00F0FF` / `0xE0FFFF` | Default player orb (octagon+diamond core), full charge ring (octagon + 4 cardinal diamond studs), armed barriers |
| **Crimson Red (Danger/Locked)** | `crimson_main` | `#FF2A54` | `0xFF2A54` | Squeeze gates, shrunk-state ordinary barriers (dashed + `×`), and **LOCKED Charged Barriers** (`×`-barred diamond studs) |
| **Solar Gold (Primary Energy)** | `gold_main` | `#FFB800` | `0xFFB800` | 4-point **Diamond** energy collectibles, star ratings, and `×5` octagram celebration |
| **Mint Green (Bonus Energy)** | `mint_main` | `#00FF9D` | `0x00FF9D` | 6-point **Hexagon** bonus collectibles, recovery chevrons, and stage-clear banners |
| **Chromatic Violet / Magenta** | `w2_violet` / `w2_magenta` | `#A855F7` / `#EC4899` | `0xA855F7` / `0xEC4899` | World 2 (*Chromatic Overdrive*), World 3 (*Pulse Collapse*) accents, and *Violet Nova* / *Void Prism* skins |
| **Pure White (UI & Lock Rim)** | `white` | `#F8FAFC` | `0xF8FAFC` | Essential dynamic UI text, 100% full-charge lock rim, and *Whiteout* skin |

## 2. Three Themed Campaign Worlds (`backgrounds/` & `pulse_world_decor_atlas`)

1. **WORLD 1 — NEON CIRCUIT (`bg_world1_far`, `bg_world1_mid`, `bg_world1_fg_rail`, `bg_world1_intro_banner`):**
   - **Palette:** Deep Navy `#080D1A`, Grid `#142642`, Electric Cyan `#00F0FF`, Restrained White `#F8FAFC`.
   - **Layers:** Clean `128px` blueprint grid with monolithic circuit blocks (`far`), stepped geometric ceiling/floor ridges (`mid`), and crisp cyan/white velocity tick rails (`fg_rail`).
2. **WORLD 2 — CHROMATIC OVERDRIVE (`bg_world2_far`, `bg_world2_mid`, `bg_world2_fg_rail`, `bg_world2_intro_banner`):**
   - **Palette:** Dark Indigo `#0C0A1C`, Grid `#26184A`, Violet `#A855F7`, Magenta `#EC4899`, Cyan `#00F0FF`.
   - **Layers:** Alternating cadence lanes with concentric diamond rhythm markers (`far`), sharp crystalline prism spires (`mid`), and magenta-cyan syncopated beat rails (`fg_rail`).
3. **WORLD 3 — PULSE COLLAPSE (`bg_world3_far`, `bg_world3_mid`, `bg_world3_fg_rail`, `bg_world3_intro_banner`):**
   - **Palette:** Obsidian Violet `#100816`, Hex Matrix `#34122E`, Crimson `#FF2A54`, Electric Cyan `#00F0FF`, Bright White `#F8FAFC`.
   - **Layers:** High-density hexagonal circuit matrix (`far`), fractured collapse monoliths with white-hot rim highlights (`mid`), and double-density `16px` velocity rails (`fg_rail`).

## 3. Six Cosmetic Orb Skins (`pulse_skins_atlas` & `cosmetics/`)

All 6 skins share identical sprite sizes (`128×128` normal/ring/morph, `76×76` shrunk, `96×96` tension arcs), center origin `(0.5, 0.5)`, and solid hitbox radii (`r = 46px` normal, `r = 22px` shrunk):
1. **Original Cyan Pulse (`classic`):** `#00F0FF` octagon + `#E0FFFF` inner diamond (`pulse_gameplay_atlas` -> `player_orb_*`).
2. **Solar Flare (`solar-flare`):** `#FF7A00` / `#FFF3B0` 16-point stellar corona starburst (`pulse_skins_atlas` -> `skin_solar_flare_*`).
3. **Void Prism (`void-prism`):** `#A855F7` / `#E879F9` dual interlocking hexagram prism (`pulse_skins_atlas` -> `skin_void_prism_*`).
4. **Retro Green (`retro-green`):** `#00FF66` / `#39FF14` CRT scanline & oscilloscope crosshair orb (`pulse_skins_atlas` -> `skin_retro_green_*`).
5. **Violet Nova (`violet-nova` — NEW in v4):** `#D946EF` / `#F472B6` 12-point synthwave pulsar star (`pulse_skins_atlas` -> `skin_violet_nova_*`).
6. **Whiteout (`whiteout` — NEW in v4):** `#F8FAFC` / `#A5F3FC` high-contrast monochrome geometric aperture (`pulse_skins_atlas` -> `skin_whiteout_*`).
