# PULSE v2.0 — Phaser 3.90.0 Integration Guide for Claude

**Package:** `PULSE_Production_Asset_Pack_v2.0.zip`  
**Target Engine:** Phaser `3.90.0` | Logical Resolution `1080 × 1920` (`Phaser.Scale.FIT`, Portrait)  
**Repository Note:** These files have **not** been committed to GitHub. Copy the `assets/` directory from the ZIP into the repository's static asset folder and record `PALETTE_AND_STYLE_GUIDE.md` in the project documentation.

## 1. Reconciliation Audit of Earlier v1.0 Pack vs. v2.0 Final Pack

1. **Retained & Verified from v1.0:** Core player states (`player_orb_normal`, `player_orb_shrunk`, `player_orb_ring`, `player_tension_arcs_01..04`), modular wall pieces (`wall_body_tile`, `wall_cap_left`, `wall_cap_right`), collectibles (`orb_energy_gold_01..04`, `orb_energy_mint_01..04`, `orb_lock_ring`), and collision/spark VFX (`fx_spark_diamond`, `fx_shatter_shard_01..03`, `fx_shockwave_ring`).
2. **Corrected in v2.0 (Removed Baked UI Text):**
   - Removed `ui_toast_near_miss` (`"CLOSE!"` baked text) and replaced it with `fx_near_miss_arc` (`64×96` pure geometric cyan graze crescent in `pulse_gameplay_atlas`) so near-miss feedback is 100% visual/cosmetic and never implies bonus points or relies on baked English strings.
   - Replaced `ui_badge_new_best` (`"NEW RECORD"` baked text) with text-free pill frames (`ui_badge_pill_gold` and `ui_badge_pill_cyan`, `240×56`) and header banners (`ui_banner_header_cyan/mint/crimson`, `640×110`) so Phaser renders all UI text dynamically.
3. **Added in v2.0:**
   - **Modular Wall Divider:** `wall_joint_divider` (`32×96`) for multi-gap gates in Stages 2 & 3.
   - **Campaign Mode & Stage Select UI (`pulse_ui_atlas`):** `ui_card_mode_campaign_up/down`, `ui_card_mode_endless_up/down`, `ui_stage_card_locked/unlocked/completed/selected`, `ui_star_empty/filled`, `ui_icon_status_lock/check`, plus navigation buttons (`home`, `back`, `next`, `skins`).
   - **Cosmetic Skin Selector UI & 3 Complete Orb Skins (`pulse_skins_atlas`):** `ui_skin_slot_unselected/selected` (`260×300`) and 21 skin frames (`skin_solar_flare_*`, `skin_void_prism_*`, `skin_retro_green_*`).
   - **3 Campaign Stage Background & Tick Sets (`assets/backgrounds/`):** `bg_stage1_first_pulse.png`, `bg_stage2_find_rhythm.png`, `bg_stage3_overload.png` (`512×512` each) + matching `bg_stage1/2/3_ticks.png` (`128×512`).

## 2. Exact Asset Paths & Preload Setup (`PreloadScene.ts` / `.js`)

```javascript
preload() {
  // 1. Core Gameplay, Skins, and UI Texture Atlases (Phaser 3.90.0 JSON Hash)
  this.load.atlas('pulse_gameplay', 'assets/atlases/pulse_gameplay_atlas.png', 'assets/atlases/pulse_gameplay_atlas.json');
  this.load.atlas('pulse_skins',    'assets/atlases/pulse_skins_atlas.png',    'assets/atlases/pulse_skins_atlas.json');
  this.load.atlas('pulse_ui',       'assets/atlases/pulse_ui_atlas.png',       'assets/atlases/pulse_ui_atlas.json');

  // 2. Campaign & Endless Seamless Background Tiles (512x512 & 128x512 Power-of-Two)
  this.load.image('bg_stage1_first_pulse', 'assets/backgrounds/bg_stage1_first_pulse.png');
  this.load.image('bg_stage1_ticks',       'assets/backgrounds/bg_stage1_ticks.png');
  this.load.image('bg_stage2_find_rhythm', 'assets/backgrounds/bg_stage2_find_rhythm.png');
  this.load.image('bg_stage2_ticks',       'assets/backgrounds/bg_stage2_ticks.png');
  this.load.image('bg_stage3_overload',    'assets/backgrounds/bg_stage3_overload.png');
  this.load.image('bg_stage3_ticks',       'assets/backgrounds/bg_stage3_ticks.png');
}
```

