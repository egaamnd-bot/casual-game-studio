// Landscape menus: mode selection (with skin picker) and campaign stage selection. Positions
// follow Gemini's v3 landscape layout guide (960×540), scaled horizontally to the screen width.
// Uses Gemini's UI frames when loaded (all text rendered here), otherwise simple shapes.
(function () {
  const T = Pulse.THEME;
  const C = Pulse.CONFIG;

  // Horizontal position from the guide's 960-wide layout.
  const gx = (scene, x) => Math.round((x * scene.scale.width) / 960);

  // Landscape backdrop matching gameplay: base tile, ceiling/floor ridges and tick rails.
  function backdrop(scene) {
    if (!Pulse.Assets.ok) return;
    const v = Pulse.Assets.ENDLESS_VISUAL;
    const W = scene.scale.width;
    const H = scene.scale.height;
    const b = Pulse.ART.base;
    scene.add.tileSprite(0, 0, W, H, v.background).setOrigin(0).setTileScale(b);
    scene.add.tileSprite(0, H - 128, W, 128, v.mid).setOrigin(0).setTileScale(b).setAlpha(0.5);
    scene.add.tileSprite(0, 0, W, 128, v.mid).setOrigin(0).setTileScale(b).setFlipY(true).setAlpha(0.5);
  }

  class MenuScene extends Phaser.Scene {
    constructor() {
      super('menu');
    }

    create() {
      const UI = Pulse.UI;
      const sprites = Pulse.Assets.ok;
      const left = gx(this, 280);
      const right = gx(this, 700);
      this.save = Pulse.Save.load();
      this.input.on('pointerdown', () => Pulse.Sfx.unlock());
      backdrop(this);

      // Left column: logo, then the two modes.
      if (sprites) this.add.image(left, 118, 'pulse_ui', 'ui_logo_pulse').setScale(0.5);
      else UI.text(this, left, 118, 'PULSE', 80, T.text, true);
      UI.text(this, left, 182, 'Hold to shrink · Release to grow and smash', 18, T.textDim);
      if (sprites) {
        this.modeCard(left, 285, 'ui_card_mode_campaign_up', 'CAMPAIGN', `${Pulse.STAGES.length} stages`, () => this.go('stages'));
        this.modeCard(left, 415, 'ui_card_mode_endless_up', 'ENDLESS', `Best ${this.save.endless.best}`,
          () => this.go('game', { mode: 'endless' }));
      } else {
        UI.button(this, left, 285, 300, 80, 'Campaign', () => this.go('stages'), { size: 32, edge: T.wallEdge });
        UI.button(this, left, 395, 300, 80, 'Endless', () => this.go('game', { mode: 'endless' }), { size: 32 });
        UI.text(this, left, 455, `Endless best ${this.save.endless.best}`, 18, T.textDim);
      }

      // Right column: total stars, then the skin picker.
      const stars = Pulse.Campaign.totalStars(this.save);
      const g = this.add.graphics();
      UI.stars(this, g, right - 48, 110, 16, 1, 1);
      UI.text(this, right + 14, 110, `${stars} / ${Pulse.STAGES.length * 3}`, 28, T.text, true);

      this.skinIndex = Math.max(0, Pulse.SKINS.indexOf(Pulse.Skins.selected(this.save)));
      this.skinX = right;
      this.skinY = 280;
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
    }

    modeCard(x, y, frame, title, subtitle, onPress) {
      const s = 0.6;
      const card = this.add.image(0, 0, 'pulse_ui', frame).setScale(s);
      const left = (-card.width * s) / 2 + 160 * s; // the card's icon box fills its left ~150 px
      const t1 = this.add.text(left, -14, title, { fontFamily: T.font, fontSize: '26px', fontStyle: 'bold', color: T.text })
        .setOrigin(0, 0.5);
      const t2 = this.add.text(left, 18, subtitle, { fontFamily: T.font, fontSize: '17px', color: T.textDim })
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
      if (Pulse.Skins.select(this.save, skin.id)) Pulse.Save.write(this.save);
      Pulse.Sfx.play('select');
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

    go(key, data) {
      Pulse.Sfx.play('select');
      this.scene.start(key, data);
    }
  }

  class StageSelectScene extends Phaser.Scene {
    constructor() {
      super('stages');
    }

    create() {
      const UI = Pulse.UI;
      const W = this.scale.width;
      const save = Pulse.Save.load();
      backdrop(this);

      UI.text(this, W / 2, 50, 'Campaign', 44, T.text, true);
      UI.text(this, W / 2, 92, `${Pulse.Campaign.totalStars(save)} / ${Pulse.STAGES.length * 3} stars`, 18, T.textDim);

      if (Pulse.Assets.ok) this.cardRow(save);
      else this.boxRow(save);

      if (Pulse.Assets.ok) Pulse.UI.iconButton(this, 64, 52, 52, 'ui_btn_icon_back_up', '<', () => this.scene.start('menu'));
      else UI.button(this, 90, 52, 120, 56, 'Back', () => this.scene.start('menu'), { size: 22 });
    }

    start(i) {
      Pulse.Sfx.play('select');
      this.scene.start('game', { mode: 'campaign', stageIndex: i });
    }

    // Card slots: a row of three per row, 250 px apart (guide: x 230/480/730 at 960 wide).
    slots() {
      const W = this.scale.width;
      return Pulse.STAGES.map((_, i) => ({
        x: W / 2 + ((i % 3) - 1) * gx(this, 250),
        y: 300 + Math.floor(i / 3) * 250,
      }));
    }

    // Gemini's 280x320 stage cards at 0.72 scale.
    cardRow(save) {
      const UI = Pulse.UI;
      const s = 0.72;
      const cw = 280 * s;
      const slots = this.slots();
      UI.text(this, this.scale.width / 2, 140, Pulse.STAGES[0].sector.name.toUpperCase(), 16, T.textDim, true);
      Pulse.STAGES.forEach((stage, i) => {
        const { x, y } = slots[i];
        const unlocked = Pulse.Campaign.isUnlocked(save, i);
        const rec = Pulse.Campaign.stageRecord(save, stage.id);
        const frame = !unlocked ? 'ui_stage_card_locked' : (rec.completed ? 'ui_stage_card_completed' : 'ui_stage_card_unlocked');
        const card = this.add.image(0, 0, 'pulse_ui', frame).setScale(s);
        const parts = [card];
        parts.push(UI.text(this, 0, -112 * s, String(i + 1).padStart(2, '0'), 22, unlocked ? T.text : T.textDim, true));
        const name = UI.text(this, 0, -12 * s, stage.name, 19, unlocked ? T.text : T.textDim, true);
        name.setWordWrapWidth(cw - 24);
        parts.push(name);
        const box = this.add.container(x, y, parts);
        if (unlocked) {
          const imgs = [];
          UI.stars(this, null, 0, 112 * s, 12, rec.bestStars, 3, imgs);
          imgs.forEach((img) => box.add(img));
          UI.wire(box, card, () => this.start(i));
        } else {
          box.add(this.add.image(0, 50 * s, 'pulse_ui', 'ui_icon_status_lock').setScale(0.55));
        }
      });
    }

    // Shape fallback: one box per stage in the same slots.
    boxRow(save) {
      const UI = Pulse.UI;
      const g = this.add.graphics().setDepth(21);
      this.slots().forEach(({ x, y }, i) => {
        const stage = Pulse.STAGES[i];
        const unlocked = Pulse.Campaign.isUnlocked(save, i);
        const rec = Pulse.Campaign.stageRecord(save, stage.id);
        const card = UI.button(this, x, y, 210, 220, '', () => {
          if (unlocked) this.start(i);
        }, { edge: unlocked ? T.wallEdge : T.panelEdge });
        card.label.setVisible(false);
        UI.text(this, x, y - 70, `${i + 1}`, 30, unlocked ? T.text : T.textDim, true).setDepth(21);
        UI.text(this, x, y - 20, stage.name, 20, unlocked ? T.text : T.textDim, true).setDepth(21).setWordWrapWidth(180);
        if (unlocked) Pulse.Render.stars(g, x, y + 60, 14, rec.bestStars, 3);
        else UI.text(this, x, y + 60, 'Locked', 18, T.textDim).setDepth(21);
      });
    }
  }

  Pulse.MenuScene = MenuScene;
  Pulse.StageSelectScene = StageSelectScene;
})();
