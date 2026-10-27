// Developer Campaign / QA Gauntlet (docs/DEV_GAUNTLET.md). A short, curated sequence of Prototype Lab entries, one per mechanic, so
// the Producer can exercise every approved mechanic on the phone without playing 30 stages. Developer/QA tool only:
//   - Every section is an ordinary Lab entry (src/js/lab.js): not in Pulse.STAGES, never writes the save, no stars/unlocks/best score.
//   - Each section runs the REAL game systems. Stages are slices of authored campaign stages (copied, never edited) or the
//     prototype's own Lab stage, and the section's `flags` are the same switches the prototype already reads as scene.lab.flags,
//     so leaving a section drops every flag with it. Nothing here touches CONFIG or a Pulse.* global except the guard below.
//   - Guard: CONFIG.gauntlet.enabled (and CONFIG.lab.enabled). Off => no section is registered and the LAB screen shows no entry.
// Hooks in game-scene.js are all `if (Pulse.Gauntlet)`: attach / detach / reset / complete / next, plus one flag in grazeOn().
(function () {
  const C = Pulse.CONFIG;
  C.gauntlet = Object.assign({ enabled: true }, C.gauntlet || {});
  const GROUP = 'gauntlet';

  const byId = (id) => Pulse.STAGES.find((s) => s.id === id);
  const slice = (id, a, b) => byId(id).items.slice(a, b + 1).map((it) => Object.assign({}, it));
  const clone = (o) => JSON.parse(JSON.stringify(o));

  // ---- The sections. `proof(scene, st)` reads what the run actually triggered (for the end screen and the tests). ----
  // `from` marks a section that reuses a prototype's own Lab entry (its stage and flags) instead of a campaign slice.
  const SPECS = [
    {
      key: 'core', mechanic: 'Core control: hold to shrink, release to grow', title: 'Shrink and grow',
      prompt: 'HOLD to shrink, RELEASE to grow. Slip through the small gaps, grow back out for the wide ones, and collect the gold.',
      trigger: 'Pass every gate and pick up the gold.',
      expect: 'Wide gates pass at any size, narrow gaps need you small, gold counts towards stars.',
      base: 's1-first-pulse', items: () => slice('s1-first-pulse', 0, 19),
      proof: (s) => ({ ok: s.energy >= 3, text: `gold collected: ${s.energy}` }),
    },
    {
      key: 'hazards', mechanic: 'Hazard avoidance: tight gaps and a moving gap', title: 'Hazards',
      prompt: 'Tight gaps, then one that swings. Stay small through the narrow ones and steer to the opening.',
      trigger: 'Clear the zig-zag of narrow gaps and the swinging gap without a hit.',
      expect: 'A hit ends the run exactly as in the campaign; clean passes build the combo.',
      base: 's4-split-decision', items: () => slice('s4-split-decision', 13, 24),
      proof: (s) => ({ ok: s.scoring.combo >= 4 || s.state === 'complete', text: `best combo this run: ${s.scoring.combo}` }),
    },
    {
      key: 'barriers', mechanic: 'Cyan barriers and the ready cue', title: 'Cyan barriers',
      prompt: 'Grow to full size and the orb glows ready. Smash the cyan barriers; a charged one also needs the full ring.',
      trigger: 'Be at full size when a barrier arrives.',
      expect: 'The ready cue shows, barriers smash (small orb = crash), charged barriers need the full ring.',
      base: 's7-double-trouble', items: () => slice('s7-double-trouble', 0, 27),
      proof: (s, st) => ({ ok: st.smashes >= 1, text: `barriers smashed: ${st.smashes}` }),
    },
    {
      key: 'routes', mechanic: 'Risk-reward routes', title: 'Risk routes',
      prompt: 'The wall splits in two. Left or right: one lane is safe, the other is harder and pays more.',
      trigger: 'Take the risk lane (the harder side) and collect all its mint notes; then try the safe lane.',
      expect: 'A fully collected risk lane counts as a route clear; the safe lane just passes and does not.',
      base: 's14-safe-or-sorry', items: () => slice('s14-safe-or-sorry', 5, 16),
      proof: (s) => ({ ok: (s.routeClears || 0) >= 1, text: `risk routes cleared: ${s.routeClears || 0}` }),
    },
    {
      key: 'mirror', mechanic: 'Mirror Pulse', title: 'Mirror Pulse',
      prompt: 'A violet echo appears opposite you. Both orbs must clear their gates at the same time.',
      trigger: 'Pass the telegraph, then clear the mirrored pairs.',
      expect: 'The echo mirrors your position; a hit by either orb ends the run; cleared pairs count.',
      base: 's7-double-trouble', items: () => slice('s7-double-trouble', 19, 49),
      proof: (s) => ({ ok: (s.mirrorClears || 0) >= 1, text: `mirror pairs cleared: ${s.mirrorClears || 0}` }),
    },
    {
      key: 'nearmiss', mechanic: 'Near-miss to Overdrive', title: 'Near-miss',
      prompt: 'Squeeze past walls with almost no room to spare: each close pass charges the Overdrive meter.',
      trigger: 'Pass a gate with the orb nearly touching the wall (within 8 px) without a hit.',
      expect: 'A graze flash and a small Overdrive charge, capped per run; nothing while Overdrive is already on.',
      base: 's10-precision', items: () => slice('s10-precision', 0, 24), flags: { graze: true },
      proof: (s) => ({ ok: (s.grazes || 0) >= 1 && s.od.chargedTotal > 0, text: `grazes: ${s.grazes || 0}, Overdrive charge from grazes: ${s.grazeCharge || 0}` }),
    },
    {
      key: 'resonance', mechanic: 'Resonance Gates', title: 'Resonance Gates', from: 'resonance',
      prompt: 'Wide gates with a glowing ring. Match your size to it as the gate passes for a small Overdrive bonus. Missing costs nothing.',
      trigger: 'Be inside the ring size while the gate is crossing you.',
      expect: 'One small Overdrive bonus per matched gate (capped); safe pass otherwise.',
      proof: (s) => { const z = Pulse.Resonance && Pulse.Resonance.stats(s); return { ok: !!z && z.count >= 1, text: `rings matched: ${z ? z.count : 0}` }; },
    },
    {
      key: 'symphony', mechanic: 'Shatter Symphony', title: 'Shatter Symphony',
      prompt: 'Keep a clean streak, take a risk route, smash a barrier. The music answers with a quiet arpeggio that builds.',
      trigger: 'Build a combo of 8 or more, clear the fork, smash the barriers.',
      expect: 'An arpeggio layer enters on the beat grid and thins out when you miss; effects never get late.',
      base: 's14-safe-or-sorry', items: () => slice('s14-safe-or-sorry', 0, 27), flags: { symphony: true },
      proof: (s, st) => ({ ok: st.peakArp >= 1.5, text: `arpeggio level reached: ${st.peakArp.toFixed(1)} of 3` }),
    },
    {
      key: 'worldshift', mechanic: 'World Shift', title: 'World Shift', from: Pulse.WorldShift ? Pulse.WorldShift.ID : 'world-shift',
      prompt: 'The lane colour sweeps, then the world changes. Take the calm after each shift. Three movements.',
      trigger: 'Play through all three movements (the shifts into II and III are the trigger).',
      expect: 'A banner and rail sweep telegraph each shift, the backdrop changes, a calm recovery follows.',
      proof: (s, st) => ({ ok: st.movements.size >= 2, text: `shifts seen: ${[...st.movements].join(', ') || 'none'}` }),
    },
  ];

  const sections = []; // registered Lab entries, in order
  const run = new WeakMap(); // scene -> per-run proof counters

  function makeEntry(spec, n) {
    const id = `gauntlet-${n}-${spec.key}`;
    let stage, flags, base;
    if (spec.from) {
      const src = Pulse.Lab.find(spec.from);
      if (!src) return null; // the prototype is not in this build: say so, never fake a section
      base = src.base;
      stage = Object.assign({}, src.stage, { id: `lab-${id}`, name: spec.title });
      flags = clone(src.flags);
    } else {
      base = spec.base;
      stage = Pulse.Lab.derive(spec.base, {
        id: `lab-${id}`, name: spec.title, intro: spec.prompt, teaches: spec.mechanic, profile: spec.trigger,
        hints: [], items: spec.items(),
      });
      flags = clone(spec.flags || {});
    }
    return { id, title: `${n}. ${spec.title}`, desc: spec.trigger, base, stage, flags, group: GROUP, n, spec };
  }

  function register() {
    if (!C.gauntlet.enabled || !C.lab.enabled || !Pulse.Lab || sections.length) return;
    const skipped = [];
    SPECS.forEach((spec) => {
      const e = makeEntry(spec, sections.length + 1);
      if (!e) { skipped.push(spec.key); return; }
      sections.push(Pulse.Lab.register(e));
    });
    Pulse.Gauntlet.skipped = skipped;
  }

  const isSection = (lab) => !!lab && lab.group === GROUP;
  const next = (lab) => (isSection(lab) ? sections[sections.indexOf(Pulse.Lab.find(lab.id)) + 1] || null : null);

  // ---- On the scene: tag, prompt (until the run starts), per-run proof. All of it dies in detach(). ----
  function attach(scene) {
    if (!isSection(scene.lab)) return;
    const UI = Pulse.UI, T = Pulse.THEME;
    const st = { smashes: 0, peakArp: 0, movements: new Set(), objs: [], realContact: scene.contact };
    run.set(scene, st);
    const e = scene.lab;
    st.tag = UI.text(scene, scene.SW / 2, 20, `GAUNTLET ${e.n}/${SPECS.length} · ${e.spec.title.toUpperCase()}`, 13, T.textDim).setDepth(9).setAlpha(0.75);
    st.prompt = UI.text(scene, scene.SW / 2, Math.round(scene.SH * 0.36), e.spec.prompt, 20, T.text, true).setDepth(30);
    st.prompt.setWordWrapWidth(scene.SW - 90).setAlign('center');
    st.sub = UI.text(scene, scene.SW / 2, Math.round(scene.SH * 0.47) + 56, `Try: ${e.spec.trigger}`, 15, T.textAccent).setDepth(30);
    st.sub.setWordWrapWidth(scene.SW - 90).setAlign('center');
    st.objs.push(st.tag, st.prompt, st.sub);
    scene.contact = function (kind, seg, prev) { if (kind === 'break' || kind === 'chargedBreak') st.smashes++; return st.realContact.call(this, kind, seg, prev); };
    st.onUpdate = () => sample(scene);
    scene.events.on('update', st.onUpdate);
    sample(scene);
  }

  function detach(scene) {
    const st = run.get(scene);
    if (!st) return;
    delete scene.contact; // drops the counting wrapper; the class method is back
    scene.events.off('update', st.onUpdate);
    st.objs.forEach((o) => o && o.destroy && o.destroy());
    run.delete(scene);
  }

  // A new run (first or retry): proof counters back to zero; the prompt shows again until the run starts.
  function reset(scene) {
    const st = run.get(scene);
    if (!st) return;
    st.smashes = 0; st.peakArp = 0; st.movements = new Set();
    st.prompt.setVisible(false); st.sub.setVisible(false); // a run is starting: the prompt gets out of the way at once (the state flips a moment later)
  }

  // Read-only: called every frame by the scene's own update event (and by the tests). Hides the prompt once the run starts.
  function sample(scene) {
    const st = run.get(scene);
    if (!st) return;
    st.prompt.setVisible(scene.state === 'ready'); st.sub.setVisible(scene.state === 'ready');
    const sym = Pulse.Symphony && Pulse.Symphony.current && Pulse.Symphony.current();
    if (sym && sym.v > st.peakArp) st.peakArp = sym.v;
    const ws = scene.ws;
    if (ws && ws.numeral && ws.numeral.text) st.movements.add(ws.numeral.text);
  }

  // The end screen: say what the run actually triggered (an observed result, not a claim).
  function complete(scene) {
    const st = run.get(scene);
    if (!st) return;
    sample(scene);
    scene.titleText.setText('Section clear');
    const p = scene.lab.spec.proof(scene, st);
    st.proofText && st.proofText.destroy();
    st.proofText = Pulse.UI.text(scene, scene.SW / 2, scene.titleText.y + 56, `${p.ok ? 'Triggered' : 'Not triggered'}: ${p.text}`, 16, p.ok ? Pulse.THEME.textAccent : Pulse.THEME.textDim).setDepth(40);
    st.proofText.setWordWrapWidth(scene.SW - 80).setAlign('center');
    st.objs.push(st.proofText);
    st.last = p;
  }

  Pulse.Gauntlet = {
    GROUP, SPECS, sections: () => sections.slice(), skipped: [],
    available: () => !!C.gauntlet.enabled && !!C.lab.enabled && sections.length > 0,
    isSection, next, attach, detach, reset, sample, complete, register,
    proof: (scene) => { const st = run.get(scene); return st ? scene.lab.spec.proof(scene, st) : null; },
    state: (scene) => run.get(scene) || null,
  };

  // The prototypes that register on DOMContentLoaded (World Shift, Symphony) added their listeners before this script ran, so
  // registering on the same event puts the Gauntlet last and every prototype's Lab entry exists. Never at load time.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', register);
  else register();
})();
