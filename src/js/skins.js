// Cosmetic orb skins. Looks only: skins never change size, speed, timing or collection.
// `sprite` names Gemini's v2.0 atlas frames; `colors` are used when sprites aren't available.
Pulse.SKINS = [
  {
    id: 'classic', name: 'Classic', unlockStars: 0,
    colors: { orb: 0x00f0ff, shrunk: 0xe0ffff, core: 0xffffff },
    sprite: { atlas: 'pulse_gameplay', prefix: 'player_orb_', arcPrefix: 'player_tension_arcs_' },
  },
  {
    id: 'solar-flare', name: 'Solar Flare', unlockStars: 3,
    colors: { orb: 0xff7a00, shrunk: 0xfff3b0, core: 0xfff3b0 },
    sprite: { atlas: 'pulse_skins', prefix: 'skin_solar_flare_', arcPrefix: 'skin_solar_flare_tension_arcs_' },
  },
  {
    id: 'void-prism', name: 'Void Prism', unlockStars: 6,
    colors: { orb: 0xa855f7, shrunk: 0xf3e8ff, core: 0xf3e8ff },
    sprite: { atlas: 'pulse_skins', prefix: 'skin_void_prism_', arcPrefix: 'skin_void_prism_tension_arcs_' },
  },
  {
    id: 'retro-green', name: 'Retro Green', unlockStars: 9,
    colors: { orb: 0x00ff66, shrunk: 0xccffe0, core: 0xccffe0 },
    sprite: { atlas: 'pulse_skins', prefix: 'skin_retro_green_', arcPrefix: 'skin_retro_green_tension_arcs_' },
  },
  // v4.0 skins; thresholds from Gemini's integration guide (campaign now has 36 stars).
  {
    id: 'violet-nova', name: 'Violet Nova', unlockStars: 12,
    colors: { orb: 0xd946ef, shrunk: 0xfae8ff, core: 0xffffff },
    sprite: { atlas: 'pulse_skins', prefix: 'skin_violet_nova_', arcPrefix: 'skin_violet_nova_tension_arcs_' },
  },
  {
    id: 'whiteout', name: 'Whiteout', unlockStars: 15,
    colors: { orb: 0xf1f5f9, shrunk: 0xffffff, core: 0x0f172a },
    sprite: { atlas: 'pulse_skins', prefix: 'skin_whiteout_', arcPrefix: 'skin_whiteout_tension_arcs_' },
  },
  // Gemini's 30-stage expansion skins (atlas `pulse_expansion`; no tension-arc frames, so arcPrefix is null).
  // Thresholds follow Gemini's proposal for the 90-star campaign; the existing six keep theirs. Stars come from
  // the campaign only, so 72 needs stages that are not built yet (18 stages = 54 stars today).
  {
    id: 'cyber-katana', name: 'Cyber Katana', unlockStars: 24,
    colors: { orb: 0xff3b6b, shrunk: 0xffd1dc, core: 0x00f0ff },
    sprite: { atlas: 'pulse_expansion', prefix: 'skin_cyber_katana_', arcPrefix: null },
  },
  {
    id: 'chrono-shard', name: 'Chrono Shard', unlockStars: 36,
    colors: { orb: 0x00f5a0, shrunk: 0xd1ffee, core: 0xffffff },
    sprite: { atlas: 'pulse_expansion', prefix: 'skin_chrono_shard_', arcPrefix: null },
  },
  {
    id: 'plasma-singularity', name: 'Plasma Singularity', unlockStars: 54,
    colors: { orb: 0xffb800, shrunk: 0xfff1b8, core: 0xa855f7 },
    sprite: { atlas: 'pulse_expansion', prefix: 'skin_plasma_singularity_', arcPrefix: null },
  },
  {
    id: 'aether-crown', name: 'Aether Crown', unlockStars: 72,
    colors: { orb: 0x38bdf8, shrunk: 0xe0f7ff, core: 0xffe08a },
    sprite: { atlas: 'pulse_expansion', prefix: 'skin_aether_crown_', arcPrefix: null },
  },
];

Pulse.Skins = {
  byId(id) {
    return Pulse.SKINS.find((s) => s.id === id) || null;
  },

  // Unlocks are kept once earned, even if the star total later changes.
  isUnlocked(save, skin) {
    return skin.unlockStars <= Pulse.Campaign.totalStars(save) || save.skins.unlocked.includes(skin.id);
  },

  // Adds newly earned skins to the save; returns the skins unlocked by this call.
  grantUnlocks(save, totalStars) {
    const added = [];
    for (const skin of Pulse.SKINS) {
      if (skin.unlockStars <= totalStars && !save.skins.unlocked.includes(skin.id)) {
        save.skins.unlocked.push(skin.id);
        if (skin.unlockStars > 0) added.push(skin);
      }
    }
    return added;
  },

  // The selected skin, falling back to Classic if the stored choice is unknown or locked.
  selected(save) {
    const skin = this.byId(save.skins.selected);
    return skin && this.isUnlocked(save, skin) ? skin : Pulse.SKINS[0];
  },

  select(save, id) {
    const skin = this.byId(id);
    if (!skin || !this.isUnlocked(save, skin)) return false;
    save.skins.selected = id;
    return true;
  },
};
