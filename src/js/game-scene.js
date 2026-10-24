// Gameplay for both modes, in landscape. States: ready → playing → over | complete, plus
// paused when the app loses focus or the pause button is pressed.
//   Endless:  pattern-based Pulse.EndlessLevel, score × multiplier, best score.
//   Campaign: fixed Pulse.Campaign.CampaignLevel, energy count, finish line, stars.
// Orb, input, collision and pickups are shared; only scoring and the level source differ.
//
// Coordinates: the rules run in track space (see config.js): this.W = lane width (540),
// this.H = track length, the orb at (orbX, orbY). Everything in the world is drawn inside
// `this.layer`, a container at the screen's right edge rotated 90°, which maps track (x, y) to
// screen (SW − y, x): obstacles enter on the right and travel left; the lane fills the screen
// height. The HUD, menus and overlays are laid out directly in screen space (SW × SH).
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
      this.SW = this.scale.width;
      this.SH = this.scale.height;
      this.W = C.width;
      this.H = this.SW;
      this.orbX = C.orb.x;
      this.orbY = Math.round(this.H * C.orb.yRatio);
      // Where the orb appears on screen.
      this.orbSX = this.SW - this.orbY;
      this.orbSY = this.orbX;
      this.layer = this.add.container(this.SW, 0).setRotation(Math.PI / 2).setDepth(2);

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

      this.orbState = Pulse.Orb.create();
      this.scoring = Pulse.Scoring.create();
      this.score = 0;
      this.multiplier = 1;
      this.prevBest = this.best;
      this.energy = 0;
      this.bonus = 0;
      this.scroll = 0;
      this.ringT = 1;
      this.nearMisses = 0;
      this.test = window.PULSE_TEST || null;

      // Sprites when Gemini's assets loaded; otherwise the code-drawn shapes in render.js.
      this.view = Pulse.Assets.ok ? new Pulse.SpriteView(this, visual, this.skin, this.layer) : null;
      this.world = this.add.graphics().setDepth(3);
      this.layer.add(this.world);
      this.layer.sort('depth');
      this.hud = this.add.graphics().setDepth(9);
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

    // Landscape HUD (Gemini's layout guide, scaled to the screen width): pause top-left,
    // campaign progress top-centre, score/energy readout top-right. The lane below stays clear.
    createHud() {
      const UI = Pulse.UI;
      const SW = this.SW;
      this.hudTop = 44;
      this.rightX = SW - 128;
      if (Pulse.Assets.ok) {
        this.bracket = this.add.image(SW - 120, 46, 'pulse_ui', 'ui_hud_bracket_right').setScale(0.6).setDepth(9);
      }
      this.scoreText = UI.text(this, this.rightX, 36, '', 32, T.text, true).setDepth(10);
      this.bestText = UI.text(this, this.rightX - 26, 64, '', 15, T.textAccent, true).setDepth(10);
      this.multText = UI.text(this, this.rightX + 58, 64, '', 18, T.textAccent, true).setDepth(10);
      this.energyText = UI.text(this, this.rightX, 46, '', 22, T.textAccent, true).setDepth(10);

      // Overlay text sits to the right of the orb, over the lane ahead.
      const cx = this.overlayX();
      const wrap = SW - cx - 60;
      this.titleText = UI.text(this, cx, 150, '', 72, T.text, true).setDepth(16);
      this.subText = UI.text(this, cx, 220, '', 22, T.textDim).setDepth(16).setWordWrapWidth(wrap * 2 - 40);
      this.detailText = UI.text(this, cx, 290, '', 20, T.textDim).setDepth(16);
      this.hintText = UI.text(this, cx, 300, '', 28, T.textAccent, true).setDepth(16);
      this.tweens.add({ targets: this.hintText, alpha: 0.35, duration: 650, yoyo: true, repeat: -1 });

      this.popupText = UI.text(this, this.orbSX, this.orbSY, '', 26, T.textAccent, true).setAlpha(0).setDepth(10);

      // Read-ahead aid: a charged barrier is coming from the right.
      if (Pulse.Assets.ok) {
        this.warnIcon = this.add.image(SW - 40, this.SH / 2, 'pulse_gameplay', 'ind_upcoming_charged_warn')
          .setScale(0.6).setDepth(9).setVisible(false);
        this.tweens.add({ targets: this.warnIcon, alpha: 0.4, duration: 300, yoyo: true, repeat: -1 });
      }
    }

    // Centre of the overlay area: between the orb and the right edge.
    overlayX() {
      return Math.round((this.orbSX + C.orb.radius + this.SW) / 2);
    }

    createButtons() {
      const UI = Pulse.UI;
      const campaign = this.mode === 'campaign';
      const y = this.SH - 64;
      this.pauseBtn = UI.iconButton(this, 56, this.hudTop, 48, 'ui_btn_icon_pause_up', 'II', () => this.pause());
      this.backBtn = UI.button(this, this.overlayX(), y, 200, 60, campaign ? 'Stages' : 'Menu', () => this.leave(), { size: 24 });
      this.retryBtn = UI.button(this, this.overlayX(), y, 200, 60, 'Retry', () => this.canAct() && this.startRun(), { size: 24 });
      this.nextBtn = UI.button(this, this.overlayX(), y, 200, 60, 'Next stage', () => this.canAct() && this.nextStage(),
        { edge: T.wallEdge, primary: 'mint', size: 24 });
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
      this.titleText.setFontSize(72);
      this.overlay.clear();
      for (const img of this.overlayImages) img.destroy();
      this.overlayImages.length = 0;

      if (state === 'ready') {
        if (campaign) {
          this.titleText.setFontSize(46);
          show(this.titleText, this.stage.name, T.text);
          show(this.subText, this.stage.intro, T.textDim);
        } else {
          show(this.titleText, 'PULSE', T.text);
          show(this.subText, 'Shrink through gaps · Grow to smash cyan barriers', T.textDim);
        }
        show(this.hintText, 'Tap to start');
      } else if (state === 'over') {
        // Light dim so the text reads over whatever obstacles are frozen behind it.
        this.overlay.fillStyle(T.background, 0.55).fillRect(0, 0, this.SW, this.SH);
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
        this.titleText.setFontSize(56);
        show(this.titleText, 'Stage clear', T.text);
        // Dim the frozen play field so the results and buttons read cleanly over it.
        this.overlay.fillStyle(T.background, 0.82).fillRect(0, 0, this.SW, this.SH);
        Pulse.UI.stars(this, this.overlay, this.titleText.x, 215, 24, r.stars, 3, this.overlayImages, 17);
        const lines = [`Energy ${this.energy}/${this.level.track.energyTotal}`];
        if (this.level.track.bonusTotal) lines[0] += ` · Bonus ${this.bonus}/${this.level.track.bonusTotal}`;
        if (r.record.bestStars > r.stars) lines.push(`Best ${r.record.bestStars} stars`);
        if (r.record.unlockedNext) lines.push(`Unlocked: ${r.record.unlockedNext.name}`);
        for (const skin of r.record.newSkins) lines.push(`New skin: ${skin.name}`);
        show(this.detailText, lines.join('\n'), T.textDim);
        this.detailText.setY(300);
      } else if (state === 'paused') {
        this.overlay.fillStyle(T.background, 0.55).fillRect(0, 0, this.SW, this.SH);
        show(this.titleText, 'Paused', T.text);
        show(this.hintText, 'Tap to resume');
      }

      // End-screen buttons in one row along the bottom of the overlay area.
      const hasNext = campaign && state === 'complete' && this.stageIndex + 1 < Pulse.STAGES.length;
      const row = state === 'complete' ? [this.backBtn, this.retryBtn].concat(hasNext ? [this.nextBtn] : [])
        : state === 'playing' ? [] : [this.backBtn];
      // Three buttons need the full width (they sit below the orb, so they can't cover it).
      const cx = row.length > 2 ? this.SW / 2 : this.overlayX();
      row.forEach((b, i) => b.setX(cx + (i - (row.length - 1) / 2) * 216));
      this.pauseBtn.setEnabled(state === 'playing');
      this.backBtn.setEnabled(row.includes(this.backBtn));
      this.backBtn.label.setText(state === 'paused' ? 'Quit' : (campaign ? 'Stages' : 'Menu'));
      this.retryBtn.setEnabled(row.includes(this.retryBtn));
      this.nextBtn.setEnabled(row.includes(this.nextBtn));
      this.updateHud();
    }

    updateHud() {
      const playing = this.state === 'playing' || this.state === 'paused';
      if (this.bracket) this.bracket.setVisible(playing);
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
      this.bestText.setText(`BEST ${this.best}`).setVisible(playing);
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
          this.crash(s);
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

    // `seg` is what the orb hit, so the effect can show why (e.g. a charged barrier too early).
    crash(seg) {
      if (this.mode === 'endless' && this.score > this.best) {
        this.best = this.score;
        this.save.endless.best = this.best;
        Pulse.Save.write(this.save);
      }
      this.crashedOn = seg ? (seg.kind === 'barrier' ? (seg.charged ? 'charged barrier' : 'barrier') : 'gap') : null;
      if (this.test && this.test.onCrash) this.test.onCrash(this.elapsed, this.score);
      Pulse.Sfx.play('crash');
      if (this.view) this.view.crash(seg);
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
      if (this.view) this.view.multUp();
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

    // Popups rise above the orb in screen space.
    popup(str, color) {
      this.tweens.killTweensOf(this.popupText);
      this.popupText.setText(str).setColor(color).setAlpha(1).setPosition(this.orbSX, this.orbSY - C.orb.radius - 30);
      this.tweens.add({ targets: this.popupText, y: this.popupText.y - 50, alpha: 0, duration: 650, ease: 'Quad.easeOut' });
    }

    // A charged barrier that hasn't entered the screen yet but will within half a screen.
    chargedComing() {
      const items = this.level.items;
      for (let i = this.level.nextIndex; i < items.length; i++) {
        const ahead = items[i].at - this.level.travelled;
        if (ahead > this.H * 0.5) return false;
        if (items[i].charged) return true;
      }
      return false;
    }

    draw() {
      const g = this.world;
      g.clear();
      this.hud.clear();
      const dimmed = !this.canCollect();
      // Barriers show whether hitting them *right now* would smash them.
      const canSmash = (s) => this.level.canSmash(s, this.radius, this.orbState.charge);
      const active = this.state === 'playing' || this.state === 'paused';

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
      this.chargeRingShown = active &&
        this.level.segments.some((s) => s.active && s.charged && !s.broken && s.y < this.orbY && s.y + s.h > 0);
      if (this.view) this.view.renderChargeRing(this.chargeRingShown, this.orbState.charge, this.radius);
      else if (this.chargeRingShown) Pulse.Render.chargeRing(g, this.orbX, this.orbY, this.radius, this.orbState.charge);

      this.warnShown = active && this.chargedComing();
      if (this.warnIcon) this.warnIcon.setVisible(this.warnShown);

      if (this.mode === 'campaign') {
        const fy = this.level.finishY();
        const finishVisible = fy > -C.campaign.finishThickness && fy < this.H;
        if (this.view) this.view.renderFinish(fy, finishVisible);
        else if (finishVisible) Pulse.Render.finishLine(g, fy, this.W);
        if (active) Pulse.Render.progressBar(this.hud, this.SW / 2 - 200, 36, 400, this.level.progress(this.orbY));
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
