// Rhythm timing foundation. Pure logic with no Phaser dependency, so it can be tested on its own.
//
// The music is a grid: every gameplay track has a fixed BPM and is cut on exact bar boundaries
// (docs/art/v4/QUALITY_CHECK_REPORT_v4.md), so beat n of a run is at n × 60/BPM seconds.
//
//   Clock      run time → beat/bar position. Advanced by the game's own frame time while playing, so
//              pause, retry and stage changes need no special handling: not stepped = not moving.
//              The beat is always *computed* from the run time (never counted up frame by frame),
//              so it cannot drift however uneven the frames are.
//   Profile    exact time ↔ distance for a stage's speed ramp. Lets the campaign place an item so it
//              reaches the orb on a beat, whatever the phone's screen length.
//   Motion     deterministic offset of a moving obstacle, keyed to the beat.
//   Sync       decides when the streamed music has drifted from the clock and needs a seek. The music
//              follows the gameplay clock; gameplay never waits for the music.
//   OrbFx      cosmetic orb scale (beat pulse, stretch). Never smaller than the collision circle.
(function () {
  const C = Pulse.CONFIG;
  const TAU = Math.PI * 2;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  // Tempo of every track (Gemini's audio manifest, docs/art/v4/audio_manifest_v4.json).
  const TRACKS = {
    MENU_THEME: { bpm: 112 },
    WORLD_1_GAMEPLAY: { bpm: 125 },
    WORLD_2_GAMEPLAY: { bpm: 133 },
    WORLD_3_GAMEPLAY: { bpm: 140 },
  };

  const beatSeconds = (bpm) => 60 / bpm;

  // ---- Clock ----
  // `origin` is the run time at which the current track started (0, or the moment Endless
  // switches to the next world's track), so beat 0 is always the start of a loop.
  function createClock(opts) {
    const o = opts || {};
    return { bpm: o.bpm || 120, beatsPerBar: o.beatsPerBar || 4, t: 0, origin: 0, lastBeat: 0, lastBar: 0 };
  }

  function reset(clock, bpm) {
    if (bpm) clock.bpm = bpm;
    clock.t = 0;
    clock.origin = 0;
    clock.lastBeat = 0;
    clock.lastBar = 0;
    return clock;
  }

  // The next track starts here: beat 0 is now, at the new tempo.
  function retune(clock, bpm) {
    clock.bpm = bpm;
    clock.origin = clock.t;
    clock.lastBeat = 0;
    clock.lastBar = 0;
    return clock;
  }

  const trackTime = (clock) => Math.max(0, clock.t - clock.origin);
  const beatAt = (clock, t) => (t - clock.origin) * clock.bpm / 60;

  // Where the clock is now. `phase` runs 0 → 1 within a beat (0 = on the beat).
  function position(clock) {
    const beat = Math.max(0, beatAt(clock, clock.t));
    const index = Math.floor(beat);
    return {
      beat,
      index,
      phase: beat - index,
      bar: Math.floor(index / clock.beatsPerBar),
      beatInBar: index % clock.beatsPerBar,
    };
  }

  // Advances by one frame. Returns how many beats and bars were crossed (usually 0 or 1).
  function step(clock, dt) {
    clock.t += dt;
    const p = position(clock);
    const out = { beats: Math.max(0, p.index - clock.lastBeat), bars: Math.max(0, p.bar - clock.lastBar) };
    clock.lastBeat = p.index;
    clock.lastBar = p.bar;
    return out;
  }

  // A sharp pulse on the beat that eases out: 1 at phase 0, 0 by phase 1.
  const pulse = (phase, sharpness) => Math.pow(1 - clamp(phase, 0, 1), sharpness || 3);

  // ---- Speed profile: exact time ↔ distance for a stage's linear speed ramp ----
  // Speed rises linearly with distance from s0 to s1 over `length` px, then stays at s1
  // (Pulse.Campaign.speedAtDistance). Solving dd/dt = s0 + k·d gives exponential growth.
  function profile(s0, s1, length) {
    const k = (s1 - s0) / length;
    const flat = Math.abs(k) < 1e-9;
    const speed = (d) => s0 + (s1 - s0) * clamp(d / length, 0, 1);
    const time = (d) => {
      if (d <= 0) return 0;
      const dd = Math.min(d, length);
      const t = flat ? dd / s0 : Math.log((s0 + k * dd) / s0) / k;
      return d > length ? t + (d - length) / s1 : t;
    };
    const dist = (t) => {
      if (t <= 0) return 0;
      const tEnd = time(length);
      if (t > tEnd) return length + (t - tEnd) * s1;
      return flat ? s0 * t : (s0 * (Math.exp(k * t) - 1)) / k;
    };
    return { speed, time, dist, s0, s1, length };
  }

  // ---- Motion: a moving obstacle's offset from its centre line ----
  // spec: { amp (px), beats (period), phase (0..1 of the cycle at the moment the obstacle reaches
  // the orb) }. `arriveBeat` is when that moment is, so the author controls what the player sees
  // on arrival: phase 0 = passing through the middle, 0.25 = at the far end of its swing.
  function motionOffset(spec, beat, arriveBeat) {
    return spec.amp * Math.sin(TAU * ((beat - arriveBeat) / spec.beats + spec.phase));
  }

  // Fastest the obstacle's edge moves (px/s) at the given tempo.
  const motionRate = (spec, bpm) => (spec.amp * TAU) / (spec.beats * beatSeconds(bpm));

  // ---- Audio sync ----
  // Signed distance (s) the music is ahead of the clock, accounting for the loop wrapping.
  function audioError(trackT, audioPos, loop) {
    const want = loop > 0 ? trackT % loop : trackT;
    let e = audioPos - want;
    if (loop > 0) {
      if (e > loop / 2) e -= loop;
      else if (e < -loop / 2) e += loop;
    }
    return e;
  }

  // Where to seek the music, or null when it is close enough (or can't be measured: muted,
  // not started, not loaded).
  function seekTarget(trackT, audioPos, loop, tolerance) {
    if (audioPos === null || audioPos === undefined || !Number.isFinite(audioPos)) return null;
    if (Math.abs(audioError(trackT, audioPos, loop)) <= (tolerance === undefined ? C.rhythm.syncTolerance : tolerance)) return null;
    return loop > 0 ? trackT % loop : trackT;
  }

  // ---- Orb effects (cosmetic) ----
  // The orb's solid body is drawn at the collision radius. Effects only ever add to it: the beat
  // pulse breathes the outer glow, and the stretch lengthens the body along the direction of
  // travel (never across the lane). Both scales are >= 1, so the drawn orb always covers the
  // collision circle and can't look smaller than what it hits.
  const OrbFx = {
    maxGlow: 0.08,
    maxStretch: 0.05,
    // radiusRate: signed px/s (negative = shrinking). Returns the target stretch (0..maxStretch).
    stretchTarget(radiusRate) {
      const norm = clamp(Math.abs(radiusRate) / C.orb.growRate, 0, 1);
      return OrbFx.maxStretch * norm;
    },
    // Smooths the stretch toward its target (frame-rate independent).
    stretchStep(current, target, dt) {
      return current + (target - current) * (1 - Math.exp(-dt * 18));
    },
    // Scale multipliers for the glow and the body.
    scales(phase, stretch) {
      return { glow: 1 + OrbFx.maxGlow * pulse(phase, C.rhythm.pulseSharpness), along: 1 + stretch, across: 1 };
    },
  };

  Pulse.Rhythm = {
    TRACKS, beatSeconds, createClock, reset, retune, trackTime, beatAt, position, step, pulse,
    profile, motionOffset, motionRate, audioError, seekTarget, OrbFx,
  };
})();
