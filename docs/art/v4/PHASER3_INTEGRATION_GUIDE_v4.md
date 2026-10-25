# PULSE v4.0 — Phaser 3.90.0 Visual & Audio Integration Guide for Claude

**Deliverable Archive:** `PULSE_Production_Asset_and_Audio_Pack_v4.zip`  
**Target Codebase:** Directly compatible with the `pulse-debug-apk-run18` repository (`src/js/config.js`, `src/js/assets.js`, `src/js/sprite-view.js`, `src/js/game-scene.js`, `src/js/menu-scenes.js`, `src/js/skins.js`, `src/js/stages.js`, `src/js/sfx.js`).

## 1. Backward Compatibility Guarantee

Every atlas key (`pulse_gameplay`, `pulse_skins`, `pulse_ui`), every frame name in `Pulse.Assets.requiredFrames()`, and every background image key in `Pulse.Assets.IMAGES` from v3 (`run18`) is **100% preserved at identical dimensions and origins**. Extracting `atlases/` and `backgrounds/` into `src/assets/` works immediately with zero breaking changes.

## 2. Adding the Two New v4 Skins (`Violet Nova` & `Whiteout`) to `src/js/skins.js`

Append these two entries to `Pulse.SKINS` in `src/js/skins.js`:

```javascript
  {
    id: 'violet-nova', name: 'Violet Nova', unlockStars: 12,
    colors: { orb: 0xd946ef, shrunk: 0xfae8ff, core: 0xffffff },
    sprite: { atlas: 'pulse_skins', prefix: 'skin_violet_nova_', arcPrefix: 'skin_violet_nova_tension_arcs_' },
  },
  {
    id: 'whiteout', name: 'Whiteout', unlockStars: 15,
    colors: { orb: 0xf1f5f9, shrunk: 0xffffff, core: 0x0f172a },
    sprite: { atlas: 'pulse_skins', prefix: 'skin_whiteout_', arcPrefix: 'skin_whiteout_tension_arcs_' },
  }
```

## 3. Integrating the Three Worlds (`src/js/assets.js` & `src/js/stages.js`)

The v3 aliases (`bg_stage1_first_pulse`, `bg_stage2_find_rhythm`, `bg_stage3_overload`, etc.) already contain the upgraded v4 World 1–3 textures. To reference the canonical v4 World keys directly or add World Intro banners:
- **World 1 (Neon Circuit):** `bg_world1_far`, `bg_world1_mid`, `bg_world1_fg_rail`, `bg_world1_intro_banner`
- **World 2 (Chromatic Overdrive):** `bg_world2_far`, `bg_world2_mid`, `bg_world2_fg_rail`, `bg_world2_intro_banner`
- **World 3 (Pulse Collapse):** `bg_world3_far`, `bg_world3_mid`, `bg_world3_fg_rail`, `bg_world3_intro_banner`
- **Optional Ambient World Decor Atlas:** `this.load.atlas('pulse_world_decor', 'assets/atlases/pulse_world_decor_atlas.png', 'assets/atlases/pulse_world_decor_atlas.json')`

## 4. Integrating the Original Synthwave OST & 31 SFX (`src/js/sfx.js` & `src/js/assets.js`)

### 4.1 Recommended Formats & Volume Balance
- **Music (`audio/music/*.ogg`):** Load `.ogg` files via `scene.load.audio(key, 'assets/audio/music/' + key + '.ogg')`. Recommended master music volume: **`0.55`** (`55%`) so transient SFX cut through cleanly.
- **Sound Effects (`audio/sfx/*.ogg` or `.wav`):** Use `.ogg` for general WebAudio preloading (smallest APK footprint) or `.wav` for zero-decode-latency critical cues. Recommended master SFX volume: **`0.85`** (`85%`), continuous shrink loop volume: **`0.25`** (`25%`).
- **Max Simultaneous SFX Polyphony:** Cap concurrent SFX instances at **`6` voices** (and throttle repeated pickup/pass sounds within `35ms`).

### 4.2 Preloading & Mapping to Existing `Pulse.Sfx` Hooks
In `src/js/sfx.js`, you can upgrade the placeholder WebAudio oscillator tones to play the loaded Phaser audio buffers while keeping the oscillator tones as an automatic fallback when running unit tests (`window.PULSE_TEST`):

```javascript
const SFX_MAP = {
  start:          'sfx_ui_retry',
  pass:           'sfx_obstacle_gate_pass',
  pickup:         'sfx_pickup_gold',
  bonusPickup:    'sfx_pickup_mint_bonus',
  multiplierLost: 'sfx_charge_cancelled',
  crash:          'sfx_player_death_collision',
  chargedFail:    'sfx_barrier_charged_fail',
  milestone:      'sfx_multiplier_max_x5',
  streak:         'sfx_multiplier_x5_streak',
  smash:          'sfx_barrier_smash_ordinary',
  chargedSmash:   'sfx_barrier_smash_charged',
  chargeStart:    'sfx_charge_start_fill',
  chargeReady:    'sfx_charge_complete',
  nearMiss:       'sfx_near_miss_graze',
  complete:       'sfx_stage_finish_line',
  select:         'sfx_ui_button_tap',
  pause:          'sfx_ui_pause',
  resume:         'sfx_ui_resume'
};
```

### 4.3 Seamless Music Looping & Capacitor Android Lifecycle Handling
```javascript
// Playing a seamless world or menu loop:
playMusic(scene, trackKey = 'MENU_THEME') {
  if (this.currentMusic && this.currentMusic.key === trackKey && this.currentMusic.isPlaying) return;
  if (this.currentMusic) this.currentMusic.stop();
  if (scene.cache.audio.exists(trackKey)) {
    this.currentMusic = scene.sound.add(trackKey, { loop: true, volume: 0.55 });
    this.currentMusic.play();
  }
}

// Mobile browser & Capacitor Android unlock + background/foreground pause:
scene.input.on('pointerdown', () => {
  if (scene.sound && scene.sound.locked) scene.sound.unlock();
  if (scene.sound && scene.sound.context && scene.sound.context.state === 'suspended') {
    scene.sound.context.resume();
  }
});
scene.game.events.on('hidden', () => { if (this.currentMusic && this.currentMusic.isPlaying) this.currentMusic.pause(); });
scene.game.events.on('visible', () => { if (this.currentMusic && this.currentMusic.isPaused && !this.musicMuted) this.currentMusic.resume(); });
```
