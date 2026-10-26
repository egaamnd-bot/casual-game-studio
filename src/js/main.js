// Boots Phaser in PORTRAIT. The screen is 540 px wide (the lane width); its height (the track
// length) follows the phone's aspect ratio within limits: 9:16 gives 960, 9:20 gives 1200.
// Outside those limits (tablets, very tall phones) Phaser letterboxes.
(function () {
  const C = Pulse.CONFIG;
  const aspect = window.innerWidth / Math.max(1, window.innerHeight); // width / height: below 1 in portrait
  const length = Math.round(Math.min(C.maxLength, Math.max(C.minLength, C.width / aspect)));
  // Tests can force a size: window.PULSE_TEST.length.
  const forced = window.PULSE_TEST && window.PULSE_TEST.length;

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
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: C.width, height: forced || length },
    input: { activePointers: 3 },
    // Sounds come from src/js/sfx.js; Phaser's own audio engine is unused for now.
    audio: { noAudio: true },
    scene: [Pulse.BootScene, Pulse.MenuScene, Pulse.StageSelectScene, Pulse.GameScene].concat(Pulse.LabScene ? [Pulse.LabScene] : []),
    // Headless test browsers barely run requestAnimationFrame, so test pages use timers.
    fps: test ? { forceSetTimeOut: true, target: 60 } : undefined,
  });
  if (test) window.__pulseGame = game;
})();