## 3. Animation Sequences & Hot-Swappable Cosmetic Skin Layer

Register animations for both the default orb and the three cosmetic skins so switching skins requires **only changing a string key** (`activeSkin = 'default' | 'solar_flare' | 'void_prism' | 'retro_green'`):

```javascript
const SKIN_CONFIG = {
  default:     { atlas: 'pulse_gameplay', prefix: 'player_orb_',          arcPrefix: 'player_tension_arcs_', trailTint: 0x00F0FF },
  solar_flare: { atlas: 'pulse_skins',    prefix: 'skin_solar_flare_',    arcPrefix: 'skin_solar_flare_tension_arcs_', trailTint: 0xFF7A00 },
  void_prism:  { atlas: 'pulse_skins',    prefix: 'skin_void_prism_',     arcPrefix: 'skin_void_prism_tension_arcs_',  trailTint: 0xA855F7 },
  retro_green: { atlas: 'pulse_skins',    prefix: 'skin_retro_green_',    arcPrefix: 'skin_retro_green_tension_arcs_', trailTint: 0x00FF66 }
};

// Register 24fps tension arc loops for each skin
Object.entries(SKIN_CONFIG).forEach(([skinKey, cfg]) => {
  this.anims.create({
    key: `anim_arcs_${skinKey}`,
    frames: this.anims.generateFrameNames(cfg.atlas, {
      prefix: cfg.arcPrefix,
      start: 1,
      end: 4,
      zeroPad: 2
    }),
    frameRate: 24,
    repeat: -1
  });
});

// Collectible shimmer loops (12fps)
this.anims.create({
  key: 'anim_orb_gold',
  frames: this.anims.generateFrameNames('pulse_gameplay', { prefix: 'orb_energy_gold_', start: 1, end: 4, zeroPad: 2 }),
  frameRate: 12,
  repeat: -1
});
this.anims.create({
  key: 'anim_orb_mint',
  frames: this.anims.generateFrameNames('pulse_gameplay', { prefix: 'orb_energy_mint_', start: 1, end: 4, zeroPad: 2 }),
  frameRate: 12,
  repeat: -1
});
```

### Applying a Selected Skin to the Player Container
All four skins share identical dimensions (`128×128` normal, `128×128` ring, `76×76` shrunk, `96×96` arcs) and identical Arcade Physics circle bodies:
- **Expanded State (`isShrunk = false`):** `body.setCircle(46, 18, 18)`
- **Shrunken State (`isShrunk = true`):** `body.setCircle(20, 18, 18)`

```javascript
function applyPlayerSkin(player, skinKey = 'default') {
  const cfg = SKIN_CONFIG[skinKey] || SKIN_CONFIG.default;
  player.normalSprite.setTexture(cfg.atlas, `${cfg.prefix}normal`);
  player.ringSprite.setTexture(cfg.atlas, `${cfg.prefix}ring`);
  player.shrunkSprite.setTexture(cfg.atlas, `${cfg.prefix}shrunk`);
  player.tensionArcsSprite.play(`anim_arcs_${skinKey}`);
  player.trailEmitter.setParticleTint(cfg.trailTint);
}
```

## 4. Implementing the Missing Audit Items in Gameplay Code

### 4.1 Collectible 45% Opacity Dimming & Pickup Lock While Shrunk
Claude's repo audit noted that collectibles do not yet dim to 45% opacity when shrunk. Wire this into pointer hold/release and the overlap check:

