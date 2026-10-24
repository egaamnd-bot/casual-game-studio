// Cosmetic orb skins. Colours only: skins never change size, speed, timing or collection.
// PLACEHOLDER palettes until Gemini's skin artwork is approved and integrated.
Pulse.SKINS = [
  { id: 'classic', name: 'Classic', unlockStars: 0, colors: { orb: 0x4fe3c1, shrunk: 0x8fd8ff, core: 0xe6fffa } },
  { id: 'solar-flare', name: 'Solar Flare', unlockStars: 3, colors: { orb: 0xff9d3d, shrunk: 0xffd08a, core: 0xfff4dc } },
  { id: 'void-prism', name: 'Void Prism', unlockStars: 6, colors: { orb: 0xa47dff, shrunk: 0xd2c0ff, core: 0xf3eeff } },
  { id: 'retro-green', name: 'Retro Green', unlockStars: 9, colors: { orb: 0x5cf26e, shrunk: 0xb4ffbc, core: 0xecffee } },
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
