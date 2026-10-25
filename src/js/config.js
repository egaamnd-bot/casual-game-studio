// Tuning values and placeholder palette. Gameplay code reads everything from here,
// so balancing and the final art swap happen in one place.
window.Pulse = window.Pulse || {};

// Coordinates. Gameplay runs in "track space": `x` runs across the lane (0..width) and `y`
// runs along the direction of travel, increasing as things move toward and past the orb.
// The screen is landscape: track x maps to screen y (lane = screen height, 540) and track y maps
// to screen x reversed, so obstacles enter on the right and move left. The screen width (the
// track length) follows the phone's aspect ratio between minLength and maxLength.
// See GameScene.create and docs/LANDSCAPE.md.
Pulse.CONFIG = {
  width: 540, // lane width = landscape screen height
  minLength: 860, // track length = landscape screen width (16:9 = 960)
  maxLength: 1240,

  orb: {
    x: 270, // lane centre (screen vertical centre)
    yRatio: 0.7, // 70% of the track is ahead of the orb: orb sits 30% from the left edge
    radius: 56,
    minRadius: 20,
    shrinkRate: 190, // px per second while holding
    growRate: 260, // px per second after release
  },

  speed: { start: 270, perSecond: 8, max: 640 },

  // Endless difficulty reaches its maximum after this many seconds.
  spacing: { rampSeconds: 70 },

  // Every gap leaves at least this much room around a fully shrunk orb.
  fairMargin: 8,
  wallMinWidth: 24,

  gate: { thickness: 36, maxShift: 70 },

  // Full-width cyan barrier: smashed if the orb is charged (near full size), fatal if shrunk.
  // A *charged* barrier (thicker, double-edged) also needs a full charge ring: the orb must
  // have stayed at full size for `chargeTime` seconds before impact.
  barrier: { thickness: 22, chargedThickness: 30, chargeTime: 0.3 },

  // Fairness: minimum clear time (s) to switch size between two demands, used by
  // Pulse.Track.validateItems for campaign stages and Endless patterns alike.
  track: {
    minWallSpace: 40, // px between any two walls/barriers, for readability
    minMixedSpace: 80, // px between a gap wall and a barrier, so the two kinds read apart
    toSmall: 0.35, // grown (or start) → must be shrunk for a gate
    toBarrier: 0.32, // shrunk → must be charged for a barrier
    toChargedBarrier: 0.62, // shrunk → regrown AND fully charged (0.32 + 0.3 charge time)
    toEnergy: 0.32, // shrunk → charged for gold
    energyToSmall: 0.32, // gold → shrunk again
    bonusTime: 0.22, // either side of a mint bonus: it's the risky option
  },

  pickup: {
    radius: 14,
    // The orb must be within this many px of full size ("charged") to reach a pickup or
    // smash a barrier.
    sizeTolerance: 8,
    // Pickups render at this opacity whenever the orb is too small to collect them.
    dimAlpha: 0.45,
  },

  campaign: {
    finishThickness: 24,
    defaultStars: { two: 0.6, three: 0.9 },
  },

  // Rhythm layer (rhythm.js). The music enhances the game; no action has to be on the beat.
  rhythm: {
    refLength: 960, // track length (16:9 screen width) used when a stage is compiled without a screen
    syncTolerance: 0.08, // s: how far the music may drift from the run clock before it is re-aligned
    pulseSharpness: 3, // how quickly the beat pulse eases out
  },

  // Trailer look (docs/RHYTHM.md): a round glowing sphere with a comet tail, crimson chevron walls,
  // a darker field. `enabled: false` returns to the v4 octagon-orb and sprite-wall look.
  comet: {
    enabled: true,
    tailBase: 2.0, // tail length = this × radius ...
    tailPerSpeed: 0.62, // ... + this × speed (px/s), scaled down while the orb is shrunk
    nodes: 10, // pooled sparkle nodes behind the orb (never more)
    nodeIntervalMs: 28,
    backdropAlpha: 0.5, // dims the v4 background so the sphere and walls pop
  },

  // Moving obstacles (see Pulse.Rhythm.motionOffset). The gap moves, but even at its tightest it
  // still leaves the same clearance a static gap of that `need` would.
  motion: {
    maxRate: 100, // px/s: fastest a gap edge may move (the orb shrinks at 190)
    minBeats: 2, // shortest period, so the swing is always readable
  },

  multiplierMax: 5,
  // Feedback only (no points): call out every Nth obstacle cleared while at the max multiplier.
  maxStreakCallout: 10,
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
