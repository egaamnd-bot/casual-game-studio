// Boots Phaser. The game is 540 px wide; its height follows the phone's aspect ratio
// (within limits) so tall phones get more lookahead instead of black bars.
(function () {
  const C = Pulse.CONFIG;
  const aspect = window.innerHeight / Math.max(1, window.innerWidth);
  const height = Math.round(Math.min(C.maxHeight, Math.max(C.minHeight, C.width * aspect)));

  // Fail fast on a broken stage definition rather than at the end of a run.
  for (const stage of Pulse.STAGES) {
    const errors = Pulse.Campaign.validate(stage, C.width);
    if (errors.length) console.error('Invalid stage', errors);
  }

  // Test pages can boot straight into gameplay; players start at the menu.
  const test = window.PULSE_TEST;
  const scenes = [Pulse.MenuScene, Pulse.StageSelectScene, Pulse.GameScene];
  if (test && test.autoStart) scenes.unshift(scenes.pop());

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: document.body,
    backgroundColor: Pulse.THEME.backgroundCss,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: C.width, height },
    input: { activePointers: 3 },
    // Sounds come from src/js/sfx.js; Phaser's own audio engine is unused for now.
    audio: { noAudio: true },
    scene: scenes,
    // Headless test browsers barely run requestAnimationFrame, so test pages use timers.
    fps: test ? { forceSetTimeOut: true, target: 60 } : undefined,
  });
  if (test) window.__pulseGame = game;
})();
