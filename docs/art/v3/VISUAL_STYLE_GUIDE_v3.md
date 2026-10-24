# PULSE v3.0 — Visual Style Guide (Neon Geometric Precision)

**Creative Direction:** Geometry Dash–Inspired High-Contrast Neon Geometric Arcade  
**Target Orientation:** Mobile Landscape (`16:9` baseline: `960 × 540` logical / `1920 × 1080` HD, adaptable to `18:9`–`21:9`)  
**Target Engine:** Phaser `3.90.0` JavaScript  

## 1. Core Visual Identity & Design Pillars

1. **Bold Geometric Silhouettes Over Color Alone:** Every interactive entity has a unique geometric polygon silhouette:
   - **Player Orb:** Concentric Octagon + Inner Diamond Core inside a circular containment rim (`r = 46px` sprite / `56px` game full size, `r = 22px` sprite / `20px` game shrunk).
   - **Ordinary Squeeze Gate:** Solid thick crimson rectangular blocks with `45°` chamfered gap-facing caps and vertical amber emitter strips (`wall_body_tile`, `wall_cap_left`, `wall_cap_right`).
   - **Ordinary Cyan Smash Barrier:** Single-banded translucent energy bar with **inward-pointing chevron fracture seams (`> <`)** along the center (`barrier_smash_ready_tile` vs. broken dashed crimson `barrier_smash_danger_tile`).
   - **Charged Cyan Barrier:** Thicker **double-bordered armored frame** studded with **large geometric Diamond Capacitor Cores** (`barrier_charged_ready_tile` vs. X-locked crimson/amber `barrier_charged_danger_tile`) and a prominent `96×96` **Octagon-Diamond Target Emblem** (`barrier_charged_emblem_ready` / `barrier_charged_emblem_danger`) centered on the orb's lane.
   - **Standard Energy (Gold):** 4-point **Diamond** inside a circular radar ring (`orb_energy_gold_01..04`).
   - **Bonus Energy (Mint):** 6-point **Hexagon** inside a circular radar ring (`orb_energy_mint_01..04`).
2. **Restrained Pre-Baked Glow & Crisp Outlines:** All sprites use a `3px–4px` high-contrast solid perimeter rim paired with a tightly controlled `10px–16px` radial alpha falloff baked directly into the PNG. Collision boundaries always match the **solid inner rim**, never the outer glow fringe.

## 2. Master Color Palette (HEX & Phaser Integer Values)

| Role | Token | HEX | Phaser Hex | Usage Rules |
| :--- | :--- | :--- | :--- | :--- |
| **Void Background** | `bg_void` | `#070B14` | `0x070B14` | Deepest canvas clear color |
| **Stage 1 Base / Grid** | `s1_bg` / `s1_grid` | `#080D1A` / `#14243E` | `0x080D1A` / `0x14243E` | *First Pulse* clean geometric background |
| **Stage 2 Base / Accent** | `s2_bg` / `s2_accent` | `#0B1024` / `#00D2BE` | `0x0B1024` / `0x00D2BE` | *Find the Rhythm* cadence lanes & chevrons |
| **Stage 3 Base / Accent** | `s3_bg` / `s3_accent` | `#110A1E` / `#C026D3` | `0x110A1E` / `0xC026D3` | *Controlled Overload* hex-circuit matrix |
| **Player & Smash Cyan** | `cyan_main` | `#00F0FF` | `0x00F0FF` | Full-size orb fill, ready smash barriers, charge segments |
| **Overcharge White-Cyan** | `cyan_hot` | `#E0FFFF` | `0xE0FFFF` | 100% locked charge ring, charged barrier outer rails, shrunken core |
| **Lethal / Danger Red** | `crimson_main` | `#FF2A54` | `0xFF2A54` | Squeeze gate rims, uncharged/shrunk barrier danger states |
| **Barrier Dark Chassis** | `crimson_dark` | `#2B111B` | `0x2B111B` | Recessed interior fill of squeeze gates & locked barriers |
| **Warning Trim** | `amber_warn` | `#FF7A00` | `0xFF7A00` | Gap-edge strips and uncharged barrier lockout bars |
| **Standard Energy Gold** | `gold_main` | `#FFB800` | `0xFFB800` | Standard collectible diamond, star ratings, ×5 celebration |
| **Bonus Energy Mint** | `mint_main` | `#00FF9D` | `0x00FF9D` | Optional risky bonus hexagon, stage-clear banner, recovery chevron |
| **Shrunken Dim Tint** | `dim_slate` | `#475569` | `0x475569` | Applied at `45%` alpha (`0.45`) to collectibles while player holds shrink |
