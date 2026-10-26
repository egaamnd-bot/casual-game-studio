# PULSE — Asset & Audio Pack Changelog (v3.0 → v4.0)

## 1. Backward Compatibility Summary
- **Deprecated / Removed Asset IDs:** **None (`0`).** Every single atlas key, frame name, and background image key from `PULSE_Production_Asset_Pack_v3.0.zip` (as integrated in `pulse-debug-apk-run18`) is retained with identical dimensions, anchor points `(0.5, 0.5)`, and collider offsets.

## 2. Replaced / Upgraded Assets (1:1 Compatible Drop-In Replacements)
| Existing v3 Asset ID | v4 Replacement / Alias | Improvement in v4.0 |
| :--- | :--- | :--- |
| `bg_stage1_first_pulse`, `bg_stage1_mid_parallax`, `bg_stage1_rail_horiz` | Retained + aliased to `bg_world1_far`, `bg_world1_mid`, `bg_world1_fg_rail` | Upgraded to **World 1: Neon Circuit** with subtle cyan node accents and white velocity markers |
| `bg_stage2_find_rhythm`, `bg_stage2_mid_parallax`, `bg_stage2_rail_horiz` | Retained + aliased to `bg_world2_far`, `bg_world2_mid`, `bg_world2_fg_rail` | Upgraded to **World 2: Chromatic Overdrive** with violet/magenta/cyan crystalline parallax spires |
| `bg_stage3_overload`, `bg_stage3_mid_parallax`, `bg_stage3_rail_horiz` | Retained + aliased to `bg_world3_far`, `bg_world3_mid`, `bg_world3_fg_rail` | Upgraded to **World 3: Pulse Collapse** with fractured monolith silhouettes and bright white/crimson accents |
| `skin_solar_flare_*`, `skin_void_prism_*`, `skin_retro_green_*` | Retained in `pulse_skins_atlas` | Added `_morph_01` and `_morph_02` transition frames (`128×128`) to every skin |

## 3. Newly Added Assets in v4.0
- **Gameplay Atlas (`pulse_gameplay_atlas`):** Added `fx_orb_spawn_materialize` (`160×160`), `fx_stage_clear_burst` (`256×256`), and `fx_world_transition_wave` (`128×256`).
- **Cosmetic Skins (`pulse_skins_atlas` & `cosmetics/`):** Added 2 complete new skins (**Violet Nova** `skin_violet_nova_*` and **Whiteout** `skin_whiteout_*`, 9 frames each) plus standalone `skin_cyan_pulse_*` files in `cosmetics/`.
- **UI Atlas & Stage Cards (`pulse_ui_atlas` & `sprites/ui/`):** Added `ui_world_card_world1_neon_circuit`, `ui_world_card_world2_chromatic_overdrive`, `ui_world_card_world3_pulse_collapse`, `ui_btn_icon_settings_up/down`, `ui_stars_trio_0..3`, `ui_hud_icon_gold`, `ui_hud_icon_mint`, `ui_tutorial_callout_9slice`, `ui_icon_status_error`, and 12 stage card plates (`ui_stage_card_s01_w1` .. `ui_stage_card_s12_w3`).
- **World Intro Banners & Decor (`backgrounds/` & `pulse_world_decor_atlas`):** Added `bg_world1..3_intro_banner.png` (`512×160`) and 9 reusable non-hazard decorative elements (`decor_w1..w3_*`).
- **Original Synthwave OST (`audio/music/`):** Added 8 original tracks/stings (`MENU_THEME`, `WORLD_1_GAMEPLAY`, `WORLD_2_GAMEPLAY`, `WORLD_3_GAMEPLAY`, `STAGE_CLEAR`, `GAME_OVER`, `WORLD_TRANSITION`, `MAX_MULTIPLIER_STING`) + `OST_Preview_Medley.ogg`.
- **Action-by-Action Sound Effects (`audio/sfx/`):** Added 31 original SFX in both `.ogg` and `.wav` master formats (`62` SFX files total).
