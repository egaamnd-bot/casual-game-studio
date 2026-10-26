// Draws gameplay with Gemini's v3.0 sprites (portrait). It only reads game state (segments,
// orb radius and charge) and never changes it, so collision, scoring and timing are identical
// to the shape renderer.
//
// Track space and screen space are the same in portrait (GameScene.create): x across the lane,
// y down the screen, obstacles falling toward the orb. Walls and barriers are bands across the
// lane. The backdrop is procedural (a deep navy field, a faint grid and neon lane rails moving
// down with the run), so it works at any screen height; Gemini's wall/barrier/pickup art is reused.
// All art is scaled to the existing gameplay sizes using the measurements in Pulse.ART.
(function () {
  const C = Pulse.CONFIG;
  const T = Pulse.THEME;
  const A = Pulse.ART;
  const ART_W = 64 * A.base; // wall pieces are 64x96 in the atlas
  const ART_H = 96 * A.base;
  const CAP_REACH = A.capReach * A.base; // visible width of a cap toward the gap
  // Barrier tiles: plain 64x64 with its 44 px band starting 10 px down; charged 64x84 with a
  // 60 px band starting 12 px down. At half scale the bands are exactly 22 and 30 px, the
  // collision thicknesses in config.js.
  const BARRIER_ART = {
    plain: { h: 64 * A.base, top: 10 * A.base, ready: 'barrier_smash_ready_tile', danger: 'barrier_smash_danger_tile' },
    charged: { h: 84 * A.base, top: 12 * A.base, ready: 'barrier_charged_ready_tile', danger: 'barrier_charged_danger_tile' },
  };
  // Finish tile: 64x48 with a 36 px band starting 6 px down, scaled so the band is 24 px.
  const FINISH_SCALE = C.campaign.finishThickness / 36;
  // Charge ring art (168x168) is drawn at the orb body's scale, so it hugs the orb at any size.
  const RING_FRAMES = ['charge_ring_state_b_step_01', 'charge_ring_state_b_step_02',
    'charge_ring_state_b_step_03', 'charge_ring_state_b_step_04'];

  class SpriteView {
    constructor(scene, visual, skin, layer) {
      this.scene = scene;
      this.layer = layer;
      this.visual = visual;
      this.free = { gate: [], pickup: [], barrier: [], tunnel: [] };
      this.dimmed = false;
      const SW = scene.SW;
      const SH = scene.SH;

      // ---- Procedural portrait backdrop (below the gameplay layer) ----
      this.makeBackdropTextures();
      this.bg = scene.add.rectangle(0, 0, SW, SH, T.background).setOrigin(0).setDepth(0);
      // World backdrop (Gemini, 540x960, repeats every 192 px so it tiles without a seam): the arc's look.
      const bdKey = scene.mode === 'campaign' ? Pulse.Assets.worldBackdrop(scene.stageIndex) : null;
      this.worldBg = bdKey && scene.textures.exists(bdKey) ? scene.add.tileSprite(0, 0, SW, SH, bdKey).setOrigin(0).setDepth(0.3) : null;
      this.worldBgKey = this.worldBg ? bdKey : null;
      this.grid = scene.add.tileSprite(0, 0, SW, SH, 'pulse_grid').setOrigin(0).setDepth(0.5).setAlpha(C.comet.backdropAlpha + 0.1);
      this.streaks = scene.add.tileSprite(0, 0, SW, SH, 'pulse_streaks').setOrigin(0).setDepth(0.6).setAlpha(0.5);

      // ---- Gameplay layer (track space) ----
      const x = scene.orbX;
      const y = scene.orbY;
      this.ring = this.add(scene.add.image(x, y, 'pulse_gameplay', 'player_orb_ring'), 5);
      this.body = this.add(scene.add.image(x, y, 'pulse_gameplay', 'player_orb_normal'), 5);
      this.core = this.add(scene.add.image(x, y, 'pulse_gameplay', 'player_orb_shrunk'), 5);
      this.arcs = this.add(scene.add.sprite(x, y, 'pulse_gameplay', 'player_tension_arcs_01'), 5);
      this.chargeRing = this.add(scene.add.image(x, y, 'pulse_gameplay', 'charge_ring_state_a_empty').setVisible(false), 5.2);
      this.chargeBurst = this.add(scene.add.image(x, y, 'pulse_gameplay', 'fx_charge_complete_burst')
        .setBlendMode('ADD').setVisible(false), 6);
      this.wasFull = true;

      const sparks = (tint) => this.add(scene.add.particles(0, 0, 'pulse_gameplay', {
        frame: 'fx_spark_diamond', speed: { min: 90, max: 240 }, lifespan: 380,
        scale: { start: 0.7, end: 0 }, alpha: { start: 1, end: 0 }, tint, blendMode: 'ADD', emitting: false,
      }), 6);
      this.sparksGold = sparks(T.pickup);
      this.sparksMint = sparks(T.bonus);
      this.sparksCyan = sparks(T.orb);
      this.shards = this.add(scene.add.particles(0, 0, 'pulse_gameplay', {
        frame: ['fx_shatter_shard_01', 'fx_shatter_shard_02', 'fx_shatter_shard_03'],
        speed: { min: 140, max: 340 }, lifespan: 650, rotate: { min: 0, max: 360 },
        scale: { start: 0.7, end: 0.2 }, alpha: { start: 1, end: 0 }, emitting: false,
      }), 6);
      const fx = (frame, blend) => {
        const img = this.add(scene.add.image(x, y, 'pulse_gameplay', frame).setVisible(false), 6);
        if (blend) img.setBlendMode('ADD');
        return img;
      };
      this.shockwave = fx('fx_shockwave_ring');
      this.smashBurst = fx('fx_smash_ordinary_burst', true);
      this.smashNova = fx('fx_smash_charged_nova', true);
      this.failDeflect = fx('fx_fail_charged_deflect');
      this.starburst = fx('fx_mult_x5_starburst', true);
      this.collectFx = [0, 1, 2, 3].map(() => fx('fx_collect_gold_burst', true));
      this.collectNext = 0;
      this.arcFx = [-1, 1].map((side) => fx('fx_near_miss_arc', true).setFlipX(side < 0));

      // ---- Screen space above the HUD layer ----
      this.chevron = scene.add.image(scene.orbSX, scene.orbSY, 'pulse_gameplay', 'fx_mult_up_chevron')
        .setScale(A.base).setDepth(10).setVisible(false);

      this.comet = !!C.comet.enabled;
      this.setSkin(skin);
      if (this.comet) this.initComet();
    }

    // ---- Trailer look: a round glowing sphere with a comet tail ----
    // Procedural textures (no new art files): a soft glow, a crisp disc drawn at exactly the
    // collision radius, a tapering tail, a ring for beat echoes and a small spark. Everything is
    // white and tinted per skin. The disc is the collision circle; glow and tail only add to it.
    makeCometTextures() {
      const tex = this.scene.textures;
      const make = (key, w, h, draw) => {
        if (tex.exists(key)) return;
        const t = tex.createCanvas(key, w, h);
        draw(t.getContext(), w, h);
        t.refresh();
      };
      make('comet_glow', 256, 256, (g, w, h) => {
        const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        r.addColorStop(0, 'rgba(255,255,255,0.95)');
        r.addColorStop(0.22, 'rgba(255,255,255,0.45)');
        r.addColorStop(0.5, 'rgba(255,255,255,0.16)');
        r.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = r;
        g.fillRect(0, 0, w, h);
      });
      make('comet_body', 128, 128, (g, w, h) => {
        const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        r.addColorStop(0, 'rgba(255,255,255,1)');
        r.addColorStop(0.78, 'rgba(255,255,255,1)');
        r.addColorStop(0.9, 'rgba(255,255,255,0.9)');
        r.addColorStop(1, 'rgba(255,255,255,0.9)');
        g.fillStyle = r;
        g.beginPath();
        g.arc(w / 2, h / 2, w / 2 - 0.5, 0, Math.PI * 2);
        g.fill(); // the disc's edge is the collision radius
      });
      make('comet_tail', 64, 256, (g, w, h) => {
        for (let y = 0; y < h; y++) {
          const u = y / h;
          const half = (w / 2) * Math.pow(1 - u, 0.85);
          g.fillStyle = `rgba(255,255,255,${(0.85 * Math.pow(1 - u, 1.7)).toFixed(3)})`;
          g.fillRect(w / 2 - half, y, half * 2, 1);
        }
      });
      make('comet_ring', 128, 128, (g, w, h) => {
        g.strokeStyle = 'rgba(255,255,255,1)';
        g.lineWidth = 3;
        g.beginPath();
        g.arc(w / 2, h / 2, w / 2 - 3, 0, Math.PI * 2);
        g.stroke();
      });
      // Fallback for the ribbon stamp (used only if the comet atlas is missing): a soft lens, bright in the
      // middle, fading along its length (cosine bell) and across (gaussian), white and tinted per use.
      make('comet_ribbon_fb', 64, 64, (g, w, h) => {
        const img = g.createImageData(w, h);
        for (let y = 0; y < h; y++) {
          const along = Math.pow(Math.cos(((y + 0.5) / h - 0.5) * Math.PI), 1.3);
          for (let x = 0; x < w; x++) {
            const dx = ((x + 0.5) / w - 0.5) * 2;
            const a = Math.max(0, along) * Math.exp(-dx * dx * 3.2);
            const i = (y * w + x) * 4;
            img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
            img.data[i + 3] = Math.round(255 * a);
          }
        }
        g.putImageData(img, 0, 0);
      });
      make('comet_dot', 32, 32, (g, w, h) => {
        const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        r.addColorStop(0, 'rgba(255,255,255,1)');
        r.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = r;
        g.fillRect(0, 0, w, h);
      });
    }

    initComet() {
      const sc = this.scene;
      this.makeCometTextures();
      const x = sc.orbX;
      const y = sc.orbY;
      for (const img of [this.ring, this.body, this.core, this.arcs]) img.setVisible(false);
      // Gemini's comet kit (atlas `pulse_comet_vfx`) when it loaded in full, else the procedural fallbacks.
      const vfx = this.vfx = Pulse.Assets.vfxReady(sc);
      const tx = (frame, fb) => (vfx ? ['pulse_comet_vfx', frame] : [fb]);
      this.tx = tx;
      const R = C.comet.ribbon;
      // Ribbon: pooled overlapping stamps laid along the orb's recent path (src/js/trail.js).
      this.trail = Pulse.Trail.create();
      this.rib = Pulse.Trail.makeOut(R.stamps);
      this.ribbon = [];
      for (let i = 0; i < R.stamps; i++) this.ribbon.push(this.add(sc.add.image(x, y, ...tx('comet_ribbon_seg', 'comet_ribbon_fb')).setBlendMode('ADD').setVisible(false), 4.2));
      // Core filament: a narrower, white-hot ribbon over the first part of the same path.
      this.core2 = Pulse.Trail.makeOut(R.coreStamps);
      this.coreRibbon = [];
      for (let i = 0; i < R.coreStamps; i++) this.coreRibbon.push(this.add(sc.add.image(x, y, ...tx('comet_ribbon_seg', 'comet_ribbon_fb')).setBlendMode('ADD').setVisible(false), 4.25));
      // Head taper and fine streak: short, laid along the path's tangent at the orb, so they cannot read as a bar.
      this.cometTail = this.add(sc.add.image(x, y, ...tx('comet_taper_med', 'comet_tail')).setOrigin(0.5, 0).setBlendMode('ADD'), 4.3);
      this.cometStreak = this.add(sc.add.image(x, y, ...tx('comet_streak_fine', 'comet_tail')).setOrigin(0.5, 0).setBlendMode('ADD'), 4.35);
      this.tailFrame = 'comet_taper_med';
      this.cometGlow = this.add(sc.add.image(x, y, ...tx('comet_halo_bloom', 'comet_glow')).setBlendMode('ADD'), 4.6);
      this.odCorona = vfx ? this.add(sc.add.image(x, y, 'pulse_comet_vfx', 'comet_overdrive_corona').setBlendMode('ADD').setVisible(false), 4.7) : null;
      this.cometBody = this.add(sc.add.image(x, y, ...tx('comet_core_disc', 'comet_body')), 5);
      this.cometCore = this.add(sc.add.image(x, y, ...tx('comet_core_disc', 'comet_body')), 5.05);
      this.cometEcho = this.add(sc.add.image(x, y, 'comet_ring').setBlendMode('ADD').setVisible(false), 4.8);
      this.cometRipple = this.add(sc.add.image(x, y, 'comet_ring').setBlendMode('ADD').setVisible(false), 4.9);
      this.cometRing = this.add(sc.add.graphics(), 5.2);
      // Barrier-ready corona: a thin ring just outside the orb while it could smash the barrier ahead (feedback only).
      this.readyRing = this.add(sc.add.image(x, y, 'comet_ring').setBlendMode('ADD').setVisible(false), 4.75);
      this.readyTarget = 0;
      this.readyK = 0;
      this.milestoneRings = [0, 1, 2].map(() => this.add(sc.add.image(x, y, 'comet_ring').setBlendMode('ADD').setVisible(false), 4.85));
      // Mirror Pulse echo: its own violet ribbon (history of the echo's actual positions) and orb sprite.
      // The shared Render.echo keeps the link line and halo; the tail and disc are drawn here.
      this.echoTrail = Pulse.Trail.create();
      this.echoRib = Pulse.Trail.makeOut(R.echoStamps);
      this.echoRibbon = [];
      for (let i = 0; i < R.echoStamps; i++) this.echoRibbon.push(this.add(sc.add.image(x, y, ...tx('mirror_echo_ribbon_seg', 'comet_ribbon_fb')).setBlendMode('ADD').setVisible(false), 4.15));
      this.echoOrb = vfx ? this.add(sc.add.image(x, y, 'pulse_comet_vfx', 'mirror_echo_orb_disc').setVisible(false), 4.95) : null;
      this.echoBurst = vfx ? this.add(sc.add.image(x, y, 'pulse_comet_vfx', 'mirror_echo_fold_burst').setBlendMode('ADD').setVisible(false), 4.96) : null;
      this.echoParts = { link: true, tail: false, halo: true, disc: !vfx };
      this.echoLive = false;
      // Pooled sparks behind the orb: a fixed ring buffer, so nothing is ever allocated in play.
      this.nodes = [];
      for (let i = 0; i < C.comet.nodes; i++) {
        const n = this.add(sc.add.image(x, y, ...tx('comet_spark_micro', 'comet_dot')).setBlendMode('ADD').setVisible(false), 4.5);
        n.age = 1e9;
        this.nodes.push(n);
      }
      this.nodeNext = 0;
      this.nodeClock = 0;
      this.lastRender = 0;
      // Neon-blue lane rails down both edges, as in the trailer (glow, body, bright core).
      const SW = sc.SW;
      const SH = sc.SH;
      const rails = this.rails = sc.add.graphics().setDepth(1.5);
      for (const [w, al] of [[12, 0.1], [5, 0.25], [2, 0.9]]) {
        rails.lineStyle(w, 0x1e6bff, al);
        rails.lineBetween(6, 0, 6, SH);
        rails.lineBetween(SW - 6, 0, SW - 6, SH);
      }
    }

    // Tileable textures for the backdrop: a faint grid with brighter cross ticks, and sparse speed streaks.
    makeBackdropTextures() {
      const tex = this.scene.textures;
      const make = (key, w, h, draw) => {
        if (tex.exists(key)) return;
        const t = tex.createCanvas(key, w, h);
        draw(t.getContext(), w, h);
        t.refresh();
      };
      make('pulse_grid', 90, 90, (g, w, h) => {
        g.strokeStyle = 'rgba(30,107,255,0.16)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(0.5, 0);
        g.lineTo(0.5, h);
        g.moveTo(0, 0.5);
        g.lineTo(w, 0.5);
        g.stroke();
        g.fillStyle = 'rgba(80,160,255,0.35)';
        g.fillRect(0, 0, 3, 3);
      });
      make('pulse_streaks', 270, 360, (g, w, h) => {
        // Deterministic pseudo-random streaks so the tile is identical every run.
        let seed = 7;
        const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        for (let i = 0; i < 16; i++) {
          const x = Math.floor(rnd() * w);
          const y = Math.floor(rnd() * h);
          const len = 16 + Math.floor(rnd() * 46);
          const grad = g.createLinearGradient(0, y, 0, y + len);
          grad.addColorStop(0, 'rgba(120,190,255,0)');
          grad.addColorStop(1, 'rgba(120,190,255,0.5)');
          g.fillStyle = grad;
          g.fillRect(x, y, 2, len);
        }
      });
    }

    // The orb colour moves from its normal to its shrunk tint as it gets small.
    cometColor(t, dead) {
      if (dead) return T.danger;
      const c = this.skin.colors;
      const mix = (a, b) => {
        const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
        const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
        return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
      };
      return mix(c.orb, c.shrunk);
    }

    // Linear mix of two 0xRRGGBB colours.
    mixColor(a, b, t) {
      if (t <= 0) return a;
      const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
      const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
      return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
    }

    // Combo milestone (4 / 8 / 16): rings round the orb, one more and bigger each time, and a few
    // sparks at 16. Round, quick and well away from the lane ahead.
    comboMilestone(m) {
      if (!this.milestoneRings) return; // sprite look (comet off) has no milestone rings
      const sc = this.scene;
      const K = C.combo;
      const rad = this.drawnRadius || C.orb.radius;
      const s = rad / 64;
      const rings = m >= K.flourish ? 3 : m >= K.layerB ? 2 : 1;
      for (let i = 0; i < rings; i++) {
        const img = this.milestoneRings[i];
        sc.tweens.killTweensOf(img);
        img.setVisible(true).setPosition(sc.orbX, sc.orbY).setTint(i === rings - 1 && m >= K.flourish ? 0xfff1b8 : this.cometColor(0, false)).setAlpha(0).setScale(s);
        sc.tweens.add({ targets: img, scale: s * (1.9 + 0.8 * i + (m >= K.flourish ? 0.5 : 0)), duration: 380 + 60 * i, delay: 70 * i, ease: 'Cubic.easeOut',
          onStart: () => img.setAlpha(0.6), onUpdate: (tw) => img.setAlpha(0.6 * (1 - tw.progress)), onComplete: () => img.setVisible(false) });
      }
      if (m >= K.flourish && this.sparksGold) this.sparksGold.explode(10, sc.orbX, sc.orbY);
    }

    // Overdrive starts: a big golden ring and a burst of sparks; the glow itself rises by the eased
    // `od.fx`, so there is no pop in brightness.
    overdriveBurst() {
      const sc = this.scene;
      const rad = this.drawnRadius || C.orb.radius;
      this.ringPulse(this.cometRipple, (rad / 64) * 0.9, (rad / 64) * 3.2, 460, 0.8);
      if (this.sparksGold) this.sparksGold.explode(14, sc.orbX, sc.orbY);
    }

    // The whole rail and backdrop breathe with the beat (quietly: it is a pulse, not a strobe).
    beatPulse(phase, calm) {
      if (!this.comet) return;
      const k = calm ? 0 : Pulse.Rhythm.pulse(phase, 3);
      const od = this.scene.od ? this.scene.od.fx : 0; // Overdrive: the lane glows a little brighter, never flashes
      this.rails.setAlpha(Math.min(1, 0.78 + 0.22 * k + 0.1 * od));
      this.grid.setAlpha(C.comet.backdropAlpha + 0.1 + 0.08 * k + 0.1 * od);
    }

    // Draws the comet from the collision radius (`radius`, authoritative) and the springy visual
    // model `f` (Pulse.Rhythm.OrbFx): the disc is f.radius, which is never below the collision
    // radius; the tail and glow follow it through springs so they trail and recover smoothly.
    // The tail is a ribbon along the orb's recent path (see trail.js), not a rotated bar.
    // Whether the orb could smash the barrier ahead right now (set by the scene from Level.canSmash).
    setSmashReady(on) {
      this.readyTarget = on ? 1 : 0;
    }

    renderComet(radius, dead, f) {
      const sc = this.scene;
      const Rh = Pulse.Rhythm;
      const Tr = Pulse.Trail;
      const x = sc.orbX;
      const y = sc.orbY;
      const now = sc.time.now;
      const paused = sc.state === 'paused'; // the whole effect freezes with the world (springs, sparks, tail)
      const dtms = paused ? 0 : Math.min(50, Math.max(0, now - (this.lastRender || now)));
      const dt = dtms / 1000;
      this.lastRender = now;
      const vr = Math.min(radius + Pulse.Rhythm.OrbFx.maxExtra, Math.max(radius, f.radius || radius)); // what is drawn: never smaller than what collides, at most a few px bigger
      this.drawnRadius = vr;
      const t = Math.min(1, Math.max(0, (C.orb.radius - radius) / (C.orb.radius - C.orb.minRadius)));
      const od = dead || !sc.od ? 0 : sc.od.fx; // Overdrive intensity 0..1 (cosmetic only: never touches the radius)
      const col = this.mixColor(this.cometColor(t, dead), 0xfff1b8, 0.55 * od);
      const speed = sc.speedNow || 200;
      const k = C.comet;
      // Barrier-ready level 0..1, eased with an exponential so it looks the same at any frame rate (frozen while paused).
      this.readyK += ((dead ? 0 : this.readyTarget) - this.readyK) * (1 - Math.exp(-dt * 14));
      if (Math.abs(this.readyK - (dead ? 0 : this.readyTarget)) < 0.003) this.readyK = dead ? 0 : this.readyTarget;
      const rk = this.readyK;
      // Tail: longer the faster you go, shorter while shrunk, stretched a little while shrinking
      // (streamlined) and eased in and out by a spring so it trails the orb instead of snapping.
      const target = (k.tailBase * vr + k.tailPerSpeed * speed * (0.4 + 0.6 * (vr / C.orb.radius))) * (1 + 0.22 * (f.shrink || 0));
      if (!this.tailLen) this.tailLen = Rh.createSpring(target);
      const len = Math.max(8, Rh.springStep(this.tailLen, target * (1 + 0.4 * od), dt, 4.5, 0.75));
      const vx = dead ? 0 : (sc.orbState.vx || 0);
      const show = !dead;

      // Path history. Ready: the world is still, the tail hangs straight. Playing / complete: record
      // the orb at the distance the world has moved. Paused: untouched, so the tail freezes with the world.
      const travelled = sc.level ? sc.level.travelled : 0;
      if (sc.state === 'ready') Tr.reset(this.trail, x, travelled);
      else if (sc.state === 'playing' || sc.state === 'complete') Tr.push(this.trail, x, travelled);

      // ---- Ribbon: overlapping stamps along the path, wide and bright at the orb, tapering to nothing ----
      const R = k.ribbon;
      const N = R.stamps;
      const rib = this.rib;
      const step = len / (N - 1);
      Tr.ribbon(this.trail, len, N, rib, step * R.overlap * 0.5);
      const w0 = 2 * vr * 0.92 * f.glow * (1 + 0.25 * od);
      const a0 = R.alpha * (0.8 + 0.2 * od) * (this.vfx ? 1 : 1.5);
      const tex = this.vfx ? 128 : 64; // the stamp texture's size
      for (let i = 0; i < N; i++) {
        const u = i / (N - 1);
        const st = this.ribbon[i];
        const fall = Math.pow(1 - u, 1.35);
        const h = rib.gap[i] * R.overlap;
        const w = this.fitAhead(w0 * (0.28 + 0.72 * Math.pow(1 - u, 0.8)), h, rib.rot[i], rib.s[i], vr);
        st.setVisible(show).setPosition(rib.x[i], y + rib.s[i]).setRotation(rib.rot[i]).setTint(col)
          .setAlpha(a0 * (0.35 + 0.65 * fall))
          .setScale(w / tex, h / tex);
      }

      // ---- Core filament: narrower and white-hot, along the first 60% of the same path ----
      const NC = R.coreStamps;
      const clen = len * 0.6;
      const cstep = clen / (NC - 1);
      Tr.ribbon(this.trail, clen, NC, this.core2, cstep * R.overlap * 0.5);
      const cw0 = 2 * vr * 0.34 * f.glow * (1 + 0.3 * od);
      for (let i = 0; i < NC; i++) {
        const u = i / (NC - 1);
        const h = this.core2.gap[i] * R.overlap;
        const w = this.fitAhead(cw0 * (0.3 + 0.7 * Math.pow(1 - u, 0.9)), h, this.core2.rot[i], this.core2.s[i], vr);
        this.coreRibbon[i].setVisible(show).setPosition(this.core2.x[i], y + this.core2.s[i]).setRotation(this.core2.rot[i]).setTint(this.skin.colors.core)
          .setAlpha((0.5 + 0.3 * od) * (0.4 + 0.6 * Math.pow(1 - u, 1.2)))
          .setScale(w / tex, h / tex);
      }

      // ---- Head taper and streak: short, along the path's tangent right behind the orb ----
      const lean = -Math.atan(Tr.slopeAt(this.trail, 14));
      const headLen = Math.min(len * 0.2, 56);
      if (this.vfx) { // taper frame by length, with hysteresis so it never flickers between two
        const lo = this.tailFrame === 'comet_taper_short' ? 150 : 130;
        const hi = this.tailFrame === 'comet_taper_long' ? 252 : 270;
        const want = len < lo ? 'comet_taper_short' : len > hi ? 'comet_taper_long' : 'comet_taper_med';
        if (want !== this.tailFrame) {
          this.tailFrame = want;
          this.cometTail.setFrame(want);
        }
      }
      const tailH = this.vfx ? ({ comet_taper_short: 160, comet_taper_med: 256, comet_taper_long: 384 })[this.tailFrame] : 256;
      const tailW = this.vfx ? ({ comet_taper_short: 64, comet_taper_med: 80, comet_taper_long: 96 })[this.tailFrame] : 64;
      this.cometTail.setVisible(show).setPosition(x, y).setTint(col).setAlpha(0.5 + 0.25 * od).setRotation(lean)
        .setScale((2 * vr * 0.5 * f.glow * (1 + 0.25 * od)) / (tailW * 0.9), headLen / tailH);
      this.cometStreak.setVisible(show).setPosition(x, y).setTint(this.skin.colors.core).setAlpha(0.7 + 0.3 * od).setRotation(lean)
        .setScale((2 * vr * (0.2 + 0.1 * od)) / (this.vfx ? 26 : 64), (headLen * 1.1) / (this.vfx ? 192 : 256));

      this.cometGlow.setVisible(true).setPosition(x, y).setTint(rk > 0 ? this.mixColor(col, 0xffffff, 0.35 * rk) : col).setAlpha(dead ? 0.5 : Math.min(1, 0.55 + 0.25 * (f.pop || 0) + 0.25 * od + 0.15 * rk))
        .setScale((vr * 2.7 * f.glow * (1 + 0.3 * od + 0.1 * rk)) / 256);
      this.readyRing.setVisible(rk > 0.01 && !dead).setPosition(x, y).setTint(this.mixColor(col, 0xffffff, 0.6))
        .setAlpha(0.55 * rk * (0.85 + 0.15 * Math.sin(now / 1000 * 9))).setScale((vr / 64) * 1.28);
      if (this.odCorona) {
        this.odCorona.setVisible(od > 0.02 && !dead).setPosition(x, y).setAlpha(0.8 * od).setRotation(now / 1000 * 0.9)
          .setScale((vr * 3.1) / 175);
      }
      // The disc is at least the collision radius across the lane; stretch only adds.
      const d = (2 * vr) / 128;
      this.cometBody.setPosition(x, y).setTint(col).setScale(d * f.across, d * f.along);
      this.cometCore.setPosition(x, y).setTint(0xffffff).setAlpha(dead ? 0 : 0.9 + 0.1 * rk).setScale(d * (0.46 + 0.14 * rk));

      // Sparks: shed off the curve more often the faster you go or turn, drifting back with the world,
      // spreading a little sideways and easing out as they fade.
      this.nodeClock += dtms;
      const turn = Math.min(1.5, Math.abs(vx) / 500);
      const interval = (k.nodeIntervalMs * Math.min(2, 260 / Math.max(120, speed))) / ((1 + 1.2 * od) * (1 + turn));
      if (show && sc.state === 'playing' && this.nodeClock >= interval) {
        this.nodeClock = 0;
        const n = this.nodes[this.nodeNext++ % this.nodes.length];
        const sOff = len * (0.08 + 0.3 * Math.random());
        n.age = 0;
        n.px = Tr.xAt(this.trail, sOff) + (Math.random() - 0.5) * vr * 0.7;
        n.py = y + sOff;
        n.vx = (Math.random() - 0.5) * 24 - vx * 0.18;
        n.sz = vr / 56;
        n.setTint(col);
      }
      for (const n of this.nodes) {
        if (sc.state === 'paused') break; // frozen with the world
        n.age += dtms;
        const life = n.age / 300;
        if (life >= 1) {
          n.setVisible(false);
          continue;
        }
        n.py += speed * (0.55 + 0.3 * life) * dt;
        n.px += n.vx * dt;
        n.vx *= Math.pow(0.05, dt); // drag
        const fade = 1 - life * life;
        n.setVisible(true).setPosition(n.px, n.py).setAlpha(0.7 * fade).setScale(n.sz * (this.vfx ? 0.9 : 1) * (0.95 - 0.8 * life));
      }
      if (!show) for (const n of this.nodes) n.setVisible(false);
    }

    // A tilted stamp's corner can reach above the orb's centre line (up the lane, where the player is looking
    // for gaps). Narrow it, if needed, so its highest point stays within the orb's own top edge.
    fitAhead(w, h, rot, s, vr) {
      const sin = Math.abs(Math.sin(rot));
      if (sin < 1e-3) return w;
      const room = 2 * (s + vr * 0.85) - h * Math.abs(Math.cos(rot));
      return Math.max(w * 0.2, Math.min(w, room / sin));
    }

    // Mirror Pulse echo trail. `on` is true while an echo exists (strength sc.echoK at sc.echoX). The
    // ribbon is the history of where the echo actually was, so it reflects the player's path exactly as
    // the collision does (echoX comes from Pulse.Mirror.echoX with the event's strength). When the echo
    // is gone its history is dropped and everything is hidden, so the next event starts clean.
    renderEcho(on, radius) {
      if (!this.comet || !this.echoRibbon) return;
      const sc = this.scene;
      const Tr = Pulse.Trail;
      const R = C.comet.ribbon;
      if (!on) {
        if (this.echoLive) this.hideEcho();
        return;
      }
      const k = sc.echoK;
      const ex = sc.echoX;
      const y = sc.orbY;
      const travelled = sc.level ? sc.level.travelled : 0;
      if (!this.echoLive) {
        this.echoLive = true;
        Tr.reset(this.echoTrail, ex, travelled);
      } else if (sc.state === 'playing' || sc.state === 'complete') Tr.push(this.echoTrail, ex, travelled);
      const N = R.echoStamps;
      const len = Math.max(24, (this.tailLen ? this.tailLen.x : 120) * R.echoLen);
      const step = len / (N - 1);
      const rib = this.echoRib;
      Tr.ribbon(this.echoTrail, len, N, rib, step * R.overlap * 0.5);
      const col = C.mirror.color;
      const w0 = 2 * radius * 0.85;
      const tex = this.vfx ? 128 : 64;
      for (let i = 0; i < N; i++) {
        const u = i / (N - 1);
        const h = rib.gap[i] * R.overlap;
        const w = this.fitAhead(w0 * (0.28 + 0.72 * Math.pow(1 - u, 0.8)), h, rib.rot[i], rib.s[i], radius);
        this.echoRibbon[i].setVisible(true).setPosition(rib.x[i], y + rib.s[i]).setRotation(rib.rot[i]).setTint(col)
          .setAlpha(R.echoAlpha * k * (0.35 + 0.65 * Math.pow(1 - u, 1.35)) * (this.vfx ? 1 : 1.5))
          .setScale(w / tex, h / tex);
      }
      if (this.echoOrb) {
        // The sprite's disc spans 105 of its 128 px: scaled so that disc is exactly the collision circle.
        this.echoOrb.setVisible(true).setPosition(ex, y).setAlpha(0.8 * k).setScale((2 * radius) / 105);
      }
    }

    hideEcho() {
      this.echoLive = false;
      for (const st of this.echoRibbon) st.setVisible(false);
      if (this.echoOrb) this.echoOrb.setVisible(false);
    }

    // The echo appears: a short, quiet fold burst where it forms (cosmetic).
    mirrorBurst() {
      if (!this.comet || !this.echoBurst) return;
      const sc = this.scene;
      this.pulse(this.echoBurst, 0.5, 1.5, 420, sc.echoX, sc.orbY, C.mirror.color);
    }

    // A new run starts: the trails forget the old path.
    resetTrails() {
      if (!this.comet || !this.trail) return;
      Pulse.Trail.reset(this.trail, this.scene.orbX, this.scene.level ? this.scene.level.travelled : 0);
      this.hideEcho();
      this.readyK = 0;
      this.readyTarget = 0;
      this.readyRing.setVisible(false);
      for (const n of this.nodes) { n.age = 1e9; n.setVisible(false); }
    }

    // Beat echo (every beat) and release ripple: round rings, cosmetic only.
    beatEcho(radius, big) {
      if (!this.comet) return;
      const s = radius / 64;
      this.ringPulse(this.cometEcho, s * 1.02, s * (big ? 1.7 : 1.45), 280, 0.55);
    }

    releaseRipple(radius) {
      if (!this.comet) return;
      const s = radius / 64;
      this.ringPulse(this.cometRipple, s * 0.9, s * 1.9, 240, 0.8);
    }

    ringPulse(img, from, to, ms, alpha) {
      if (!img) return; // comet-only ring objects do not exist in the sprite look
      const sc = this.scene;
      sc.tweens.killTweensOf(img);
      img.setVisible(true).setPosition(sc.orbX, sc.orbY).setTint(this.cometColor(0, false)).setAlpha(alpha).setScale(from);
      sc.tweens.add({ targets: img, scale: to, alpha: 0, duration: ms, ease: 'Cubic.easeOut' });
    }

    // Adds a gameplay object to the track-space layer, keeping draw order by depth.
    add(obj, depth) {
      obj.setDepth(depth);
      this.layer.add(obj);
      this.layer.sort('depth');
      return obj;
    }

    setSkin(skin) {
      this.skin = skin;
      const s = skin.sprite;
      this.ring.setTexture(s.atlas, `${s.prefix}ring`);
      this.body.setTexture(s.atlas, `${s.prefix}normal`);
      this.core.setTexture(s.atlas, `${s.prefix}shrunk`);
      if (s.arcPrefix) this.arcs.play(`anim_arcs_${skin.id}`);
      else this.arcs.stop();
    }

    // `scroll` is the scene's background scroll (half the distance travelled).
    // `canSmash(seg)` says whether hitting a barrier now would smash it.
    render(level, scroll, dimmed, wallGraphics, canSmash) {
      const travel = scroll * 2; // distance travelled; the backdrop moves up the screen's opposite way: down
      // Overdrive speeds up only the backdrop streaks (a look; the obstacles' speed is untouched).
      // The offset accumulates per frame, so the streaks never jump when the intensity changes.
      const od = this.scene.od ? this.scene.od.fx : 0;
      const dTravel = this.lastTravel === undefined ? 0 : travel - this.lastTravel;
      this.lastTravel = travel;
      this.streakPos = (this.streakPos || 0) + dTravel * 1.15 * (1 + 0.6 * od);
      if (dTravel < 0) this.streakPos = travel * 1.15; // a retry rewinds the track
      this.grid.tilePositionY = -travel * 0.55;
      if (this.worldBg) this.worldBg.tilePositionY = -travel * 0.3;
      this.streaks.tilePositionY = -this.streakPos;
      this.dimmed = dimmed;

      const H = this.scene.H;
      const segs = level.segments;
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        if (!s.active) {
          this.release(s);
          continue;
        }
        const onScreen = s.y < H && s.y + s.h > -60;
        if (s.kind === 'barrier') {
          this.placeBarrier(this.acquire(s, 'barrier'), s, onScreen && !s.broken, canSmash ? canSmash(s) : !dimmed);
        } else if (s.kind === 'gate' && s.fork) {
          this.release(s); // route fork: two openings, drawn from the same numbers the collision uses
          if (s.y + s.h < H && s.y + s.h + (s.firstRow ? C.route.preview : (s.laneSpan || 0)) > -60) Pulse.Render.forkGate(wallGraphics, s, this.scene.W);
        } else if (s.kind === 'gate' && s.ring) {
          this.release(s); // rotating ring: drawn from the same numbers the collision test uses
          if (onScreen) Pulse.Render.ring(wallGraphics, s, level.time);
        } else if (s.kind === 'gate' && s.h > C.gate.thickness) {
          // Tunnel (long hold): body drawn in the wall palette, edges and lane guide from the atlas.
          const v = this.acquire(s, 'tunnel');
          this.placeTunnel(v, s, onScreen);
          if (onScreen) Pulse.Render.tunnelBody(wallGraphics, s, this.scene.W);
        } else if (s.kind === 'gate' && this.comet) {
          this.release(s); // trailer look: gap walls are drawn, not sprites
          if (onScreen) Pulse.Render.cometGate(wallGraphics, s, this.scene.W, level.bpm ? (level.time * level.bpm) / 60 : 0, s.y + s.h < this.scene.orbY - 10);
        } else if (s.kind === 'gate') {
          this.placeGate(this.acquire(s, 'gate'), s, onScreen);
        } else {
          this.placePickup(this.acquire(s, 'pickup'), s, onScreen && !s.taken);
        }
      }
    }

    acquire(seg, kind) {
      if (seg._vis && seg._vis.kind === kind && seg._vis.owner === seg) return seg._vis;
      this.release(seg);
      const make = { gate: 'makeGate', pickup: 'makePickup', barrier: 'makeBarrier', tunnel: 'makeTunnel' }[kind];
      const v = this.free[kind].pop() || this[make]();
      v.owner = seg;
      seg._vis = v;
      return v;
    }

    release(seg) {
      const v = seg._vis;
      if (!v) return;
      v.show(false);
      v.owner = null;
      this.free[v.kind].push(v);
      seg._vis = null;
    }

    group(kind, parts, extra) {
      return Object.assign({ kind, parts, show: (on) => parts.forEach((p) => p.setVisible(on)) }, extra);
    }

    makeGate() {
      const sc = this.scene;
      const body = () => this.add(sc.add.tileSprite(0, 0, ART_W, ART_H, 'pulse_gameplay', 'wall_body_tile')
        .setOrigin(0).setTileScale(A.base), 2);
      const cap = (frame) => this.add(sc.add.image(0, 0, 'pulse_gameplay', frame).setOrigin(0).setScale(A.base), 2);
      return this.group('gate', [body(), cap('wall_cap_left'), cap('wall_cap_right'), body()]);
    }

    placeGate(v, s, visible) {
      v.show(visible);
      if (!visible) return;
      const [bodyL, capL, capR, bodyR] = v.parts;
      const y = s.y - A.wallBandTop * A.base; // the art's hazard band starts 12 px down
      capL.setPosition(s.gapL - CAP_REACH, y);
      capR.setPosition(s.gapR - (ART_W - CAP_REACH), y);
      const wl = Math.max(0, Math.ceil(s.gapL - CAP_REACH + 2));
      const xr = Math.floor(s.gapR + CAP_REACH - 2);
      const wr = Math.max(0, this.scene.W - xr);
      bodyL.setVisible(wl > 0).setPosition(0, y);
      bodyR.setVisible(wr > 0).setPosition(xr, y);
      if (bodyL.width !== wl && wl > 0) bodyL.setSize(wl, ART_H);
      if (bodyR.width !== wr && wr > 0) bodyR.setSize(wr, ART_H);
    }

    // Tunnel edges: tunnel_wall_edge_tile (content x 0–51, the gap-facing edge at 51) repeated
    // along the tunnel; mirrored for the far wall. The long-hold guide marks the lane: keep holding.
    makeTunnel() {
      const sc = this.scene;
      const edge = () => this.add(sc.add.tileSprite(0, 0, 64 * A.base, 64, 'pulse_gameplay', 'tunnel_wall_edge_tile')
        .setOrigin(0).setTileScale(A.base), 2);
      const guide = this.add(sc.add.tileSprite(0, 0, 48 * A.base, 64, 'pulse_gameplay', 'ind_long_hold_guide_tile')
        .setOrigin(0.5, 0).setTileScale(A.base).setAlpha(0.6), 2);
      return this.group('tunnel', [edge(), edge().setFlipX(true), guide]);
    }

    placeTunnel(v, s, visible) {
      v.show(visible);
      if (!visible) return;
      const [edgeL, edgeR, guide] = v.parts;
      if (edgeL.height !== s.h) {
        edgeL.setSize(64 * A.base, s.h);
        edgeR.setSize(64 * A.base, s.h);
        guide.setSize(48 * A.base, s.h);
      }
      edgeL.setPosition(s.gapL - CAP_REACH, s.y);
      edgeR.setPosition(s.gapR - (ART_W - CAP_REACH), s.y);
      guide.setPosition(s.cx, s.y);
    }

    makeBarrier() {
      const sc = this.scene;
      const bar = this.add(sc.add.tileSprite(0, 0, sc.W, BARRIER_ART.plain.h, 'pulse_gameplay', BARRIER_ART.plain.ready)
        .setOrigin(0).setTileScale(A.base), 3);
      const emblem = this.add(sc.add.image(0, 0, 'pulse_gameplay', 'barrier_charged_emblem_ready').setScale(A.base), 3.5);
      return this.group('barrier', [bar, emblem], { frame: BARRIER_ART.plain.ready, charged: false });
    }

    // Plain barriers swap between ready/danger tiles; charged ones also show the target emblem
    // on the orb's lane. `ready` = hitting it now would smash it (Level.canSmash).
    placeBarrier(v, s, visible, ready) {
      v.show(visible);
      if (!visible) return;
      const [bar, emblem] = v.parts;
      const art = s.charged ? BARRIER_ART.charged : BARRIER_ART.plain;
      const frame = ready ? art.ready : art.danger;
      if (v.frame !== frame) {
        bar.setTexture('pulse_gameplay', frame);
        v.frame = frame;
      }
      if (bar.height !== art.h) bar.setSize(this.scene.W, art.h);
      bar.setPosition(0, s.y - art.top);
      emblem.setVisible(!!s.charged);
      if (s.charged) {
        emblem.setFrame(ready ? 'barrier_charged_emblem_ready' : 'barrier_charged_emblem_danger')
          .setPosition(this.scene.orbX, s.y + s.h / 2);
      }
    }

    makePickup() {
      const sc = this.scene;
      const parts = [
        this.add(sc.add.sprite(0, 0, 'pulse_gameplay', 'orb_energy_gold_01'), 4),
        this.add(sc.add.image(0, 0, 'pulse_gameplay', 'orb_lock_ring'), 4),
      ];
      return this.group('pickup', parts, { variant: null });
    }

    // A note pickup at lane position s.x. It can be taken at any orb size, so it is never dimmed.
    placePickup(v, s, visible) {
      v.show(visible);
      if (!visible) return;
      const [orb, lock] = v.parts;
      if (v.variant !== s.variant) {
        v.variant = s.variant;
        const bonus = s.variant === 'bonus';
        const scale = A.pickupDrawRadius / (bonus ? A.bonusRadius : A.energyRadius);
        orb.play(bonus ? 'anim_orb_mint' : 'anim_orb_gold').setScale(scale);
        lock.setScale((A.pickupDrawRadius + 6) / 28);
      }
      orb.setPosition(s.x, s.y).clearTint().setAlpha(1);
      lock.setPosition(s.x, s.y).clearTint().setAlpha(0.85);
    }

    renderFinish(y, visible) {
      if (!this.finish) {
        this.finish = this.add(this.scene.add.tileSprite(0, 0, this.scene.W, 48 * FINISH_SCALE, 'pulse_gameplay', 'finish_line_tile')
          .setOrigin(0).setTileScale(FINISH_SCALE), 3);
      }
      this.finish.setVisible(visible).setPosition(0, y - 6 * FINISH_SCALE);
    }

    // `fx` (Pulse.Rhythm.OrbFx.scales) is cosmetic: the glow ring breathes on the beat and the
    // body stretches along the direction of travel. All its scales are >= 1, so the drawn orb
    // always covers the collision circle (radius), which fx never changes.
    renderOrb(radius, dead, fx) {
      const R = C.orb.radius;
      const f = fx || { glow: 1, along: 1, across: 1 };
      if (this.comet) {
        this.renderComet(radius, dead, f);
        return;
      }
      const t = Math.min(1, Math.max(0, (R - radius) / (R - C.orb.minRadius)));
      const bodyScale = radius / A.orbBodyRadius;
      const coreScale = radius / A.orbShrunkRadius;
      this.body.setScale(bodyScale * f.across, bodyScale * f.along).setAlpha(1 - 0.85 * t);
      this.ring.setScale(bodyScale * f.glow).setAlpha(0.9);
      this.core.setScale(coreScale * f.across, coreScale * f.along).setAlpha(t);
      this.arcs.setScale(coreScale * f.across, coreScale * f.along).setAlpha(this.skin.sprite.arcPrefix ? 0.9 * t : 0); // (skins without arc frames show none)
      for (const img of [this.body, this.ring, this.core, this.arcs]) {
        if (dead) img.setTint(T.danger);
        else img.clearTint();
      }
    }

    // Charge ring states (v3 spec): A empty (8 broken slots), B charging (4 steps), C full
    // (fused octagon + diamond studs) with a one-off completion burst. Only shown while a charged
    // barrier is on screen.
    renderChargeRing(visible, charge, radius) {
      const ring = this.chargeRing;
      if (this.comet) this.cometRing.clear();
      if (!visible) {
        ring.setVisible(false);
        this.wasFull = charge >= 1;
        return;
      }
      const scale = radius / A.orbBodyRadius;
      ring.setVisible(true).setScale(scale);
      if (charge <= 0.01) {
        ring.setFrame('charge_ring_state_a_empty').setAlpha(0.75);
        this.wasFull = false;
      } else if (charge < 1) {
        ring.setFrame(RING_FRAMES[Math.min(3, Math.floor(charge * 4))]).setAlpha(0.95);
        this.wasFull = false;
      } else {
        ring.setFrame('charge_ring_state_c_full').setAlpha(1);
        if (!this.wasFull) {
          this.wasFull = true;
          if (this.comet) this.ringPulse(this.cometEcho, radius / 64, (radius / 64) * 1.6, 200, 0.9);
          else this.pulse(this.chargeBurst, scale * 0.85, scale * 1.35, 200);
        }
      }
      this.ringFrame = ring.frame.name;
      if (this.comet) {
        // Same rule feedback, drawn as a round ring to match the sphere (the sprite state above is kept for tests).
        ring.setVisible(false);
        // The drawn charge eases up toward the real charge and drops at once when it is lost, so the
        // ring never shows more charge than the rules have (it can lag a few frames behind a fill).
        const dt = Math.min(0.05, (this.scene.game.loop.delta || 16) / 1000);
        if (charge < this.dispCharge || this.dispCharge === undefined) this.dispCharge = charge;
        else this.dispCharge += (charge - this.dispCharge) * (1 - Math.exp(-dt * 30));
        if (charge >= 1 && this.dispCharge > 0.985) this.dispCharge = 1;
        const drawn = Math.min(radius + Pulse.Rhythm.OrbFx.maxExtra, Math.max(radius, this.drawnRadius || radius));
        Pulse.Render.chargeRing(this.cometRing, this.scene.orbX, this.scene.orbY, drawn, this.dispCharge);
      }
    }

    // One-shot expanding fade on an effect image.
    pulse(img, from, to, duration, x, y, tint) {
      const sc = this.scene;
      sc.tweens.killTweensOf(img);
      img.setVisible(true).setAlpha(1).setScale(from).setPosition(x === undefined ? sc.orbX : x, y === undefined ? sc.orbY : y);
      if (tint !== undefined) img.setTint(tint);
      sc.tweens.add({ targets: img, scale: to, alpha: 0, duration, ease: 'Cubic.easeOut' });
    }

    collect(seg) {
      const em = seg.variant === 'bonus' ? this.sparksMint : this.sparksGold;
      const frame = seg.variant === 'bonus' ? 'fx_collect_mint_burst' : 'fx_collect_gold_burst';
      em.explode(seg.quality === 'perfect' ? 10 : 6, seg.x, seg.y);
      const img = this.collectFx[this.collectNext++ % this.collectFx.length].setFrame(frame);
      this.pulse(img, A.base * 0.4, A.base * (seg.quality === 'perfect' ? 1.15 : 0.9), 260, seg.x, seg.y);
    }

    // Plain smash: octagonal burst; charged smash: the bigger double-diamond nova.
    smash(seg) {
      const sc = this.scene;
      const cy = seg.y + seg.h / 2;
      for (let x = 40; x < sc.W; x += 90) this.sparksCyan.explode(seg.charged ? 4 : 3, x, cy);
      if (seg.charged) this.pulse(this.smashNova, A.base * 0.45, A.base * 1.25, 340, sc.orbX, cy);
      else this.pulse(this.smashBurst, A.base * 0.4, A.base * 1.0, 260, sc.orbX, cy);
    }

    // Run start: the orb materializes (v4 effect).
    spawn() {
      this.resetTrails();
      if (this.comet) {
        this.ringPulse(this.cometRipple, 0.4, 2.0, 380, 0.9);
        return;
      }
      if (!this.spawnFx) this.spawnFx = this.add(this.scene.add.image(0, 0, 'pulse_gameplay', 'fx_orb_spawn_materialize').setBlendMode('ADD'), 6);
      this.pulse(this.spawnFx, A.base * 1.6, A.base * 0.9, 320);
    }

    // Stage clear: a large burst around the orb (v4 effect).
    stageClear() {
      if (!this.clearFx) this.clearFx = this.add(this.scene.add.image(0, 0, 'pulse_gameplay', 'fx_stage_clear_burst').setBlendMode('ADD'), 6);
      this.pulse(this.clearFx, A.base * 0.6, A.base * 2.2, 700);
    }

    // Multiplier reached its maximum: golden starburst around the orb (feedback only).
    milestone() {
      this.pulse(this.starburst, A.base * 0.7, A.base * 1.4, 480);
    }

    // Multiplier rose: chevron rising above the orb, in screen space (feedback only).
    multUp() {
      const sc = this.scene;
      const c = this.chevron;
      sc.tweens.killTweensOf(c);
      c.setVisible(true).setAlpha(1).setPosition(sc.orbSX, sc.orbSY - C.orb.radius - 24);
      sc.tweens.add({ targets: c, y: c.y - 30, alpha: 0, duration: 420, ease: 'Quad.easeOut' });
    }

    // Crash: shards and a red shockwave; hitting a charged barrier too early also shows the
    // crimson ✕ shield, so the reason is visible.
    crash(seg) {
      const sc = this.scene;
      this.shards.explode(14, sc.orbX, sc.orbY);
      this.pulse(this.shockwave, 0.3, 1.1, 420, sc.orbX, sc.orbY, T.danger);
      if (seg && seg.kind === 'barrier' && seg.charged) this.pulse(this.failDeflect, A.base * 0.5, A.base * 1.15, 380);
    }

    // Cosmetic only: a graze arc on the side of the tight wall edge. Never affects score.
    nearMiss(side, radius) {
      const sc = this.scene;
      const arc = this.arcFx[side < 0 ? 0 : 1];
      sc.tweens.killTweensOf(arc);
      arc.setVisible(true).setAlpha(1).setScale(A.base * 1.2).setPosition(sc.orbX + side * (radius + 10), sc.orbY);
      sc.tweens.add({ targets: arc, scaleX: A.base * 1.6, scaleY: A.base * 1.4, alpha: 0, duration: 220 });
    }
  }

  Pulse.SpriteView = SpriteView;
})();
