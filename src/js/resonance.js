// Resonance gates prototype (docs/RESONANCE_GATES.md). A resonance gate is an ordinary, wide gate that can be passed
// at ANY orb size (it never kills; walls, hit rectangles and rates are untouched). It shows a target band for the
// orb's radius [lo, hi]. If the collision radius was inside the band while the gate's middle line passed the orb
// (see `swept`), the pass earns ONE small award through the existing Overdrive meter (Pulse.Overdrive.award, exactly
// the way GameScene.graze() does it): modest, capped per run, nothing while Overdrive is on. Too small or too large
// is a safe pass with no reward and no message.
//
// Nothing here reads or changes collision, score, stars or the save. Where gates get their band is data this module
// owns: the lab entry's `flags.resonance.gates` maps a stage item index to a band (the stage DSL cannot carry it).
// A segment is matched to its item by its distance along the track, so no hook in the level core is needed.
//
//   Pulse.Resonance.on(scene)                   whether this scene plays a resonance lab stage (flag + lab entry)
//   Pulse.Resonance.observe(scene, seg, x, y, r) once per frame per uncleared gate, before collision is resolved
//   Pulse.Resonance.cleared(scene, seg, r)       once, when the gate has been passed (the pass event of Level.resolve)
//   Pulse.Resonance.reset(scene)                 new run (startRun)
//   Pulse.Resonance.draw(scene)                  the overlay (target rings, orb ring); end of GameScene.draw
(function () {
  const C = Pulse.CONFIG;
  const R = C.orb.radius;
  const CHARGED = R - C.pickup.sizeTolerance; // Pulse.isCharged(r) is r > CHARGED: bands stay clear of it

  C.resonance = {
    enabled: true,
    window: 14, // px of gate travel either side of the gate's middle line during which the size counts
    charge: 4, // Overdrive units for one resonance
    runCap: 20, // most units resonance can add in one run (the meter needs 100)
    band: [26, 46], // default target band, px of orb radius
    minLo: C.orb.minRadius + 4, // a band never touches the smallest size ...
    maxHi: CHARGED - 2, // ... nor the near-full sizes that smash barriers
    minWidth: 12, // narrowest allowed band
  };

  // ---- Pure rules (no Phaser) ----
  function normalize(band) {
    const K = C.resonance;
    let lo = band && band[0], hi = band && band[1];
    if (!(lo < hi)) { lo = K.band[0]; hi = K.band[1]; }
    lo = Math.max(K.minLo, lo);
    hi = Math.min(K.maxHi, hi);
    if (hi - lo < K.minWidth) { lo = K.band[0]; hi = K.band[1]; }
    return [lo, hi];
  }

  // Closed band: a radius exactly on lo or hi is inside.
  const inBand = (r, lo, hi) => r >= lo && r <= hi;

  // Sub-interval of u in [0,1] where a0 + (a1 - a0) u lies in [lo, hi], or null.
  function span(a0, a1, lo, hi) {
    const da = a1 - a0;
    if (Math.abs(da) < 1e-12) return a0 >= lo && a0 <= hi ? [0, 1] : null;
    let u0 = (lo - a0) / da, u1 = (hi - a0) / da;
    if (u0 > u1) { const t = u0; u0 = u1; u1 = t; }
    u0 = Math.max(0, u0); u1 = Math.min(1, u1);
    return u0 <= u1 + 1e-9 ? [u0, u1] : null;
  }

  // Did the radius sit in [lo, hi] at some instant while the gate's middle line was within `win` px of the orb,
  // given the frame went from (d0, r0) to (d1, r1) (d = middle line minus orb y; both change linearly in the frame)?
  // Exact for a frame of any length, so the answer does not depend on the frame rate.
  function swept(d0, r0, d1, r1, win, lo, hi) {
    const a = span(d0, d1, -win, win);
    if (!a) return false;
    const b = span(r0, r1, lo, hi);
    if (!b) return false;
    return Math.max(a[0], b[0]) <= Math.min(a[1], b[1]) + 1e-9;
  }

  // ---- Per-scene state ----
  function state(scene) {
    let st = scene.rz;
    if (!st) st = scene.rz = { run: 0, charge: 0, count: 0, shown: 0, tags: null, g: null, burst: null };
    return st;
  }

  function reset(scene) {
    if (!on(scene)) { if (scene.rz && scene.rz.g && scene.rz.g.scene) scene.rz.g.clear(); scene.rz = null; return; } // a scene that moves on to any other stage keeps no resonance state at all
    const st = state(scene);
    st.run++;
    st.charge = 0;
    st.count = 0;
    st.shown = 0;
    st.burst = null;
    if (st.g && st.g.scene) st.g.clear();
  }

  function on(scene) {
    const K = C.resonance;
    return !!(K && K.enabled && scene.mode === 'campaign' && scene.lab && scene.lab.flags && scene.lab.flags.resonance);
  }

  // The tagged gates of this level: { at, lo, hi } for each item index the lab entry names.
  function tagsOf(scene) {
    const st = state(scene);
    if (st.tags && st.tags.level === scene.level) return st.tags.list;
    const gates = scene.lab.flags.resonance.gates || {};
    const list = [];
    for (const key of Object.keys(gates)) {
      const it = scene.level.items[+key];
      if (!it || it.type !== 'gate' || it.ring || it.fork) continue; // lateral gaps only
      const band = normalize(gates[key] === true ? null : gates[key]);
      list.push({ at: it.at, lo: band[0], hi: band[1] });
    }
    st.tags = { level: scene.level, list };
    return list;
  }

  // The segment's resonance record for this run (created on first sight; a pooled segment reused for another
  // item, or by the next run, gets a fresh one).
  function recordOf(scene, s) {
    const st = state(scene);
    const level = scene.level;
    const at = level.travelled - s.y - s.h; // distance along the track of the gate's near edge
    const z = s.rz;
    if (z && z.run === st.run && Math.abs(z.at - at) < 1) return z;
    const list = tagsOf(scene);
    for (let i = 0; i < list.length; i++) {
      if (Math.abs(list[i].at - at) < 1) {
        return (s.rz = { run: st.run, at: list[i].at, lo: list[i].lo, hi: list[i].hi, d: NaN, r: NaN, hit: false, paid: false });
      }
    }
    s.rz = null;
    return null;
  }

  function observe(scene, s, x, y, r) {
    const z = recordOf(scene, s);
    if (!z) return;
    const d = s.y + s.h / 2 - y;
    const first = z.d !== z.d;
    if (!z.hit && swept(first ? d : z.d, first ? r : z.r, d, r, C.resonance.window, z.lo, z.hi)) z.hit = true;
    z.d = d;
    z.r = r;
  }

  // The gate has been passed. Pays once, and only for a gate that was passed (a crash returns before this).
  function cleared(scene, s, r) {
    const z = s.rz;
    const st = state(scene);
    if (!z || z.run !== st.run || z.paid || !z.hit) return;
    z.paid = true;
    st.shown++;
    const K = C.resonance;
    const x = scene.orbX, y = scene.orbY;
    // The effect always shows; the charge is small, capped, and never added while Overdrive is on.
    Pulse.Sfx.play('packCombo4');
    scene.reward(3);
    st.burst = { t0: scene.time.now, x, y, r, hi: z.hi };
    if (scene.view && scene.textures && Pulse.Assets && Pulse.Assets.vfxReady(scene)) {
      const img = st.bloom && st.bloom.scene ? st.bloom : (st.bloom = scene.add.image(x, y, 'pulse_comet_vfx', 'comet_halo_bloom').setBlendMode('ADD').setDepth(3.2));
      scene.tweens.killTweensOf(img);
      const s0 = (2 * z.hi) / 256;
      img.setVisible(true).setAlpha(0.9).setTint(0x6BFFC4).setPosition(x, y).setScale(s0);
      scene.tweens.add({ targets: img, scale: s0 * 2.4, alpha: 0, duration: 380, ease: 'Cubic.easeOut', onComplete: () => img.setVisible(false) });
    }
    const room = K.runCap - st.charge;
    if (room <= 0 || scene.od.active) return;
    const res = Pulse.Overdrive.award(scene.od, Math.min(K.charge, room));
    if (res.added <= 0) return;
    st.charge += res.added;
    st.count++;
    scene.quality('RESONANCE', '#6BFFC4');
    if (res.started) scene.overdriveStarted();
  }

  // ---- Overlay (drawn above the walls, below the HUD; the hit rectangles are not touched) ----
  const LIT = 0x6BFFC4;
  const IDLE = 0xFFFFFF;
  const DARK = 0x04060C;

  function ring(g, x, y, rad, w, color, a) {
    g.lineStyle(w + 3, DARK, a * 0.5).strokeCircle(x, y, rad);
    g.lineStyle(w, color, a).strokeCircle(x, y, rad);
  }

  function draw(scene) {
    if (!on(scene)) {
      const old = scene.rz && scene.rz.g;
      if (old && old.scene) old.clear();
      return;
    }
    const st = state(scene);
    if (!st.g || !st.g.scene) st.g = scene.add.graphics().setDepth(3.1);
    const g = st.g;
    g.clear();
    const active = scene.state === 'playing' || scene.state === 'paused';
    if (!active) return;
    const level = scene.level;
    const segs = level.segments;
    const oy = scene.orbY, ox = scene.orbX, r = scene.radius;
    const pulse = 0.5 + 0.5 * Math.sin(level.time * 6);
    let next = null; // the nearest uncleared resonance gate ahead of (or at) the orb
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      if (!s.active || s.kind !== 'gate' || s.scored) continue;
      const z = s.rz;
      if (!z || z.run !== st.run) continue;
      const ym = s.y + s.h / 2;
      if (ym < -50 || ym > scene.H + 50) continue;
      const cx = (s.gapL + s.gapR) / 2;
      const near = Math.max(0, Math.min(1, 1 - (oy - ym) / 420)); // 0 far above ... 1 at the orb
      const a = 0.45 + 0.55 * near;
      const color = z.hit ? LIT : IDLE;
      // The band: a soft annulus between the two rings, so "your orb fits in here" reads at a glance.
      g.lineStyle(z.hi - z.lo, color, (z.hit ? 0.3 : 0.14 + 0.08 * pulse) * a).strokeCircle(cx, ym, (z.lo + z.hi) / 2);
      ring(g, cx, ym, z.hi, 2, color, a);
      ring(g, cx, ym, z.lo, 2, color, a);
      if (ym <= oy + z.hi && (!next || ym > next.ym)) next = { ym, z };
    }
    if (next) {
      // The orb's own ring: the target radii as faint guides, and the collision circle lit while it is in the band.
      const z = next.z;
      const lit = inBand(r, z.lo, z.hi);
      g.lineStyle(1.5, IDLE, 0.3).strokeCircle(ox, oy, z.lo).strokeCircle(ox, oy, z.hi);
      ring(g, ox, oy, r + 5, lit ? 4 : 2, lit ? LIT : IDLE, lit ? 0.95 : 0.35);
    }
    const b = st.burst;
    if (b) {
      const k = (scene.time.now - b.t0) / 380;
      if (k >= 1 || k < 0) st.burst = null;
      else {
        const rr = b.r + 8 + 46 * (1 - Math.pow(1 - k, 3));
        g.lineStyle(4 * (1 - k) + 1, LIT, 1 - k).strokeCircle(b.x, b.y, rr);
        for (let i = 0; i < 8; i++) {
          const an = (i / 8) * Math.PI * 2 + 0.4;
          g.lineStyle(3, LIT, 1 - k).lineBetween(b.x + Math.cos(an) * (rr + 4), b.y + Math.sin(an) * (rr + 4), b.x + Math.cos(an) * (rr + 4 + 12 * (1 - k)), b.y + Math.sin(an) * (rr + 4 + 12 * (1 - k)));
        }
      }
    }
  }

  Pulse.Resonance = { normalize, inBand, swept, on, observe, cleared, reset, draw, stats: (scene) => ({ charge: state(scene).charge, count: state(scene).count, shown: state(scene).shown }) };

  // ---- The lab prototype ----
  // Seven resonance gates among ordinary wide gates and gold notes, world 1, calm pace. `gates` maps an item index to
  // its band; the other gates are plain (84 px half-width: passable at full size).
  function labEntry() {
    const std = [26, 46], low = [24, 38], high = [32, 46];
    const items = [];
    const gates = {};
    const wide = (t, x) => items.push({ type: 'gate', need: 84, t, x });
    const res = (t, x, band) => { gates[items.length] = band; items.push({ type: 'gate', need: 84, t, x }); };
    const gold = (t, x) => items.push({ type: 'energy', t, x });
    wide(1.2, 0); gold(0.5, -40);
    res(1.1, 0, std); gold(0.6, 60);
    res(1.0, -70, std); gold(0.5, -60);
    wide(0.9, 80); res(1.0, 60, low); gold(0.5, 50);
    wide(0.9, -60); res(1.0, 0, high); gold(0.5, 0);
    res(1.0, -80, std); gold(0.5, -70);
    wide(0.9, 50); res(1.0, 70, low); gold(0.5, 70);
    res(1.0, -50, high); gold(0.5, 0);
    wide(0.9, 0);
    return {
      id: 'resonance',
      title: 'Resonance gates',
      desc: 'Match your size to the glowing ring as a gate passes: a small Overdrive bonus. Miss it and nothing happens.',
      base: 's3-controlled-overload',
      stage: Pulse.Lab.derive('s3-controlled-overload', {
        id: 'lab-resonance', name: 'Resonance',
        intro: 'Wide gates with a glowing target ring. Match your size to it as the gate passes. Missing costs nothing.',
        teaches: 'Intermediate orb sizes: shrink and release to land between the rings.',
        profile: 'Calm wide gates with a size target and a small optional reward.',
        speed: { start: 250, end: 300 }, pace: 1, spread: 1,
        hints: [
          { from: 1.5, to: 6.5, title: 'FIND THE RING.', sub: 'MATCH YOUR SIZE TO IT  ·  OPTIONAL BONUS' },
        ],
        items,
      }),
      flags: { resonance: { gates } },
    };
  }

  // lab.js loads after this file in index.html: register the prototype the moment Pulse.Lab appears.
  function register() { Pulse.Lab.register(labEntry()); }
  if (Pulse.Lab) register();
  else {
    Object.defineProperty(Pulse, 'Lab', {
      configurable: true,
      get: () => undefined,
      set(v) { Object.defineProperty(Pulse, 'Lab', { value: v, writable: true, configurable: true, enumerable: true }); register(); },
    });
  }
  Pulse.Resonance.labEntry = labEntry;
})();
