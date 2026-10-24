// Android pipeline smoke test. Checks rendering, hold/release touch input, audio, and frame rate
// inside the Capacitor WebView. Throwaway: not the Pulse prototype.

const COLORS = [0x38bdf8, 0xf472b6, 0xfacc15, 0x4ade80, 0xa78bfa];
const FONT = 'system-ui, -apple-system, Roboto, "Segoe UI", sans-serif';

class SmokeTestScene extends Phaser.Scene {
  constructor() {
    super('smoke-test');
    this.downCount = 0;
    this.upCount = 0;
    this.colorIndex = 0;
    this.audioCtx = null;
  }

  create() {
    const { width, height } = this.scale;
    const info = window.BUILD_INFO || { commit: 'preview', run: '-' };
    const platform = window.Capacitor?.getPlatform?.() ?? 'web';

    const label = (y, str, size, color) =>
      this.add.text(width / 2, y, str, { fontFamily: FONT, fontSize: `${size}px`, color }).setOrigin(0.5);

    label(60, 'Pipeline smoke test', 36, '#f9fafb');
    label(110, `Phaser ${Phaser.VERSION} · ${platform}`, 22, '#9ca3af');
    label(140, `build ${info.commit} · run #${info.run}`, 22, '#9ca3af');

    this.ball = this.add.circle(width / 2, height / 2, 110, COLORS[0]);

    this.countText = label(height - 200, '', 28, '#f9fafb');
    this.audioText = label(height - 150, 'audio: not started', 22, '#9ca3af');
    this.fpsText = label(height - 110, '', 22, '#9ca3af');
    label(height - 50, 'Hold to shrink · release to grow', 22, '#6b7280');

    this.input.on('pointerdown', () => this.press());
    this.input.on('pointerup', () => this.release());
    this.input.on('pointerupoutside', () => this.release());

    this.updateCounts();
    this.time.addEvent({ delay: 250, loop: true, callback: () => {
      this.fpsText.setText(`fps: ${Math.round(this.game.loop.actualFps)}`);
    } });
  }

  press() {
    this.downCount++;
    this.colorIndex = (this.colorIndex + 1) % COLORS.length;
    this.ball.setFillStyle(COLORS[this.colorIndex]);
    this.tweens.killTweensOf(this.ball);
    this.tweens.add({ targets: this.ball, scale: 0.45, duration: 90, ease: 'Quad.easeOut' });
    this.beep(660);
    this.updateCounts();
  }

  release() {
    this.upCount++;
    this.tweens.killTweensOf(this.ball);
    this.tweens.add({ targets: this.ball, scale: 1, duration: 220, ease: 'Back.easeOut' });
    this.beep(440);
    this.updateCounts();
  }

  updateCounts() {
    // Down and up should match after every release; a mismatch means a touch event was lost.
    const ok = this.downCount === this.upCount ? 'OK' : 'holding';
    this.countText.setText(`down ${this.downCount} · up ${this.upCount} · ${ok}`);
  }

  beep(frequency) {
    // WebAudio needs a user gesture before it can play, so the context is created on first touch.
    if (!this.audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) {
        this.audioText.setText('audio: unsupported');
        return;
      }
      this.audioCtx = new Ctx();
    }
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain).connect(this.audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
    this.audioText.setText(`audio: ${this.audioCtx.state}`);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: document.body,
  backgroundColor: '#111827',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 540, height: 960 },
  scene: SmokeTestScene,
});
