// Tuning values and placeholder palette. Gameplay code reads everything from here,
// so balancing and the final art swap happen in one place.
window.Pulse = window.Pulse || {};

// Coordinates. Gameplay runs in "track space": `x` runs across the lane (0..width) and `y`
// runs along the direction of travel, increasing as things move toward and past the orb.
// The screen is PORTRAIT: track x is screen x and track y is screen y, so obstacles enter from
// the top and fall toward the orb, which sits `orb.yRatio` of the way down. The lane is the
// screen width (540); the track length is the screen height, which follows the phone's aspect
// ratio between minLength and maxLength (9:16 gives 960, 9:20 gives 1200).
// The orb steers left and right inside the lane (see `steer` and Pulse.Orb in level.js).
// See GameScene.create and docs/PORTRAIT_REWORK.md.
Pulse.CONFIG = {
  width: 540, // lane width = portrait screen width
  minLength: 860, // track length = portrait screen height (9:16 = 960)
  maxLength: 1240,

  orb: {
    x: 270, // lane centre: where the orb starts each run
    yRatio: 0.7, // 70% of the track is ahead of the orb: the orb sits 30% up from the bottom
    radius: 56,
    minRadius: 20,
    shrinkRate: 190, // px per second while holding
    growRate: 260, // px per second after release
  },


  // Lateral steering (docs/PORTRAIT_REWORK.md). One finger: touching shrinks the orb (as always),
  // dragging sideways steers it by the finger's movement, and the orb keeps gliding to wherever the
  // finger last sent it after you let go. The orb chases its target with a speed limit and an
  // acceleration limit, stepped in fixed slices so it moves the same at any frame rate.
  steer: {
    maxSpeed: 1150, // px/s: the fastest the orb can slide
    accel: 10000, // px/s^2
    follow: 16, // 1/s: how hard it pulls toward the target (the time constant is 1/follow s)
    margin: 44, // the orb's centre stays this far from each lane edge
    gain: 1.15, // orb movement per px of finger movement
    deadZone: 2, // px of finger jitter ignored
    // Fairness model for authored content (Pulse.Track.validateItems): how far the orb is assumed
    // to get between two obstacles. Deliberately well under maxSpeed, plus a delay for the player
    // to see the obstacle and drag, so average players are covered, not just perfect ones.
    fairSpeed: 520, // px/s
    latency: 0.18, // s before a needed move starts
    startSpeedFactor: 1, // (reserved) scales fairSpeed for the first obstacle of a run
  },

  speed: { start: 270, perSecond: 8, max: 640 },

  // Endless difficulty reaches its maximum after this many seconds.
  spacing: { rampSeconds: 70 },

  // Every gap leaves at least this much room around a fully shrunk orb.
  fairMargin: 8,
  wallMinWidth: 24,

  gate: { thickness: 36 },

  // Lateral room an authored gap must leave a fully shrunk orb on each side (a narrow window is
  // a pixel-perfect drag on a phone). Gaps can still be tight in size; this is the aiming margin.
  lateral: { minWindow: 14 },

  // Full-width cyan barrier: smashed if the orb is charged (near full size), fatal if shrunk.
  // A *charged* barrier (thicker, double-edged) also needs a full charge ring: the orb must
  // have stayed at full size for `chargeTime` seconds before impact.
  barrier: { thickness: 22, chargedThickness: 30, chargeTime: 0.3 },

  // Fairness: minimum clear time (s) to switch size between two demands, used by
  // Pulse.Track.validateItems for campaign stages and Endless patterns alike. Pickups have no size
  // demand any more (they are note targets collected on contact), so only gaps and barriers count.
  track: {
    minWallSpace: 40, // px between any two walls/barriers, for readability
    minMixedSpace: 80, // px between a gap wall and a barrier, so the two kinds read apart
    toSmall: 0.35, // grown (or start) → must be shrunk for a gate
    toBarrier: 0.32, // shrunk → must be charged for a barrier
    toChargedBarrier: 0.62, // shrunk → regrown AND fully charged (0.32 + 0.3 charge time)
  },

  // Pickups are musical note targets: collected the moment the orb's centre comes within
  // `collectRadius` of one, at any orb size. (They used to need a full-size orb; with steering that
  // made note trails impossible, because steering shrinks the orb. Documented in DECISIONS.md.)
  // `window` is the lateral reach the fairness validator assumes (a little under collectRadius);
  // `perfect` is the offset that counts as a Perfect (feedback only, never score).
  pickup: {
    radius: 14,
    collectRadius: 42,
    window: 34,
    perfect: 14,
    // The orb must be within this many px of full size ("charged") to smash a barrier.
    sizeTolerance: 8,
  },

  campaign: {
    finishThickness: 24,
    defaultStars: { two: 0.6, three: 0.9 },
  },

  // Rhythm layer (rhythm.js). The music enhances the game; no action has to be on the beat.
  rhythm: {
    refLength: 960, // track length (9:16 portrait screen height) used when a stage is compiled without a screen
    grid: 0.5, // beats: campaign items arrive on this grid by default (an eighth note)
    syncTolerance: 0.15, // s: how far the music may drift from the run clock before it is re-aligned (seeking is audible, so only for real drift)
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

  // Sound timing (docs/PORTRAIT_REWORK.md). Nothing the player does or hits waits for the beat:
  // input sounds (shrink, release) and contact sounds (pickup, pass, smash) play the instant they
  // happen. The music grid is met by *placing* obstacles so they arrive on beats (campaign items are
  // beat-aligned, see campaign.js), not by delaying sounds. `eventDelay` is kept as a safety valve:
  // raise it only to experiment with quantising reward sounds to the 16th note.
  groove: { enabled: true, inputDelay: 0, eventDelay: 0, maxSeeks: 4 },

  // Overdrive meter and combo milestones (src/js/overdrive.js, docs/OVERDRIVE.md). Feedback only:
  // nothing here touches collision, orb size, obstacle layout, score or stars.
  overdrive: {
    threshold: 100, // meter units to fill; full = Overdrive starts by itself
    duration: 6, // seconds of run time (frozen while paused)
    // Charge per successful contact (before the multipliers below).
    charge: { pickup: 4.5, bonus: 8, pass: 2.5, break: 6, chargedBreak: 10 },
    perfectMult: 1.4, // a Perfect contact charges 40% more
    comboStep: 4, // every 4 in a row adds comboBonus ...
    comboBonus: 0.1, // ... +10% charge, up to comboMaxBonus
    comboMaxBonus: 0.3,
    // Repeating the same kind of contact earns less: weight = max(minRepeat, 1 - repeatDrop * (run - 1)).
    repeatDrop: 0.12,
    minRepeat: 0.5,
    missPenalty: 20, // a missed gold note drains this much (never below 0); a missed mint costs nothing
    // Eased 0..1 intensity that drives the visuals (rates per second; exponential, so frame-rate independent).
    fxIn: 5, // ramp up when Overdrive starts
    fxOut: 3, // ramp down when it ends
    warn: 1.6, // seconds before the end when the HUD starts to warn
  },
  // Combo milestones: 4 adds a quiet layer, 8 an energetic arpeggio, 16 a flourish.
  combo: { layerA: 4, layerB: 8, flourish: 16 },

  // Musical contact feedback (Pulse.Sfx.note, docs/PORTRAIT_REWORK.md).
  music: {
    comboLayerA: 4, // consecutive hits before notes gain an octave sparkle
    comboLayerB: 8, // ... and before a fifth is added under them
    perfectLayer: true, // a Perfect hit adds a short high sparkle on top of the note
  },

  // Rotating ring gate (see Pulse.Rhythm.Ring and docs/RHYTHM.md). NOT USED in the portrait campaign:
  // its geometry assumed an orb locked to the lane centre; with steering the orb could simply drive
  // around it. Kept (with its tests) until the ring is redesigned for steering.
  ring: {
    thickness: 22,
    margin: 0.07, // rad of extra notch beyond the exact minimum
    maxAngular: 4.2, // rad/s: fastest the ring may turn
    minRadius: 78,
    maxRadius: 215,
    maxAlpha: 1.9, // rad: widest notch half-angle, so the ring always reads as a ring
  },

  // Moving obstacles (see Pulse.Rhythm.motionOffset). The gap moves, but even at its tightest it
  // still leaves the same clearance a static gap of that `need` would.
  motion: {
    maxRate: 180, // px/s: fastest a gap edge may move (the orb shrinks at 190)
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
