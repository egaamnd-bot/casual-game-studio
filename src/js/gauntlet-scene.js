// The Developer Gauntlet screen (docs/DEV_GAUNTLET.md): pick any section directly. Opened from the LAB screen.
(function () {
  const T = Pulse.THEME;

  class GauntletScene extends Phaser.Scene {
    constructor() {
      super('gauntlet');
    }

    create() {
      const UI = Pulse.UI;
      const W = this.scale.width;
      const H = this.scale.height;
      this.input.on('pointerdown', () => Pulse.Sfx.unlock());
      Pulse.Music.play('MENU_THEME');
      this.add.rectangle(0, 0, W, H, T.background).setOrigin(0).setDepth(-3);
      UI.text(this, W / 2, 50, 'Developer Gauntlet', 32, T.text, true);
      UI.text(this, W / 2, 86, 'QA mode · nothing is saved · not part of the campaign', 14, T.textDim);
      UI.text(this, W / 2, 108, 'Pick a section, or start at 1: clearing a section offers the next one.', 13, T.textDim);
      const list = Pulse.Gauntlet ? Pulse.Gauntlet.sections() : [];
      const top = 150;
      const rowH = Math.min(86, (H - top - 90) / Math.max(1, list.length));
      list.forEach((e, k) => {
        const y = top + rowH / 2 + k * rowH;
        UI.button(this, W / 2, y - 10, 440, Math.min(52, rowH - 26), e.title, () => {
          Pulse.Sfx.play('select');
          this.scene.start('game', { mode: 'campaign', lab: e.id });
        }, { size: 22 });
        UI.text(this, W / 2, y + rowH / 2 - 16, e.spec.mechanic, 12, T.textDim);
      });
      if (!list.length) UI.text(this, W / 2, H / 2, 'No sections in this build', 18, T.textDim);
      UI.button(this, W / 2, H - 46, 160, 52, 'Lab', () => { Pulse.Sfx.play('select'); this.scene.start('lab'); }, { size: 22 });
    }
  }

  Pulse.GauntletScene = GauntletScene;
})();
