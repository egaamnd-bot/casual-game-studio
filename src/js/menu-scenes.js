// Mode selection (with skin picker) and campaign stage selection. Uses Gemini's UI frames when
// loaded (all text rendered here), otherwise simple shapes.
(function () {
  const T = Pulse.THEME;
  const C = Pulse.CONFIG;

  // Full-screen background matching gameplay.
  function backdrop(scene, key) {
    if (!Pulse.Assets.ok) return;
    scene.add.tileSprite(0, 0, scene.scale.width, scene.scale.height, key || 'bg_grid_tile')
      .setOrigin(0).setTileScale(Pulse.ART.base);
  }

  class MenuScene extends Phaser.Scene {
    constructor() {
      super('menu');
    }

    create() {
      const UI = Pulse.UI;
      const W = this.scale.width;
      const H = this.scale.height;
      const cx = W / 2;
      const sprites = Pulse.Assets.ok;
      this.save = Pulse.Save.load();
      this.input.on('pointerdown', () => Pulse.Sfx.unlock());
      backdrop(this);

      if (sprites) this.add.image(cx, H * 0.13, 'pulse_ui', 'ui_logo_pulse').setScale(0.6);
      else UI.text(this, cx, H * 0.13, 'PULSE', 96, T.text, true);
      UI.text(this, cx, H * 0.13 + 74, 'Hold to shrink · Release to grow', 24, T.textDim);

      const stars = Pulse.Campaign.totalStars(this.save);
      const max = Pulse.STAGES.length * 3;
      const g = this.add.graphics();
      UI.stars(this, g, cx - 52, H * 0.25, 18, 1, 1);
      UI.text(this, cx + 14, H * 0.25, `${stars} / ${max}`, 30, T.text, true);

      const y1 = H * 0.36;
      const y2 = y1 + (sprites ? 175 : 110);
      if (sprites) {
        this.modeCard(cx, y1, 'ui_card_mode_campaign_up', 'CAMPAIGN', `${Pulse.STAGES.length} stages`, () => this.go('stages'));
        this.modeCard(cx, y2, 'ui_card_mode_endless_up', 'ENDLESS', `Best ${this.save.endless.best}`,
          () => this.go('game', { mode: 'endless' }));
      } else {
        UI.button(this, cx, y1, 340, 84, 'Campaign', () => this.go('stages'), { size: 34, edge: T.wallEdge });
        UI.button(this, cx, y2, 340, 84, 'Endless', () => this.go('game', { mode: 'endless' }), { size: 34 });
        UI.text(this, cx, y2 + 60, `Endless best ${this.save.endless.best}`, 22, T.textDim);
      }

      // Skin picker: preview, name, unlock requirement, arrows to browse.
      this.skinIndex = Math.max(0, Pulse.SKINS.indexOf(Pulse.Skins.selected(this.save)));
      this.skinY = H * 0.78;
      if (sprites) {
        this.slot = this.add.image(cx, this.skinY + 10, 'pulse_ui', 'ui_skin_slot_selected').setScale(0.55);
        this.previewImgs = ['ring', 'normal'].map(() => this.add.image(cx, this.skinY - 6, 'pulse_gameplay', 'player_orb_normal'));
        this.lockIcon = this.add.image(cx, this.skinY - 6, 'pulse_ui', 'ui_icon_status_lock').setScale(0.7);
      } else {
        this.preview = this.add.graphics();
      }
      this.skinName = UI.text(this, cx, this.skinY + 112, '', 26, T.text, true);
      this.skinNote = UI.text(this, cx, this.skinY + 144, '', 20, T.textDim);
      this.arrow(cx - 170, -1);
      this.arrow(cx + 170, 1);
      this.showSkin();
    }

    modeCard(x, y, frame, title, subtitle, onPress) {
      const s = 0.7;
      const card = this.add.image(0, 0, 'pulse_ui', frame).setScale(s);
      const left = (-card.width * s) / 2 + 160 * s; // the card's icon box fills its left ~150 px
      const t1 = this.add.text(left, -16, title, { fontFamily: T.font, fontSize: '30px', fontStyle: 'bold', color: T.text })
        .setOrigin(0, 0.5);
      const t2 = this.add.text(left, 20, subtitle, { fontFamily: T.font, fontSize: '20px', color: T.textDim })
        .setOrigin(0, 0.5);
      Pulse.UI.wire(this.add.container(x, y, [card, t1, t2]), card, onPress);
    }

    arrow(x, dir) {
      const cb = () => this.browse(dir);
      if (!Pulse.Assets.ok) {
        Pulse.UI.button(this, x, this.skinY, 70, 70, dir < 0 ? '<' : '>', cb, { size: 32 });
        return;
      }
      const btn = Pulse.UI.iconButton(this, x, this.skinY, 64, 'ui_btn_icon_back_up', '<', cb);
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
        const scale = 44 / Pulse.ART.orbBodyRadius;
        this.previewImgs[0].setTexture(s.atlas, `${s.prefix}ring`).setScale(scale).setAlpha(unlocked ? 0.9 : 0.3);
        this.previewImgs[1].setTexture(s.atlas, `${s.prefix}normal`).setScale(scale).setAlpha(unlocked ? 1 : 0.3);
        this.slot.setFrame(selected ? 'ui_skin_slot_selected' : 'ui_skin_slot_unselected');
        this.lockIcon.setVisible(!unlocked);
      } else {
        this.preview.clear().setAlpha(unlocked ? 1 : 0.35);
        Pulse.Render.orb(this.preview, this.scale.width / 2, this.skinY, C.orb.radius, false, skin);
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
      const H = this.scale.height;
      const cx = W / 2;
      const save = Pulse.Save.load();
      backdrop(this);

      UI.text(this, cx, H * 0.1, 'Campaign', 56, T.text, true);
      UI.text(this, cx, H * 0.1 + 56, `${Pulse.Campaign.totalStars(save)} / ${Pulse.STAGES.length * 3} stars`, 24, T.textDim);

      if (Pulse.Assets.ok) this.cardGrid(save);
      else this.list(save);

      UI.button(this, cx, H - 80, 300, 70, 'Back', () => this.scene.start('menu'));
    }

    start(i) {
      Pulse.Sfx.play('select');
      this.scene.start('game', { mode: 'campaign', stageIndex: i });
    }

    // Gemini's 280x320 stage cards, three per row, grouped by sector.
    cardGrid(save) {
      const UI = Pulse.UI;
      const W = this.scale.width;
      const s = 0.55;
      const cw = 280 * s;
      const ch = 320 * s;
      // Lay out: sector label, then rows of three cards.
      const slots = [];
      let y = this.scale.height * 0.27;
      let sector = null;
      let col = 3;
      Pulse.STAGES.forEach((stage) => {
        if (stage.sector.id !== sector) {
          if (sector !== null) y += ch / 2 + 30;
          sector = stage.sector.id;
          UI.text(this, W / 2, y, stage.sector.name.toUpperCase(), 20, T.textDim, true);
          y += 30 + ch / 2;
          col = 0;
        } else if (col === 3) {
          y += ch + 20;
          col = 0;
        }
        slots.push({ x: W / 2 + (col - 1) * (cw + 16), y });
        col++;
      });

      Pulse.STAGES.forEach((stage, i) => {
        const { x, y } = slots[i];
        const unlocked = Pulse.Campaign.isUnlocked(save, i);
        const rec = Pulse.Campaign.stageRecord(save, stage.id);
        const frame = !unlocked ? 'ui_stage_card_locked' : (rec.completed ? 'ui_stage_card_completed' : 'ui_stage_card_unlocked');
        const card = this.add.image(0, 0, 'pulse_ui', frame).setScale(s);
        const parts = [card];
        parts.push(UI.text(this, 0, -112 * s, String(i + 1).padStart(2, '0'), 20, unlocked ? T.text : T.textDim, true));
        const name = UI.text(this, 0, -12 * s, stage.name, 17, unlocked ? T.text : T.textDim, true);
        name.setWordWrapWidth(cw - 20);
        parts.push(name);
        const box = this.add.container(x, y, parts);
        if (unlocked) {
          const imgs = [];
          UI.stars(this, null, 0, 112 * s, 11, rec.bestStars, 3, imgs);
          imgs.forEach((img) => box.add(img));
          UI.wire(box, card, () => this.start(i));
        } else {
          box.add(this.add.image(0, 46 * s, 'pulse_ui', 'ui_icon_status_lock').setScale(0.5));
        }
      });
    }

    // Shape fallback: one wide card per stage.
    list(save) {
      const UI = Pulse.UI;
      const cx = this.scale.width / 2;
      const g = this.add.graphics().setDepth(21);
      let y = this.scale.height * 0.27;
      let sector = null;
      Pulse.STAGES.forEach((stage, i) => {
        if (stage.sector.id !== sector) {
          sector = stage.sector.id;
          UI.text(this, cx, y - 20, stage.sector.name.toUpperCase(), 20, T.textDim, true);
          y += 30;
        }
        const unlocked = Pulse.Campaign.isUnlocked(save, i);
        const rec = Pulse.Campaign.stageRecord(save, stage.id);
        const card = UI.button(this, cx, y + 50, 440, 120, '', () => {
          if (unlocked) this.start(i);
        }, { edge: unlocked ? T.wallEdge : T.panelEdge });
        card.label.setVisible(false);
        UI.text(this, cx, y + 26, `${i + 1}. ${stage.name}`, 30, unlocked ? T.text : T.textDim, true).setDepth(21);
        if (unlocked) {
          Pulse.Render.stars(g, cx, y + 76, 16, rec.bestStars, 3);
        } else {
          UI.text(this, cx, y + 76, `Locked: clear ${Pulse.STAGES[i - 1].name}`, 20, T.textDim).setDepth(21);
        }
        y += 150;
      });
    }
  }

  Pulse.MenuScene = MenuScene;
  Pulse.StageSelectScene = StageSelectScene;
})();
