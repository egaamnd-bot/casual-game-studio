// Boots Phaser. The game is 540 px wide; its height follows the phone's aspect ratio
// (within limits) so tall phones get more lookahead instead of black bars.
(function () {
  const C = Pulse.CONFIG;
  const aspect = window.innerHeight / Math.max(1, window.innerWidth);
  const height = Math.round(Math.min(C.maxHeight, Math.max(C.minHeight, C.width * aspect)));

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: document.body,
    backgroundColor: Pulse.THEME.backgroundCss,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: C.width, height },
    scene: Pulse.GameScene,
  });
})();
