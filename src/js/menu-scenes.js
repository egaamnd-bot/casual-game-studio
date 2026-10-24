// Mode selection (with skin picker) and campaign stage selection. PLACEHOLDER styling.
(function () {
  const T = Pulse.THEME;

  class MenuScene extends Phaser.Scene {
    constructor() {
      super('menu');
    }

    create() {
      const UI = Pulse.UI;
      const W = this.scale.width;
      const H = this.scale.height;
      const cx = W / 2;
      this.save = Pulse.Save.load();
      this.input.on('pointerdown', () => Pulse.Sfx.unlock());

      UI.text(this, cx, H * 0.13, 'PULSE', 96, T.text, true);
      UI.text(this, cx, H * 0.13 + 74, 'Hold to shrink · Release to grow', 26, T.textDim);

      const stars = Pulse.Campaign.totalStars(this.save);
      const max = Pulse.STAGES.length * 3;
      const g = this.add.graphics();
      Pulse.Render.star(g, cx - 60, H * 0.27, 18, true);
      UI.text(this, cx + 10, H * 0.27, `${stars} / ${max}`, 30, T.text, true);

      UI.button(this, cx, H * 0.38, 340, 84, 'Campaign', () => this.go('stages'), { size: 34, edge: T.wallEdge });
      UI.button(this, cx, H * 0.38 + 110, 340, 84, 'Endless', () => this.go('game', { mode: 'endless' }), { size: 34 });
      UI.text(this, cx, H * 0.38 + 170, `Endless best ${this.save.endless.best}`, 22, T.textDim);

      // Skin picker: preview, name, unlock requirement, arrows to browse.
      this.skinIndex = Math.max(0, Pulse.SKINS.indexOf(Pulse.Skins.selected(this.save)));
      this.skinY = H * 0.74;
      this.preview = this.add.graphics();
      this.skinName = UI.text(this, cx, this.skinY + 90, '', 28, T.text, true);
      this.skinNote = UI.text(this, cx, this.skinY + 126, '', 22, T.textDim);
      UI.button(this, cx - 170, this.skinY, 70, 70, '<', () => this.browse(-1), { size: 32 });
      UI.button(this, cx + 170, this.skinY, 70, 70, '>', () => this.browse(1), { size: 32 });
      UI.text(this, cx, this.skinY - 90, 'Orb', 22, T.textDim);
      this.showSkin();
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
      this.preview.clear().setAlpha(unlocked ? 1 : 0.35);
      Pulse.Render.orb(this.preview, this.scale.width / 2, this.skinY, Pulse.CONFIG.orb.radius, false, skin);
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

      UI.text(this, cx, H * 0.1, 'Campaign', 56, T.text, true);
      UI.text(this, cx, H * 0.1 + 56, `${Pulse.Campaign.totalStars(save)} / ${Pulse.STAGES.length * 3} stars`, 24, T.textDim);

      const g = this.add.graphics().setDepth(21);
      let y = H * 0.27;
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
          if (!unlocked) return;
          Pulse.Sfx.play('select');
          this.scene.start('game', { mode: 'campaign', stageIndex: i });
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

      UI.button(this, cx, H - 80, 300, 70, 'Back', () => this.scene.start('menu'));
    }
  }

  Pulse.MenuScene = MenuScene;
  Pulse.StageSelectScene = StageSelectScene;
})();
