// Gameplay for both modes. States: ready → playing → over | complete, plus paused when the
// app loses focus or the pause button is pressed.
//   Endless:  random Pulse.Level, score × multiplier, best score.
//   Campaign: fixed Pulse.Campaign.CampaignLevel, energy count, finish line, stars.
// Orb, input, collision and pickups are shared; only scoring and the level source differ.
(function () {
  const C = Pulse.CONFIG;
  const T = Pulse.THEME;

  class GameScene extends Phaser.Scene {
    constructor() {
      super('game');
    }

    init(data) {
      const test = window.PULSE_TEST || {};
      data = data && data.mode ? data : test;
      this.mode = data.mode === 'campaign' ? 'campaign' : 'endless';
      this.stageIndex = data.stageIndex || 0;
    }

    create() {
      this.W = this.scale.width;
      this.H = this.scale.height;
      this.orbX = C.orb.x;
      this.orbY = Math.round(this.H * C.orb.yRatio);

      this.save = Pulse.Save.load();
      this.skin = Pulse.Skins.selected(this.save);
      this.best = this.save.endless.best;
      if (this.mode === 'campaign') {
        this.stage = Pulse.STAGES[this.stageIndex];
        this.level = new Pulse.Campaign.CampaignLevel(this.W, this.H, this.stage);
        this.edgeColor = this.stage.visual && this.stage.visual.wallEdge;
      } else {
        this.level = new Pulse.Level(this.W, this.H);
        this.edgeColor = null;
      }

      this.radius = C.orb.radius;
      this.score = 0;
      this.multiplier = 1;
      this.prevBest = this.best;
      this.energy = 0;
      this.bonus = 0;
      this.scroll = 0;
      this.ringT = 1;
      this.test = window.PULSE_TEST || null;

      this.world = this.add.graphics();
      this.overlay = this.add.graphics().setDepth(15);
      this.createHud();
      this.createButtons();

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
      const UI = Pulse.UI;
      const cx = this.W / 2;
      const top = Math.round(this.H * 0.09);
      this.hudTop = top;
      this.scoreText = UI.text(this, cx, top, '', 64, T.text, true).setDepth(10);
      this.multText = UI.text(this, cx, top + 52, '', 26, T.textAccent, true).setDepth(10);
      this.bestText = UI.text(this, cx, top + 86, '', 22, T.textDim).setDepth(10);
      this.energyText = UI.text(this, cx, top + 6, '', 30, T.textAccent, true).setDepth(10);

      const mid = Math.round(this.H * 0.3);
      this.titleText = UI.text(this, cx, mid, '', 88, T.text, true).setDepth(16);
      this.subText = UI.text(this, cx, mid + 80, '', 26, T.textDim).setDepth(16);
      this.detailText = UI.text(this, cx, mid + 175, '', 24, T.textDim).setDepth(16);
      this.hintText = UI.text(this, cx, mid + 140, '', 30, T.textAccent, true).setDepth(16);
      this.tweens.add({ targets: this.hintText, alpha: 0.35, duration: 650, yoyo: true, repeat: -1 });

      this.popupText = UI.text(this, this.orbX, this.orbY, '', 30, T.textAccent, true).setAlpha(0).setDepth(10);
    }

    createButtons() {
      const UI = Pulse.UI;
      const cx = this.W / 2;
      const campaign = this.mode === 'campaign';
      this.pauseBtn = UI.button(this, 52, this.hudTop, 64, 64, 'II', () => this.pause(), { size: 26 });
      this.backBtn = UI.button(this, cx, this.H - 80, 300, 70, campaign ? 'Stages' : 'Menu', () => this.leave());
      this.retryBtn = UI.button(this, cx, this.H - 170, 300, 70, 'Retry', () => this.canAct() && this.startRun());
      this.nextBtn = UI.button(this, cx, this.H - 260, 300, 70, 'Next stage', () => this.canAct() && this.nextStage(),
        { edge: T.wallEdge });
    }

    canAct() {
      return this.time.now - this.stateAt >= C.restartLockMs;
    }

    setState(state) {
      this.state = state;
      this.stateAt = this.time.now;
      const campaign = this.mode === 'campaign';
      const show = (t, str, color) => {
        t.setText(str).setVisible(true);
        if (color) t.setColor(color);
      };

      for (const t of [this.titleText, this.subText, this.hintText, this.detailText]) t.setVisible(false);
      this.titleText.setFontSize(88);
      this.overlay.clear();

      if (state === 'ready') {
        if (campaign) {
          this.titleText.setFontSize(54);
          show(this.titleText, this.stage.name, T.text);
          show(this.subText, this.stage.intro, T.textDim);
        } else {
          show(this.titleText, 'PULSE', T.text);
          show(this.subText, 'Hold to shrink · Release to grow', T.textDim);
        }
        show(this.hintText, 'Tap to start');
      } else if (state === 'over') {
        if (campaign) {
          show(this.titleText, 'Crashed', T.textDanger);
          show(this.subText, `${Math.round(this.level.progress(this.orbY) * 100)}% of the way`, T.textDim);
        } else {
          const newBest = this.score > this.prevBest;
          show(this.titleText, String(this.score), T.text);
          show(this.subText, newBest ? 'New best!' : `Best ${this.best}`, newBest ? T.textAccent : T.textDim);
        }
        show(this.hintText, 'Tap to retry');
      } else if (state === 'complete') {
        const r = this.result;
        this.titleText.setFontSize(64);
        show(this.titleText, 'Stage clear', T.text);
        Pulse.Render.stars(this.overlay, this.W / 2, this.titleText.y + 80, 26, r.stars, 3);
        const lines = [`Energy ${this.energy}/${this.level.track.energyTotal}`];
        if (this.level.track.bonusTotal) lines[0] += ` · Bonus ${this.bonus}/${this.level.track.bonusTotal}`;
        if (r.record.bestStars > r.stars) lines.push(`Best ${r.record.bestStars} stars`);
        if (r.record.unlockedNext) lines.push(`Unlocked: ${r.record.unlockedNext.name}`);
        for (const skin of r.record.newSkins) lines.push(`New skin: ${skin.name}`);
        show(this.detailText, lines.join('\n'), T.textDim);
      } else if (state === 'paused') {
        show(this.titleText, 'Paused', T.text);
        show(this.hintText, 'Tap to resume');
      }

      const hasNext = campaign && state === 'complete' && this.stageIndex + 1 < Pulse.STAGES.length;
      this.pauseBtn.setEnabled(state === 'playing');
      this.backBtn.setEnabled(state !== 'playing');
      this.backBtn.label.setText(state === 'paused' ? 'Quit' : (campaign ? 'Stages' : 'Menu'));
      this.retryBtn.setEnabled(state === 'complete');
      this.nextBtn.setEnabled(hasNext);
      this.updateHud();
    }

    updateHud() {
      const playing = this.state === 'playing' || this.state === 'paused';
      if (this.mode === 'campaign') {
        this.scoreText.setVisible(false);
        this.multText.setVisible(false);
        this.bestText.setVisible(false);
        this.energyText.setVisible(playing).setText(`Energy ${this.energy}/${this.level.track.energyTotal}`);
        return;
      }
      this.energyText.setVisible(false);
      this.scoreText.setVisible(playing).setText(String(this.score));
      this.multText.setVisible(playing && this.multiplier > 1).setText(`x${this.multiplier}`);
      this.bestText.setText(`BEST ${this.best}`).setVisible(this.state !== 'over');
    }

    startRun() {
      this.level.reset();
      this.elapsed = 0;
      this.score = 0;
      this.multiplier = 1;
      this.prevBest = this.best;
      this.energy = 0;
      this.bonus = 0;
      this.ringT = 1;
      this.popupText.setAlpha(0);
      Pulse.Sfx.play('start');
      this.setState('playing');
    }

    onPointerDown(pointer, currentlyOver) {
      Pulse.Sfx.unlock();
      if (currentlyOver && currentlyOver.length) return; // a button handled it
      if (this.state === 'ready') this.startRun();
      else if (this.state === 'paused') this.setState('playing');
      else if (this.state === 'over' && this.canAct()) this.startRun();
    }

    pause() {
      if (this.state === 'playing') this.setState('paused');
    }

    leave() {
      if (this.state === 'over' && !this.canAct()) return;
      this.scene.start(this.mode === 'campaign' ? 'stages' : 'menu');
    }

    nextStage() {
      this.scene.start('game', { mode: 'campaign', stageIndex: this.stageIndex + 1 });
    }

    handleFocusLost() {
      const pointers = this.input.manager.pointers;
      for (let i = 0; i < pointers.length; i++) {
        pointers[i].isDown = false;
        pointers[i].buttons = 0;
      }
      this.pause();
    }

    isHeld() {
      if (this.test && this.test.bot) return this.botWantsHold();
      const pointers = this.input.manager.pointers;
      for (let i = 0; i < pointers.length; i++) {
        if (pointers[i].isDown) return true;
      }
      return false;
    }

    // Pickups can be collected only above this radius, and are drawn dimmed below it.
    canCollect() {
      return this.radius > C.orb.radius - C.pickup.sizeTolerance;
    }

    update(time, delta) {
      const dt = Math.min(delta / 1000, C.maxFrameSeconds);

      // The orb responds in every state except the end screens, so players can practise.
      if (this.state !== 'over' && this.state !== 'complete') {
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
      const campaign = this.mode === 'campaign';
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
            this.ringT = 0;
            if (campaign) {
              if (s.variant === 'bonus') this.bonus++;
              else this.energy++;
              this.popup(s.variant === 'bonus' ? 'Bonus!' : '+1', T.textAccent);
            } else {
              this.multiplier = Math.min(C.multiplierMax, this.multiplier + 1);
              this.popup(`x${this.multiplier}`, T.textAccent);
            }
            Pulse.Sfx.play('pickup');
            this.updateHud();
          } else if (s.y - C.pickup.radius > this.orbY + r) {
            s.resolved = true;
            if (!campaign && this.multiplier > 1) {
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
          if (!campaign) {
            this.score += this.multiplier;
            this.updateHud();
          }
          Pulse.Sfx.play('pass');
        }
      }

      if (campaign && this.level.finishY() >= this.orbY) this.completeStage();
    }

    crash() {
      if (this.mode === 'endless' && this.score > this.best) {
        this.best = this.score;
        this.save.endless.best = this.best;
        Pulse.Save.write(this.save);
      }
      if (this.test && this.test.onCrash) this.test.onCrash(this.elapsed, this.score);
      Pulse.Sfx.play('crash');
      this.cameras.main.shake(220, 0.012);
      this.cameras.main.flash(120, 255, 93, 108);
      this.setState('over');
    }

    completeStage() {
      const track = this.level.track;
      const stars = Pulse.Campaign.computeStars(this.stage, true, this.energy, track.energyTotal);
      const record = Pulse.Campaign.recordCompletion(this.save, this.stage.id, stars);
      Pulse.Save.write(this.save);
      this.result = { stars, record };
      if (this.test && this.test.onComplete) this.test.onComplete(this.elapsed, this.energy, this.bonus, stars);
      Pulse.Sfx.play('complete');
      this.setState('complete');
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

      const dimmed = !this.canCollect();
      const segs = this.level.segments;
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        if (!s.active || s.y > this.H || s.y + s.h < -40) continue;
        if (s.kind === 'pickup') Pulse.Render.pickup(g, s, this.orbX, dimmed);
        else Pulse.Render.walls(g, s, this.W, this.edgeColor);
      }

      if (this.mode === 'campaign') {
        const fy = this.level.finishY();
        if (fy > -C.campaign.finishThickness && fy < this.H) Pulse.Render.finishLine(g, fy, this.W);
        if (this.state === 'playing' || this.state === 'paused') {
          Pulse.Render.progressBar(g, 100, this.hudTop - 40, this.W - 140, this.level.progress(this.orbY));
        }
      }

      Pulse.Render.orb(g, this.orbX, this.orbY, this.radius, this.state === 'over', this.skin);
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
