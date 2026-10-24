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
  restartLockMs: 380,
  maxFrameSeconds: 0.05,
};

// PLACEHOLDER palette. Replace when Gemini's art direction is approved.
Pulse.THEME = {
  font: 'system-ui, -apple-system, Roboto, "Segoe UI", sans-serif',
  background: 0x0f1328,
  backgroundCss: '#0f1328',
  speedLine: 0x1c2347,
  wall: 0x2f3b6b,
  wallEdge: 0x7c8cff,
  orb: 0x4fe3c1,
  orbShrunk: 0x8fd8ff,
  orbCore: 0xe6fffa,
  pickup: 0xffc94d,
  danger: 0xff5d6c,
  text: '#eef1ff',
  textDim: '#8a93c2',
  textAccent: '#ffc94d',
  textDanger: '#ff5d6c',
};
