// Portrait menus (540 wide, taller on tall phones): mode selection (with skin picker and audio
// settings) and campaign stage selection by world. Everything is stacked in one column and
// positioned from the screen height, so it fits any portrait phone. Uses Gemini's UI frames when
// loaded (all text rendered here), otherwise simple shapes.
(function () {
  const T = Pulse.THEME;

  // The same deep-navy backdrop as gameplay: a faint grid and neon lane rails.
  function backdrop(scene) {
    const W = scene.scale.width;
    const H = scene.scale.height;
    Pulse.UI.backdropTextures(scene);
    scene.add.rectangle(0, 0, W, H, T.background).setOrigin(0).setDepth(-3);
    scene.add.tileSprite(0, 0, W, H, 'pulse_grid').setOrigin(0).setDepth(-2).setAlpha(0.6);
    const rails = scene.add.graphics().setDepth(-1);
    for (const [w, al] of [[12, 0.1], [5, 0.25], [2, 0.9]]) {
      rails.lineStyle(w, 0x1e6bff, al);
      rails.lineBetween(6, 0, 6, H);
      rails.lineBetween(W - 6, 0, W - 6, H);
    }
  }

  class MenuScene extends Phaser.Scene {
    constructor() {
      super('menu');
    }

    create() {
      const UI = Pulse.UI;
      const sprites = Pulse.Assets.ok;
      const W = this.scale.width;
      const H = this.scale.height;
      const cx = W / 2;
      this.save = Pulse.Save.load();
      this.input.on('pointerdown', () => Pulse.Sfx.unlock());
      Pulse.Music.play('MENU_THEME');
      backdrop(this);

      // Logo, then the two modes stacked.
      const logoY = Math.round(H * 0.13);
      if (sprites) this.add.image(cx, logoY, 'pulse_ui', 'ui_logo_pulse').setScale(0.5);
      else UI.text(this, cx, logoY, 'PULSE', 80, T.text, true);
      UI.text(this, cx, logoY + 66, 'Slide to steer · Hold to shrink · Release to smash', 16, T.textDim);
      const stars = Pulse.Campaign.totalStars(this.save);
      const maxStars = Pulse.STAGES.length * 3;
      const campY = Math.round(H * 0.3);
      const endY = campY + 130;
      if (sprites) {
        this.modeCard(cx, campY, 'ui_card_mode_campaign_up', 'CAMPAIGN', `${Pulse.STAGES.length} stages · ${stars}/${maxStars} stars`, () => this.go('stages'));
        this.modeCard(cx, endY, 'ui_card_mode_endless_up', 'ENDLESS', `Best ${this.save.endless.best}`,
          () => this.go('game', { mode: 'endless' }));
      } else {
        UI.button(this, cx, campY, 340, 90, 'Campaign', () => this.go('stages'), { size: 32, edge: T.wallEdge });
        UI.button(this, cx, endY, 340, 90, 'Endless', () => this.go('game', { mode: 'endless' }), { size: 32 });
        UI.text(this, cx, endY + 60, `Endless best ${this.save.endless.best}`, 18, T.textDim);
      }

      // Total stars, then the skin picker.
      const starsY = endY + 110;
      const g = this.add.graphics();
      UI.stars(this, g, cx - 56, starsY, 16, 1, 1);
      UI.text(this, cx + 8, starsY, `${stars} / ${maxStars}`, 28, T.text, true);

      this.skinIndex = Math.max(0, Pulse.SKINS.indexOf(Pulse.Skins.selected(this.save)));
      const right = cx;
      this.skinX = right;
      this.skinY = Math.round(Math.max(starsY + 130, H * 0.74));
      if (sprites) {
        this.slot = this.add.image(right, this.skinY + 8, 'pulse_ui', 'ui_skin_slot_selected').setScale(0.5);
        this.previewImgs = ['ring', 'normal'].map(() => this.add.image(right, this.skinY - 6, 'pulse_gameplay', 'player_orb_normal'));
        this.lockIcon = this.add.image(right, this.skinY - 6, 'pulse_ui', 'ui_icon_status_lock').setScale(0.6);
      } else {
        this.preview = this.add.graphics();
      }
      this.skinName = UI.text(this, right, this.skinY + 100, '', 22, T.text, true);
      this.skinNote = UI.text(this, right, this.skinY + 128, '', 16, T.textDim);
      this.arrow(right - 140, -1);
      this.arrow(right + 140, 1);
      this.showSkin();

      // Settings (top-right).
      UI.iconButton(this, W - 56, 44, 48, 'ui_btn_icon_settings_up', '⚙', () => this.openSettings());
    }

    modeCard(x, y, frame, title, subtitle, onPress) {
      const s = 0.6;
      const card = this.add.image(0, 0, 'pulse_ui', frame).setScale(s);
      const left = (-card.width * s) / 2 + 160 * s; // the card's icon box fills its left ~150 px
      const t1 = this.add.text(left, -14, title, { fontFamily: T.font, fontSize: '26px', fontStyle: 'bold', color: T.text })
        .setOrigin(0, 0.5);
      const t2 = this.add.text(left, 18, subtitle, { fontFamily: T.font, fontSize: '16px', color: T.textDim })
        .setOrigin(0, 0.5);
      Pulse.UI.wire(this.add.container(x, y, [card, t1, t2]), card, onPress);
    }

    arrow(x, dir) {
      const cb = () => this.browse(dir);
      if (!Pulse.Assets.ok) {
        Pulse.UI.button(this, x, this.skinY, 60, 60, dir < 0 ? '<' : '>', cb, { size: 28 });
        return;
      }
      const btn = Pulse.UI.iconButton(this, x, this.skinY, 52, 'ui_btn_icon_back_up', '<', cb);
      if (dir > 0) btn.list[0].setFlipX(true);
    }

    browse(dir) {
      const n = Pulse.SKINS.length;
      this.skinIndex = (this.skinIndex + dir + n) % n;
      const skin = Pulse.SKINS[this.skinIndex];
      if (Pulse.Skins.select(this.save, skin.id)) {
        Pulse.Save.write(this.save);
        Pulse.Sfx.play('skin');
      } else {
        Pulse.Sfx.play('nav');
      }
      this.showSkin();
    }

    showSkin() {
      const skin = Pulse.SKINS[this.skinIndex];
      const unlocked = Pulse.Skins.isUnlocked(this.save, skin);
      const selected = Pulse.Skins.selected(this.save).id === skin.id;
      if (Pulse.Assets.ok) {
        const s = skin.sprite;
        const scale = 40 / Pulse.ART.orbBodyRadius;
        this.previewImgs[0].setTexture(s.atlas, `${s.prefix}ring`).setScale(scale).setAlpha(unlocked ? 0.9 : 0.3);
        this.previewImgs[1].setTexture(s.atlas, `${s.prefix}normal`).setScale(scale).setAlpha(unlocked ? 1 : 0.3);
        this.slot.setFrame(selected ? 'ui_skin_slot_selected' : 'ui_skin_slot_unselected');
        this.lockIcon.setVisible(!unlocked);
      } else {
        this.preview.clear().setAlpha(unlocked ? 1 : 0.35);
        Pulse.Render.orb(this.preview, this.skinX, this.skinY, 44, false, skin);
      }
      this.skinName.setText(skin.name);
      this.skinNote.setText(unlocked ? (selected ? 'Selected' : '') : `Unlocks at ${skin.unlockStars} stars`);
    }

    // Audio settings: music and sound-effect levels (0–100% in 20% steps), mute icons, saved.
    openSettings() {
      if (this.settings) return;
      Pulse.Sfx.play('select');
      const UI = Pulse.UI;
      const W = this.scale.width;
      const H = this.scale.height;
      const parts = [];
      const blocker = this.add.rectangle(0, 0, W, H, T.background, 0.75).setOrigin(0).setDepth(30).setInteractive();
      parts.push(blocker);
      const cx = W / 2;
      const panel = Pulse.Assets.ok
        ? this.add.nineslice(cx, H / 2, 'pulse_ui', 'ui_panel_modal_9slice', 960, 640, 40, 40, 40, 40).setScale(0.5)
        : this.add.rectangle(cx, H / 2, 480, 320, T.panel).setStrokeStyle(2, T.panelEdge);
      parts.push(panel.setDepth(31));
      parts.push(UI.text(this, cx, H / 2 - 110, 'Settings', 30, T.text, true).setDepth(32));
      const row = (label, kind, y) => {
        parts.push(UI.text(this, cx - 150, y, label, 20, T.text, true).setDepth(32));
        const value = UI.text(this, cx + 90, y, '', 20, T.textAccent, true).setDepth(32);
        parts.push(value);
        const iconFrame = () => `ui_btn_icon_audio_${kind === 'music' ? 'bgm' : 'sfx'}_${Pulse.Audio.volume(kind) > 0 ? 'on' : 'off'}`;
        const icon = UI.iconButton(this, cx - 30, y, 44, iconFrame(), kind === 'music' ? '♪' : 'fx', () => this.setLevel(kind,
          Pulse.Audio.volume(kind) > 0 ? 0 : (this.lastLevel[kind] || 0.8)));
        const minus = UI.button(this, cx + 40, y, 40, 40, '−', () => this.setLevel(kind, Pulse.Audio.volume(kind) - 0.2), { size: 22 });
        const plus = UI.button(this, cx + 140, y, 40, 40, '+', () => this.setLevel(kind, Pulse.Audio.volume(kind) + 0.2), { size: 22 });
        for (const b of [icon, minus, plus]) b.setDepth(33);
        parts.push(icon, minus, plus);
        return () => {
          value.setText(`${Math.round(Pulse.Audio.volume(kind) * 100)}%`);
          if (Pulse.Assets.ok) icon.list[0].setFrame(iconFrame());
        };
      };
      this.lastLevel = { music: this.save.settings.music || 0.8, sfx: this.save.settings.sfx || 1 };
      this.refreshers = [row('Music', 'music', H / 2 - 40), row('Sound effects', 'sfx', H / 2 + 20)];
      this.refreshers.forEach((f) => f());
      const done = UI.button(this, cx, H / 2 + 95, 180, 54, 'Done', () => this.closeSettings(), { size: 22 }).setDepth(33);
      parts.push(done);
      this.settings = parts;
    }

    setLevel(kind, value) {
      const v = Math.round(Math.max(0, Math.min(1, value)) * 5) / 5;
      if (v > 0) this.lastLevel[kind] = v;
      Pulse.Audio.setVolume(kind, v);
      this.save.settings[kind] = v;
      Pulse.Save.write(this.save);
      Pulse.Sfx.play('toggle');
      this.refreshers.forEach((f) => f());
    }

    closeSettings() {
      Pulse.Sfx.play('select');
      this.settings.forEach((o) => o.destroy());
      this.settings = null;
    }

    go(key, data) {
      Pulse.Sfx.play('select');
      this.scene.start(key, data);
    }
  }

  // Stage select: one world per page (banner + its four stages), arrows to change world.
  class StageSelectScene extends Phaser.Scene {
    constructor() {
      super('stages');
    }

    init(data) {
      const save = Pulse.Save.load();
      const next = Pulse.STAGES[Pulse.Campaign.nextStageIndex(save)];
      this.worldIndex = data && data.world ? data.world : next.world.index;
    }

    create() {
      const UI = Pulse.UI;
      const W = this.scale.width;
      const save = Pulse.Save.load();
      const world = Pulse.WORLDS[this.worldIndex - 1];
      Pulse.Music.play('MENU_THEME');
      this.input.on('pointerdown', () => Pulse.Sfx.unlock());
      backdrop(this);

      const H = this.scale.height;
      UI.text(this, W / 2, 56, 'Campaign', 34, T.text, true);
      UI.text(this, W / 2, 92, `${Pulse.Campaign.totalStars(save)} / ${Pulse.STAGES.length * 3} stars`, 16, T.textDim);
      UI.worldBanner(this, W / 2, 168, world, 400);

      // The world's four stages in a 2×2 grid, centred in the space below the banner.
      const stages = Pulse.STAGES.map((s, i) => ({ s, i })).filter(({ s }) => s.world === world);
      const top = 250;
      const rowH = Math.min(240, (H - top - 150) / 2);
      stages.forEach(({ s, i }, k) => {
        const x = W / 2 + (k % 2 ? 1 : -1) * 108;
        const y = top + rowH / 2 + Math.floor(k / 2) * rowH;
        if (Pulse.Assets.ok) this.card(save, s, i, x, y);
        else this.box(save, s, i, x, y);
      });

      // World arrows (bottom) and back (top-left).
      const go = (d) => this.scene.restart({ world: this.worldIndex + d });
      const ay = H - 70;
      UI.text(this, W / 2, ay, `WORLD ${this.worldIndex} / ${Pulse.WORLDS.length}`, 18, T.textDim, true);
      if (this.worldIndex > 1) this.arrow(70, ay, -1, () => go(-1));
      if (this.worldIndex < Pulse.WORLDS.length) this.arrow(W - 70, ay, 1, () => go(1));
      if (Pulse.Assets.ok) UI.iconButton(this, 56, 52, 52, 'ui_btn_icon_back_up', '<', () => this.back());
      else UI.button(this, 90, 52, 120, 56, 'Back', () => this.back(), { size: 22 });
    }

    back() {
      Pulse.Sfx.play('select');
      this.scene.start('menu');
    }

    arrow(x, y, dir, cb) {
      const press = () => {
        Pulse.Sfx.play('nav');
        cb();
      };
      if (!Pulse.Assets.ok) {
        Pulse.UI.button(this, x, y, 52, 70, dir < 0 ? '<' : '>', press, { size: 26 });
        return;
      }
      const b = Pulse.UI.iconButton(this, x, y, 48, 'ui_btn_icon_back_up', '<', press);
      if (dir > 0) b.list[0].setFlipX(true);
    }

    start(i) {
      Pulse.Sfx.play('select');
      this.scene.start('game', { mode: 'campaign', stageIndex: i });
    }

    // Gemini's world-themed stage plates (280×320) at 0.6 scale; locked stages use the locked card.
    card(save, stage, i, x, y) {
      const UI = Pulse.UI;
      const s = 0.6;
      const unlocked = Pulse.Campaign.isUnlocked(save, i);
      const rec = Pulse.Campaign.stageRecord(save, stage.id);
      const card = unlocked ? this.add.image(0, 0, Pulse.Assets.stageCardKey(i)).setScale(s)
        : this.add.image(0, 0, 'pulse_ui', 'ui_stage_card_locked').setScale(s);
      const parts = [card];
      parts.push(UI.text(this, 0, -112 * s, String(i + 1).padStart(2, '0'), 22, unlocked ? T.text : T.textDim, true));
      const name = UI.text(this, 0, -14 * s, stage.name, 17, unlocked ? T.text : T.textDim, true);
      name.setWordWrapWidth(280 * s - 24);
      parts.push(name);
      const box = this.add.container(x, y, parts);
      if (unlocked) {
        const imgs = [];
        UI.stars(this, null, 0, 112 * s, 11, rec.bestStars, 3, imgs);
        imgs.forEach((img) => box.add(img));
        if (rec.completed) box.add(this.add.image(280 * s / 2 - 16, -320 * s / 2 + 16, 'pulse_ui', 'ui_icon_status_check').setScale(0.4));
        UI.wire(box, card, () => this.start(i));
      } else {
        box.add(this.add.image(0, 46 * s, 'pulse_ui', 'ui_icon_status_lock').setScale(0.5));
      }
    }

    // Shape fallback with the same layout.
    box(save, stage, i, x, y) {
      const UI = Pulse.UI;
      const unlocked = Pulse.Campaign.isUnlocked(save, i);
      const rec = Pulse.Campaign.stageRecord(save, stage.id);
      const card = UI.button(this, x, y, 190, 210, '', () => {
        if (unlocked) this.start(i);
      }, { edge: unlocked ? T.wallEdge : T.panelEdge });
      card.label.setVisible(false);
      UI.text(this, x, y - 66, `${i + 1}`, 28, unlocked ? T.text : T.textDim, true).setDepth(21);
      UI.text(this, x, y - 10, stage.name, 18, unlocked ? T.text : T.textDim, true).setDepth(21).setWordWrapWidth(150);
      if (unlocked) Pulse.Render.stars(this.add.graphics().setDepth(21), x, y + 60, 13, rec.bestStars, 3);
      else UI.text(this, x, y + 60, 'Locked', 16, T.textDim).setDepth(21);
    }
  }

  Pulse.MenuScene = MenuScene;
  Pulse.StageSelectScene = StageSelectScene;
})();
