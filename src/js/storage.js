// Versioned save data in local storage. Storage can be unavailable or hold old or broken data,
// so every read is validated and every call is guarded.
//
// Format (key "pulse.save.v1"):
//   { version: 1,
//     endless:  { best: number },
//     campaign: { stages: { [stageId]: { completed: bool, bestStars: 0..3 } } },
//     skins:    { selected: skinId, unlocked: [skinId] } }
//
// The prototype's endless best score lives under "pulse.best". It is read on every load,
// so it can never be lost, and is still written so older builds keep working.
Pulse.Save = {
  KEY: 'pulse.save.v1',
  LEGACY_BEST_KEY: 'pulse.best',
  CORRUPT_KEY: 'pulse.save.corrupt',

  defaultStorage() {
    try {
      return window.localStorage;
    } catch (e) {
      return null;
    }
  },

  defaults() {
    return {
      version: 1,
      endless: { best: 0 },
      campaign: { stages: {} },
      skins: { selected: 'classic', unlocked: ['classic'] },
    };
  },

  // Builds a clean save from anything, keeping every valid field it recognises.
  sanitize(raw) {
    const data = this.defaults();
    if (!raw || typeof raw !== 'object') return data;
    const best = raw.endless && Number(raw.endless.best);
    if (Number.isFinite(best) && best > 0) data.endless.best = Math.floor(best);

    const stages = raw.campaign && raw.campaign.stages;
    if (stages && typeof stages === 'object') {
      for (const id of Object.keys(stages)) {
        const r = stages[id];
        if (!r || typeof r !== 'object') continue;
        const stars = Math.max(0, Math.min(3, Math.floor(Number(r.bestStars)) || 0));
        data.campaign.stages[id] = { completed: r.completed === true || stars > 0, bestStars: stars };
      }
    }

    if (raw.skins && typeof raw.skins === 'object') {
      if (typeof raw.skins.selected === 'string') data.skins.selected = raw.skins.selected;
      if (Array.isArray(raw.skins.unlocked)) {
        for (const id of raw.skins.unlocked) {
          if (typeof id === 'string' && !data.skins.unlocked.includes(id)) data.skins.unlocked.push(id);
        }
      }
    }
    return data;
  },

  load(storage) {
    storage = storage === undefined ? this.defaultStorage() : storage;
    let data = this.defaults();
    if (!storage) return data;
    try {
      const text = storage.getItem(this.KEY);
      if (text) {
        try {
          data = this.sanitize(JSON.parse(text));
        } catch (e) {
          // Keep the unreadable save for diagnosis, then continue with defaults.
          if (!storage.getItem(this.CORRUPT_KEY)) storage.setItem(this.CORRUPT_KEY, text);
        }
      }
      const legacy = parseInt(storage.getItem(this.LEGACY_BEST_KEY), 10);
      if (Number.isFinite(legacy) && legacy > data.endless.best) data.endless.best = legacy;
    } catch (e) {
      // Storage blocked: play on with defaults.
    }
    return data;
  },

  write(data, storage) {
    storage = storage === undefined ? this.defaultStorage() : storage;
    if (!storage) return;
    try {
      storage.setItem(this.KEY, JSON.stringify(data));
      storage.setItem(this.LEGACY_BEST_KEY, String(data.endless.best));
    } catch (e) {
      // Progress just won't persist this session.
    }
  },
};
