# PULSE v3.0 — Phaser 3.90.0 JavaScript Integration Guide for Claude

**Primary Deliverable Archive:** `PULSE_Production_Asset_Pack_v3.0.zip`  
**Target Codebase:** Compatible directly with `src/js/config.js`, `src/js/assets.js`, `src/js/sprite-view.js`, `src/js/render.js`, `src/js/game-scene.js`, and `src/js/menu-scenes.js` (inspected from `pulse-debug-apk-run17.zip`).

## 1. Drop-In File Placement

Extract `assets/` from `PULSE_Production_Asset_Pack_v3.0.zip` directly over `src/assets/` (or `public/assets/`):
- `assets/atlases/pulse_gameplay_atlas.png` + `.json` (`1024×1024`, 53 frames — includes all 24 legacy frames required by `Pulse.Assets.requiredFrames()` plus 29 new v3.0 frames!)
- `assets/atlases/pulse_skins_atlas.png` + `.json` (`1024×512`, 21 frames)
- `assets/atlases/pulse_ui_atlas.png` + `.json` (`2048×2048`, 48 frames)
- `assets/backgrounds/` (16 seamless textures: all 8 existing keys + 4 mid-parallax layers `bg_stage1..3_mid_parallax.png`, `bg_endless_mid_parallax.png` + 4 horizontal rail textures `bg_stage1..3_rail_horiz.png`, `bg_speed_rail_horiz.png`)

## 2. Registering the New v3.0 Frames in `src/js/assets.js`

Add the new v3.0 Charged-Barrier, Charge-Ring, Indicator, and VFX frames to `Pulse.Assets.requiredFrames().pulse_gameplay`:

```javascript
// Additions to Pulse.Assets.requiredFrames().pulse_gameplay:
const v3GameplayFrames = [
  // Player morph frames
  'player_orb_morph_01', 'player_orb_morph_02',
  // Charge ring states (State A, State B x4, State C, and completion burst)
  'charge_ring_state_a_empty',
  'charge_ring_state_b_step_01', 'charge_ring_state_b_step_02',
  'charge_ring_state_b_step_03', 'charge_ring_state_b_step_04',
  'charge_ring_state_c_full', 'fx_charge_complete_burst',
  // Ordinary & Charged Barrier modular tiles & target emblems
  'barrier_smash_ready_tile', 'barrier_smash_danger_tile',
  'barrier_charged_ready_tile', 'barrier_charged_danger_tile',
  'barrier_charged_emblem_ready', 'barrier_charged_emblem_danger',
  // Tunnels, recovery, upcoming warning, and finish line
  'wall_joint_divider', 'tunnel_wall_edge_tile',
  'ind_long_hold_guide_tile', 'ind_recovery_chevron',
  'ind_upcoming_charged_warn', 'finish_line_tile',
  // Distinct v3.0 event VFX
  'fx_smash_ordinary_burst', 'fx_smash_charged_nova', 'fx_fail_charged_deflect',
  'fx_collect_gold_burst', 'fx_collect_mint_burst',
  'fx_mult_up_chevron', 'fx_mult_x5_starburst'
];
```

## 3. Rendering Ordinary & Charged Barriers with Sprites in `src/js/sprite-view.js`

In `pulse-debug-apk-run17`, `sprite-view.js` lines 78–84 fell back to `Pulse.Render.barrier()` because barrier sprites did not exist yet. Replace that fallback with pooled `TileSprite` barrier objects:

```javascript
makeBarrier() {
  const sc = this.scene;
  // TileSprite spans full track width (or height in horizontal landscape scroll)
  const bar = sc.add.tileSprite(0, 0, sc.W, 64 * A.base, 'pulse_gameplay', 'barrier_smash_ready_tile')
    .setOrigin(0, 0.5).setTileScale(A.base).setDepth(3);
  const emblem = sc.add.image(sc.orbX, 0, 'pulse_gameplay', 'barrier_charged_emblem_ready')
    .setScale(A.base).setDepth(3.5).setVisible(false);
  return {
    kind: 'barrier', bar, emblem,
    show: (on) => { bar.setVisible(on); if (!on) emblem.setVisible(false); }
  };
}

placeBarrier(v, s, visible, ready) {
  v.show(visible);
  if (!visible || s.broken) { v.show(false); return; }
  const cy = s.y + s.h / 2;
  if (s.charged) {
    // CRITICAL RULE: Charged barrier ONLY shows ready/cyan when orb is full-sized AND charge >= 1.0!
    const frame = ready ? 'barrier_charged_ready_tile' : 'barrier_charged_danger_tile';
    const embFrame = ready ? 'barrier_charged_emblem_ready' : 'barrier_charged_emblem_danger';
    v.bar.setTexture('pulse_gameplay', frame).setSize(this.scene.W, 84 * A.base).setPosition(0, cy);
    v.emblem.setTexture('pulse_gameplay', embFrame).setPosition(this.scene.orbX, cy).setVisible(true);
  } else {
    const frame = ready ? 'barrier_smash_ready_tile' : 'barrier_smash_danger_tile';
    v.bar.setTexture('pulse_gameplay', frame).setSize(this.scene.W, 64 * A.base).setPosition(0, cy);
    v.emblem.setVisible(false);
  }
}
```

