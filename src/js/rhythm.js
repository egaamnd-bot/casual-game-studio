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

  // The live gap of a moving gate: { off, half } = centre offset and half-width.
  //   slide    the whole gap swings side to side (see motionOffset); half-width is fixed.
  //   breathe  the gap stays centred and opens and closes (a pinch): half-width goes from `base`
  //            (tightest, at phase 0 = on arrival) up to base + amp and back.
  function motionShape(spec, beat, arriveBeat) {
    if (spec.kind === 'breathe') {
      const u = (beat - arriveBeat) / spec.beats + spec.phase;
      return { off: 0, half: spec.base + (spec.amp * (1 - Math.cos(TAU * u))) / 2 };
    }
    return { off: motionOffset(spec, beat, arriveBeat), half: spec.half };
  }

  // Fastest the obstacle's edge moves (px/s) at the given tempo.
  const motionRate = (spec, bpm) => (spec.amp * (spec.kind === 'breathe' ? Math.PI : TAU)) / (spec.beats * beatSeconds(bpm));

  // ---- Rotating ring gate ----
  // A ring centred on the lane, travelling toward the orb, with one notch (the opening). The orb
  // flies through the *front* arc and, half a turn later, the *rear* arc, so the ring turns exactly
  // half a revolution while the orb is inside it: the opening is at the front when the orb meets the
  // front arc and at the rear when it meets the rear arc. Whole-beat timing: the half turn takes
  // `beats` beats. Angles are track-space angles (0 = +x across the lane, +90deg = toward the orb).
  const wrapAngle = (a) => {
    const t = ((a + Math.PI) % TAU + TAU) % TAU;
    return t - Math.PI;
  };

  const Ring = {
    // Angle of the notch's centre at run time `time`. `ring` = { dir, omega, tf } (see campaign.js).
    notchAngle(ring, time) {
      return Math.PI / 2 + ring.dir * ring.omega * (time - ring.tf);
    },

    // Half-angle (rad) of the arc of the ring's centre line that an orb of radius `r`, with its
    // centre `d` from the ring's centre, overlaps. Ring thickness `t`, ring radius `R`.
    overlap(R, t, d, r) {
      const rho = r + t / 2;
      if (Math.abs(d - R) >= rho || d < 1e-6) return -1; // no contact
      return Math.acos(clamp((R * R + d * d - rho * rho) / (2 * R * d), -1, 1));
    },

    // Whether the orb at (x, y) with radius r is touching a solid part of the ring whose centre is
    // (cx, cy) and whose notch (half-angle `alpha`) is centred on `notch`. Exact geometry: the orb
    // is safe only if every point of the ring it overlaps lies inside the notch.
    hits(ring, cx, cy, notch, x, y, r) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.hypot(dx, dy);
      const g = Ring.overlap(ring.R, ring.t, d, r);
      if (g < 0) return false;
      return Math.abs(wrapAngle(Math.atan2(dy, dx) - notch)) + g > ring.alpha;
    },

    // The smallest notch half-angle that lets an orb of radius `need` through both arcs when the
    // ring is aligned at their mid points, given the speeds there. Found by sweeping the crossing
    // in small steps, so the geometry that is drawn and the geometry that is tested are the same.
    minAlpha(R, t, omega, need, speedFront, speedRear) {
      let worst = 0;
      for (const v of [speedFront, speedRear]) {
        const rho = need + t / 2;
        const span = rho / v + 0.02;
        for (let tau = -span; tau <= span; tau += 0.002) {
          const d = Math.abs(R - v * tau); // the orb's distance from the ring's centre
          const g = Ring.overlap(R, t, d, need);
          if (g < 0) continue;
          worst = Math.max(worst, g + omega * Math.abs(tau));
        }
      }
      return worst;
    },
  };

  // ---- Fluid motion helpers (cosmetic smoothing; never feed back into the rules) ----
  // A spring stepped in fixed 4 ms slices, so the result is the same at 30, 60 or 144 fps.
  const SPRING_STEP = 1 / 240;
  function createSpring(x) {
    return { x: x || 0, v: 0, acc: 0 };
  }

  function springStep(s, target, dt, freq, zeta) {
    s.acc += Math.min(Math.max(dt, 0), 0.1);
    const w = TAU * freq;
    while (s.acc >= SPRING_STEP) {
      s.v += (w * w * (target - s.x) - 2 * zeta * w * s.v) * SPRING_STEP;
      s.x += s.v * SPRING_STEP;
      s.acc -= SPRING_STEP;
    }
    return s.x;
  }

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

    // ---- A springy orb that never lies about its size ----
    // The collision radius `r` (Pulse.Orb) is authoritative and moves at a constant rate. What is
    // *drawn* follows it through springs so the orb feels alive: it eases into a shrink instead of
    // snapping to full speed, springs past its full size when released (a pop), stretches along
    // the direction of travel while changing size and bulges across the lane while growing.
    // The drawn radius is always `r` plus a small non-negative extra, and the stretch scales are
    // always >= 1: the picture can only be bigger than what collides, never smaller.
    maxExtra: 7, // px the drawn orb may exceed the collision circle
    create() {
      return {
        radius: createSpring(C.orb.radius), along: createSpring(1), across: createSpring(1),
        pop: createSpring(0), prev: C.orb.radius,
      };
    },
    // Advances the visual model one frame. `squeeze` = a gate wall is passing the orb.
    step(st, r, dt, squeeze) {
      const rate = dt > 0 ? (r - st.prev) / dt : 0;
      st.prev = r;
      springStep(st.radius, r, dt, 6.5, 0.6);
      const shrink = clamp(-rate / C.orb.shrinkRate, 0, 1.2);
      const grow = clamp(rate / C.orb.growRate, 0, 1.2);
      springStep(st.along, 1 + 0.06 * shrink + 0.02 * grow + (squeeze ? 0.03 : 0), dt, 9, 0.7);
      springStep(st.across, 1 + 0.045 * grow, dt, 9, 0.7);
      springStep(st.pop, 0, dt, 8, 0.4);
      return {
        radius: r + clamp(st.radius.x - r, 0, OrbFx.maxExtra),
        along: Math.max(1, st.along.x),
        across: Math.max(1, st.across.x),
        pop: clamp(st.pop.x, 0, 0.35),
        shrink,
        grow,
      };
    },
    // A reward (pickup, smash) makes the orb pulse once.
    kick(st, amount) {
      st.pop.v += amount;
    },
  };

  // ---- Groove: makes player sounds land on the music ----
  // Gameplay never waits for these: the orb and every rule react instantly. Only the *sound* of an
  // action is nudged (at most `window` seconds, never earlier) onto the nearest 16th-note of the
  // music, so taps, pickups and smashes play in time with the track. If the music isn't aligned
  // (muted, loading) or the next 16th is too far away, the sound plays at once.
  const Groove = {
    grid: 0.25, // beats: a 16th note
    // Notes (semitones above the root) each world's pickups climb through: pentatonic-style, in
    // the key of the world's track (F minor, C dorian, D harmonic minor).
    SCALES: {
      1: [0, 3, 5, 7, 10, 12],
      2: [0, 2, 3, 7, 9, 12],
      3: [0, 2, 3, 7, 8, 12],
    },
    // Roots (semitones) that put each world's pickup sound in its key.
    ROOTS: { 1: 0, 2: -2, 3: 2 },

    // Seconds to wait so a sound at the clock's current moment lands on the next grid line.
    // `aligned` is false when the music isn't known to be in step with the clock.
    delay(clock, aligned, maxDelay, grid) {
      if (!aligned) return 0;
      const g = (grid || Groove.grid) * beatSeconds(clock.bpm);
      const t = Math.max(0, trackTime(clock));
      const wait = Math.ceil(t / g - 1e-6) * g - t;
      return wait <= maxDelay ? wait : 0;
    },

    // True when the clock is within `tolerance` seconds of a whole beat.
    nearBeat(clock, tolerance) {
      const b = beatSeconds(clock.bpm);
      const t = Math.max(0, trackTime(clock));
      const off = t % b;
      return Math.min(off, b - off) <= tolerance;
    },

    // Playback rate for the nth pickup in a run: the notes climb the world's scale and then come
    // back down, so a streak plays a little melody.
    noteRate(world, step) {
      const scale = Groove.SCALES[world] || Groove.SCALES[1];
      const cycle = 2 * scale.length - 2; // up, then back down without repeating the ends
      const i = Math.max(0, step) % cycle;
      const note = scale[i < scale.length ? i : cycle - i];
      return clamp(Math.pow(2, (note + (Groove.ROOTS[world] || 0)) / 12), 0.7, 2.2);
    },
  };

  Pulse.Rhythm = {
    TRACKS, beatSeconds, createClock, reset, retune, trackTime, beatAt, position, step, pulse,
    profile, motionOffset, motionShape, motionRate, audioError, seekTarget, OrbFx, Groove,
    Ring, wrapAngle, createSpring, springStep,
  };
})();
