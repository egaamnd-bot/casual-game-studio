# Landscape Conversion + Gemini v3 Art

> **Superseded for the new branch** by [PORTRAIT_REWORK.md](PORTRAIT_REWORK.md) (decision #14). This page describes the landscape build.

> Status: **built and tested automatically; not yet tested on a phone; not merged.** Branch `feature/pulse-landscape`, started from **`e8790cf`** (Gameplay Evolution v2, verified as the head of `origin/feature/pulse-gameplay-evolution`). `e8790cf` stays as the recoverable portrait version. Approved by the producer (DECISIONS.md #9).

## How It Works

**Two coordinate spaces, one mapping.**

- **Track space (the rules).** All gameplay logic (`level.js`, `patterns.js`, `campaign.js`, `stages.js`) is unchanged. `x` runs across the lane (0–540) and `y` along the direction of travel; the orb sits at 70% of the track length. This is why fairness, timing, collision, charge duration and difficulty are mathematically identical to the tested portrait game, and why the logic and campaign suites produce the same numbers as before.
- **Screen space (landscape).** The screen is 540 px tall (the lane) and as wide as the phone's aspect ratio allows: 860–1240 px (16:9 = 960, 18:9 = 1080, 20:9 = 1200; 21:9 is capped at 1240). Outside that range (tablets, a phone held upright) Phaser letterboxes.
- **The mapping.** Gameplay objects are drawn inside one container (`GameScene.layer`) placed at the right edge and rotated 90°. Track `(x, y)` lands on screen at `(screenWidth − y, x)`:
  - Obstacles enter on the right and travel left.
  - The orb sits **30% from the left**, vertically centred.
  - Gap walls become columns from the top and bottom edges, with the gap in the middle.
  - Barriers are full-height bars.
- **Read-ahead is unchanged.** 70% of the screen width is ahead of the orb, the same distance the portrait game showed above it.
- **Native landscape layout.** The HUD, menus, stage select, pause, game-over and stage-clear screens are laid out directly in landscape (Gemini's layout guide), not rotated. So are the backgrounds: base tile, ceiling and floor ridges, and top and bottom tick rails, all scrolling left with parallax.
- **Android:** the build workflow now sets `screenOrientation="sensorLandscape"`, so the app works in either landscape direction.

## Layout (from `docs/art/v3/LANDSCAPE_UI_LAYOUT_GUIDE.md`, scaled to the screen width)

| Screen | Layout |
|--------|--------|
| Gameplay HUD | Pause (48 px) at top-left (56, 44). Campaign progress bar at top-centre (400 px). Score/best/multiplier (Endless) or energy (Campaign) in the right bracket at top-right. The lane below stays clear. |
| Ready / paused / game over | Text centred between the orb and the right edge; one button bottom-centre of that area. Paused and game over dim the play field slightly so text reads over frozen obstacles. |
| Stage clear | Dimmed field, title + stars + details on the right, three buttons in a row centred along the bottom (Stages · Retry · Next stage). |
| Main menu | Left column: logo, Campaign and Endless cards. Right column: star total and the skin picker with arrows. |
| Stage select | Back icon top-left, title top-centre, a row of three stage cards (0.72 scale). |
| Read-ahead aid | `ind_upcoming_charged_warn` pulses at the right edge while a charged barrier is less than half a screen away but not yet visible. |

## Gemini v3 Art in Use

- **Sprites:** 88 atlas frames, checked at load and by `tests/assets.html`.
- **Gameplay sprites:** every existing sprite was redrawn in v3 with **identical geometry** (orb body radius 46, shrunk 22, wall band 72 px, caps, pickups 24/28), so collision alignment is unchanged. New:
  - **Barriers:** `barrier_smash_ready/danger_tile` (band 44 px → 22 px, the plain barrier's collision thickness) and `barrier_charged_ready/danger_tile` (band 60 px → 30 px, the charged one's), plus the charged emblem on the orb's lane. Which tile shows comes from `Level.canSmash`, the same function the collision uses, so a charged barrier stays in red lockout until the ring is full.
  - **Charge ring:** `charge_ring_state_a_empty`, `_b_step_01..04`, `_c_full`, and the completion burst. Drawn at the orb's scale; only shown while a charged barrier is on screen.
  - **Tunnels:** `tunnel_wall_edge_tile` at both gap edges, plus `ind_long_hold_guide_tile` along the lane.
  - **Finish line:** `finish_line_tile`, scaled so its band is the 24 px finish line.
- **Effects:**
  - `fx_smash_ordinary_burst` vs `fx_smash_charged_nova`
  - `fx_fail_charged_deflect` when a charged barrier is hit too early
  - `fx_collect_gold_burst` / `fx_collect_mint_burst`
  - `fx_mult_up_chevron` when the multiplier rises
  - `fx_mult_x5_starburst` at ×5
- **Backgrounds (12):** the 4 base tiles, 4 `*_mid_parallax` ridge strips (floor, and flipped for the ceiling) and 4 `*_rail_horiz` tick rails (bottom, and flipped for the top). The portrait edge-tick textures are removed.
- **UI:** the same text-free frames, now in a 2048×2048 atlas.

**Not used yet:** `player_orb_morph_01/02` (the cross-fade already covers shrinking), `ind_recovery_chevron`, the tutorial hands, the audio toggle icons, banners and badges, and `wall_joint_divider`.

**Texture memory** (uncompressed RGBA on the GPU): gameplay 4 MB + skins 2 MB + UI 16 MB + backgrounds ≈ 3 MB → **about 25 MB**. That's the same as before (the old UI atlas was 1024×4096) and comfortable for current Android phones. App assets on disk: 786 KB.

## Tests (headless Edge, on this branch)

| Test | Result |
|------|--------|
| `tests/landscape.html` (new) at 6 window shapes: 16:9, 18:9, 20:9, 21:9, 4:3 tablet, phone held upright | **PASS at all 6.** Checks: logical size follows the aspect ratio; orb at 30% from the left; orb sprite at the orb; gate art where the rules put the gap; barriers span the full height; obstacles enter from the right; HUD stays in the top strip and clear of the notch; nothing off screen on any menu or gameplay screen; game-over and stage-clear buttons don't overlap each other or the orb. |
| `tests/assets.html` | **PASS.** 88 frames present; barrier tiles and emblem match `canSmash` *and* the actual collision outcome for plain and charged barriers in 5 orb states; barrier bands aligned with their collision thickness; charge ring A/B/C states and burst; orb, wall and pickup scale. |
| `tests/scene.html` (sprites and shapes) | **PASS.** Taps in the landscape lane; pause via the new button position; dimming; save rules; Endless. |
| `tests/logic.html`, `tests/campaign.html` | **PASS** (190/190), identical numbers to `e8790cf`: same fairness, strategies and stage results. |
| Real game, autopilot, 16:9 | Stages 1–3 complete with 3 stars (21.8 / 22.0 / 22.5 s); Endless survives 100 s (score 406); idle crashes at 3.6 s. |

**Not tested:** how it feels on a phone, touch on a real device, the APK build itself, and real-device frame rate with the 2048² UI atlas.

## Known Limitations

- The orb sits at 30% from the left rather than the guide's roughly 20%. That keeps read-ahead (and so difficulty) identical to the tested game. Moving it to 20% would add read-ahead and make the game a little easier; that's a balance decision.
- In landscape, the lane is the screen *height* (540 px game units). On a 16:9 phone that's the full height, so the HUD (top 90 px) overlaps the outer ends of tall gap walls. The gap itself is always in the middle of the lane and never under the HUD.
- `sensorLandscape` lets the phone flip between the two landscape directions; switch to plain `landscape` in the workflow if that's unwanted.
- Gemini's lock icon still looks like an *open* padlock.
