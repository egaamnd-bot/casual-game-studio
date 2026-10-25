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
  // Beat alignment: an item with `beat: n` (see `on()` in stages.js) is nudged later, never
  // earlier, until it reaches the orb on a multiple of n beats of the stage's tempo, so clear
  // times only ever grow. The speed ramp of such a stage is fixed to its unsnapped length
  // (`speedLength`), so an item's arrival time is an exact function of its position. The orb
  // sits at `height × orb.yRatio`, so the alignment holds on any screen length.
  function compile(stage, width, height) {
    const orbY = Math.round((height || C.rhythm.refLength) * C.orb.yRatio);
    const bpm = stage.bpm || stage.world.bpm;
    if (!stage.items.some((it) => it.beat)) return build(stage, width, orbY, bpm, null);
    return build(stage, width, orbY, bpm, build(stage, width, orbY, bpm, null).finishAt);
  }

  function build(stage, width, orbY, bpm, speedLength) {
    const items = [];
    const prof = speedLength ? Pulse.Rhythm.profile(stage.speed.start, stage.speed.end, speedLength) : null;
    const beatSec = Pulse.Rhythm.beatSeconds(bpm);
    let prevTop = 0;
    let prevType = 'start';
    for (let i = 0; i < stage.items.length; i++) {
      const src = stage.items[i];
      const space = src.space !== undefined ? src.space
        : Pulse.Track.spaceFor(prevType, src.type, src.t, stage.speed.end);
      const item = Pulse.Track.placeItem(Object.assign({}, src, { space }), prevTop, width);
      if (prof) {
        const arrive = prof.time(item.at + orbY);
        if (src.beat) {
          const grid = beatSec * src.beat;
          const onGrid = Math.ceil(arrive / grid - 1e-6) * grid;
          item.at = prof.dist(onGrid) - orbY;
          item.space = item.at - prevTop;
        }
        item.arrive = prof.time(item.at + orbY);
        item.arriveBeat = item.arrive / beatSec;
      }
      item.index = i;
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
      if (it.type === 'gate' && !(typeof it.need === 'number')) err(`gate ${stage.items.indexOf(it)} needs a numeric need`);
      if (it.slide) {
        const n = stage.items.indexOf(it);
        const bpm = stage.bpm || stage.world.bpm;
        const s = it.slide;
        if (it.type !== 'gate' || it.length) err(`item ${n}: only plain gaps can move`);
        if (!it.beat) err(`item ${n}: a moving gap must be beat-aligned (use on())`);
        if (!(s.amp > 0) || !(s.beats >= C.motion.minBeats)) err(`item ${n}: slide needs amp > 0 and beats >= ${C.motion.minBeats}`);
        else if (Pulse.Rhythm.motionRate(s, bpm) > C.motion.maxRate) {
          err(`item ${n}: gap moves ${Pulse.Rhythm.motionRate(s, bpm).toFixed(0)} px/s, above the ${C.motion.maxRate} limit`);
        }
        if (it.need + (s && s.amp) > C.orb.x - C.wallMinWidth) err(`item ${n}: swing leaves the lane`);
        if (s && s.kind !== undefined && s.kind !== 'slide' && s.kind !== 'breathe') err(`item ${n}: unknown motion kind`);
      }
    }
    if (errors.length) return errors;

    const track = compile(stage, width);
    return Pulse.Track.validateItems(track.items, (it) => speedAtDistance(stage, track.speedLength, it.at), stage.id);
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
