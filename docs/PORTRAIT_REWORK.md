# Portrait Rework — trailer-inspired gameplay transformation

> Status: **built and tested automatically; NOT DEVICE-TESTED; not merged.** Branch `feature/pulse-portrait-trailer-rework`, started from `a4f5cf6` (head of `feature/pulse-12-stage-campaign`, PR #9, which already contains PR #11's rhythm work). Decision #14 in [DECISIONS.md](DECISIONS.md).

## What changed for the player

1. **Portrait.** Track space equals screen space: x across a 540 px lane, obstacles fall from the top, the orb sits 70% of the way down. Logical height = clamp(540 / aspect, 860, 1240): 9:16 = 960, 360×800 = 1200, 412×915 ≈ 1199, tall phones cap at 1240, tablets get 860 and letterbox. Menus, stage select, pause and results are portrait layouts. The manifest orientation is locked to portrait in the Android workflow.
2. **Steering (one finger).** *Touch and hold = shrink. Drag = steer. Lift = grow.* The drag is relative: the orb moves by the finger's movement (gain 1.15), wherever the finger is, so the thumb never covers the orb. The orb's target persists after lift, so it can grow while holding its line. The orb chases the target with a speed limit (1150 px/s) and an acceleration limit (10 000 px/s²), integrated in fixed 4 ms substeps, so it feels identical at 30 / 60 / 144 fps. It cannot leave the lane (margin 44 px). The tail leans against the sideways velocity. Keyboard (testing): arrows / A / D steer, SPACE holds.
3. **Density.** Every stage was re-authored with `pace` (compresses the time between obstacles), `spread` (sideways travel) and, from stage 4, a quarter-beat grid. Measured median clear time between neighbouring obstacles (seconds, bot-measured on the same speed ramp), old landscape → new portrait: s1 1.14→0.83, s2 1.14→0.83, s3 1.04→0.83, s4 0.90→0.72, s5 0.97→0.79, s6 0.79→0.64, s7 0.74→0.68, s8 0.74→0.61, s9 0.69→0.58, s10 0.69→0.56, s11 0.67→0.49, s12 0.66→0.56. That is **8–27% shorter (mean ≈ 20%)**. The brief asked for 20–30%: **met (≥ 20%) on stages 1–4 and 11; missed on stages 5, 6, 8, 9, 10, 12 (−16 to −19%) and 7 (−8%)**. Late stages are bounded by the fairness floor (time to switch size and to travel sideways); pushing further would make them unreachable rather than harder. Items per stage rose from 13–33 to 34–44; the longest empty stretch is ≤ 1.18 s.
   Each stage documents its own `profile` and `teaches` text; a test checks that all 12 are distinct. Stage 1 teaches steering + shrinking + notes; barriers appear in stage 2, moving gaps 3, breathing gaps 4, charged barriers 5, tunnels 6, mints 8. Rings are switched off in the portrait campaign (the code is kept).
4. **Musical feedback.** See below.

## Fairness model

- Old size-switch minima are kept. New *reachability* rule (config `steer`): an obstacle is reachable if the orb can cover the sideways distance at `fairSpeed` 520 px/s (45% of its top speed) after a `latency` of 0.18 s, with at least ±14 px aiming room and a minimum half-gap of 34 px. The campaign compiler pushes items later until they satisfy it, and `validateItems` re-checks independently; Endless uses the same floor.
- Test evidence: all 12 stages and 20 Endless seeds are completable by the bot at 30 / 60 / 144 fps and at track lengths 860 / 960 / 1200 / 1240. A player who never steers crashes in every stage.

## Intentional rule changes (the only ones)

- Gold/mint notes are single notes collected at **any** orb size within 42 px. Previously only a full-size orb collected. Reason: lateral steering makes "must be big to collect" a second skill gate on top of the steering one, and the musical hit needs the note to be collectable without a mode switch. Barriers still need the right size (and charged barriers a full ring). Perfect = within 14 px of the note; gate Perfect = within max(14, 30% of half-width) of the gap centre.
- Combo: increments on pass / smash / note; resets on a missed gold note or a crash; a missed mint does not reset it.
- Unchanged: stage ids, star thresholds, save format (a test loads a pre-rework save), score values, the hold-to-shrink / release-to-grow mechanic.

## Musical rhythm arcade

- Every contact plays a note **immediately** (no waiting for a beat). Instead the *targets* are scheduled onto the beat grid: the contact moment of every obstacle/note in a campaign stage sits on a 0.5-beat grid (stages 4–12: 0.25 beat), measured by tests at 860–1240 px lengths. If the player is on time the hit lands on the music.
- `src/js/melody.js` is pure (no audio): `Melody.hit(world, kind, {combo, quality})`. Consecutive hits walk a 16-step phrase in the world's scale, so a streak plays a melody; the phrase rises a scale step on the second pass and never leaps more than a fourth (tested). Kinds: gold note, mint (bell), gate pass, smash, charged smash — each has its own timbre. Combo 4 / 8 / 16 add octave, fifth-below and high layers; Perfect adds a sparkle on the same note; a broken streak (≥ 3) plays a short falling phrase; a crash plays a distinct falling, out-of-key sound.
- Accompaniment layers (never the lead) may wait for the next 16th note (≤ 80 ms). Steering, shrink, grow and collision never wait (`groove.inputDelay` = 0, checked in tests).
- Palettes (pentatonic, derived from chroma analysis of Gemini's tracks): World 1 Bb major pentatonic, World 2 D minor pentatonic, World 3 A minor pentatonic. Measured tempos of the gameplay tracks: 126.0 / 132.5 / 139.7 BPM, so the 125 / 133 / 140 clock values stand. The tonal centres are ambiguous (key-profile correlations 0.44–0.56): the keys are *chosen to fit the pitch-class content*, not claimed as the tracks' true keys. Gemini's old accent chords are no longer played (their keys could clash with the melody).
- Music / SFX volume sliders are unchanged and apply to the melody notes.
- **The trailer's music is NOT integrated.** It measures about 129 BPM and sounds C-centred, but its rights and source are unknown. A production brief for replacement tracks is in [GEMINI_MUSIC_BRIEF.md](GEMINI_MUSIC_BRIEF.md); coding does not depend on it.

## Tests (see the handoff for results)

`tests/logic.html` (steering physics, frame-rate independence, scoring, combo, Endless), `campaign.html` (12 stages × lengths × frame rates, density, fairness mutations, stars, saves), `rhythm.html` (beat alignment, moving gaps, springs, groove), `melody.html` (note mapping, combos, Perfect, failure), `portrait.html` (real Phaser layout at five viewport sizes + a pointer drag), `scene.html` (pause / resume / retry / completion / audio lifecycle), `assets.html`. Page tests step the scene by hand, so results do not depend on this machine's rendering speed.

## Known limitations

- Not device-tested: steering feel, sync of streamed music with the run clock (tolerance 0.15 s), melody latency on Android.
- Endless is not beat-aligned (no fixed tempo per run).
- Density target of 20–30% not reached on every stage (above).
- Rings are disabled; `landscape.html` was replaced by `portrait.html`; `docs/LANDSCAPE.md` describes the previous build.
- The visual refresh is procedural (grid, streaks, rails) rather than new Gemini art; no new art assets were requested from Gemini.
