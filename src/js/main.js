// Boots Phaser in landscape. The screen is 540 px tall (the lane width); its width (the track
// length) follows the phone's aspect ratio within limits: 16:9 gives 960, 20:9 gives 1200.
// Outside those limits (tablets, a phone held upright) Phaser letterboxes.
(function () {
  const C = Pulse.CONFIG;
  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  const length = Math.round(Math.min(C.maxLength, Math.max(C.minLength, C.width * aspect)));

  // Fail fast on a broken stage definition rather than at the end of a run.
  for (const stage of Pulse.STAGES) {
    const errors = Pulse.Campaign.validate(stage, C.width);
    if (errors.length) console.error('Invalid stage', errors);
  }

  // BootScene loads Gemini's assets, then opens the menu (or gameplay on test pages).
  const test = window.PULSE_TEST;
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: document.body,
    backgroundColor: Pulse.THEME.backgroundCss,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: length, height: C.width },
    input: { activePointers: 3 },
    // Sounds come from src/js/sfx.js; Phaser's own audio engine is unused for now.
    audio: { noAudio: true },
    scene: [Pulse.BootScene, Pulse.MenuScene, Pulse.StageSelectScene, Pulse.GameScene],
    // Headless test browsers barely run requestAnimationFrame, so test pages use timers.
    fps: test ? { forceSetTimeOut: true, target: 60 } : undefined,
  });
  if (test) window.__pulseGame = game;
})();
