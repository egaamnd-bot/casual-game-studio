// Shared helpers for tests/resonance.html and tests/resonance-run.html (docs/RESONANCE_GATES.md). Loaded after the game scripts.
const C = Pulse.CONFIG;
const Z = Pulse.Resonance;
const K = C.resonance;
const fails = [];
const notes = [];
let checks = 0;
const check = (ok, msg) => { checks++; if (!ok) fails.push(msg); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const scene = () => window.__pulseScene;
const fake = new WeakMap();
const clockOf = (sc) => { let c = fake.get(sc); if (!c) { c = { now: sc.time.now }; fake.set(sc, c); Object.defineProperty(sc.time, 'now', { get: () => c.now, set: () => {}, configurable: true }); } return c; };
const frames = (sc, n, until, ms) => { const c = clockOf(sc); const dt = ms || 16.667; for (let i = 0; i < n; i++) { c.now += dt; sc.update(c.now, dt); sc.draw && sc.draw(); if (until && until()) return true; } return !until; };
const errors = [];
window.addEventListener('error', (e) => errors.push(e.message));
const W = C.width;
const R = C.orb.radius;
const saveText = () => localStorage.getItem(Pulse.Save.KEY);
let seed = 987654; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const FPS = [[30, 33.333], [60, 16.667], [144, 6.944]];

// ---- In-game helpers ----
const pinFn = (q, fn) => Object.defineProperty(q, 'radius', { get: () => fn(q.elapsed), set: () => {}, configurable: true });
const unpin = (q) => { delete q.radius; };
// The radius over time of a list of taps [start, length] on a full-size orb (the smallest of them where taps overlap).
const tapShape = (taps) => (t) => {
  let r = R;
  for (const [ts, D] of taps) {
    if (t >= ts && t < ts + D) r = Math.min(r, Math.max(C.orb.minRadius, R - C.orb.shrinkRate * (t - ts)));
    const bottom = Math.max(C.orb.minRadius, R - C.orb.shrinkRate * D);
    const back = ts + D + (R - bottom) / C.orb.growRate;
    if (t >= ts + D && t < back) r = Math.min(r, bottom + C.orb.growRate * (t - ts - D));
  }
  return r;
};
const startLab = async (id, opts) => {
  scene().scene.start('game', { mode: 'campaign', lab: id });
  await wait(450);
  const q = scene();
  q.test = Object.assign({ holdReady: true, bot: true, route: 'safe' }, opts || {});
  q.startRun();
  frames(q, 2);
  return q;
};
// Runs until the state changes. `hook(q)` runs before every frame, `hitch` = { at: seconds, ms } makes one long frame.
const drive = (q, { ms = 16.667, hook, hitch } = {}) => {
  const c = clockOf(q);
  let hitched = false, n = 0;
  while (q.state === 'playing' && n++ < 200000) {
    let dt = ms;
    if (hitch && !hitched && q.elapsed >= hitch.at) { hitched = true; dt = hitch.ms; }
    c.now += dt;
    if (hook) hook(q);
    q.update(c.now, dt);
    q.draw();
  }
};
const outcome = (q) => ({ state: q.state, count: Z.stats(q).count, shown: Z.stats(q).shown, charge: Z.stats(q).charge, od: +q.od.chargedTotal.toFixed(6), score: q.score, energy: q.energy, t: +q.elapsed.toFixed(3), stars: q.result && q.result.stars });
const gateTimes = (q) => { const g = q.lab.flags.resonance.gates; return Object.keys(g).map((k) => ({ idx: +k, band: g[k], t: q.level.items[+k].hit, x: q.level.items[+k].cx0 - C.orb.x })); };
// Records every paid / burst resonance in the game.
let bursts = 0;
const burstAt = [];
const realCleared = Z.cleared;
Z.cleared = function (sc, s, r) { const st = sc.rz; const before = st && st.burst; realCleared.call(this, sc, s, r); if (sc.rz.burst && sc.rz.burst !== before) { bursts++; burstAt.push(Math.round(s.rz.at)); } };
// Overdrive would start by itself once ordinary contacts plus rewards fill the meter, and adds nothing while on. Most tests
// count crossings and payments, so they run with a meter that cannot fill; the equivalence tests use the real threshold.
const THRESHOLD = C.overdrive.threshold;
const odQuiet = () => { C.overdrive.threshold = 1e9; };
const odNormal = () => { C.overdrive.threshold = THRESHOLD; };
// The scene calls Pulse.Resonance.cleared by property lookup each time, so the wrapper above is live.

// Plays the lab stage once with no size changes (the bot only steers) and measures when each resonance gate's middle
// line reaches the orb. Returns the facts every test needs.
async function prepare() {
  odQuiet();
  const entry = Pulse.Lab.find('resonance');
  const gates = entry.flags.resonance.gates;
  const idxs = Object.keys(gates).map(Number);
  const q = await startLab('resonance');
  check(q.lab === entry && Z.on(q) && q.state === 'playing', 'the lab run plays with the resonance flag on');
  const GT = gateTimes(q);
  const seen = {};
  const mid = (s) => s.y + s.h / 2 - q.orbY;
  const prev = {};
  drive(q, { ms: 16.667, hook: (x) => { for (const s of x.level.segments) { if (!s.active || s.kind !== 'gate') continue; const at = Math.round(x.level.travelled - s.y - s.h); const d = mid(s); if (prev[at] !== undefined && prev[at] < 0 && d >= 0 && seen[at] === undefined) seen[at] = x.elapsed - (d / x.level.speedAt(x.elapsed)); prev[at] = d; } } });
  check(q.state === 'complete', `plain bot run completes (state ${q.state}, ${q.elapsed.toFixed(1)} s)`);
  check(q.elapsed >= 25 && q.elapsed <= 35, `the lab stage lasts 25-35 s (${q.elapsed.toFixed(1)} s)`);
  const plain = outcome(q);
  check(plain.count === 0 && plain.charge === 0, `a bot that never changes size earns no resonance (count ${plain.count})`);
  let worst = 0;
  for (const g of GT) { const at = Math.round(q.level.items[g.idx].at); const obs = seen[at]; worst = Math.max(worst, obs === undefined ? 99 : Math.abs(obs - g.t)); }
  check(worst < 0.03, `the compiled hit moment matches the observed middle-line crossing within 30 ms (worst ${(worst * 1000).toFixed(1)} ms)`);
  const D = 0.15; // a 150 ms tap dips to 27.5 px
  const tapsFor = (sel, delta) => GT.filter((g) => sel(g)).map((g) => [g.t - D / 2 + (delta || 0) - 0.06, D]); // the dip bottoms out at the middle line
  const play = async (fn, opts) => {
const x = await startLab('resonance');
bursts = 0;
pinFn(x, fn);
drive(x, opts);
unpin(x);
return { x, o: outcome(x), bursts };
  };
  const stdIdx = idxs.filter((i) => gates[i].join() === '26,46');
  return { entry, gates, idxs, GT, plain, D, tapsFor, play, stdIdx, cap0: K.runCap };
}

// Runs a page's tests and puts the verdict in the title (read by the headless runner).
function finish(name, run) {
  if (/manual=1/.test(location.search)) return; // ?manual=1 only loads the game (for looking at it by hand)
  run().then(() => { document.title = fails.length ? `FAIL ${fails.length}: ${fails.join(' | ')}` : `PASS ${name} ${checks} checks | ${notes.join(' | ')}`; })
.catch((e) => { document.title = 'FAIL error ' + e.message + ' ' + (e.stack || '').split('\n')[1]; });
}
