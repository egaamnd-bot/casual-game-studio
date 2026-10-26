// Campaign: compiles stage data into a fixed track, validates it, runs it through the shared
// Level core (level.js), and handles stars and stage progress.
(function () {
  const C = Pulse.CONFIG;
  const ITEM_TYPES = ['gate', 'barrier', 'energy', 'bonus'];

  // Turns relative spacing into absolute track positions. `at` is where the item's near
  // (bottom) edge sits, measured in distance travelled; pickups have zero height.
  // Items give either `space` (px) or `t` (seconds of clear time before the item, converted
  // at the stage's top speed so the real time is never shorter than written).
  //
  // Beat alignment: every item is nudged later, never earlier, until its HIT MOMENT falls on the
  // stage's beat grid (`stage.grid` beats, default an eighth note; an item's own `beat` overrides
  // it), so clear times only ever grow. The hit moment is when the player feels the contact: a
  // note pickup at its collect radius, a barrier at the orb's edge, a gate at the wall's middle
  // (see `lead`). The speed ramp of the stage is fixed to its unsnapped length (`speedLength`), so
  // an item's arrival time is an exact function of its position. The orb sits at `height ×
  // orb.yRatio`, so the alignment holds on any screen length. Sounds are NOT delayed to the beat:
  // the obstacles are placed so that the contact itself lands on it.
  function compile(stage, width, height) {
    const orbY = Math.round((height || C.rhythm.refLength) * C.orb.yRatio);
    const bpm = stage.bpm || stage.world.bpm;
    const grid = stage.grid === undefined ? C.rhythm.grid : stage.grid;
    const first = build(stage, width, orbY, bpm, null, grid);
    if (!grid && !stage.items.some((it) => it.beat)) return first;
    return build(stage, width, orbY, bpm, first.finishAt, grid);
  }

  // Distance past the item's near edge at which the orb and the item make contact.
  function lead(item) {
    if (item.ring) return C.ring.thickness / 2;
    if (item.type === 'gate') return item.h / 2;
    if (item.type === 'barrier') return -C.orb.radius;
    return -C.pickup.collectRadius;
  }

  // Ring geometry. The ring turns half a revolution in `beats` beats while the orb is inside it, so
  // its radius is the distance the orb travels in that time (half of it each way), and the notch is
  // widened just enough to let an orb of radius `need` through both arcs: the same geometry that
  // Level.ringHit tests and the renderer draws.
  function buildRing(item, need, prof, orbY, beatSec) {
    const t = C.ring.thickness;
    const nb = item.ring.beats * beatSec;
    const df = item.at + orbY + t / 2; // travelled when the orb meets the front arc's centre line
    const tf = prof.time(df);
    const span = prof.dist(tf + nb) - df; // distance covered during the half turn
    const omega = Math.PI / nb;
    const alpha = Pulse.Rhythm.Ring.minAlpha(span / 2, t, omega, need, prof.speed(df), prof.speed(df + span)) + C.ring.margin;
    item.ring = { dir: item.ring.dir, beats: item.ring.beats, R: span / 2, t, omega, tf, alpha };
    item.h = span + t;
  }

  function build(stage, width, orbY, bpm, speedLength, grid) {
    const items = [];
    const prof = speedLength ? Pulse.Rhythm.profile(stage.speed.start, stage.speed.end, speedLength) : null;
    const beatSec = Pulse.Rhythm.beatSeconds(bpm);
    let prevTop = 0;
    let prevType = 'start';
    const fair = Pulse.Track.fairState();
    for (let i = 0; i < stage.items.length; i++) {
      const src = stage.items[i];
      const space = src.space !== undefined ? src.space
        : Pulse.Track.spaceFor(prevType, src.type, src.t * (stage.pace || 1), stage.speed.end);
      const sp = stage.spread === undefined ? 1 : stage.spread;
      const placed = Object.assign({}, src, { space, x: (src.x || 0) * sp });
      if (src.slide && sp !== 1) placed.slide = Object.assign({}, src.slide, { amp: src.slide.amp * sp });
      const item = Pulse.Track.placeItem(placed, prevTop, width);
      // Fairness floor: the authored `t` is a request, never less than a fair spacing (level.js).
      const topSpeed = stage.speed.end;
      const need = Pulse.Track.floorSpace(fair, item, topSpeed, bpm, false);
      if (need > item.space) {
        item.at += need - item.space;
        item.space = need;
      }
      if (prof) {
        const ld = lead(item);
        const sub = src.beat !== undefined ? src.beat : grid;
        if (sub) {
          const step = beatSec * sub;
          const arrive = prof.time(item.at + orbY + ld);
          const onGrid = Math.ceil(arrive / step - 1e-6) * step;
          item.at = prof.dist(onGrid) - orbY - ld;
          item.space = item.at - prevTop;
        }
        item.arrive = prof.time(item.at + orbY); // leading edge reaches the orb's centre
        item.arriveBeat = item.arrive / beatSec;
        item.hit = prof.time(item.at + orbY + ld); // the moment of contact
        item.hitBeat = item.hit / beatSec;
        if (item.ring) buildRing(item, src.need, prof, orbY, beatSec);
      }
      item.index = i;
      Pulse.Track.commitFair(fair, item, stage.speed.end, bpm, false);
      items.push(item);
      prevTop = item.at + item.h;
      prevType = src.type;
    }
    const finishAt = prevTop + stage.exit.runout;
    const energyTotal = items.filter((it) => it.type === 'energy').length;
    const bonusTotal = items.filter((it) => it.type === 'bonus').length;
    return { stage, items, finishAt, speedLength: speedLength || finishAt, bpm, orbY, energyTotal, bonusTotal };
  }

  function speedAtDistance(stage, finishAt, travelled) {
    const t = Math.min(1, Math.max(0, travelled / finishAt));
    return stage.speed.start + (stage.speed.end - stage.speed.start) * t;
  }

  // Returns a list of human-readable problems; empty means the stage is valid and fair.
  function validate(stage, width) {
    const errors = [];
    const err = (msg) => errors.push(`${stage && stage.id || '(no id)'}: ${msg}`);
    if (!stage || typeof stage !== 'object') return ['stage is not an object'];
    if (typeof stage.id !== 'string' || !stage.id) err('missing id');
    if (typeof stage.name !== 'string' || !stage.name) err('missing name');
    if (!stage.sector || !stage.sector.id || !stage.sector.name) err('missing sector');
    if (!stage.world || !(stage.world.index >= 1) || !stage.world.music) err('missing world');
    if (typeof stage.intro !== 'string') err('missing intro');
    if (!stage.speed || !(stage.speed.start > 0) || !(stage.speed.end > 0)) err('speed.start and speed.end must be > 0');
    if (stage.speed && Math.max(stage.speed.start, stage.speed.end) > C.speed.max) err('speed above the game maximum');
    if (!stage.exit || stage.exit.type !== 'finish' || !(stage.exit.runout > 0)) err('exit must be { type: "finish", runout > 0 }');
    if (!Array.isArray(stage.items) || stage.items.length === 0) err('items must be a non-empty list');
    const stars = Object.assign({}, C.campaign.defaultStars, stage.stars);
    if (!(stars.two >= 0 && stars.two <= stars.three && stars.three <= 1)) err('stars need 0 <= two <= three <= 1');
    if (errors.length) return errors;

    for (const it of stage.items) {
      if (!ITEM_TYPES.includes(it.type)) err(`unknown item type "${it.type}"`);
      if (!(it.space > 0) && !(it.t >= 0)) err(`item ${stage.items.indexOf(it)} needs space > 0 or t >= 0`);
      if (it.x !== undefined && !(Math.abs(it.x) <= C.orb.x - C.steer.margin)) err(`item ${stage.items.indexOf(it)} x is outside the lane`);
      if (it.type === 'gate' && !(typeof it.need === 'number')) err(`gate ${stage.items.indexOf(it)} needs a numeric need`);
      if (it.ring) {
        const n = stage.items.indexOf(it);
        if (it.type !== 'gate' || it.length || it.slide) err(`item ${n}: a ring is a plain gate`);
        if (!it.beat) err(`item ${n}: a ring must be beat-aligned (use on())`);
        if (!(it.ring.beats === undefined || (it.ring.beats >= 1.5 && it.ring.beats <= 4))) err(`item ${n}: ring half-turn must take 1.5-4 beats`);
      }
      if (it.slide) {
        const n = stage.items.indexOf(it);
        const bpm = stage.bpm || stage.world.bpm;
        const s = it.slide;
        if (it.type !== 'gate' || it.length) err(`item ${n}: only plain gaps can move`);
        if (!it.beat) err(`item ${n}: a moving gap must be beat-aligned (use on())`);
        if (!(s.amp > 0) || !(s.beats >= C.motion.minBeats)) err(`item ${n}: slide needs amp > 0 and beats >= ${C.motion.minBeats}`);
        else if (Pulse.Rhythm.motionRate({ amp: s.amp * (stage.spread === undefined ? 1 : stage.spread), beats: s.beats, kind: s.kind }, bpm) > C.motion.maxRate) {
          err(`item ${n}: gap moves ${Pulse.Rhythm.motionRate({ amp: s.amp * (stage.spread === undefined ? 1 : stage.spread), beats: s.beats, kind: s.kind }, bpm).toFixed(0)} px/s, above the ${C.motion.maxRate} limit`);
        }
        const cx = C.orb.x + (it.x || 0);
        const reach = it.need + (s && s.amp) + C.wallMinWidth;
        if (cx - reach < 0 || cx + reach > width) err(`item ${n}: swing leaves the lane`);
        if (s && s.kind !== undefined && s.kind !== 'slide' && s.kind !== 'breathe') err(`item ${n}: unknown motion kind`);
      }
    }
    if (errors.length) return errors;

    const track = compile(stage, width);
    for (const it of track.items) {
      if (!it.ring) continue;
      const r = it.ring;
      const n = it.index;
      if (r.R < C.ring.minRadius || r.R > C.ring.maxRadius) err(`item ${n}: ring radius ${r.R.toFixed(0)} px outside ${C.ring.minRadius}-${C.ring.maxRadius}`);
      if (r.omega > C.ring.maxAngular) err(`item ${n}: ring turns ${r.omega.toFixed(2)} rad/s, above the ${C.ring.maxAngular} limit`);
      if (r.alpha > C.ring.maxAlpha) err(`item ${n}: ring notch ${(r.alpha * 57.3).toFixed(0)} degrees half-width is too wide for the need`);
    }
    if (errors.length) return errors;
    return Pulse.Track.validateItems(track.items, (it) => speedAtDistance(stage, track.speedLength, it.at), stage.id, { bpm: track.bpm, width });
  }

  function starRules(stage) {
    return Object.assign({}, C.campaign.defaultStars, stage.stars);
  }

  // 0 stars if not completed; otherwise 1–3 by share of energy pairs collected.
  // A stage with no energy awards 3 stars on completion.
  function computeStars(stage, completed, collected, total) {
    if (!completed) return 0;
    if (!(total > 0)) return 3;
    const rules = starRules(stage);
    const need = (share) => Math.ceil(share * total - 1e-9);
    let stars = 1;
    if (collected >= need(rules.two)) stars = 2;
    if (collected >= need(rules.three)) stars = 3;
    return stars;
  }

  function stageRecord(save, id) {
    return save.campaign.stages[id] || { completed: false, bestStars: 0 };
  }

  function totalStars(save) {
    let total = 0;
    for (const s of Pulse.STAGES) total += stageRecord(save, s.id).bestStars;
    return total;
  }

  // A stage is open if it's the first, the one before it is completed, or it was completed
  // itself (so a stage a player has already beaten can never re-lock if stages are inserted).
  function isUnlocked(save, index) {
    if (index <= 0) return true;
    const prev = Pulse.STAGES[index - 1];
    const self = Pulse.STAGES[index];
    return (!!prev && stageRecord(save, prev.id).completed) || (!!self && stageRecord(save, self.id).completed);
  }

  // The stage a player should see first: the first one not yet completed (or the last).
  function nextStageIndex(save) {
    const i = Pulse.STAGES.findIndex((s, k) => isUnlocked(save, k) && !stageRecord(save, s.id).completed);
    return i < 0 ? Pulse.STAGES.length - 1 : i;
  }

  // Records a completed run. Never lowers a stored star rating. Returns what changed.
  function recordCompletion(save, stageId, stars) {
    const old = stageRecord(save, stageId);
    const index = Pulse.STAGES.findIndex((s) => s.id === stageId);
    const nextWasLocked = index >= 0 && index + 1 < Pulse.STAGES.length && !isUnlocked(save, index + 1);
    save.campaign.stages[stageId] = { completed: true, bestStars: Math.max(old.bestStars, stars) };
    const newSkins = Pulse.Skins.grantUnlocks(save, totalStars(save));
    return {
      previousBest: old.bestStars,
      bestStars: save.campaign.stages[stageId].bestStars,
      unlockedNext: nextWasLocked && isUnlocked(save, index + 1) ? Pulse.STAGES[index + 1] : null,
      newSkins,
    };
  }

  // Runs one compiled stage through the shared Level core; speed depends on distance travelled,
  // so a stage plays identically every time.
  class CampaignLevel extends Pulse.Level {
    constructor(width, height, stage) {
      super(width, height);
      this.track = compile(stage, width, height);
      this.items = this.track.items;
      this.bpm = this.track.bpm; // moving obstacles follow the stage's tempo
    }

    speedAt() {
      return speedAtDistance(this.track.stage, this.track.speedLength, this.travelled);
    }

    // Screen y of the finish line; the stage is complete once it reaches the orb.
    finishY() {
      return this.travelled - this.track.finishAt;
    }

    progress(orbY) {
      return Math.min(1, this.travelled / (this.track.finishAt + orbY));
    }
  }

  Pulse.Campaign = {
    compile, validate, speedAtDistance, computeStars, starRules,
    stageRecord, totalStars, isUnlocked, nextStageIndex, recordCompletion, CampaignLevel,
  };
})();
