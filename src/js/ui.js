// Small UI helpers shared by all scenes. PLACEHOLDER styling.
Pulse.UI = {
  text(scene, x, y, str, size, color, bold) {
    return scene.add.text(x, y, str, {
      fontFamily: Pulse.THEME.font, fontSize: `${size}px`, color, fontStyle: bold ? 'bold' : 'normal',
      align: 'center', wordWrap: { width: Pulse.CONFIG.width - 80 },
    }).setOrigin(0.5);
  },

  // A tappable rectangle with a label. Returns a container with setEnabled(bool).
  button(scene, x, y, w, h, label, onPress, opts) {
    opts = opts || {};
    const T = Pulse.THEME;
    const bg = scene.add.rectangle(0, 0, w, h, opts.fill || T.panel).setStrokeStyle(2, opts.edge || T.panelEdge);
    const txt = Pulse.UI.text(scene, 0, 0, label, opts.size || 28, opts.color || T.text, true);
    const box = scene.add.container(x, y, [bg, txt]).setDepth(opts.depth || 20);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', () => {
      if (box.visible) onPress();
    });
    box.label = txt;
    box.setEnabled = (on) => {
      box.setVisible(on);
      if (on) bg.setInteractive({ useHandCursor: true });
      else bg.disableInteractive();
      return box;
    };
    return box;
  },
};
