// Draws gameplay with Gemini's v3.0 sprites (landscape). It only reads game state (segments,
// orb radius and charge) and never changes it, so collision, scoring and timing are identical
// to the shape renderer.
//
// Two spaces:
//   - Gameplay objects live in `layer`, a container that maps track space onto the screen
//     (GameScene.create): track x (across the lane) → screen y, track y (along travel) → screen
//     x reversed. Art is authored for this: walls and barriers are bands across the lane.
//   - Backgrounds and screen effects (multiplier chevron) are in screen space, laid out for
//     landscape: base tile, ceiling/floor ridges, top/bottom tick rails, all scrolling left.
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

      // ---- Screen-space landscape background (below the gameplay layer) ----
      this.bg = scene.add.tileSprite(0, 0, SW, SH, visual.background).setOrigin(0).setTileScale(A.base).setDepth(0);
      const midH = 256 * A.base;
      this.midBottom = scene.add.tileSprite(0, SH - midH, SW, midH, visual.mid).setOrigin(0).setTileScale(A.base)
        .setAlpha(0.5).setDepth(1);
      this.midTop = scene.add.tileSprite(0, 0, SW, midH, visual.mid).setOrigin(0).setTileScale(A.base)
        .setFlipY(true).setAlpha(0.5).setDepth(1);
      const railH = 128 * A.base;
      this.railBottom = scene.add.tileSprite(0, SH - railH, SW, railH, visual.rail).setOrigin(0).setTileScale(A.base)
        .setAlpha(0.7).setDepth(1);
      this.railTop = scene.add.tileSprite(0, 0, SW, railH, visual.rail).setOrigin(0).setTileScale(A.base)
        .setFlipY(true).setAlpha(0.7).setDepth(1);

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

      this.setSkin(skin);
    }

    // Adds a gameplay object to the track-space layer, keeping draw order by depth.
    add(obj, depth) {
      obj.setDepth(depth);
      this.layer.add(obj);
      this.layer.sort('depth');
      return obj;
    }

    setSkin(skin) {
      const s = skin.sprite;
      this.ring.setTexture(s.atlas, `${s.prefix}ring`);
      this.body.setTexture(s.atlas, `${s.prefix}normal`);
      this.core.setTexture(s.atlas, `${s.prefix}shrunk`);
      this.arcs.play(`anim_arcs_${skin.id}`);
    }

    // `scroll` is the scene's background scroll (half the distance travelled).
    // `canSmash(seg)` says whether hitting a barrier now would smash it.
    render(level, scroll, dimmed, wallGraphics, canSmash) {
      const travel = scroll * 2;
      this.bg.tilePositionX = (travel * this.visual.bgSpeed) / A.base;
      this.midTop.tilePositionX = this.midBottom.tilePositionX = (travel * this.visual.midSpeed) / A.base;
      this.railTop.tilePositionX = this.railBottom.tilePositionX = (travel * this.visual.railSpeed) / A.base;
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
        } else if (s.kind === 'gate' && s.h > C.gate.thickness) {
          // Tunnel (long hold): body drawn in the wall palette, edges and lane guide from the atlas.
          const v = this.acquire(s, 'tunnel');
          this.placeTunnel(v, s, onScreen);
          if (onScreen) Pulse.Render.tunnelBody(wallGraphics, s, this.scene.W);
        } else if (s.kind === 'gate') {
          this.placeGate(this.acquire(s, 'gate'), s, onScreen);
        } else {
          this.placePickup(this.acquire(s, 'pickup'), s, onScreen && !s.taken, dimmed);
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
      guide.setPosition(this.scene.orbX, s.y);
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
      const parts = [];
      for (let i = 0; i < 2; i++) {
        parts.push(this.add(sc.add.sprite(0, 0, 'pulse_gameplay', 'orb_energy_gold_01'), 4));
        parts.push(this.add(sc.add.image(0, 0, 'pulse_gameplay', 'orb_lock_ring'), 4));
      }
      return this.group('pickup', parts, { variant: null });
    }

    placePickup(v, s, visible, dimmed) {
      v.show(visible);
      if (!visible) return;
      const p = v.parts; // [orb, lock, orb, lock]
      if (v.variant !== s.variant) {
        v.variant = s.variant;
        const bonus = s.variant === 'bonus';
        const scale = A.pickupDrawRadius / (bonus ? A.bonusRadius : A.energyRadius);
        p[0].play(bonus ? 'anim_orb_mint' : 'anim_orb_gold').setScale(scale);
        p[2].play(bonus ? 'anim_orb_mint' : 'anim_orb_gold').setScale(scale);
        p[1].setScale((A.pickupDrawRadius + 6) / 28);
        p[3].setScale((A.pickupDrawRadius + 6) / 28);
      }
      const x0 = this.scene.orbX;
      for (let side = 0; side < 2; side++) {
        const x = side ? x0 + s.offset : x0 - s.offset;
        const orb = p[side * 2];
        const lock = p[side * 2 + 1];
        orb.setPosition(x, s.y);
        lock.setPosition(x, s.y);
        // Shrunk: collectibles can't be taken, so they dim (45%, slate tint) per the style guide.
        if (dimmed) {
          orb.setTint(T.dimTint).setAlpha(C.pickup.dimAlpha);
          lock.setTint(T.dimTint).setAlpha(C.pickup.dimAlpha);
        } else {
          orb.clearTint().setAlpha(1);
          lock.clearTint().setAlpha(0.85);
        }
      }
    }

    renderFinish(y, visible) {
      if (!this.finish) {
        this.finish = this.add(this.scene.add.tileSprite(0, 0, this.scene.W, 48 * FINISH_SCALE, 'pulse_gameplay', 'finish_line_tile')
          .setOrigin(0).setTileScale(FINISH_SCALE), 3);
      }
      this.finish.setVisible(visible).setPosition(0, y - 6 * FINISH_SCALE);
    }

    renderOrb(radius, dead) {
      const R = C.orb.radius;
      const t = Math.min(1, Math.max(0, (R - radius) / (R - C.orb.minRadius)));
      const bodyScale = radius / A.orbBodyRadius;
      const coreScale = radius / A.orbShrunkRadius;
      this.body.setScale(bodyScale).setAlpha(1 - 0.85 * t);
      this.ring.setScale(bodyScale).setAlpha(0.9);
      this.core.setScale(coreScale).setAlpha(t);
      this.arcs.setScale(coreScale).setAlpha(0.9 * t);
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
          this.pulse(this.chargeBurst, scale * 0.85, scale * 1.35, 200);
        }
      }
      this.ringFrame = ring.frame.name;
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
      const x = this.scene.orbX;
      for (const px of [x - seg.offset, x + seg.offset]) {
        em.explode(6, px, seg.y);
        const img = this.collectFx[this.collectNext++ % this.collectFx.length].setFrame(frame);
        this.pulse(img, A.base * 0.4, A.base * 0.9, 260, px, seg.y);
      }
    }

    // Plain smash: octagonal burst; charged smash: the bigger double-diamond nova.
    smash(seg) {
      const sc = this.scene;
      const cy = seg.y + seg.h / 2;
      for (let x = 40; x < sc.W; x += 90) this.sparksCyan.explode(seg.charged ? 4 : 3, x, cy);
      if (seg.charged) this.pulse(this.smashNova, A.base * 0.45, A.base * 1.25, 340, sc.orbX, cy);
      else this.pulse(this.smashBurst, A.base * 0.4, A.base * 1.0, 260, sc.orbX, cy);
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
