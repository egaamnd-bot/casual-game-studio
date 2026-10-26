// The LAB screen: one button per registered prototype (Pulse.Lab). Opened from the menu's LAB button.
(function () {
  const T = Pulse.THEME;

  class LabScene extends Phaser.Scene {
    constructor() {
      super('lab');
    }

    create() {
      const UI = Pulse.UI;
      const W = this.scale.width;
      const H = this.scale.height;
      this.input.on('pointerdown', () => Pulse.Sfx.unlock());
      Pulse.Music.play('MENU_THEME');
      this.add.rectangle(0, 0, W, H, T.background).setOrigin(0).setDepth(-3);
      UI.text(this, W / 2, 56, 'Lab', 34, T.text, true);
      UI.text(this, W / 2, 92, 'Prototypes · not part of the campaign · no stars, no saves', 14, T.textDim);
      const list = Pulse.Lab.list();
      const top = 150;
      const rowH = Math.min(150, (H - top - 120) / Math.max(1, list.length));
      list.forEach((e, k) => {
        const y = top + rowH / 2 + k * rowH;
        UI.button(this, W / 2, y - 14, 440, 64, e.title, () => {
          Pulse.Sfx.play('select');
          this.scene.start('game', { mode: 'campaign', lab: e.id });
        }, { size: 26 });
        UI.text(this, W / 2, y + 34, e.desc, 14, T.textDim).setWordWrapWidth(440).setAlign('center');
      });
      if (!list.length) UI.text(this, W / 2, H / 2, 'No prototypes in this build', 18, T.textDim);
      UI.button(this, 90, 52, 120, 56, 'Back', () => { Pulse.Sfx.play('select'); this.scene.start('menu'); }, { size: 22 });
    }
  }

  Pulse.LabScene = LabScene;
})();
