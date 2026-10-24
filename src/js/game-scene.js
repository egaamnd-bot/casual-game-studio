// The only scene. States: ready → playing → over (→ playing), plus paused when the app
// loses focus mid-run.
(function () {
  const C = Pulse.CONFIG;
  const T = Pulse.THEME;

  class GameScene extends Phaser.Scene {
    constructor() {
      super('game');
    }

    create() {
      this.W = this.scale.width;
      this.H = this.scale.height;
      this.orbX = C.orb.x;
      this.orbY = Math.round(this.H * C.orb.yRatio);

      this.level = new Pulse.Level(this.W, this.H);
      this.best = Pulse.Storage.getBest();
      this.radius = C.orb.radius;
      this.score = 0;
      this.multiplier = 1;
      this.prevBest = this.best;
      this.scroll = 0;
      this.ringT = 1;
      this.test = window.PULSE_TEST || null;

      this.world = this.add.graphics();
      this.createHud();

      this.input.addPointer(2);
      this.input.on('pointerdown', this.onPointerDown, this);

      // Losing focus can swallow the touch-up event, so release everything and pause.
      this.onFocusLost = () => this.handleFocusLost();
      this.game.events.on('blur', this.onFocusLost);
      this.game.events.on('hidden', this.onFocusLost);
      this.events.once('shutdown', () => {
        this.game.events.off('blur', this.onFocusLost);
        this.game.events.off('hidden', this.onFocusLost);
      });

      if (this.test) window.__pulseScene = this;
      this.setState('ready');
      if (this.test && this.test.autoStart) this.startRun();
    }

    createHud() {
      const text = (x, y, size, color, bold) => this.add.text(x, y, '', {
        fontFamily: T.font, fontSize: `${size}px`, color, fontStyle: bold ? 'bold' : 'normal',
      }).setOrigin(0.5).setDepth(10);

      const cx = this.W / 2;
      const top = Math.round(this.H * 0.09);
      this.scoreText = text(cx, top, 64, T.text, true);
      this.multText = text(cx, top + 52, 26, T.textAccent, true);
      this.bestText = text(cx, top + 86, 22, T.textDim);

      const mid = Math.round(this.H * 0.34);
      this.titleText = text(cx, mid, 88, T.text, true);
      this.subText = text(cx, mid + 80, 26, T.textDim);
      this.hintText = text(cx, mid + 140, 30, T.textAccent, true);
      this.tweens.add({ targets: this.hintText, alpha: 0.35, duration: 650, yoyo: true, repeat: -1 });

      this.popupText = text(this.orbX, this.orbY, 30, T.textAccent, true).setAlpha(0);
    }

    setState(state) {
      this.state = state;
      this.stateAt = this.time.now;
      const show = (t, str, color) => {
        t.setText(str).setVisible(true);
        if (color) t.setColor(color);
      };

      this.titleText.setVisible(false);
      this.subText.setVisible(false);
      this.hintText.setVisible(false);

      if (state === 'ready') {
        show(this.titleText, 'PULSE', T.text);
        show(this.subText, 'Hold to shrink · Release to grow');
        show(this.hintText, 'Tap to start');
      } else if (state === 'over') {
        const newBest = this.score > this.prevBest;
        show(this.titleText, String(this.score), T.text);
        show(this.subText, newBest ? 'New best!' : `Best ${this.best}`, newBest ? T.textAccent : T.textDim);
        show(this.hintText, 'Tap to retry');
      } else if (state === 'paused') {
        show(this.titleText, 'Paused', T.text);
        show(this.hintText, 'Tap to resume');
      }
      this.updateHud();
    }

    updateHud() {
      const playing = this.state === 'playing' || this.state === 'paused';
      this.scoreText.setVisible(playing).setText(String(this.score || 0));
      this.multText.setVisible(playing && this.multiplier > 1).setText(`x${this.multiplier}`);
      this.bestText.setText(`BEST ${this.best}`).setVisible(this.state !== 'over');
    }

    startRun() {
      this.level.reset();
      this.elapsed = 0;
      this.score = 0;
      this.multiplier = 1;
      this.prevBest = this.best;
      this.ringT = 1;
      this.popupText.setAlpha(0);
      Pulse.Sfx.play('start');
      this.setState('playing');
    }

    onPointerDown() {
      Pulse.Sfx.unlock();
      if (this.state === 'ready') this.startRun();
      else if (this.state === 'paused') this.setState('playing');
      else if (this.state === 'over' && this.time.now - this.stateAt >= C.restartLockMs) this.startRun();
    }

    handleFocusLost() {
      const pointers = this.input.manager.pointers;
      for (let i = 0; i < pointers.length; i++) {
        pointers[i].isDown = false;
        pointers[i].buttons = 0;
      }
      if (this.state === 'playing') this.setState('paused');
    }

    isHeld() {
      if (this.test && this.test.bot) return this.botWantsHold();
      const pointers = this.input.manager.pointers;
      for (let i = 0; i < pointers.length; i++) {
        if (pointers[i].isDown) return true;
      }
      return false;
    }

    update(time, delta) {
      const dt = Math.min(delta / 1000, C.maxFrameSeconds);

      // The orb responds in every state except game over, so players can practise on the start screen.
      if (this.state !== 'over') {
        const target = this.isHeld() ? C.orb.minRadius : C.orb.radius;
        this.radius = this.radius > target
          ? Math.max(target, this.radius - C.orb.shrinkRate * dt)
          : Math.min(target, this.radius + C.orb.growRate * dt);
      }

      if (this.state === 'playing') this.step(dt);
      if (this.ringT < 1) this.ringT = Math.min(1, this.ringT + dt * 3);
      this.draw();
    }

    step(dt) {
      this.elapsed += dt;
      const speed = this.level.speedAt(this.elapsed);
      this.scroll += speed * dt * 0.5;
      this.level.update(dt, speed, this.elapsed);

      const segs = this.level.segments;
      const r = this.radius;
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        if (!s.active) continue;

        if (s.kind === 'pickup') {
          if (s.resolved) continue;
          if (this.level.touchesPickup(s, this.orbY, r)) {
            s.taken = true;
            s.resolved = true;
            this.multiplier = Math.min(C.multiplierMax, this.multiplier + 1);
            this.ringT = 0;
            this.popup(`x${this.multiplier}`, T.textAccent);
            Pulse.Sfx.play('pickup');
            this.updateHud();
          } else if (s.y - C.pickup.radius > this.orbY + r) {
            s.resolved = true;
            if (this.multiplier > 1) {
              this.multiplier = 1;
              this.popup('x1', T.textDim);
              Pulse.Sfx.play('multiplierLost');
              this.updateHud();
            }
          }
          continue;
        }

        if (this.level.hitsWall(s, this.orbX, this.orbY, r)) {
          this.crash();
          return;
        }
        if (!s.scored && s.y > this.orbY + r) {
          s.scored = true;
          this.score += this.multiplier;
          Pulse.Sfx.play('pass');
          this.updateHud();
        }
      }
    }

    crash() {
      if (this.score > this.best) {
        this.best = this.score;
        Pulse.Storage.setBest(this.best);
      }
      if (this.test) this.test.onCrash && this.test.onCrash(this.elapsed, this.score);
      Pulse.Sfx.play('crash');
      this.cameras.main.shake(220, 0.012);
      this.cameras.main.flash(120, 255, 93, 108);
      this.setState('over');
    }

    popup(str, color) {
      this.tweens.killTweensOf(this.popupText);
      this.popupText.setText(str).setColor(color).setAlpha(1).setPosition(this.orbX, this.orbY - C.orb.radius - 30);
      this.tweens.add({ targets: this.popupText, y: this.popupText.y - 60, alpha: 0, duration: 650, ease: 'Quad.easeOut' });
    }

    draw() {
      const g = this.world;
      g.clear();
      Pulse.Render.background(g, this.W, this.H, this.scroll);

      const segs = this.level.segments;
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        if (!s.active || s.y > this.H || s.y + s.h < -40) continue;
        if (s.kind === 'pickup') Pulse.Render.pickup(g, s, this.orbX);
        else Pulse.Render.walls(g, s, this.W);
      }

      Pulse.Render.orb(g, this.orbX, this.orbY, this.radius, this.state === 'over');
      if (this.ringT < 1) Pulse.Render.collectRing(g, this.orbX, this.orbY, this.ringT);
    }

    // Test-only autopilot: shrinks for any wall it cannot fit through, otherwise stays big.
    botWantsHold() {
      if (this.state !== 'playing') return false;
      const speed = this.level.speedAt(this.elapsed);
      const look = speed * 0.28;
      const segs = this.level.segments;
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        if (!s.active || s.kind === 'pickup') continue;
        const near = s.y + s.h > this.orbY - C.orb.radius - look && s.y < this.orbY + C.orb.radius;
        if (near && s.need < C.orb.radius) return true;
      }
      return false;
    }
  }

  Pulse.GameScene = GameScene;
})();
