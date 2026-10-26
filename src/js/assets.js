// Gemini's v4.0 asset pack (landscape, three worlds): loading, animations, and a check that every
// frame the game uses is present. If anything fails to load, the game falls back to code-drawn
// shapes. Audio is loaded separately by src/js/sfx.js.
// Texture memory (RGBA, uncompressed): gameplay 1024×2048 8 MB, skins 1024² 4 MB,
// UI 2048² 16 MB, backgrounds and stage cards ≈ 4 MB → about 32 MB of GPU memory.
Pulse.Assets = {
  ATLASES: {
    pulse_gameplay: 'assets/atlases/pulse_gameplay_atlas',
    pulse_skins: 'assets/atlases/pulse_skins_atlas',
    pulse_ui: 'assets/atlases/pulse_ui_atlas',
  },

  // Optional cosmetic atlases (Gemini batch 1 comet kit). A failed load never blocks the game: the
  // trail falls back to procedural textures (see SpriteView.makeCometTextures).
  OPTIONAL_ATLASES: {
    pulse_comet_vfx: 'assets/atlases/pulse_comet_vfx_atlas',
  },
  // The six portrait world backdrops (Gemini, 540x960). Optional like the comet kit: a failed load leaves the plain
  // backdrop. `noArt` (tests) skips them.
  ART_IMAGES: [
    'bg_portrait_w1_neon_circuit', 'bg_portrait_w1_finale_s10', 'bg_portrait_w2_chromatic_overdrive',
    'bg_portrait_w2_finale_s20', 'bg_portrait_w3_pulse_collapse', 'bg_portrait_w3_finale_s30',
  ],
  // Which portrait backdrop a campaign stage uses: its arc's, and the arc finale's on stages 10 / 20 / 30.
  // (Stages 19-30 do not exist yet; their entries are ready for them.) Endless keeps the plain backdrop.
  worldBackdrop(stageIndex) {
    const st = Pulse.STAGES[stageIndex];
    if (!st || !st.arc) return null;
    const finale = (stageIndex + 1) % Pulse.ARC_SIZE === 0;
    const n = st.arc.index - 1;
    return (finale
      ? ['bg_portrait_w1_finale_s10', 'bg_portrait_w2_finale_s20', 'bg_portrait_w3_finale_s30']
      : ['bg_portrait_w1_neon_circuit', 'bg_portrait_w2_chromatic_overdrive', 'bg_portrait_w3_pulse_collapse'])[n] || null;
  },
  VFX_FRAMES: [
    'comet_core_disc', 'comet_halo_bloom', 'comet_overdrive_corona', 'comet_ribbon_seg', 'comet_spark_micro',
    'comet_spark_star', 'comet_streak_fine', 'comet_taper_long', 'comet_taper_med', 'comet_taper_short',
    'mirror_echo_fold_burst', 'mirror_echo_orb_disc', 'mirror_echo_ribbon_seg',
  ],
  // True when the comet atlas loaded and every frame the trail uses exists.
  vfxReady(scene) {
    const tex = scene.textures;
    if (!tex.exists('pulse_comet_vfx')) return false;
    const t = tex.get('pulse_comet_vfx');
    return this.VFX_FRAMES.every((f) => t.has(f));
  },

  // Landscape backgrounds: a 512² repeating base tile, a 1024×256 ridge strip (floor; flipped
  // for the ceiling) and a 512×128 tick rail (bottom edge; flipped for the top) per theme.
  // Plus a 512×160 intro banner per world.
  IMAGES: [
    'bg_grid_tile', 'bg_endless_mid_parallax', 'bg_speed_rail_horiz',
    'bg_world1_far', 'bg_world1_mid', 'bg_world1_fg_rail', 'bg_world1_intro_banner',
    'bg_world2_far', 'bg_world2_mid', 'bg_world2_fg_rail', 'bg_world2_intro_banner',
    'bg_world3_far', 'bg_world3_mid', 'bg_world3_fg_rail', 'bg_world3_intro_banner',
  ],

  // World-themed stage-card plates (280×320) in assets/stage_cards/ (frame colour per world).
  // With ten stages per world the plate is shared: one per arc (the number and name are drawn on top).
  STAGE_PLATES: ['ui_stage_card_s01_w1', 'ui_stage_card_s05_w2', 'ui_stage_card_s09_w3'],
  stageCardKey(index) {
    return this.STAGE_PLATES[Pulse.STAGES[index].arc.index - 1];
  },

  // Background used by Endless and menus; campaign stages name theirs in `visual` (stages.js).
  // Speeds are fractions of the obstacles' speed (parallax).
  ENDLESS_VISUAL: {
    background: 'bg_grid_tile', mid: 'bg_endless_mid_parallax', rail: 'bg_speed_rail_horiz',
    bgSpeed: 0.22, midSpeed: 0.4, railSpeed: 0.75,
  },

  // Every atlas frame the code references. Checked after loading and by tests/assets.html.
  requiredFrames() {
    const frames = {
      pulse_gameplay: [
        'wall_body_tile', 'wall_cap_left', 'wall_cap_right', 'orb_lock_ring',
        'fx_near_miss_arc', 'fx_spark_diamond', 'fx_shockwave_ring',
        'fx_shatter_shard_01', 'fx_shatter_shard_02', 'fx_shatter_shard_03',
        // v3.0: barriers, charge ring, tunnels, finish line, indicators, event effects.
        'barrier_smash_ready_tile', 'barrier_smash_danger_tile',
        'barrier_charged_ready_tile', 'barrier_charged_danger_tile',
        'barrier_charged_emblem_ready', 'barrier_charged_emblem_danger',
        'charge_ring_state_a_empty', 'charge_ring_state_b_step_01', 'charge_ring_state_b_step_02',
        'charge_ring_state_b_step_03', 'charge_ring_state_b_step_04', 'charge_ring_state_c_full',
        'fx_charge_complete_burst', 'tunnel_wall_edge_tile', 'ind_long_hold_guide_tile',
        'ind_upcoming_charged_warn', 'finish_line_tile',
        'fx_smash_ordinary_burst', 'fx_smash_charged_nova', 'fx_fail_charged_deflect',
        'fx_collect_gold_burst', 'fx_collect_mint_burst', 'fx_mult_up_chevron', 'fx_mult_x5_starburst',
        // v4.0
        'fx_orb_spawn_materialize', 'fx_stage_clear_burst',
      ],
      pulse_skins: [],
      pulse_ui: [
        'ui_logo_pulse', 'ui_btn_primary_cyan_up', 'ui_btn_primary_mint_up', 'ui_btn_icon_pause_up',
        'ui_btn_icon_back_up', 'ui_card_mode_campaign_up', 'ui_card_mode_endless_up',
        'ui_stage_card_locked', 'ui_stage_card_unlocked', 'ui_stage_card_completed',
        'ui_star_empty', 'ui_star_filled', 'ui_icon_status_lock', 'ui_icon_status_check',
        'ui_panel_modal_9slice', 'ui_skin_slot_selected', 'ui_skin_slot_unselected',
        'ui_hud_bracket_right',
        // v4.0
        'ui_btn_icon_settings_up', 'ui_btn_icon_audio_bgm_on', 'ui_btn_icon_audio_bgm_off',
        'ui_btn_icon_audio_sfx_on', 'ui_btn_icon_audio_sfx_off', 'ui_hud_icon_gold', 'ui_hud_icon_mint',
        'ui_btn_icon_next_up',
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
    if (!(window.PULSE_TEST && window.PULSE_TEST.noVfx)) for (const key of Object.keys(this.OPTIONAL_ATLASES)) {
      const base = this.OPTIONAL_ATLASES[key];
      scene.load.atlas(key, `${base}.png`, `${base}.json`);
    }
    if (!(window.PULSE_TEST && window.PULSE_TEST.noArt)) {
      for (const key of this.ART_IMAGES) scene.load.image(key, `assets/backgrounds/${key}.png`);
    }
    for (const key of this.IMAGES) scene.load.image(key, `assets/backgrounds/${key}.png`);
    for (const key of this.STAGE_PLATES) scene.load.image(key, `assets/stage_cards/${key}.png`);
  },

  // Returns the list of missing textures/frames; empty means sprites can be used.
  missing(scene) {
    const tex = scene.textures;
    const out = [];
    for (const key of this.IMAGES) if (!tex.exists(key)) out.push(key);
    for (const key of this.STAGE_PLATES) if (!tex.exists(key)) out.push(key);
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
    // Audio loads in the background; sounds fall back to synthesized tones until it's ready.
    Pulse.Audio.init(this.game, Pulse.Save.load().settings);

    const test = window.PULSE_TEST;
    if (test && test.autoStart) this.scene.start('game', test);
    else this.scene.start('menu');
  }
};
