// Prototype Lab (docs/LAB.md). A registry of isolated, playable experiments that are NOT part of the campaign:
// their stages are not in Pulse.STAGES, never count towards stars or unlocks, and never write the save.
// Each prototype registers one entry from its own module; the menu's LAB button lists them (lab-scene.js).
//
//   Pulse.Lab.register({ id, title, desc, base, stage, flags })
//       id     unique, e.g. 'resonance'
//       base   id of a real campaign stage whose arc / world / backdrop / opener rule the lab stage inherits
//       stage  a stage definition (same DSL as stages.js; use Pulse.Lab.derive to start from an existing one);
//              it is validated by Pulse.Campaign.validate exactly like a campaign stage
//       flags  free-form prototype switches the entry carries for its own module (GameScene.lab.flags)
//   Pulse.Lab.derive(baseId, overrides)  shallow copy of a campaign stage with a new id / name / fields
//   Pulse.Lab.list() / find(id)
(function () {
  const entries = [];

  function stageIndexOf(id) {
    return Pulse.STAGES.findIndex((s) => s.id === id);
  }

  function derive(baseId, overrides) {
    const i = stageIndexOf(baseId);
    if (i < 0) throw new Error(`Pulse.Lab.derive: unknown base stage ${baseId}`);
    return Object.assign({}, Pulse.STAGES[i], overrides || {});
  }

  function register(entry) {
    const e = Object.assign({ flags: {} }, entry);
    if (!e.id || typeof e.id !== 'string') throw new Error('Pulse.Lab.register: id is required');
    if (entries.some((x) => x.id === e.id)) throw new Error(`Pulse.Lab.register: duplicate id ${e.id}`);
    if (Pulse.STAGES.some((s) => s.id === (e.stage && e.stage.id))) throw new Error(`Pulse.Lab.register: stage id ${e.stage.id} collides with a campaign stage`);
    e.baseIndex = stageIndexOf(e.base);
    if (e.baseIndex < 0) throw new Error(`Pulse.Lab.register: unknown base stage ${e.base}`);
    if (!e.stage || !e.stage.id) throw new Error('Pulse.Lab.register: stage is required');
    const errors = Pulse.Campaign.validate(e.stage, Pulse.CONFIG.width);
    if (errors.length) throw new Error(`Pulse.Lab.register: ${e.id} is not a valid stage: ${errors.join('; ')}`);
    entries.push(e);
    return e;
  }

  Pulse.Lab = {
    register,
    derive,
    list: () => entries.slice(),
    find: (id) => entries.find((e) => e.id === id) || null,
    // test helper: drop an entry (never used by the game)
    _remove: (id) => { const i = entries.findIndex((e) => e.id === id); if (i >= 0) entries.splice(i, 1); },
  };
})();