## 4. Rendering the 3-State Charge Ring in `src/js/sprite-view.js`

Add `this.chargeRing = scene.add.image(x, y, 'pulse_gameplay', 'charge_ring_state_a_empty').setScale(A.base).setDepth(5.2).setVisible(false);` and `this.chargeBurst = scene.add.image(x, y, 'pulse_gameplay', 'fx_charge_complete_burst').setScale(A.base).setBlendMode('ADD').setDepth(6).setVisible(false);` to `SpriteView`:

```javascript
renderChargeRing(visible, charge) {
  if (!visible) {
    this.chargeRing.setVisible(false);
    this.wasFullCharge = (charge >= 1);
    return;
  }
  this.chargeRing.setVisible(true).setPosition(this.scene.orbX, this.scene.orbY);
  if (charge <= 0.01) {
    // State A — Orb Not Charged (hollow 8-slot broken ring)
    this.chargeRing.setFrame('charge_ring_state_a_empty').setAlpha(0.75).setScale(A.base);
    this.wasFullCharge = false;
  } else if (charge < 1) {
    // State B — Orb Charging over 0.3s (progressive segment illumination)
    const step = Math.min(4, Math.max(1, Math.ceil(charge * 4)));
    this.chargeRing.setFrame(`charge_ring_state_b_step_0${step}`).setAlpha(0.95).setScale(A.base);
    this.wasFullCharge = false;
  } else {
    // State C — Orb Fully Charged (locked octagon + 4 cardinal diamond studs)
    this.chargeRing.setFrame('charge_ring_state_c_full').setAlpha(1.0).setScale(A.base);
    if (!this.wasFullCharge) {
      this.wasFullCharge = true;
      // Trigger brief completion pulse
      this.scene.tweens.killTweensOf(this.chargeBurst);
      this.chargeBurst.setVisible(true).setAlpha(1).setScale(A.base * 0.85)
        .setPosition(this.scene.orbX, this.scene.orbY);
      this.scene.tweens.add({
        targets: this.chargeBurst, scale: A.base * 1.35, alpha: 0, duration: 200, ease: 'Cubic.easeOut'
      });
    }
  }
}
```

## 5. Triggering the Distinct v3.0 Smash, Fail, Pickup & ×5 Effects

- **Ordinary Barrier Smash (`smash(seg)` when `!seg.charged`):** Flash `fx_smash_ordinary_burst` (`scale: 0.4 → 1.0, alpha: 1 → 0, duration: 260ms`) + `sparksCyan.explode(5, ...)`.
- **Charged Barrier Smash (`smash(seg)` when `seg.charged`):** Flash `fx_smash_charged_nova` (`scale: 0.45 → 1.25, alpha: 1 → 0, duration: 340ms`) + `sparksCyan.explode(8, ...)`.
- **Failed Charged-Barrier Collision (`crash(seg)` when `seg && seg.kind === 'barrier' && seg.charged`):** Flash `fx_fail_charged_deflect` (`scale: 0.5 → 1.15, alpha: 1 → 0, duration: 380ms`) at `(orbX, orbY)` so the player immediately sees the crimson X-shield lockout that deflected them.
- **Gold vs. Mint Pickup Burst (`collect(seg)`):** Flash `fx_collect_gold_burst` or `fx_collect_mint_burst` at each collected orb's `(x, y)` alongside the diamond spark emitter.
- **Multiplier Up & ×5 Celebration (`bumpMultiplier()` / `milestone()`):** Pop `fx_mult_up_chevron` above the orb on multiplier gain, and expand `fx_mult_x5_starburst` (`scale: 0.35 → 1.4, duration: 480ms, BlendModes.ADD`) on reaching `×5`.
