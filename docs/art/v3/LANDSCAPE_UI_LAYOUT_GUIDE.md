# PULSE v3.0 — Landscape UI & Viewport Layout Guide

**Reference Diagram:** `PULSE_v3_Landscape_UI_Guide.png`  
**Target Logical Viewport:** `960 × 540` (`16:9` @1x, scales cleanly to `1920 × 1080` @2x and wider `18:9`–`20:9` Android phone screens)

## 1. Landscape Safe Margins & Unobstructed Action Corridor

- **Horizontal Notch / Cutout Buffer:** Keep all interactive buttons and HUD text at least `48px` (at `960×540`) / `96px` (at `1920×1080`) inset from the left and right screen edges.
- **Vertical Edge Buffer:** Keep HUD elements within the top `72px` strip (`Y: 16..88` on a `540px` tall canvas) so the central gameplay corridor remains **100% free of panels, badges, or buttons**.
- **Gameplay HUD Layout (`960 × 540` Logical Coordinates):**
  - **Pause Control (Top-Left):** `ui_btn_icon_pause_up` (`48×48` drawn size) at `(X: 56, Y: 44)`.
  - **Campaign Progress Bar (Top-Center):** `6px` tall bar spanning `X: 280..680, Y: 36` (`400px` wide) using `#162033` track and `#00F0FF` fill.
  - **Score / Energy & Multiplier Readout (Top-Right):** `ui_hud_bracket_right` (`168×62` drawn size) anchored at `(X: 840, Y: 46)`, housing the score/energy counter and `x2`–`x5` multiplier text.
- **Landscape Main Menu (`960 × 540` Logical Coordinates):**
  - **Left Column (`X: 280`):** Brand Logo `ui_logo_pulse` at `(280, 125)` + Campaign & Endless Mode cards stacked at `(280, 290)` and `(280, 420)`.
  - **Right Column (`X: 700`):** Cosmetic Orb Skin Selector pedestal (`ui_skin_slot_selected` at `(700, 295)`) with left/right browse arrows (`ui_btn_icon_back_up` at `X: 560` and flipped at `X: 840`) and total star counter at `(700, 115)`.
- **Landscape Campaign Stage Selection (`960 × 540`):**
  - Displays the 3 stage cards (`ui_stage_card_locked`, `ui_stage_card_unlocked`, `ui_stage_card_completed`) in a spacious horizontal row at `Y = 275`, `X = 230, 480, 730` (`scale = 0.72`), with the Back button (`ui_btn_icon_back_up`) at `(X: 64, Y: 52)`.
