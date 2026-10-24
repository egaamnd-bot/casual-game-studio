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

    // Orb size and charge live in Pulse.Orb state (shared with the tests).
    get radius() {
      return this.orbState.radius;
    }

    set radius(v) {
      this.orbState.radius = v;
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
      let visual = Pulse.Assets.ENDLESS_VISUAL;
      if (this.mode === 'campaign') {
        this.stage = Pulse.STAGES[this.stageIndex];
        this.level = new Pulse.Campaign.CampaignLevel(this.W, this.H, this.stage);
        visual = this.stage.visual || visual;
      } else {
        this.level = new Pulse.EndlessLevel(this.W, this.H);
      }
      // Sprites when Gemini's assets loaded; otherwise the code-drawn shapes in render.js.
      this.view = Pulse.Assets.ok ? new Pulse.SpriteView(this, visual, this.skin) : null;
      this.nearMisses = 0;

      this.orbState = Pulse.Orb.create();
      this.scoring = Pulse.Scoring.create();
      this.score = 0;
      this.multiplier = 1;
      this.prevBest = this.best;
      this.energy = 0;
      this.bonus = 0;
      this.scroll = 0;
      this.ringT = 1;
      this.test = window.PULSE_TEST || null;

      this.world = this.add.graphics().setDepth(3);
      this.overlay = this.add.graphics().setDepth(15);
      this.overlayImages = [];
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
      this.pauseBtn = UI.iconButton(this, 52, this.hudTop, 64, 'ui_btn_icon_pause_up', 'II', () => this.pause());
      this.backBtn = UI.button(this, cx, this.H - 80, 300, 70, campaign ? 'Stages' : 'Menu', () => this.leave());
      this.retryBtn = UI.button(this, cx, this.H - 170, 300, 70, 'Retry', () => this.canAct() && this.startRun());
      this.nextBtn = UI.button(this, cx, this.H - 260, 300, 70, 'Next stage', () => this.canAct() && this.nextStage(),
        { edge: T.wallEdge, primary: 'mint' });
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
      for (const img of this.overlayImages) img.destroy();
      this.overlayImages.length = 0;

      if (state === 'ready') {
        if (campaign) {
          this.titleText.setFontSize(54);
          show(this.titleText, this.stage.name, T.text);
          show(this.subText, this.stage.intro, T.textDim);
        } else {
          show(this.titleText, 'PULSE', T.text);
          show(this.subText, 'Shrink through gaps · Grow to smash cyan barriers', T.textDim);
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
        // Dim the frozen play field so the results and buttons read cleanly over it.
        this.overlay.fillStyle(T.background, 0.82).fillRect(0, 0, this.W, this.H);
        Pulse.UI.stars(this, this.overlay, this.W / 2, this.titleText.y + 80, 26, r.stars, 3, this.overlayImages, 17);
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
      this.scoring = Pulse.Scoring.create();
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

    // "Charged": big enough to collect pickups and smash barriers. Pickups dim and barriers turn
    // red whenever the orb isn't charged.
    canCollect() {
      return Pulse.isCharged(this.radius);
    }

    update(time, delta) {
      const dt = Math.min(delta / 1000, C.maxFrameSeconds);

      // The orb responds in every state except the end screens, so players can practise.
      if (this.state !== 'over' && this.state !== 'complete') Pulse.Orb.step(this.orbState, this.isHeld(), dt);

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

      // Pulse.Level.resolve applies the rules; this only turns its events into score and feedback.
      const segs = this.level.segments;
      const r = this.radius;
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        if (!s.active) continue;
        const event = this.level.resolve(s, this.orbY, r, this.orbState.charge);
        if (!event) continue;

        if (event === 'crash') {
          this.crash();
          return;
        }
        // Endless scoring rules live in Pulse.Scoring (level.js); this turns them into feedback.
        const fb = campaign ? {} : Pulse.Scoring.apply(this.scoring, event, s);
        this.score = this.scoring.score;
        this.multiplier = this.scoring.multiplier;
        if (event === 'collect') {
          this.ringT = 0;
          if (this.view) this.view.collect(s);
          const color = s.variant === 'bonus' ? T.textBonus : T.textAccent;
          if (campaign) {
            if (s.variant === 'bonus') this.bonus++;
            else this.energy++;
            this.popup(s.variant === 'bonus' ? 'Bonus!' : '+1', color);
          } else if (fb.reachedMax) {
            this.popup(`MAX ×${this.multiplier}`, color);
            this.milestone();
          } else {
            this.popup(`x${this.multiplier}`, color);
          }
          if (fb.gained) this.bumpMultiplier();
          Pulse.Sfx.play('pickup');
          this.updateHud();
        } else if (event === 'miss') {
          // Skipping gold resets the Endless multiplier; skipping a mint bonus doesn't, so
          // declining a risky bonus is always a safe choice.
          if (fb.reset) {
            this.popup('x1', T.textDim);
            Pulse.Sfx.play('multiplierLost');
            this.updateHud();
          }
        } else {
          // 'pass' (wall cleared) or 'break' (barrier smashed): both count as an obstacle.
          if (!campaign) this.updateHud();
          if (fb.streak) this.popup(`×${C.multiplierMax} streak ${fb.streak}`, T.textAccent);
          if (event === 'break') {
            Pulse.Sfx.play('smash');
            if (this.view) this.view.smash(s);
          } else {
            Pulse.Sfx.play('pass');
            this.checkNearMiss(s, r);
          }
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
      if (this.view) this.view.crash();
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

    // Feedback only (no points): the multiplier text pops when it rises.
    bumpMultiplier() {
      this.tweens.killTweensOf(this.multText);
      this.multText.setScale(1.35);
      this.tweens.add({ targets: this.multText, scale: 1, duration: 220, ease: 'Back.easeOut' });
    }

    // Feedback only: reaching the maximum multiplier gets one restrained flourish.
    milestone() {
      Pulse.Sfx.play('milestone');
      if (this.view) this.view.milestone();
      else this.ringT = 0;
    }

    // Cosmetic only: flashes a graze arc when the orb squeezed past a wall edge with little room.
    // It reads state after scoring is done and never touches score, stars or the multiplier.
    checkNearMiss(s, r) {
      if (s.need - r > C.nearMissMargin) return;
      this.nearMisses++;
      if (this.view) this.view.nearMiss(this.orbX - s.gapL <= s.gapR - this.orbX ? -1 : 1, r);
    }

    popup(str, color) {
      this.tweens.killTweensOf(this.popupText);
      this.popupText.setText(str).setColor(color).setAlpha(1).setPosition(this.orbX, this.orbY - C.orb.radius - 30);
      this.tweens.add({ targets: this.popupText, y: this.popupText.y - 60, alpha: 0, duration: 650, ease: 'Quad.easeOut' });
    }

    draw() {
      const g = this.world;
      g.clear();
      const dimmed = !this.canCollect();
      // Barriers show whether hitting them *right now* would smash them.
      const canSmash = (s) => this.level.canSmash(s, this.radius, this.orbState.charge);

      if (this.view) {
        this.view.render(this.level, this.scroll, dimmed, g, canSmash);
      } else {
        Pulse.Render.background(g, this.W, this.H, this.scroll);
        const segs = this.level.segments;
        for (let i = 0; i < segs.length; i++) {
          const s = segs[i];
          if (!s.active || s.y > this.H || s.y + s.h < -40) continue;
          if (s.kind === 'pickup') Pulse.Render.pickup(g, s, this.orbX, dimmed);
          else if (s.kind === 'barrier') Pulse.Render.barrier(g, s, this.W, canSmash(s));
          else Pulse.Render.walls(g, s, this.W);
        }
      }

      // The charge ring only appears while a charged barrier is on screen.
      if (this.state === 'playing' || this.state === 'paused') {
        this.chargeRingShown = this.level.segments.some((s) => s.active && s.charged && !s.broken && s.y < this.orbY && s.y + s.h > 0);
        if (this.chargeRingShown) Pulse.Render.chargeRing(g, this.orbX, this.orbY, this.radius, this.orbState.charge);
      } else {
        this.chargeRingShown = false;
      }

      if (this.mode === 'campaign') {
        const fy = this.level.finishY();
        if (fy > -C.campaign.finishThickness && fy < this.H) Pulse.Render.finishLine(g, fy, this.W);
        if (this.state === 'playing' || this.state === 'paused') {
          Pulse.Render.progressBar(g, 100, this.hudTop - 40, this.W - 140, this.level.progress(this.orbY));
        }
      }

      if (this.view) {
        this.view.renderOrb(this.radius, this.state === 'over');
      } else {
        Pulse.Render.orb(g, this.orbX, this.orbY, this.radius, this.state === 'over', this.skin);
        if (this.ringT < 1) Pulse.Render.collectRing(g, this.orbX, this.orbY, this.ringT);
      }
    }

    // Test-only autopilot (Pulse.autopilot in level.js, shared with the logic tests).
    botWantsHold() {
      if (this.state !== 'playing') return false;
      return Pulse.autopilot(this.level, this.orbY, this.level.speedAt(this.elapsed), this.test.look);
    }
  }

  Pulse.GameScene = GameScene;
})();