```javascript
// 1. When pointer is held (player shrinks):
onHoldShrink() {
  this.player.isShrunk = true;
  this.collectiblesGroup.getChildren().forEach((orb) => {
    orb.setTint(0x475569).setAlpha(0.45);
    if (orb.lockRing) orb.lockRing.setTint(0x475569).setAlpha(0.45);
  });
}

// 2. When pointer is released (player expands):
onReleaseExpand() {
  this.player.isShrunk = false;
  this.collectiblesGroup.getChildren().forEach((orb) => {
    orb.clearTint().setAlpha(1.0);
    if (orb.lockRing) orb.lockRing.clearTint().setAlpha(0.85);
  });
}

// 3. In physics.add.overlap(player, collectiblesGroup, onCollectOrb, canCollectOrb):
canCollectOrb(player, orb) {
  // CRITICAL RULE: Collectibles cannot be picked up while shrunk
  return !player.isShrunk && orb.active;
}
```

### 4.2 Lightweight Cosmetic-Only Near-Miss Effect (`fx_near_miss_arc`)
When `player.isShrunk === true` and the horizontal distance between the player's solid shrunken rim (`r = 20px`) and a gate cap's solid edge (`gapLeftX` or `gapRightX`) is `<= 8px` as the gate passes `player.y`:
- **Do not award bonus points.**
- Spawn `fx_near_miss_arc` (`pulse_gameplay` atlas) at `(player.x ± 24, player.y)`, set `flipX = true` if grazing the right wall, `setBlendMode(Phaser.BlendModes.ADD)`, and tween `scaleX: 1.35, scaleY: 1.15, alpha: 0` over `220ms` while emitting 5 `fx_spark_diamond` particles.

### 4.3 Campaign Stage Visual Theme Loader
```javascript
const STAGE_THEMES = {
  1: { bgKey: 'bg_stage1_first_pulse', tickKey: 'bg_stage1_ticks', bgSpeed: 0.22, tickSpeed: 0.50, clearHex: '#090E1A' },
  2: { bgKey: 'bg_stage2_find_rhythm', tickKey: 'bg_stage2_ticks', bgSpeed: 0.30, tickSpeed: 0.65, clearHex: '#0C1021' },
  3: { bgKey: 'bg_stage3_overload',    tickKey: 'bg_stage3_ticks', bgSpeed: 0.38, tickSpeed: 0.80, clearHex: '#100B1C' }
};
```

## 5. Where to Use Phaser Shapes & Dynamic Text Instead of Images

To keep APK size small and support clean scaling/localization, all UI frames in `pulse_ui` are **text-free**:
- **Mode Selection Screen:** Render `ui_card_mode_campaign_up` and `ui_card_mode_endless_up` at `X = 540`, `Y = 820` and `Y = 1100`. Overlay Phaser `Text` at `(X + 55, Y - 22)` for `"CAMPAIGN"` / `"ENDLESS MODE"` (`36px` bold `#F8FAFC`) and `(X + 55, Y + 26)` for the subtitle (`22px` `#94A3B8`).
- **Stage Selection Cards (`280×320`):** Place `ui_stage_card_locked`, `ui_stage_card_unlocked`, or `ui_stage_card_completed` in a 3-column row (`X = 200, 540, 880`) or vertical stack. If selected, layer `ui_stage_card_selected` behind/around the active card. Render stage number (`"01"`, `"02"`, `"03"`) dynamically in the top header band (`Y - 112`), stage name in the center (`Y - 10`), and 3 star icons (`ui_star_filled` / `ui_star_empty`, `64×64`) along the bottom socket (`Y + 112`, `X - 68, X, X + 68`). For locked stages, place `ui_icon_status_lock` at `(X, Y + 10)`.
- **Cosmetic Orb Selection Screen:** Place 4 `ui_skin_slot_unselected` (or `ui_skin_slot_selected` for the active skin) in a 2×2 grid (`X = 360, 720`, `Y = 780, 1140`). Render the corresponding `<skin>_normal` + `<skin>_ring` sprite centered on the pedestal (`slotX, slotY - 25`), place `ui_icon_status_check` (`48×48` scaled) at the top-right corner of the equipped slot, and render the skin name (`"CYBER CYAN"`, `"SOLAR FLARE"`, `"VOID PRISM"`, `"RETRO GREEN"`) dynamically at `(slotX, slotY + 105)`.
- **Progress Bars & Screen Fades:** Use `this.add.graphics()` / `this.add.rectangle()` with `#00F0FF` fill over `#162033` track rather than loading static bar textures.
