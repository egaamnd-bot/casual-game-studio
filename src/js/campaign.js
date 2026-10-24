// Campaign: compiles stage data into a fixed track, validates it, runs it through the shared
// Level segment pool and collision, and handles stars and stage progress.
(function () {
  const C = Pulse.CONFIG;
  const R = C.orb.radius;
  const ITEM_TYPES = ['gate', 'energy', 'bonus'];

  // Turns relative `space` values into absolute track positions. `at` is where the item's
  // near (bottom) edge sits, measured in distance travelled; pickups have zero height.
  function compile(stage, width) {
    const items = [];
    let prevTop = 0;
    for (let i = 0; i < stage.items.length; i++) {
      const src = stage.items[i];
      const h = src.type === 'gate' ? C.gate.thickness : 0;
      const item = { index: i, type: src.type, at: prevTop + src.space, h, space: src.space };
      if (src.type === 'gate') Pulse.setGap(item, src.need, src.shift || 0, width);
      items.push(item);
      prevTop = item.at + h;
    }
    const finishAt = prevTop + stage.exit.runout;
    const energyTotal = items.filter((it) => it.type === 'energy').length;
    const bonusTotal = items.filter((it) => it.type === 'bonus').length;
    return { stage, items, finishAt, energyTotal, bonusTotal };
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
      if (!(it.space > 0)) err(`item ${stage.items.indexOf(it)} needs space > 0`);
      if (it.type === 'gate' && !(typeof it.need === 'number')) err(`gate ${stage.items.indexOf(it)} needs a numeric need`);
    }
    if (errors.length) return errors;

    const track = compile(stage, width);
    const minNeed = C.orb.minRadius + C.fairMargin;
    let prev = null;
    for (const it of track.items) {
      const speed = speedAtDistance(stage, track.finishAt, it.at);
      if (it.type === 'gate') {
        if (it.need < minNeed - 1e-9) err(`gate ${it.index}: clearance ${it.need} below fair minimum ${minNeed}`);
        if (!(it.gapL < C.orb.x && it.gapR > C.orb.x)) err(`gate ${it.index}: gap does not contain the orb's path`);
      }
      if (prev) {
        const prevWall = prev.type === 'gate';
        const curWall = it.type === 'gate';
        if (prevWall && curWall) {
          const t = (it.space - 2 * R) / speed;
          if (t < C.campaign.minObstacleGapTime - 1e-9) err(`gate ${it.index}: only ${t.toFixed(2)}s after previous wall`);
        } else if (prevWall !== curWall) {
          // Wall ↔ pickup: there must be time to change size between them.
          const bonus = it.type === 'bonus' || prev.type === 'bonus';
          const minTime = bonus ? C.campaign.bonusMinReactTime : C.pickup.minReactTime;
          const t = (it.space - R - 2.5 * C.pickup.radius) / speed;
          if (t < minTime - 1e-9) err(`item ${it.index}: only ${t.toFixed(2)}s between wall and pickup (min ${minTime})`);
        }
      }
      prev = it;
    }
    return errors;
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

  function isUnlocked(save, index) {
    if (index <= 0) return true;
    const prev = Pulse.STAGES[index - 1];
    return !!prev && stageRecord(save, prev.id).completed;
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

  // Runs one compiled stage through the shared segment pool and collision of Pulse.Level.
  class CampaignLevel extends Pulse.Level {
    constructor(width, height, stage) {
      super(width, height, () => 0);
      this.track = compile(stage, width);
      this.reset();
    }

    reset() {
      super.reset();
      this.travelled = 0;
      this.nextIndex = 0;
    }

    speedAt() {
      return speedAtDistance(this.track.stage, this.track.finishAt, this.travelled);
    }

    update(dt, speed) {
      const dy = speed * dt;
      this.moveSegments(dy);
      this.travelled += dy;
      const items = this.track.items;
      while (this.nextIndex < items.length && this.travelled >= items[this.nextIndex].at) {
        this.spawnItem(items[this.nextIndex++]);
      }
    }

    spawnItem(it) {
      const seg = this.obtain();
      seg.active = true;
      seg.scored = false;
      seg.resolved = false;
      seg.taken = false;
      seg.h = it.h;
      seg.y = this.travelled - it.at - it.h;
      if (it.type === 'gate') {
        seg.kind = 'gate';
        seg.gapL = it.gapL;
        seg.gapR = it.gapR;
        seg.need = it.need;
      } else {
        seg.kind = 'pickup';
        seg.variant = it.type;
        seg.offset = Pulse.PICKUP_OFFSET;
      }
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
    stageRecord, totalStars, isUnlocked, recordCompletion, CampaignLevel,
  };
})();
