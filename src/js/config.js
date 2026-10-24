// Tuning values and placeholder palette. Gameplay code reads everything from here,
// so balancing and the final art swap happen in one place.
window.Pulse = window.Pulse || {};

Pulse.CONFIG = {
  width: 540,
  minHeight: 860,
  maxHeight: 1240,

  orb: {
    x: 270,
    yRatio: 0.7,
    radius: 56,
    minRadius: 20,
    shrinkRate: 190, // px per second while holding
    growRate: 260, // px per second after release
  },

  speed: { start: 270, perSecond: 8, max: 640 },

  // Distance between obstacles, expressed as reaction time at the current speed.
  spacing: { startTime: 1.0, minTime: 0.62, rampSeconds: 70, padding: 40 },

  // Every gap leaves at least this much room around a fully shrunk orb.
  fairMargin: 8,
  wallMinWidth: 24,
  firstObstacleDelay: 0.9,

  gate: { thickness: 36, shrinkChance: 0.45, shrinkChanceGrowth: 0.4, maxOffset: 70 },

  tunnel: {
    unlockSeconds: 12,
    chance: 0.18,
    chanceGrowth: 0.12,
    minLength: 160,
    maxLength: 380,
    extraClearance: 4,
    maxOffset: 24,
  },

  pickup: {
    radius: 14,
    chance: 0.55,
    // The orb must be within this many px of full size to reach a pickup.
    sizeTolerance: 8,
    minReactTime: 0.32,
    // Pickups render at this opacity whenever the orb is too small to collect them.
    dimAlpha: 0.45,
  },

  campaign: {
    // Minimum clear time between two walls, after subtracting the orb's diameter.
    minObstacleGapTime: 0.35,
    // Bonus diamonds are allowed tighter timing than normal energy; that is their risk.
    bonusMinReactTime: 0.22,
    finishThickness: 24,
    defaultStars: { two: 0.6, three: 0.9 },
  },

  multiplierMax: 5,
  // Cosmetic near-miss effect when the clearance left around the orb is at most this many px.
  nearMissMargin: 8,
  restartLockMs: 380,
  maxFrameSeconds: 0.05,
};

// Kinetic Vector / Precision Cyber-Grid palette (Gemini v2.0 style guide, docs/art/).
// Used directly by code-drawn shapes and as the fallback when sprites can't load.
Pulse.THEME = {
  font: 'system-ui, -apple-system, Roboto, "Segoe UI", sans-serif',
  background: 0x0b0f19,
  backgroundCss: '#0B0F19',
  speedLine: 0x162033,
  wall: 0x2b111b,
  wallEdge: 0xff2a54,
  gapEdge: 0xff7a00,
  orb: 0x00f0ff,
  orbShrunk: 0xe0ffff,
  orbCore: 0xe0ffff,
  pickup: 0xffb800,
  bonus: 0x00ff9d,
  dimTint: 0x475569,
  starEmpty: 0x1e2d47,
  finishA: 0xf8fafc,
  finishB: 0x1e2d47,
  panel: 0x101828,
  panelEdge: 0x1e2d47,
  progressTrack: 0x162033,
  progressFill: 0x00f0ff,
  danger: 0xff2a54,
  text: '#F8FAFC',
  textDim: '#94A3B8',
  textAccent: '#FFB800',
  textBonus: '#00FF9D',
  textDanger: '#FF2A54',
};

// Sprite scale factors, measured from Gemini's v2.0 art (authored for a 1080 px wide screen;
// this game is 540 wide). Gameplay sizes never change; art is scaled to fit them.
Pulse.ART = {
  base: 0.5, // general 1080 → 540 scale
  orbBodyRadius: 46, // solid radius of *_normal in sprite px
  orbShrunkRadius: 22, // solid radius of *_shrunk
  energyRadius: 24, // solid radius of orb_energy_gold_*
  bonusRadius: 28, // solid radius of orb_energy_mint_*
  pickupDrawRadius: 16, // on-screen solid radius for both pickup types
  wallBandTop: 12, // transparent rows above the hazard band in wall pieces
  capReach: 52, // wall_cap_left content ends at x=52 (cap_right starts at 64-52)
};
