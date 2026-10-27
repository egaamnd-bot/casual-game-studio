// World Shift prototype (docs/WORLD_SHIFT.md): ONE short Lab stage in three movements. Between movements the
// world changes its look (backdrop crossfade, rail colour, a musical layer) behind a telegraph, and a calm
// recovery section follows every shift. Presentation only: it reads the run, it never changes it.
//
//   - The stage is a Lab entry ('world-shift', flag worldShift). Nothing else in the game loads this module's
//     behaviour: every hook in game-scene.js is `if (Pulse.WorldShift) ...`, and every hook returns at once
//     unless the scene is the world-shift Lab stage with CONFIG.worldShift.enabled.
//   - The movement table is owned here and keyed by the stage's own progress measure (the one the HUD bar and
//     the finish use: level.travelled / (finishAt + orbY)). The stage DSL is untouched: each movement is
//     anchored to an ITEM of the lab stage, resolved to travelled distance / progress when the scene starts.
//   - The shift is separate from the legacy audio theme `stage.world` and from the campaign arc mapping: the
//     backdrop keys are named in the table below, not taken from Pulse.Assets.worldBackdrop.
//   - Everything animates from the run's own `dt` (no Phaser tweens, no timers), so pause freezes it, retry
//     resets it, and nothing can leak.
//   - Layers sit BEHIND the world graphics (depth < 2): a banner, a rail sweep or a backdrop can never cover a
//     gate, a barrier or a note.
(function () {
  const C = Pulse.CONFIG;
  const T = Pulse.THEME;

  C.worldShift = {
    enabled: true,
    leadBeats: 4, // the telegraph starts this many beats before the shift (about 1.9 s at 125 BPM)
    fadeBeats: 4, // the backdrop crossfade lasts this many beats
    bannerHoldSec: 1.6, // how long the movement banner stays after the shift before it fades
    bannerFadeSec: 0.6,
    minContrast: 3, // wall rim over the 95th-percentile backdrop pixel, at every step of every crossfade (tests/worldshift.html)
    stingGain: 0.4, // the existing WORLD_TRANSITION sting plays under the music at this level
  };

  const ID = 'world-shift';
  const BASE = 's3-controlled-overload'; // world 1 look and tempo (125 BPM, which the world-1 Overdrive stem fits)

  // ---- The movement table ----
  // `anchor`: index (in the lab stage's items) of the note that reaches the orb at the moment of the shift;
  // `recoveryEnd`: index of the last item of the recovery section that follows it. Movement 1 has no anchor.
  // `backdrop`: Gemini portrait backdrop key. `rail`: lane rail colour (none of the hazard colours).
  // `layer`: 'stem' = the world's existing Overdrive stem is layered under the music from the shift on.
  const MOVEMENTS = [
    { id: 'm1', numeral: 'I', name: 'NEON CIRCUIT', backdrop: 'bg_portrait_w1_neon_circuit', rail: 0x1e6bff, layer: null },
    { id: 'm2', numeral: 'II', name: 'CHROMATIC OVERDRIVE', backdrop: 'bg_portrait_w2_chromatic_overdrive', rail: 0x9b5cff, layer: 'stem', anchor: null, recoveryEnd: null, color: '#C9A8FF' },
    { id: 'm3', numeral: 'III', name: 'PULSE COLLAPSE', backdrop: 'bg_portrait_w3_pulse_collapse', rail: 0xdff0ff, layer: 'stem', finale: true, anchor: null, recoveryEnd: null, color: T.textBonus },
  ];
  MOVEMENTS[0].color = '#7FB2FF';

  // ---- The lab stage ----
  // Item helpers (the same plain item objects stages.js builds; its helpers are private to that file).
  const gap = (need, t, x) => ({ type: 'gate', need, t, x: x || 0 });
  const wide = (t, x) => ({ type: 'gate', need: 84, t, x: x || 0 });
  const bar = (t) => ({ type: 'barrier', t });
  const charged = (t) => ({ type: 'barrier', charged: true, t });
  const gold = (t, x) => ({ type: 'energy', t, x: x || 0 });
  const mint = (t, x) => ({ type: 'bonus', t, x: x || 0 });
  const slide = (need, t, x, amp, beats, phase) => ({ type: 'gate', need, t, x: x || 0, beat: 0.5, slide: { amp, beats, phase: phase || 0 } });
  const breathe = (need, t, x, amp, beats, phase) => ({ type: 'gate', need, t, x: x || 0, beat: 0.5, slide: { kind: 'breathe', amp, beats, phase: phase || 0 } });
  const zig = (n, need, t, amp, s) => Array.from({ length: n }, (_, i) => gap(need, t, ((i % 2 ? -1 : 1) * (s || 1)) * amp));
  const snake = (n, need, t, x0, x1) => Array.from({ length: n }, (_, i) => gap(need, t, Math.round(x0 + ((x1 - x0) * i) / Math.max(1, n - 1))));
  const trail = (n, t, x0, x1, make) => Array.from({ length: n }, (_, i) => (make || gold)(t, Math.round(x0 + ((x1 - x0) * i) / Math.max(1, n - 1))));

  function buildItems() {
    const items = [];
    const at = {};
    const add = (...xs) => { for (const x of xs) items.push(x); };
    // Movement I · the drum: steady gap, barrier, gap, barrier (the Neon Circuit family).
    add(wide(1.0, 0), gold(0.4, 0),
      gap(48, 0.8, -70), bar(0.55), gap(46, 0.55, 70), gold(0.4, 60), bar(0.5),
      gap(46, 0.55, -70), bar(0.45), gap(46, 0.55, 40), bar(0.45),
      gap(44, 0.55, 60), bar(0.4), gap(44, 0.55, -60), gold(0.4, -50), bar(0.4));
    // Lead-in (the telegraph plays here): nothing but a wide gap and notes.
    add(wide(1.0, 0), gold(0.5, -50), gold(0.5, 50));
    at.a1 = items.length; add(gold(0.5, 0)); // reaches the orb at shift 1
    // Recovery 1: wide gaps with notes between them.
    add(wide(1.1, -40), gold(0.5, -50), wide(1.1, 40), gold(0.5, 50));
    at.r1 = items.length - 1;
    // Movement II · sway and slalom: gaps that breathe and slide with the beat, snaking weaves (the Chromatic family).
    add(gap(46, 0.8, -80), slide(46, 0.6, 0, 40, 6, 0.25), gold(0.4, 0),
      ...snake(3, 44, 0.5, 100, -100), gold(0.4, -100),
      breathe(42, 0.55, 0, 26, 4, 0), gold(0.4, 0), slide(44, 0.6, -30, 50, 6, 0.75), gold(0.4, -60),
      ...snake(3, 44, 0.5, -100, 100), breathe(40, 0.55, -40, 26, 4, 0.5), gold(0.4, 0),
      ...zig(2, 44, 0.5, 100, -1), gold(0.4, 90));
    // Lead-in 2, then the second shift.
    add(wide(1.0, 0), gold(0.5, 50), gold(0.5, -50));
    at.a2 = items.length; add(gold(0.5, 0));
    // Recovery 2.
    add(wide(1.1, 40), gold(0.5, 50), wide(1.1, -40), gold(0.5, -50));
    at.r2 = items.length - 1;
    // Movement III · the finale phrase: short, gentle, ends in a trail of gold.
    add(gap(46, 0.8, -70), bar(0.55), gap(46, 0.55, 70), gold(0.4, 60), charged(0.8), gold(0.4, 0),
      gap(44, 0.6, -60), gold(0.4, -50), ...trail(4, 0.35, 80, -80, gold), mint(0.35, 150), gold(0.4, 0));
    return { items, at };
  }

  const built = buildItems();
  MOVEMENTS[1].anchor = built.at.a1; MOVEMENTS[1].recoveryEnd = built.at.r1;
  MOVEMENTS[2].anchor = built.at.a2; MOVEMENTS[2].recoveryEnd = built.at.r2;

  const ENTRY = {
    id: ID,
    title: 'World Shift',
    desc: 'One 70 s stage in three movements: the world changes behind a signal, you get a breath, then it builds again.',
    base: BASE,
    flags: { worldShift: true },
    make() {
      return Pulse.Lab.derive(BASE, {
        id: 'lab-world-shift', name: 'World Shift',
        intro: 'Three movements. When the lane colour sweeps, the world is about to change: take the breath.',
        teaches: 'A multi-movement stage: telegraphed world shifts, each followed by a calm recovery section.',
        profile: 'Drum, then sway and slalom, then a short finale; a signalled shift and a breather between them.',
        speed: { start: 235, end: 265 }, exit: { type: 'finish', runout: 360 }, pace: 0.7,
        hints: [], items: built.items.map((x) => Object.assign({}, x, x.slide ? { slide: Object.assign({}, x.slide) } : null)),
      });
    },
  };

  // ---- Resolving the table against a compiled track ----
  const clamp01 = (v) => Math.min(1, Math.max(0, v));

  // Movement table in the stage's own progress measure. `track` = Pulse.Campaign.compile(stage, W, H), `orbY` = the orb's y.
  // Everything is pure arithmetic on the compiled track, so tests can check it at any screen length.
  function resolve(track, orbY, movements) {
    const ms = movements || MOVEMENTS;
    const stage = track.stage;
    const total = track.finishAt + orbY; // progress = travelled / total, exactly CampaignLevel.progress
    const bpm = track.bpm;
    const beat = 60 / bpm;
    const leadSec = C.worldShift.leadBeats * beat;
    const fadeSec = C.worldShift.fadeBeats * beat;
    const speedAt = (d) => Pulse.Campaign.speedAtDistance(stage, track.speedLength, d);
    return ms.map((m, i) => {
      const out = { index: i, id: m.id, numeral: m.numeral, name: m.name, backdrop: m.backdrop, rail: m.rail, layer: m.layer, finale: !!m.finale, color: m.color, leadSec, fadeSec };
      if (i === 0) return Object.assign(out, { travelled: 0, progress: 0, tele: null, recovery: null });
      const a = track.items[m.anchor];
      const e = track.items[m.recoveryEnd];
      const travelled = a.at + orbY; // the anchor note's near edge reaches the orb's centre
      const mid = travelled - (leadSec * speedAt(travelled)) / 2;
      const teleTravelled = travelled - leadSec * speedAt(mid);
      const endTravelled = e.at + orbY;
      return Object.assign(out, {
        travelled, progress: travelled / total,
        tele: { travelled: teleTravelled, progress: teleTravelled / total },
        recovery: { from: travelled / total, to: endTravelled / total, fromTravelled: travelled, toTravelled: endTravelled, firstItem: m.anchor + 1, lastItem: m.recoveryEnd },
      });
    });
  }

  // ---- Per-scene runtime ----
  const stateOf = (sc) => sc.ws || null;
  const wanted = (sc) => !!(C.worldShift.enabled && sc.lab && sc.lab.flags && sc.lab.flags.worldShift && sc.mode === 'campaign' && sc.level && sc.level.track);

  const RAIL_STROKES = [[12, 0.1], [5, 0.25], [2, 0.9]]; // the same three strokes SpriteView draws

  function drawRails(g, color, SW, SH, upTo) {
    const y1 = upTo === undefined ? SH : upTo;
    if (y1 <= 0) return;
    for (const [w, al] of RAIL_STROKES) {
      g.lineStyle(w, color, al);
      g.lineBetween(6, 0, 6, y1);
      g.lineBetween(SW - 6, 0, SW - 6, y1);
    }
  }

  function attach(sc) {
    sc.ws = null;
    if (!wanted(sc)) return;
    const UI = Pulse.UI;
    const view = sc.view;
    const res = resolve(sc.level.track, sc.orbY);
    const cx = Math.round(sc.SW / 2);
    const y = Math.round(sc.H * 0.27);
    const ws = {
      res, i: 0, tele: false, teleT: 0, afterT: -1, fade: null, layerOn: false, events: [], stings: [],
      view, canFade: false, railColor: 0, bgKey: res[0].backdrop, fadeKey: null,
    };
    // Banner (behind the world graphics, so a gate or note always draws over it).
    ws.numeral = UI.text(sc, cx, y, '', 20, T.textDim, true).setDepth(1.6).setAlpha(0).setVisible(false);
    ws.title = UI.text(sc, cx, y + 36, '', 32, T.text, true).setDepth(1.6).setAlpha(0).setVisible(false);
    if (view) {
      ws.sweep = sc.add.graphics().setDepth(1.55);
      // A second backdrop layer for the crossfade, between the world backdrop (0.3) and the grid (0.5).
      const keyOk = (k) => sc.textures.exists(k);
      if (view.worldBg && res.every((m) => keyOk(m.backdrop))) {
        ws.fadeBg = sc.add.tileSprite(0, 0, sc.SW, sc.SH, res[0].backdrop).setOrigin(0).setDepth(0.31).setAlpha(0).setVisible(false);
        ws.canFade = true;
      }
    }
    sc.ws = ws;
    reset(sc);
  }

  // A new run (or the first one): everything back to movement I.
  function reset(sc) {
    const ws = stateOf(sc);
    if (!ws) return;
    ws.i = 0; ws.tele = false; ws.teleT = 0; ws.afterT = -1; ws.fade = null; ws.layerOn = false; ws.events = []; ws.stings = [];
    ws.railColor = ws.res[0].rail;
    ws.numeral.setVisible(false).setAlpha(0);
    ws.title.setVisible(false).setAlpha(0);
    if (ws.sweep) ws.sweep.clear();
    if (ws.fadeBg) ws.fadeBg.setVisible(false).setAlpha(0);
    const v = ws.view;
    if (v) {
      if (v.rails) { v.rails.clear(); drawRails(v.rails, ws.res[0].rail, sc.SW, sc.SH); }
      if (ws.canFade) {
        if (ws.bgKey !== ws.res[0].backdrop) v.worldBg.setTexture(ws.res[0].backdrop);
        v.worldBgKey = ws.bgKey = ws.res[0].backdrop; // (a TileSprite's own texture key is internal, so the logical key is kept here)
      }
    }
  }

  function detach(sc) {
    const ws = stateOf(sc);
    if (!ws) return;
    for (const o of [ws.numeral, ws.title, ws.sweep, ws.fadeBg]) if (o && o.destroy) o.destroy();
    sc.ws = null;
  }

  function log(ws, sc, type, k) {
    ws.events.push({ type, k, travelled: sc.level.travelled, progress: sc.level.progress(sc.orbY), elapsed: sc.elapsed });
  }

  function beginTelegraph(sc, ws, m) {
    ws.tele = true; ws.teleT = 0; ws.pings = 0;
    ws.numeral.setText(m.finale ? `MOVEMENT ${m.numeral} · FINALE` : `MOVEMENT ${m.numeral}`).setColor(m.finale ? T.textBonus : T.textDim);
    ws.title.setText(m.name).setColor(m.color || T.text);
    ws.numeral.setVisible(true); ws.title.setVisible(true);
    log(ws, sc, 'telegraph', m.index);
    sc.sfx('telegraphPing', 0.12, { gain: 0.8 });
    ws.pings = 1;
  }

  function fireShift(sc, ws, m) {
    ws.i = m.index; ws.tele = false; ws.afterT = 0; ws.railColor = m.rail;
    log(ws, sc, 'shift', m.index);
    const v = ws.view;
    if (v) {
      if (v.rails) { v.rails.clear(); drawRails(v.rails, m.rail, sc.SW, sc.SH); }
      if (ws.sweep) ws.sweep.clear();
      if (ws.canFade) {
        ws.fadeBg.setTexture(m.backdrop).setAlpha(0).setVisible(true);
        ws.fadeKey = m.backdrop;
        ws.fade = { t: 0, key: m.backdrop, k: m.index };
      }
    }
    ws.layerOn = m.layer === 'stem';
    sc.sfx('worldIntro', 0.12, { gain: C.worldShift.stingGain });
    if (m.finale) ws.stings.push({ t: 60 / sc.trackBpm(), name: 'milestone', gain: 0.5 });
  }

  // Once per playing frame, after the level moved.
  function update(sc, dt) {
    const ws = stateOf(sc);
    if (!ws) return;
    const travelled = sc.level.travelled;
    const next = ws.res[ws.i + 1];
    if (next) {
      if (!ws.tele && travelled >= next.tele.travelled) beginTelegraph(sc, ws, next);
      if (ws.tele) {
        ws.teleT += dt;
        const p = clamp01((travelled - next.tele.travelled) / (next.travelled - next.tele.travelled));
        // Soft countdown pings on the last two beats of the lead (the first one played when it began).
        const want = p >= 0.75 ? 3 : p >= 0.5 ? 2 : 1;
        while (ws.pings < want) { ws.pings++; sc.sfx('telegraphPing', 0.12, { gain: 0.8 }); }
        if (ws.sweep) {
          ws.sweep.clear();
          const head = p * sc.SH;
          drawRails(ws.sweep, next.rail, sc.SW, sc.SH, head);
          ws.sweep.fillStyle(0xffffff, 0.85).fillCircle(6, head, 5).fillCircle(sc.SW - 6, head, 5);
        }
      }
      if (travelled >= next.travelled) fireShift(sc, ws, next);
    }
    // The crossfade: the incoming backdrop rises over the old one, then becomes it.
    if (ws.fade) {
      ws.fade.t += dt;
      const u = clamp01(ws.fade.t / ws.res[ws.fade.k].fadeSec);
      const a = u * u * (3 - 2 * u);
      ws.fadeBg.setAlpha(a);
      if (u >= 1) {
        ws.view.worldBg.setTexture(ws.fade.key);
        ws.view.worldBgKey = ws.bgKey = ws.fade.key;
        ws.fadeBg.setVisible(false).setAlpha(0);
        log(ws, sc, 'faded', ws.fade.k);
        ws.fade = null;
      }
    }
    if (ws.fadeBg && ws.fadeBg.visible) ws.fadeBg.tilePositionY = -(sc.scroll * 2) * 0.3; // the same drift as SpriteView gives worldBg
    if (ws.sweep && ws.view.rails) ws.sweep.setAlpha(ws.view.rails.alpha); // the sweep breathes with the rails
    // Banner: in over 0.3 s from the telegraph, out after the hold.
    if (ws.tele || ws.afterT >= 0) {
      let a = 0.92;
      if (ws.tele) a *= clamp01(ws.teleT / 0.3);
      else {
        ws.afterT += dt;
        const over = ws.afterT - C.worldShift.bannerHoldSec;
        a *= over <= 0 ? 1 : clamp01(1 - over / C.worldShift.bannerFadeSec);
        if (a <= 0) { ws.afterT = -1; ws.numeral.setVisible(false); ws.title.setVisible(false); }
      }
      ws.numeral.setAlpha(a); ws.title.setAlpha(a);
    }
    // Delayed stings, from the run's own time.
    for (let i = ws.stings.length - 1; i >= 0; i--) {
      const s = ws.stings[i];
      s.t -= dt;
      if (s.t <= 0) { ws.stings.splice(i, 1); sc.sfx(s.name, 0, { gain: s.gain }); }
    }
  }

  // GameScene.updateStem asks: should the world's Overdrive stem be playing as a movement layer?
  function wantsStem(sc) {
    const ws = stateOf(sc);
    return !!ws && ws.layerOn;
  }

  // The end screen of the lab stage borrows the finale title colour (same text: "Prototype clear").
  function completeStyle(sc) {
    if (!stateOf(sc)) return;
    sc.titleText.setColor(T.textBonus).setFontSize(44);
  }

  function register() {
    if (!Pulse.Lab || Pulse.Lab.find(ID)) return null;
    const stage = ENTRY.make();
    return Pulse.Lab.register({ id: ID, title: ENTRY.title, desc: ENTRY.desc, base: ENTRY.base, stage, flags: Object.assign({}, ENTRY.flags) });
  }

  Pulse.WorldShift = {
    ID, MOVEMENTS, ENTRY, buildItems, resolve, attach, reset, detach, update, wantsStem, completeStyle, register,
    state: stateOf,
  };

  // lab.js loads after this file in index.html, so register once every script has run (before Phaser boots).
  if (Pulse.Lab) register();
  else document.addEventListener('DOMContentLoaded', register);
})();
