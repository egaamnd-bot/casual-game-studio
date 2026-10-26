// Gameplay for both modes, in PORTRAIT. States: ready → playing → over | complete, plus
// paused when the app loses focus or the pause button is pressed.
//   Endless:  pattern-based Pulse.EndlessLevel, score × multiplier, best score.
//   Campaign: fixed Pulse.Campaign.CampaignLevel, energy count, finish line, stars.
// Orb, input, collision and pickups are shared; only scoring and the level source differ.
//
// Coordinates: the rules run in track space (see config.js): this.W = lane width (540),
// this.H = track length (the screen height), the orb at (orbX, orbY). In portrait track space IS
// screen space: obstacles enter at the top and fall toward the orb, which sits 30% up from the
// bottom and steers left and right (orbX follows the finger). The game world is drawn in
// `this.layer` (a plain container, kept so views can add to it in depth order).
//
// Controls (docs/PORTRAIT_REWORK.md): ONE finger does everything. Touching shrinks the orb and
// releasing grows it, as always; dragging sideways while touching steers by the finger's movement
// (relative, so you never have to touch where the orb is). The orb glides to wherever you last
// sent it, so a quick swipe-and-release sets a destination while the orb regrows.
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

    // The orb's lane position (steered); on screen it is at (orbX, orbY).
    get orbX() {
      return this.orbState ? this.orbState.x : C.orb.x;
    }

    get orbSX() {
      return this.orbX;
    }

    get orbSY() {
      return this.orbY;
    }

    set radius(v) {
      this.orbState.radius = v;
    }

    init(data) {
      const test = window.PULSE_TEST || {};
      data = data && data.mode ? data : test;
      this.mode = data.mode === 'campaign' ? 'campaign' : 'endless';
      this.stageIndex = data.stageIndex || 0;
      this.mirrorClears = 0;
      this.crashedByEcho = false;
      this.resetMirror(); // a new scene never inherits an echo
    }

    create() {
      this.SW = this.scale.width;
      this.SH = this.scale.height;
      this.W = C.width;
      this.H = this.SH;
      this.orbY = Math.round(this.H * C.orb.yRatio);
      this.layer = this.add.container(0, 0).setDepth(2);
      this.steer = { id: null, lastX: 0, drag: 0, moved: false };

      this.save = Pulse.Save.load();
      this.skin = Pulse.Skins.selected(this.save);
      this.best = this.save.endless.best;
      let visual = Pulse.Assets.ENDLESS_VISUAL;
      if (this.mode === 'campaign') {
        this.stage = Pulse.STAGES[this.stageIndex];
        this.level = new Pulse.Campaign.CampaignLevel(this.W, this.H, this.stage);
        visual = this.stage.world.visual;
      } else {
        this.level = new Pulse.EndlessLevel(this.W, this.H);
      }
      this.wasHeld = false;
      this.lastCharge = 1;

      // Rhythm: the run clock (stepped only while playing, so pause/retry need no special cases)
      // and the cosmetic orb stretch. The music follows the clock, never the other way round.
      this.clock = Pulse.Rhythm.createClock({ bpm: this.trackBpm() });
      this.od = Pulse.Overdrive.create(); // the Overdrive meter and its eased visual intensity (feedback only)
      this.fx = Pulse.Rhythm.OrbFx.create(); // the springy drawn orb (cosmetic; the rules read orbState)
      this.syncIn = 0;
      this.seeks = 0;
      this.cleared = 0;
      this.combo = 0;
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
      this.setupKeys();

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
      this.startMusic();
      if (this.test && this.test.autoStart && !this.test.holdReady) this.startRun();
    }

    // Campaign plays its world's track (the first stage of a world opens with the transition
    // sting, and the track starts with the run); Endless escalates through the worlds' tracks.
    musicTrack() {
      if (this.mode === 'campaign') return this.stage.world.music;
      const t = this.elapsed || 0;
      return t < 30 ? 'WORLD_1_GAMEPLAY' : t < 60 ? 'WORLD_2_GAMEPLAY' : 'WORLD_3_GAMEPLAY';
    }

    // Tempo of the track now playing (campaign: the stage's; Endless: the current world's).
    trackBpm() {
      if (this.mode === 'campaign') return this.stage.bpm || this.stage.world.bpm;
      return Pulse.Rhythm.TRACKS[this.musicTrack()].bpm;
    }

    // ---- Sound that lands on the music (Pulse.Rhythm.Groove). Gameplay is never delayed: only the
    // sound waits, at most maxDelay s, for the next 16th note, and only while the music is
    // known to be in step with the run clock. ----
    aligned() {
      return this.state === 'playing' && Pulse.Music.position(this.playingTrack) !== null;
    }

    sfx(name, maxDelay, extra) {
      const delay = C.groove.enabled && maxDelay > 0 ? Pulse.Rhythm.Groove.delay(this.clock, this.aligned(), maxDelay) : 0;
      return Pulse.Sfx.play(name, Object.assign({ delay }, extra));
    }

    // The world's key: 1, 2 or 3 (Endless follows the track that is playing).
    worldIndex() {
      if (this.mode === 'campaign') return this.stage.world.index;
      const t = this.playingTrack || this.musicTrack();
      return t === 'WORLD_3_GAMEPLAY' ? 3 : t === 'WORLD_2_GAMEPLAY' ? 2 : 1;
    }

    // Keeps the streamed music on the run clock. Checked twice a second; the music is only moved
    // when it has drifted by more than the tolerance (start-up latency, a long pause). No-op
    // while muted, loading or cross-fading (Music.position returns null).
    syncMusic(dt) {
      this.syncIn -= dt;
      if (this.syncIn > 0) return;
      this.syncIn = 0.5;
      if (this.seeks >= C.groove.maxSeeks) return; // seeking is audible: only for real drift, and a stream that won't seek is left alone
      const Rh = Pulse.Rhythm;
      const target = Rh.seekTarget(Rh.trackTime(this.clock), Pulse.Music.position(this.playingTrack), Pulse.Music.loopLength());
      if (target !== null) {
        this.seeks++;
        Pulse.Music.seek(target);
      }
    }

    worldOpener() {
      return this.mode === 'campaign' && Pulse.STAGES.findIndex((s) => s.world === this.stage.world) === this.stageIndex;
    }

    startMusic() {
      if (this.worldOpener()) {
        Pulse.Music.stop();
        Pulse.Sfx.play('worldIntro');
      } else {
        Pulse.Music.play(this.musicTrack());
      }
    }

    // Portrait HUD: pause top-left, campaign progress top-centre, score/energy readout top-right.
    // Overlay text (ready, game over, paused, results) sits in the open space above the orb;
    // buttons stack at the bottom, below it.
    createHud() {
      const UI = Pulse.UI;
      const SW = this.SW;
      this.hudTop = 46;
      this.rightX = SW - 84;
      if (Pulse.Assets.ok) {
        this.bracket = this.add.image(SW - 88, 48, 'pulse_ui', 'ui_hud_bracket_right').setScale(0.6).setDepth(9);
      }
      this.scoreText = UI.text(this, this.rightX, 38, '', 32, T.text, true).setDepth(10);
      this.bestText = UI.text(this, this.rightX - 10, 68, '', 14, T.textAccent, true).setDepth(10);
      this.multText = UI.text(this, this.rightX + 46, 68, '', 18, T.textAccent, true).setDepth(10);
      this.energyText = UI.text(this, this.rightX + 12, 48, '', 24, T.textAccent, true).setDepth(10);
      if (Pulse.Assets.ok) {
        this.goldIcon = this.add.image(this.rightX - 30, 48, 'pulse_ui', 'ui_hud_icon_gold').setScale(0.6).setDepth(10);
      }
      // Combo readout under the score (consecutive hits: the melody keeps building while it grows).
      this.comboText = UI.text(this, SW / 2, 86, '', 20, T.textAccent, true).setDepth(10).setAlpha(0);
      // Overdrive meter: a slim bar under the progress bar (campaign) so it never covers the lane.
      this.odBar = this.add.graphics().setDepth(10);
      this.odLabel = UI.text(this, 225, 68, '', 12, T.textAccent, true).setDepth(10).setAlpha(0);
      this.odShown = 0;
      // World banner on the campaign's ready screen.
      const cx = this.overlayX();
      const top = Math.round(this.H * 0.2);
      if (this.mode === 'campaign') {
        this.bannerParts = UI.worldBanner(this, cx, top - 70, this.stage.world, 340, 16);
      }
      this.titleText = UI.text(this, cx, top, '', 64, T.text, true).setDepth(16);
      this.subText = UI.text(this, cx, top + 66, '', 21, T.textDim).setDepth(16).setWordWrapWidth(440);
      this.reasonText = UI.text(this, cx, top + 140, '', 17, T.textDim).setDepth(16).setWordWrapWidth(440);
      this.detailText = UI.text(this, cx, top + 150, '', 20, T.textDim).setDepth(16);
      this.hintText = UI.text(this, cx, Math.round(this.H * 0.47), '', 26, T.textAccent, true).setDepth(16);
      this.tweens.add({ targets: this.hintText, alpha: 0.35, duration: 650, yoyo: true, repeat: -1 });

      this.popupText = UI.text(this, this.orbX, this.orbY, '', 26, T.textAccent, true).setAlpha(0).setDepth(10);
      // Quality callout ("PERFECT") beside the popup, small and quick.
      this.qualityText = UI.text(this, this.orbX, this.orbY, '', 17, T.text, true).setAlpha(0).setDepth(10);

      // Trailer-style hint card near the top of the lane (stages list hints with run-time windows).
      this.hintTop = 118;
      this.hintCard = this.add.graphics().setDepth(11).setVisible(false);
      this.hintTitle = UI.text(this, SW / 2, this.hintTop + 20, '', 28, T.text, true).setDepth(12).setVisible(false);
      this.hintSub = UI.text(this, SW / 2, this.hintTop + 46, '', 13, T.textDim).setDepth(12).setVisible(false);
      this.hintShown = null;

      // Read-ahead aid: a charged barrier is coming from the top.
      if (Pulse.Assets.ok) {
        this.warnIcon = this.add.image(SW - 36, Math.round(this.H * 0.4), 'pulse_gameplay', 'ind_upcoming_charged_warn')
          .setScale(0.6).setDepth(9).setVisible(false);
        this.tweens.add({ targets: this.warnIcon, alpha: 0.4, duration: 300, yoyo: true, repeat: -1 });
      }
    }

    // Centre of the overlay area: the lane centre.
    overlayX() {
      return Math.round(this.SW / 2);
    }

    createButtons() {
      const UI = Pulse.UI;
      const campaign = this.mode === 'campaign';
      const cx = this.overlayX();
      const y = this.SH - 64;
      this.pauseBtn = UI.iconButton(this, 48, this.hudTop, 52, 'ui_btn_icon_pause_up', 'II', () => this.pause());
      this.backBtn = UI.button(this, cx, y, 300, 60, campaign ? 'Stages' : 'Menu', () => this.leave(), { size: 24 });
      this.retryBtn = UI.button(this, cx, y, 300, 60, 'Retry', () => this.canAct() && this.startRun(), { size: 24 });
      this.nextBtn = UI.button(this, cx, y, 300, 60, 'Next stage', () => this.canAct() && this.nextStage(),
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

      for (const t of [this.titleText, this.subText, this.hintText, this.detailText, this.reasonText]) t.setVisible(false);
      if (this.bannerParts) this.bannerParts.forEach((o) => o.setVisible(state === 'ready'));
      if (state !== 'playing' && state !== 'ready') this.endHold();
      if (state !== 'paused') Pulse.Music.duck(false);
      this.hintText.setY(Math.round(this.H * 0.47));
      this.titleText.setFontSize(64);
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
          show(this.subText, 'Slide to steer · Hold to shrink · Release to smash', T.textDim);
        }
        show(this.hintText, 'Touch to start');
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
        // Why the run ended, when the game knows (see crash()).
        if (this.crashReason) show(this.reasonText, this.crashReason, T.textDim);
        show(this.hintText, 'Touch to retry');
        this.hintText.setY(Math.round(this.H * 0.47));
      } else if (state === 'complete') {
        const r = this.result;
        this.titleText.setFontSize(56);
        show(this.titleText, 'Stage clear', T.text);
        // Dim the frozen play field so the results and buttons read cleanly over it.
        this.overlay.fillStyle(T.background, 0.82).fillRect(0, 0, this.SW, this.SH);
        Pulse.UI.stars(this, this.overlay, this.titleText.x, this.titleText.y + 70, 26, r.stars, 3, this.overlayImages, 17);
        this.revealStars(r);
        const lines = [`Energy ${this.energy}/${this.level.track.energyTotal}`];
        if (this.level.track.bonusTotal) lines[0] += ` · Bonus ${this.bonus}/${this.level.track.bonusTotal}`;
        if (r.record.bestStars > r.stars) lines.push(`Best ${r.record.bestStars} stars`);
        if (r.record.unlockedNext) lines.push(`Unlocked: ${r.record.unlockedNext.name}`);
        for (const skin of r.record.newSkins) lines.push(`New skin: ${skin.name}`);
        show(this.detailText, lines.join('\n'), T.textDim);
        this.detailText.setY(this.titleText.y + 150);
      } else if (state === 'paused') {
        this.overlay.fillStyle(T.background, 0.55).fillRect(0, 0, this.SW, this.SH);
        Pulse.Music.duck(true);
        show(this.titleText, 'Paused', T.text);
        show(this.hintText, 'Touch to resume');
      }

      // End-screen buttons stack along the bottom, primary action highest.
      const hasNext = campaign && state === 'complete' && this.stageIndex + 1 < Pulse.STAGES.length;
      const row = state === 'complete' ? (hasNext ? [this.nextBtn] : []).concat([this.retryBtn, this.backBtn])
        : state === 'playing' ? [] : [this.backBtn];
      const bottom = this.SH - 64;
      row.forEach((b, i) => b.setY(bottom - (row.length - 1 - i) * 72));
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
      if (this.goldIcon) this.goldIcon.setVisible(playing && this.mode === 'campaign');
      if (this.mode === 'campaign') {
        this.scoreText.setVisible(false);
        this.multText.setVisible(false);
        this.bestText.setVisible(false);
        const label = `${this.energy}/${this.level.track.energyTotal}`;
        this.energyText.setVisible(playing).setText(this.goldIcon ? label : `Energy ${label}`);
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
      Object.assign(this.orbState, { x: C.orb.x, tx: C.orb.x, vx: 0 });
      this.scoring = Pulse.Scoring.create();
      this.score = 0;
      this.multiplier = 1;
      this.prevBest = this.best;
      this.energy = 0;
      this.bonus = 0;
      this.ringT = 1;
      this.crashReason = null;
      this.crashedByEcho = false;
      this.combo = 0;
      Pulse.Overdrive.reset(this.od);
      this.routeClears = 0;
      this.resetMirror();
      this.mirrorClears = 0;
      this.routes = {}; // per route id: { notes: risk notes taken, side: lane chosen }
      this.odShown = 0;
      this.showCombo(0);
      this.lastCharge = this.orbState.charge;
      this.popupText.setAlpha(0);
      Pulse.Sfx.play('start');
      this.playingTrack = this.musicTrack();
      Pulse.Rhythm.reset(this.clock, this.trackBpm());
      this.cleared = 0;
      this.syncIn = 0.25;
      this.seeks = 0;
      // The music that was playing on the ready screen restarts so beat 1 lines up with the run.
      const continuing = Pulse.Music.position(this.playingTrack) !== null;
      Pulse.Music.play(this.playingTrack);
      if (continuing) Pulse.Music.seek(0);
      if (this.view) this.view.spawn();
      this.setState('playing');
    }

    // ---- Steering ----
    // The finger that went down first steers (relative drag: the orb moves by the finger's
    // movement, wherever on screen the finger is). If it lifts, another finger still down takes over
    // from where it is, without a jump. The orb's target stays where it was left.
    beginSteer(pointer) {
      const st = this.steer;
      if (st.id !== null) return;
      st.id = pointer.id;
      st.lastX = pointer.x;
      st.drag = 0;
      st.moved = false;
    }

    updateSteer(dt) {
      const o = this.orbState;
      const st = this.steer;
      if (this.test && this.test.bot) {
        const target = Pulse.autosteer(this.level, o.x, this.orbY, this.level.speedAt(this.elapsed), this.test.slook, this.test.skill, this.test.route);
        Pulse.Orb.setTarget(o, target, this.W);
        return;
      }
      const pointers = this.input.manager.pointers;
      let cur = null;
      for (let i = 0; i < pointers.length; i++) {
        if (pointers[i].id === st.id && pointers[i].isDown) cur = pointers[i];
      }
      if (!cur) {
        st.id = null;
        for (let i = 0; i < pointers.length; i++) {
          if (pointers[i].isDown) {
            this.beginSteer(pointers[i]);
            cur = pointers[i];
            break;
          }
        }
      }
      if (cur) {
        const dx = cur.x - st.lastX;
        st.lastX = cur.x;
        st.drag += dx;
        if (!st.moved && Math.abs(st.drag) >= C.steer.deadZone) {
          st.moved = true;
          Pulse.Orb.setTarget(o, o.tx + st.drag * C.steer.gain, this.W);
        } else if (st.moved) {
          Pulse.Orb.setTarget(o, o.tx + dx * C.steer.gain, this.W);
        }
      }
      // Desktop convenience: arrow keys / A D nudge the target, space holds.
      const k = this.keys;
      if (k) {
        const dir = (k.RIGHT.isDown || k.D.isDown ? 1 : 0) - (k.LEFT.isDown || k.A.isDown ? 1 : 0);
        if (dir) Pulse.Orb.setTarget(o, o.tx + dir * 700 * dt, this.W);
      }
    }

    setupKeys() {
      const kb = this.input.keyboard;
      this.keys = kb && !(this.test && this.test.noKeys) ? kb.addKeys('LEFT,RIGHT,A,D,SPACE') : null;
    }

    onPointerDown(pointer, currentlyOver) {
      Pulse.Sfx.unlock();
      if (currentlyOver && currentlyOver.length) return; // a button handled it
      if (this.state === 'ready' || this.state === 'playing') this.beginSteer(pointer);
      if (this.state === 'ready') this.startRun();
      else if (this.state === 'paused') {
        Pulse.Sfx.play('resume');
        this.syncIn = 0; // the music kept playing under the pause screen: realign at once
        this.setState('playing');
      } else if (this.state === 'over' && this.canAct()) this.startRun();
    }

    pause() {
      if (this.state !== 'playing') return;
      Pulse.Sfx.play('pause');
      this.setState('paused');
    }

    // The soft hum while holding; stopped on release and whenever play stops.
    endHold() {
      Pulse.Sfx.stopHold();
      this.wasHeld = false;
    }

    leave() {
      if (this.state === 'over' && !this.canAct()) return;
      this.scene.start(this.mode === 'campaign' ? 'stages' : 'menu');
    }

    nextStage() {
      this.scene.start('game', { mode: 'campaign', stageIndex: this.stageIndex + 1 });
    }

    handleFocusLost() {
      this.endHold();
      const pointers = this.input.manager.pointers;
      for (let i = 0; i < pointers.length; i++) {
        pointers[i].isDown = false;
        pointers[i].buttons = 0;
      }
      this.pause();
    }

    isHeld() {
      if (this.test && this.test.bot) return this.botWantsHold();
      if (this.keys && this.keys.SPACE.isDown) return true;
      const pointers = this.input.manager.pointers;
      for (let i = 0; i < pointers.length; i++) {
        if (pointers[i].isDown) return true;
      }
      return false;
    }

    // "Charged": big enough to smash barriers (barriers turn red whenever the orb isn't).
    // Pickups no longer care about size.
    canCollect() {
      return true;
    }

    update(time, delta) {
      const dt = Math.min(delta / 1000, C.maxFrameSeconds);

      // The orb responds in every state except the end screens, so players can practise.
      if (this.state !== 'over' && this.state !== 'complete') {
        const held = this.isHeld();
        if (this.state === 'playing' || this.state === 'ready') this.updateSteer(dt);
        Pulse.Orb.step(this.orbState, held, this.state === 'paused' ? 0 : dt, this.W);
        if (this.state === 'playing' || this.state === 'ready') this.holdSounds(held);
      }

      if (this.state === 'playing') this.step(dt);
      else if (this.state === 'ready') {
        // The idle orb breathes and pings to the beat while it waits for the first tap.
        const tick = Pulse.Rhythm.step(this.clock, dt);
        if (tick.beats > 0 && this.view) this.view.beatEcho(this.radius, tick.bars > 0);
      }
      if (this.state === 'complete') Pulse.Overdrive.tick(this.od, dt);
      if (this.ringT < 1) this.ringT = Math.min(1, this.ringT + dt * 3);
      this.updateOrbFx(dt);
      this.updateHintCard();
      this.draw();
    }

    // Cosmetic orb animation: the glow breathes on the beat and the body stretches along the
    // direction of travel while it changes size. Rules only ever read orbState, never this.
    // The hint card fades in and out over each hint's window of run time.
    updateHintCard() {
      const hints = this.mode === 'campaign' && this.stage.hints;
      const playing = this.state === 'playing' || this.state === 'paused';
      let h = hints && playing && hints.find((x) => this.elapsed >= x.from && this.elapsed <= x.to);
      // Route hint: while the first row of a fork is on its way down, name the two routes. The card
      // fades with the row's position, so it is gone well before the player has to commit.
      let routeFade = null;
      const rh = this.mode === 'campaign' && this.stage.routeHints;
      if (!h && rh && playing) {
        const segs = this.level.segments;
        for (let i = 0; i < segs.length; i++) {
          const q = segs[i];
          if (q.active && q.fork && q.firstRow && rh[q.route] && q.y + q.h > 0 && q.y < this.orbY - 150) {
            h = rh[q.route];
            routeFade = Math.min(1, (q.y + q.h) / 60, (this.orbY - 150 - q.y) / 60);
            break;
          }
        }
      }
      const mh = this.mode === 'campaign' && this.stage.mirrorHints;
      if (!h && mh && playing && this.mirror && (this.mirror.phase === 'telegraph' || this.mirror.phase === 'intro') && mh[this.mirror.zone.id]) {
        h = mh[this.mirror.zone.id];
        routeFade = this.mirror.phase === 'intro' ? Math.max(0, 1 - this.mirror.k) : Math.min(1, this.mirror.tele * 8);
      }
      if (!h) {
        if (this.hintShown) {
          this.hintShown = null;
          this.hintCard.clear().setVisible(false);
          this.hintTitle.setVisible(false);
          this.hintSub.setVisible(false);
        }
        return;
      }
      const a = routeFade !== null ? routeFade : Math.min(1, (this.elapsed - h.from) / 0.3, (h.to - this.elapsed) / 0.3);
      if (this.hintShown !== h) {
        this.hintShown = h;
        this.hintTitle.setText(h.title);
        this.hintSub.setText(h.sub);
        const w = Math.min(this.SW - 24, Math.max(this.hintTitle.width, this.hintSub.width) + 56);
        const cx = this.SW / 2;
        this.hintCard.clear();
        const top = this.hintTop;
        this.hintCard.fillStyle(0x0b0f19, 0.8).fillRoundedRect(cx - w / 2, top, w, 62, 6);
        this.hintCard.lineStyle(2, 0x00f0ff, 0.9).strokeRoundedRect(cx - w / 2, top, w, 62, 6);
        this.hintCard.lineStyle(2, T.danger, 0.9).lineBetween(cx - w / 2 + 14, top + 61, cx - w / 2 + 70, top + 61);
      }
      this.hintCard.setVisible(true).setAlpha(Math.max(0, a));
      this.hintTitle.setVisible(true).setAlpha(Math.max(0, a));
      this.hintSub.setVisible(true).setAlpha(Math.max(0, a));
    }

    // The drawn orb follows the collision radius through springs (Pulse.Rhythm.OrbFx): it eases
    // into a shrink, pops slightly past full size on release, stretches while changing size and
    // pulses when it is rewarded. It is only ever drawn at least as big as the collision circle.
    updateOrbFx(dt) {
      const Rh = Pulse.Rhythm;
      const squeeze = this.state === 'playing' && this.level.segments.some((s) =>
        s.active && s.kind === 'gate' && s.y < this.orbY + this.radius && s.y + s.h > this.orbY - this.radius);
      const v = Rh.OrbFx.step(this.fx, this.radius, dt, squeeze);
      const calm = this.state === 'over' || this.state === 'paused';
      const phase = calm ? 1 : Rh.position(this.clock).phase;
      const base = Rh.OrbFx.scales(phase, 0);
      this.orbFx = { radius: v.radius, glow: base.glow * (1 + v.pop), along: v.along, across: v.across, pop: v.pop, shrink: v.shrink, grow: v.grow, phase };
      if (this.view && this.view.beatPulse) this.view.beatPulse(phase, calm);
    }

    // A reward makes the orb pulse once (pickup small, smash larger).
    reward(amount) {
      Pulse.Rhythm.OrbFx.kick(this.fx, amount);
    }

    // Shrink: short "start" + soft looping hum; release: "expand".
    holdSounds(held) {
      if (held === this.wasHeld) return;
      this.wasHeld = held;
      if (held) {
        this.sfx('shrinkStart', C.groove.inputDelay); // input sounds are immediate
        Pulse.Sfx.startHold();
      } else {
        Pulse.Sfx.stopHold();
        this.sfx('expand', C.groove.inputDelay);
        if (this.view) this.view.releaseRipple(this.radius);
      }
    }

    // Charge-ring sounds, only while a charged barrier is on screen: start filling, full, lost.
    chargeSounds() {
      const c = this.orbState.charge;
      if (this.chargeRingShown) {
        if (this.lastCharge <= 0 && c > 0 && c < 1) Pulse.Sfx.play('chargeStart');
        else if (this.lastCharge < 1 && c >= 1) Pulse.Sfx.play('chargeReady');
        else if (this.lastCharge > 0 && c <= 0) Pulse.Sfx.play('chargeCancel');
      }
      this.lastCharge = c;
    }

    step(dt) {
      this.elapsed += dt;
      if (Pulse.Overdrive.tick(this.od, dt).ended) this.overdriveEnded();
      const campaign = this.mode === 'campaign';
      const track = this.musicTrack();
      if (track !== this.playingTrack) {
        this.playingTrack = track;
        Pulse.Rhythm.retune(this.clock, this.trackBpm()); // Endless moves to the next world's tempo
        Pulse.Music.play(track);
        this.seeks = 0;
      }
      const tick = Pulse.Rhythm.step(this.clock, dt);
      if (tick.beats > 0 && this.view) this.view.beatEcho(this.radius, tick.bars > 0); // the orb pings on every beat, harder on the bar
      this.syncMusic(dt);
      const speed = this.level.speedAt(this.elapsed);
      this.speedNow = speed; // the comet tail grows with speed
      this.scroll += speed * dt * 0.5;
      this.level.update(dt, speed, this.elapsed);
      this.updateMirror();

      // Pulse.Level.resolve applies the rules; this only turns its events into score and feedback.
      // Contact feedback (sound, burst, flash) happens in this same frame: nothing waits for a beat.
      // The obstacles themselves were placed so the contact lands on the beat (campaign.js).
      const segs = this.level.segments;
      const r = this.radius;
      const ox = this.orbX;
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        if (!s.active) continue;
        let event = this.level.resolve(s, this.orbY, r, this.orbState.charge, ox);
        let byEcho = false;
        // Mirror Pulse: the echo is checked on its own against the paired obstacles of the zone.
        if (!event && this.echoOn) {
          event = this.level.resolveEcho(s, this.orbY, r, this.orbState.charge, this.echoX);
          byEcho = !!event;
        }
        if (!event) continue;

        if (event === 'crash') {
          this.crash(s, byEcho);
          return;
        }
        // Scoring rules live in Pulse.Scoring (level.js); the campaign ignores score and multiplier
        // but uses the same combo for the melody.
        const prevCombo = this.scoring.combo;
        const fb = Pulse.Scoring.apply(this.scoring, event, s);
        if (!campaign) {
          this.score = this.scoring.score;
          this.multiplier = this.scoring.multiplier;
        }
        this.combo = this.scoring.combo;
        if (event === 'collect') {
          this.ringT = 0;
          const bonus = s.variant === 'bonus';
          this.contact(bonus ? 'bonus' : 'pickup', s, prevCombo);
          if (s.route && s.role === 'risk') this.routeState(s.route).notes++;
          if (this.view) this.view.collect(s);
          const color = bonus ? T.textBonus : T.textAccent;
          if (campaign) {
            if (bonus) this.bonus++;
            else this.energy++;
            this.popup(bonus ? 'Bonus!' : '+1', color);
          } else if (fb.reachedMax) {
            this.popup(`MAX ×${this.multiplier}`, color);
            this.milestone();
          } else {
            this.popup(`x${this.multiplier}`, color);
          }
          if (fb.gained) this.bumpMultiplier();
          this.reward(bonus ? 4.5 : 3.2);
          if (fb.gained && !fb.reachedMax) this.sfx('multUp', C.groove.eventDelay);
          this.updateHud();
        } else if (event === 'miss') {
          // Skipping gold resets the Endless multiplier and breaks the streak; skipping a mint bonus
          // does neither, so declining a risky bonus is always a safe choice.
          Pulse.Overdrive.miss(this.od, s.variant === 'bonus');
          if (s.variant !== 'bonus') this.streakLost(fb);
          if (fb.reset) {
            this.popup('x1', T.textDim);
            Pulse.Sfx.play('multiplierLost');
            this.updateHud();
          }
        } else {
          // 'pass' (wall cleared) or 'break' (barrier smashed): both count as an obstacle.
          if (!campaign) this.updateHud();
          // Every 8 obstacles in a row, a short rising cadence on the next beat.
          if (++this.cleared % 8 === 0) {
            Pulse.Sfx.play('comboCadence', { delay: Pulse.Rhythm.Groove.delay(this.clock, this.aligned(), 0.25, 1) });
          }
          if (fb.streak) {
            this.popup(`×${C.multiplierMax} streak ${fb.streak}`, T.textAccent);
            Pulse.Sfx.play('streak');
          }
          if (event === 'break') {
            this.contact(s.charged ? 'chargedBreak' : 'break', s, prevCombo);
            this.sfx(s.charged ? 'chargedSmash' : 'smash', C.groove.eventDelay);
            this.reward(s.charged ? 7 : 4.5);
            if (s.charged) {
              Pulse.Music.pulseDuck();
              this.cameras.main.shake(110, 0.004); // a small punch: only the big hit gets one
            }
            if (this.view) this.view.smash(s);
          } else {
            this.contact('pass', s, prevCombo);
            this.checkNearMiss(s, r);
            if (s.fork && s.route) this.routePassed(s);
          }
        }
      }

      // A sonar ping two beats before a moving gap reaches the orb, so it can be heard coming.
      const beat = Pulse.Rhythm.position(this.clock).beat;
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        if (s.active && (s.slide || s.ring) && !s.pinged && s.arriveBeat - beat <= 2) {
          s.pinged = true;
          if (s.arriveBeat - beat > 0) this.sfx('telegraphPing', C.groove.eventDelay);
        }
        // A ring whooshes as the orb meets its front arc, on the beat the stage was built for.
        if (s.active && s.ring && !s.whooshed && this.level.time >= s.ring.tf) {
          s.whooshed = true;
          Pulse.Sfx.play('rotorWhoosh');
        }
      }

      if (campaign && this.level.finishY() >= this.orbY) this.completeStage();
    }

    // Seconds in a 16th note at the current tempo (the spacing of the arpeggio layers).
    stepSeconds() {
      return Pulse.Rhythm.beatSeconds(this.clock.bpm || 125) / 4;
    }

    // A successful contact: charge the Overdrive meter, answer with the melody (the lead note plays
    // at once), and mark combo milestones 4 / 8 / 16 with an extra musical phrase and a ring.
    // Nothing here touches the rules: collision, score and stars were already resolved.
    contact(kind, seg, prevCombo) {
      const OD = Pulse.Overdrive;
      const combo = this.scoring.combo;
      const r = OD.charge(this.od, kind, { quality: seg.quality, combo });
      this.hitFeedback(kind, seg);
      const m = OD.milestone(prevCombo, combo);
      if (m) this.comboMilestone(m);
      if (r.started) this.overdriveStarted();
    }

    comboMilestone(m) {
      const wait = this.aligned() ? Pulse.Rhythm.Groove.delay(this.clock, true, 0.08) : 0;
      Pulse.Sfx.notes(Pulse.Melody.milestone(this.worldIndex(), m, { step: this.stepSeconds() }), wait);
      if (this.view && this.view.comboMilestone) this.view.comboMilestone(m);
      const K = C.combo;
      const label = m === K.flourish ? 'FLOURISH!' : m === K.layerB ? 'ENERGY!' : 'LAYER';
      this.quality(label, m === K.flourish ? T.textBonus : T.textAccent);
    }

    routeState(id) {
      return this.routes[id] || (this.routes[id] = { notes: 0, side: null, done: false });
    }

    // A fork row was cleared. The first row commits the player to a side (a small cue when that is the
    // risky one); the last row decides the route: every risk note taken = ROUTE CLEAR. Feedback and one
    // bounded Overdrive award only; rules, score and stars were resolved before this runs.
    routePassed(seg) {
      const st = this.routeState(seg.route);
      const risky = seg.side === seg.risk;
      if (seg.firstRow) {
        st.side = seg.side;
        if (risky) this.quality('RISK ROUTE', '#FF5AC8');
        else this.quality('SAFE ROUTE', '#35C8FF');
      }
      if (seg.routeEnd && !st.done) {
        st.done = true;
        const info = this.level.track && this.level.track.routes && this.level.track.routes[seg.route];
        const total = info ? info.riskNotes : 0;
        if (risky && total > 0 && st.notes >= total) this.routeClear(seg);
      }
    }

    // A risk route taken in full: a short rising phrase of the world's scale (accompaniment, never
    // delaying a lead note), a ring round the orb, and a one-off Overdrive award.
    routeClear(seg) {
      const wait = this.aligned() ? Pulse.Rhythm.Groove.delay(this.clock, true, 0.08) : 0;
      Pulse.Sfx.notes(Pulse.Melody.routeClear(this.worldIndex(), { step: this.stepSeconds() }), wait);
      if (this.view && this.view.comboMilestone) this.view.comboMilestone(C.combo.layerB);
      this.quality('ROUTE CLEAR!', '#FF5AC8');
      this.popup('ROUTE CLEAR', T.textBonus);
      const r = Pulse.Overdrive.award(this.od, C.overdrive.routeBonus);
      if (r.started) this.overdriveStarted();
      this.routeClears = (this.routeClears || 0) + 1;
    }

    // ---- Mirror Pulse (docs/MIRROR.md) ----
    resetMirror() {
      this.mirror = null; // { zone, phase, k, tele } while an event is on
      this.echoOn = false; // the echo exists and can be hit
      this.echoK = 0;
      this.echoX = this.orbX;
      this.mirrorSeen = {};
    }

    // Derives the event from the distance travelled (so pause, retry and frame rate cannot desync it) and
    // plays its cues once each: the telegraph, the echo appearing, the echo dissolving. Feedback only.
    updateMirror() {
      const track = this.level.track;
      if (!track || !track.mirrors || !track.mirrors.length) return;
      const m = Pulse.Mirror.current(track.mirrors, this.level.travelled);
      this.mirror = m;
      this.echoK = m ? m.k : 0;
      this.echoOn = !!m && m.k > 0;
      this.echoX = m ? Pulse.Mirror.echoX(this.orbX, m.k, this.W) : this.orbX;
      if (!m) return;
      const seen = this.mirrorSeen[m.zone.id] || (this.mirrorSeen[m.zone.id] = {});
      const w = this.worldIndex();
      const wait = this.aligned() ? Pulse.Rhythm.Groove.delay(this.clock, true, 0.08) : 0;
      if (m.phase === 'telegraph' && !seen.tele) {
        seen.tele = true;
        Pulse.Sfx.notes(Pulse.Melody.mirrorTelegraph(w, { step: this.stepSeconds() }), wait);
      }
      if ((m.phase === 'intro' || m.phase === 'active') && !seen.intro) {
        seen.intro = true;
        Pulse.Sfx.notes(Pulse.Melody.mirrorStart(w, { step: this.stepSeconds() }), wait);
        if (this.view && this.view.mirrorBurst) this.view.mirrorBurst();
      }
      if (m.phase === 'outro' && !seen.outro) {
        seen.outro = true;
        this.mirrorClears++;
        Pulse.Sfx.notes(Pulse.Melody.mirrorEnd(w, { step: this.stepSeconds() }), wait);
        this.quality('IN SYNC', '#B98BFF');
      }
    }

    overdriveStarted() {
      const wait = this.aligned() ? Pulse.Rhythm.Groove.delay(this.clock, true, 0.08) : 0;
      Pulse.Sfx.notes(Pulse.Melody.overdriveStart(this.worldIndex()), wait);
      if (this.view && this.view.overdriveBurst) this.view.overdriveBurst();
      this.popup('OVERDRIVE!', T.textBonus);
    }

    overdriveEnded() {
      Pulse.Sfx.notes(Pulse.Melody.overdriveEnd(this.worldIndex()), 0);
    }

    // The Overdrive bar: fills as you play, turns gold and drains while active, blinks in the last
    // moments. Time-based (this.time.now), so it looks the same at any frame rate.
    drawOverdrive() {
      const g = this.odBar;
      g.clear();
      const od = this.od;
      const show = this.state === 'playing' || this.state === 'paused';
      if (!show) {
        this.odLabel.setAlpha(0);
        return;
      }
      const x = 100, y = 48, w = 250, h = 8;
      const f = Pulse.Overdrive.fraction(od);
      // The shown fill chases the real one a little, so a gain slides in instead of jumping.
      const dtms = Math.min(50, Math.max(0, this.time.now - (this.odLast || this.time.now)));
      this.odLast = this.time.now;
      this.odShown += (f - this.odShown) * (1 - Math.exp(-dtms / 1000 * (f < this.odShown ? 30 : 14)));
      if (Math.abs(f - this.odShown) < 0.002) this.odShown = f;
      const blink = Pulse.Overdrive.warning(od) ? (Math.sin(this.time.now / 1000 * 18) > 0 ? 1 : 0.45) : 1;
      g.fillStyle(0x07101f, 0.75).fillRoundedRect(x - 2, y - 2, w + 4, h + 4, 5);
      const col = od.active ? 0xffd35a : (f > 0.85 ? 0x9ff3ff : 0x35c8ff);
      if (this.odShown > 0.003) {
        g.fillStyle(col, 0.9 * blink).fillRoundedRect(x, y, Math.max(h, w * this.odShown), h, 4);
        g.fillStyle(0xffffff, 0.45 * blink).fillRect(x + 3, y + 1, Math.max(0, w * this.odShown - 6), 2);
      }
      g.lineStyle(1.5, od.active ? 0xffd35a : 0x1e6bff, od.active ? 0.9 : 0.6).strokeRoundedRect(x - 2, y - 2, w + 4, h + 4, 5);
      if (od.active) {
        this.odLabel.setText(`OVERDRIVE ${od.remaining.toFixed(1)}`).setAlpha(blink);
      } else {
        this.odLabel.setAlpha(0);
      }
    }

    // The musical answer to a contact, played the instant it happens: the next note of the world's
    // melody (Pulse.Melody) in a voice that fits the action, plus streak layers. Layers (accompaniment)
    // may wait for the next 16th note; the lead note never does.
    hitFeedback(kind, seg) {
      const combo = this.scoring.combo;
      const specs = Pulse.Melody.hit(this.worldIndex(), kind, { combo, quality: seg.quality, overdrive: this.od.active, step: this.stepSeconds() });
      const wait = this.aligned() ? Pulse.Rhythm.Groove.delay(this.clock, true, 0.08) : 0;
      Pulse.Sfx.notes(specs, wait);
      this.lastHit = { kind, combo, quality: seg.quality, t: this.elapsed };
      if (seg.quality === 'perfect' && kind !== 'break' && kind !== 'chargedBreak') this.quality('PERFECT', T.textAccent);
      this.showCombo(combo);
    }

    streakLost(fb) {
      const before = this.scoring.combo; // already reset by Scoring.apply: use the last shown value
      const had = this.shownCombo || before;
      this.combo = 0;
      this.showCombo(0);
      const specs = Pulse.Melody.lost(this.worldIndex(), had);
      if (specs.length) Pulse.Sfx.notes(specs, 0);
    }

    // The combo readout: shown from 3 in a row, pops on every hit, gone when it breaks.
    showCombo(n) {
      this.shownCombo = n;
      this.tweens.killTweensOf(this.comboText);
      if (n < 3) {
        this.comboText.setAlpha(0);
        return;
      }
      const K = C.combo;
      const big = n >= K.flourish ? 1.55 : n >= K.layerB ? 1.4 : 1.25;
      this.comboText.setText(`${n} IN A ROW`).setAlpha(1).setScale(big)
        .setColor(n >= K.flourish ? T.textBonus : T.textAccent).setFontSize(n >= K.flourish ? 24 : n >= K.layerB ? 22 : 20);
      this.tweens.add({ targets: this.comboText, scale: 1, duration: 160, ease: 'Back.easeOut' });
    }

    // A short callout beside the orb ("PERFECT"); feedback only.
    quality(str, color) {
      this.tweens.killTweensOf(this.qualityText);
      this.qualityText.setText(str).setColor(color).setAlpha(1)
        .setPosition(Math.max(70, Math.min(this.SW - 70, this.orbX)), this.orbY + C.orb.radius + 26);
      this.tweens.add({ targets: this.qualityText, y: this.qualityText.y + 22, alpha: 0, duration: 420, ease: 'Quad.easeOut' });
    }

    // Why a crash happened, in player terms. The rules make every cause unambiguous: a gap wall
    // means the orb was too big; a barrier means it was too small, or (charged barrier) the
    // charge ring wasn't full yet.
    static crashReason(seg, radius, charge, byEcho) {
      if (!seg) return null;
      if (byEcho) return seg.kind === 'barrier' ? 'Your echo hit a barrier.' : 'Your echo hit a wall: find a gap for both orbs.';
      if (seg.kind !== 'barrier') return 'Hit a wall: shrink a little sooner.';
      if (!Pulse.isCharged(radius)) return 'Too small for the barrier: let go earlier.';
      if (seg.charged && charge < 1) return 'Charge ring not full: double-edged barriers need you big for longer.';
      return null;
    }

    // `seg` is what the orb hit, so the effect can show why (e.g. a charged barrier too early).
    crash(seg, byEcho) {
      if (this.mode === 'endless' && this.score > this.best) {
        this.best = this.score;
        this.save.endless.best = this.best;
        Pulse.Save.write(this.save);
      }
      this.crashedOn = seg ? (seg.kind === 'barrier' ? (seg.charged ? 'charged barrier' : 'barrier') : 'gap') : null;
      this.crashReason = GameScene.crashReason(seg, this.radius, this.orbState.charge, byEcho);
      this.crashedByEcho = !!byEcho;
      this.resetMirror();
      if (this.test && this.test.onCrash) this.test.onCrash(this.elapsed, this.score);
      this.endHold();
      Pulse.Overdrive.crash(this.od);
      this.showCombo(0);
      Pulse.Sfx.notes(Pulse.Melody.fail(this.worldIndex()), 0);
      Pulse.Sfx.play(seg && seg.kind === 'barrier' && seg.charged ? 'chargedFail' : 'crash');
      Pulse.Music.stop(150);
      Pulse.Sfx.play('gameOver');
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
      this.endHold();
      this.resetMirror();
      this.od.active = false; // the meter is cleared; the glow eases out over the results screen
      this.od.meter = 0;
      Pulse.Music.stop(200);
      Pulse.Sfx.play('finish');
      Pulse.Sfx.play('stageClear');
      if (this.view) this.view.stageClear();
      this.setState('complete');
    }

    // Stage clear: panel sound, then each earned star pops in with a chime, then the unlock chime.
    revealStars(r) {
      Pulse.Sfx.play('clearPanel');
      const stars = this.overlayImages.slice(0, 3);
      stars.forEach((img) => img.setScale(0));
      const base = 24 * 2.2 / 64;
      stars.forEach((img, i) => {
        this.time.delayedCall(350 + i * 260, () => {
          if (this.state !== 'complete') return;
          this.tweens.add({ targets: img, scale: base, duration: 220, ease: 'Back.easeOut' });
          if (i < r.stars) Pulse.Sfx.play('star');
        });
      });
      if (!stars.length) for (let i = 0; i < r.stars; i++) this.time.delayedCall(350 + i * 260, () => Pulse.Sfx.play('star'));
      if (r.record.unlockedNext) this.time.delayedCall(350 + 3 * 260 + 150, () => Pulse.Sfx.play('unlocked'));
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
      this.reward(8);
      Pulse.Sfx.play('maxMultSfx');
      Pulse.Music.pulseDuck();
      if (this.view) this.view.milestone();
      else this.ringT = 0;
    }

    // Cosmetic only: flashes a graze arc when the orb squeezed past a wall edge with little room.
    // It reads state after scoring is done and never touches score, stars or the multiplier.
    checkNearMiss(s, r) {
      const o = Pulse.Track.openingAt(s, this.orbX, this.W);
      const left = this.orbX - r - o.gapL;
      const right = o.gapR - this.orbX - r;
      if (Math.min(left, right) > C.nearMissMargin) return;
      this.nearMisses++;
      Pulse.Sfx.play('nearMiss');
      if (this.view) this.view.nearMiss(left <= right ? -1 : 1, r);
    }

    // Popups rise above the orb.
    popup(str, color) {
      this.tweens.killTweensOf(this.popupText);
      this.popupText.setText(str).setColor(color).setAlpha(1).setPosition(Math.max(50, Math.min(this.SW - 50, this.orbX)), this.orbY - C.orb.radius - 30);
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

      // Mirror Pulse: the centreline sits behind everything; the echo is drawn after the hazards.
      const mir = active ? this.mirror : null;
      if (mir) {
        const strength = mir.phase === 'telegraph' ? 0.35 + 0.65 * mir.tele : mir.phase === 'outro' ? mir.k : 1;
        Pulse.Render.mirrorAxis(g, this.W, this.H, strength, this.scroll);
      }

      if (this.view) {
        this.view.render(this.level, this.scroll, dimmed, g, canSmash);
      } else {
        Pulse.Render.background(g, this.W, this.H, this.scroll);
        const segs = this.level.segments;
        for (let i = 0; i < segs.length; i++) {
          const s = segs[i];
          if (!s.active || s.y > this.H || s.y + s.h < -40) continue;
          if (s.kind === 'pickup') Pulse.Render.pickup(g, s);
          else if (s.kind === 'barrier') Pulse.Render.barrier(g, s, this.W, canSmash(s));
          else if (s.fork) Pulse.Render.forkGate(g, s, this.W);
          else if (s.ring) Pulse.Render.ring(g, s, this.level.time);
          else Pulse.Render.walls(g, s, this.W);
        }
      }

      if (mir && this.echoK > 0) Pulse.Render.echo(g, this.echoX, this.orbY, this.radius, this.echoK, this.orbX, 60 + 0.2 * (this.speedNow || 200));

      this.drawOverdrive();

      // The charge ring only appears while a charged barrier is on screen.
      this.chargeRingShown = active &&
        this.level.segments.some((s) => s.active && s.charged && !s.broken && s.y < this.orbY && s.y + s.h > 0);
      if (this.view) this.view.renderChargeRing(this.chargeRingShown, this.orbState.charge, this.radius);
      else if (this.chargeRingShown) Pulse.Render.chargeRing(g, this.orbX, this.orbY, this.radius, this.orbState.charge);
      if (this.state === 'playing') this.chargeSounds();

      const warn = active && this.chargedComing();
      if (warn && !this.warnShown && this.state === 'playing') this.sfx('approachCue', C.groove.eventDelay); // a charged barrier is coming
      this.warnShown = warn;
      if (this.warnIcon) this.warnIcon.setVisible(this.warnShown);

      if (this.mode === 'campaign') {
        const fy = this.level.finishY();
        const finishVisible = fy > -C.campaign.finishThickness && fy < this.H;
        if (this.view) this.view.renderFinish(fy, finishVisible);
        else if (finishVisible) Pulse.Render.finishLine(g, fy, this.W);
        if (active) Pulse.Render.progressBar(this.hud, 100, 30, 250, this.level.progress(this.orbY));
      }

      if (this.view) {
        this.view.renderOrb(this.radius, this.state === 'over', this.orbFx);
      } else {
        Pulse.Render.orb(g, this.orbX, this.orbY, this.radius, this.state === 'over', this.skin, this.orbFx);
        if (this.ringT < 1) Pulse.Render.collectRing(g, this.orbX, this.orbY, this.ringT);
      }
    }

    // Test-only autopilot (Pulse.autopilot in level.js, shared with the logic tests).
    botWantsHold() {
      if (this.state !== 'playing') return false;
      return Pulse.autopilot(this.level, this.orbY, this.level.speedAt(this.elapsed), this.test.look, this.test.route);
    }
  }

  Pulse.GameScene = GameScene;
})();
