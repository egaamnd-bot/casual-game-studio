// Gemini's v2.0 asset pack: loading, animations, and a check that every frame the game uses
// is present. If anything fails to load, the game falls back to code-drawn shapes.
Pulse.Assets = {
  ATLASES: {
    pulse_gameplay: 'assets/atlases/pulse_gameplay_atlas',
    pulse_skins: 'assets/atlases/pulse_skins_atlas',
    pulse_ui: 'assets/atlases/pulse_ui_atlas',
  },

  IMAGES: [
    'bg_grid_tile', 'bg_speed_ticks',
    'bg_stage1_first_pulse', 'bg_stage1_ticks',
    'bg_stage2_find_rhythm', 'bg_stage2_ticks',
    'bg_stage3_overload', 'bg_stage3_ticks',
  ],

  // Background used by Endless; campaign stages name theirs in `visual` (stages.js).
  ENDLESS_VISUAL: { background: 'bg_grid_tile', ticks: 'bg_speed_ticks', bgSpeed: 0.22, tickSpeed: 0.5 },

  // Every atlas frame the code references. Checked after loading and by tests/assets.html.
  requiredFrames() {
    const frames = {
      pulse_gameplay: [
        'wall_body_tile', 'wall_cap_left', 'wall_cap_right', 'orb_lock_ring',
        'fx_near_miss_arc', 'fx_spark_diamond', 'fx_shockwave_ring',
        'fx_shatter_shard_01', 'fx_shatter_shard_02', 'fx_shatter_shard_03',
      ],
      pulse_skins: [],
      pulse_ui: [
        'ui_logo_pulse', 'ui_btn_primary_cyan_up', 'ui_btn_primary_mint_up', 'ui_btn_icon_pause_up',
        'ui_btn_icon_back_up', 'ui_card_mode_campaign_up', 'ui_card_mode_endless_up',
        'ui_stage_card_locked', 'ui_stage_card_unlocked', 'ui_stage_card_completed',
        'ui_star_empty', 'ui_star_filled', 'ui_icon_status_lock', 'ui_icon_status_check',
        'ui_panel_modal_9slice', 'ui_skin_slot_selected', 'ui_skin_slot_unselected',
      ],
    };
    for (let i = 1; i <= 4; i++) {
      frames.pulse_gameplay.push(`orb_energy_gold_0${i}`, `orb_energy_mint_0${i}`);
    }
    for (const skin of Pulse.SKINS) {
      const s = skin.sprite;
      frames[s.atlas].push(`${s.prefix}normal`, `${s.prefix}ring`, `${s.prefix}shrunk`);
      for (let i = 1; i <= 4; i++) frames[s.atlas].push(`${s.arcPrefix}0${i}`);
    }
    return frames;
  },

  preload(scene) {
    this.failed = [];
    if (window.PULSE_TEST && window.PULSE_TEST.noAssets) return;
    scene.load.on('loaderror', (file) => this.failed.push(file.key));
    // Test pages live in tests/ and point this at ../src/.
    if (window.PULSE_ASSET_BASE) scene.load.setBaseURL(window.PULSE_ASSET_BASE);
    for (const key of Object.keys(this.ATLASES)) {
      const base = this.ATLASES[key];
      scene.load.atlas(key, `${base}.png`, `${base}.json`);
    }
    for (const key of this.IMAGES) scene.load.image(key, `assets/backgrounds/${key}.png`);
  },

  // Returns the list of missing textures/frames; empty means sprites can be used.
  missing(scene) {
    const tex = scene.textures;
    const out = [];
    for (const key of this.IMAGES) if (!tex.exists(key)) out.push(key);
    const frames = this.requiredFrames();
    for (const atlas of Object.keys(frames)) {
      if (!tex.exists(atlas)) {
        out.push(atlas);
        continue;
      }
      const t = tex.get(atlas);
      for (const f of frames[atlas]) if (!t.has(f)) out.push(`${atlas}:${f}`);
    }
    return out;
  },

  createAnims(scene) {
    const anims = scene.anims;
    const loop = (key, atlas, prefix, frameRate) => {
      if (anims.exists(key)) return;
      anims.create({
        key,
        frames: anims.generateFrameNames(atlas, { prefix, start: 1, end: 4, zeroPad: 2 }),
        frameRate,
        repeat: -1,
      });
    };
    loop('anim_orb_gold', 'pulse_gameplay', 'orb_energy_gold_', 12);
    loop('anim_orb_mint', 'pulse_gameplay', 'orb_energy_mint_', 12);
    for (const skin of Pulse.SKINS) loop(`anim_arcs_${skin.id}`, skin.sprite.atlas, skin.sprite.arcPrefix, 24);
  },
};

// Loads assets, then opens the menu (or straight into gameplay on test pages).
Pulse.BootScene = class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
    Pulse.UI.text(this, this.scale.width / 2, this.scale.height / 2, 'Loading…', 26, Pulse.THEME.textDim);
    Pulse.Assets.preload(this);
  }

  create() {
    const missing = Pulse.Assets.missing(this);
    Pulse.Assets.ok = missing.length === 0;
    Pulse.Assets.missingList = missing;
    if (Pulse.Assets.ok) Pulse.Assets.createAnims(this);
    else if (!(window.PULSE_TEST && window.PULSE_TEST.noAssets)) console.error('Pulse: assets missing, using shapes', missing);

    const test = window.PULSE_TEST;
    if (test && test.autoStart) this.scene.start('game', test);
    else this.scene.start('menu');
  }
};
