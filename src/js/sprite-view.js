// Draws gameplay with Gemini's v2.0 sprites. It only reads game state (segments, orb radius)
// and never changes it, so collision, scoring and timing are identical to the shape renderer.
// All art is scaled to the existing gameplay sizes using the measurements in Pulse.ART.
(function () {
  const C = Pulse.CONFIG;
  const T = Pulse.THEME;
  const A = Pulse.ART;
  const ART_W = 64 * A.base; // wall pieces are 64x96 in the atlas
  const ART_H = 96 * A.base;
  const CAP_REACH = A.capReach * A.base; // visible width of a cap toward the gap

  class SpriteView {
    constructor(scene, visual, skin) {
      this.scene = scene;
      this.visual = visual;
      this.free = { gate: [], pickup: [] };
      this.dimmed = false;
      const W = scene.W;
      const H = scene.H;

      this.bg = scene.add.tileSprite(0, 0, W, H, visual.background).setOrigin(0).setTileScale(A.base).setDepth(0);
      const tw = 128 * A.base;
      this.tickL = scene.add.tileSprite(0, 0, tw, H, visual.ticks).setOrigin(0).setTileScale(A.base).setDepth(1);
      this.tickR = scene.add.tileSprite(W - tw, 0, tw, H, visual.ticks).setOrigin(0).setTileScale(A.base)
        .setFlipX(true).setDepth(1);

      const x = scene.orbX;
      const y = scene.orbY;
      this.ring = scene.add.image(x, y, 'pulse_gameplay', 'player_orb_ring').setDepth(5);
      this.body = scene.add.image(x, y, 'pulse_gameplay', 'player_orb_normal').setDepth(5);
      this.core = scene.add.image(x, y, 'pulse_gameplay', 'player_orb_shrunk').setDepth(5);
      this.arcs = scene.add.sprite(x, y, 'pulse_gameplay', 'player_tension_arcs_01').setDepth(5);

      const sparks = (tint) => scene.add.particles(0, 0, 'pulse_gameplay', {
        frame: 'fx_spark_diamond', speed: { min: 90, max: 240 }, lifespan: 380,
        scale: { start: 0.7, end: 0 }, alpha: { start: 1, end: 0 }, tint, blendMode: 'ADD', emitting: false,
      }).setDepth(6);
      this.sparksGold = sparks(T.pickup);
      this.sparksMint = sparks(T.bonus);
      this.sparksCyan = sparks(T.orb);
      this.shards = scene.add.particles(0, 0, 'pulse_gameplay', {
        frame: ['fx_shatter_shard_01', 'fx_shatter_shard_02', 'fx_shatter_shard_03'],
        speed: { min: 140, max: 340 }, lifespan: 650, rotate: { min: 0, max: 360 },
        scale: { start: 0.7, end: 0.2 }, alpha: { start: 1, end: 0 }, emitting: false,
      }).setDepth(6);
      this.shockwave = scene.add.image(x, y, 'pulse_gameplay', 'fx_shockwave_ring').setDepth(6).setVisible(false);
      this.arcFx = [-1, 1].map((side) => scene.add.image(x, y, 'pulse_gameplay', 'fx_near_miss_arc')
        .setFlipX(side < 0).setBlendMode('ADD').setDepth(6).setVisible(false));

      this.setSkin(skin);
    }

    setSkin(skin) {
      const s = skin.sprite;
      this.ring.setTexture(s.atlas, `${s.prefix}ring`);
      this.body.setTexture(s.atlas, `${s.prefix}normal`);
      this.core.setTexture(s.atlas, `${s.prefix}shrunk`);
      this.arcs.play(`anim_arcs_${skin.id}`);
    }

    // `scroll` is the scene's background scroll (half the distance travelled).
    render(level, scroll, dimmed, wallGraphics) {
      const travel = scroll * 2;
      this.bg.tilePositionY = -(travel * this.visual.bgSpeed) / A.base;
      this.tickL.tilePositionY = this.tickR.tilePositionY = -(travel * this.visual.tickSpeed) / A.base;
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
        if (s.kind === 'barrier' || (s.kind === 'gate' && s.h > C.gate.thickness)) {
          // Barriers have no art yet, and tunnels are taller than the wall art: both are drawn
          // in code with the same palette.
          this.release(s);
          if (!onScreen) continue;
          if (s.kind === 'barrier') Pulse.Render.barrier(wallGraphics, s, this.scene.W, !dimmed);
          else Pulse.Render.walls(wallGraphics, s, this.scene.W);
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
      const v = this.free[kind].pop() || (kind === 'gate' ? this.makeGate() : this.makePickup());
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

    makeGate() {
      const sc = this.scene;
      const body = () => sc.add.tileSprite(0, 0, ART_W, ART_H, 'pulse_gameplay', 'wall_body_tile')
        .setOrigin(0).setTileScale(A.base).setDepth(2);
      const cap = (frame) => sc.add.image(0, 0, 'pulse_gameplay', frame).setOrigin(0).setScale(A.base).setDepth(2);
      const parts = [body(), cap('wall_cap_left'), cap('wall_cap_right'), body()];
      return { kind: 'gate', parts, show: (on) => parts.forEach((p) => p.setVisible(on)) };
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

    makePickup() {
      const sc = this.scene;
      const parts = [0, 1].map(() => ({
        orb: sc.add.sprite(0, 0, 'pulse_gameplay', 'orb_energy_gold_01').setDepth(4),
        lock: sc.add.image(0, 0, 'pulse_gameplay', 'orb_lock_ring').setDepth(4),
      }));
      return {
        kind: 'pickup', parts, variant: null,
        show: (on) => parts.forEach((p) => { p.orb.setVisible(on); p.lock.setVisible(on); }),
      };
    }

    placePickup(v, s, visible, dimmed) {
      v.show(visible);
      if (!visible) return;
      if (v.variant !== s.variant) {
        v.variant = s.variant;
        const bonus = s.variant === 'bonus';
        const scale = A.pickupDrawRadius / (bonus ? A.bonusRadius : A.energyRadius);
        for (const p of v.parts) {
          p.orb.play(bonus ? 'anim_orb_mint' : 'anim_orb_gold').setScale(scale);
          p.lock.setScale((A.pickupDrawRadius + 6) / 28);
        }
      }
      const x0 = this.scene.orbX;
      for (let side = 0; side < 2; side++) {
        const p = v.parts[side];
        const x = side ? x0 + s.offset : x0 - s.offset;
        p.orb.setPosition(x, s.y);
        p.lock.setPosition(x, s.y);
        // Shrunk: collectibles can't be taken, so they dim (45%, slate tint) as the style guide specifies.
        if (dimmed) {
          p.orb.setTint(T.dimTint).setAlpha(C.pickup.dimAlpha);
          p.lock.setTint(T.dimTint).setAlpha(C.pickup.dimAlpha);
        } else {
          p.orb.clearTint().setAlpha(1);
          p.lock.clearTint().setAlpha(0.85);
        }
      }
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

    collect(seg) {
      const em = seg.variant === 'bonus' ? this.sparksMint : this.sparksGold;
      const x = this.scene.orbX;
      em.explode(6, x - seg.offset, seg.y);
      em.explode(6, x + seg.offset, seg.y);
    }

    // Barrier smashed: cyan sparks along the barrier and a cyan shockwave from the orb.
    smash(seg) {
      const sc = this.scene;
      for (let x = 40; x < sc.W; x += 90) this.sparksCyan.explode(3, x, seg.y + seg.h / 2);
      sc.tweens.killTweensOf(this.shockwave);
      this.shockwave.setVisible(true).setAlpha(0.9).setScale(0.35).setTint(T.orb).setPosition(sc.orbX, sc.orbY);
      sc.tweens.add({ targets: this.shockwave, scale: 0.9, alpha: 0, duration: 300, ease: 'Quad.easeOut' });
    }

    crash() {
      const sc = this.scene;
      this.shards.explode(14, sc.orbX, sc.orbY);
      sc.tweens.killTweensOf(this.shockwave);
      this.shockwave.setVisible(true).setAlpha(1).setScale(0.3).setTint(T.danger);
      sc.tweens.add({ targets: this.shockwave, scale: 1.1, alpha: 0, duration: 420, ease: 'Quad.easeOut' });
    }

    // Cosmetic only: a graze arc on the side of the tight wall edge. Never affects score.
    nearMiss(side, radius) {
      const sc = this.scene;
      const arc = this.arcFx[side < 0 ? 0 : 1];
      sc.tweens.killTweensOf(arc);
      arc.setVisible(true).setAlpha(1).setScale(A.base * 1.2)
        .setPosition(sc.orbX + side * (radius + 10), sc.orbY);
      sc.tweens.add({ targets: arc, scaleX: A.base * 1.6, scaleY: A.base * 1.4, alpha: 0, duration: 220 });
    }
  }

  Pulse.SpriteView = SpriteView;
})();
