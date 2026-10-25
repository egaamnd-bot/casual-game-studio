# Rhythm and Motion (vertical slice)

> Status: **built and tested automatically; not yet played on a phone; not merged.** Branch `feature/pulse-rhythm-motion`, started from `deb0670` (the head of `feature/pulse-12-stage-campaign`, PR #9). Producer approval to base on that stack: given in chat.

The music enhances the game; the mechanic is unchanged. **Nothing asks the player to act on the beat**, input is never delayed, and the controls, collision rules, scoring, stars, stage ids and save file are untouched.

## The Beat Grid (`src/js/rhythm.js`)

Gemini's tracks are cut on exact bar boundaries: World 1 = 125 BPM, World 2 = 133, World 3 = 140, menu = 112 ([audio manifest](art/v4/audio_manifest_v4.json)). So beat *n* of a run is at *n* × 60 / BPM seconds.

| Piece | What it does |
|-------|--------------|
| `Clock` | Run time → beat / bar / phase. The game steps it with its own frame time **only while playing**, so pause, resume and retry need no special cases. The beat is *computed* from the time, never counted up, so it can't drift at any frame rate. `retune()` restarts the beat count when Endless moves to the next world's track. |
| `profile` | Exact time ↔ distance for a stage's speed ramp (closed form, not a simulation). Lets the campaign place an item so it reaches the orb on a beat. |
| `motionOffset` | A moving obstacle's offset as a pure function of the beat. |
| `seekTarget` | Decides when the streamed music has drifted from the clock. **The music follows the run clock; gameplay never waits for the music.** |
| `OrbFx` | Cosmetic orb scales (see below). |

### Music alignment (`game-scene.js`, `sfx.js`)

- On run start the music restarts so bar 1 lines up with the run. Twice a second the scene compares `Music.position()` with the clock and seeks only if the gap is over 80 ms (start-up latency, a long pause). Loop seams are handled by measuring the error the short way round.
- Resuming from pause re-aligns at once (the music keeps playing, ducked, under the pause screen).
- Muted, still loading, cross-fading or backgrounded: `Music.position()` is `null`, nothing is aligned, and the clock (and the visual pulse) carry on. After 12 seeks in a track the scene stops trying, so a stream that can't seek is never fought.

### Beat-aligned stage items (`campaign.js`)

An item marked `on(item, sub)` in `stages.js` is **nudged later, never earlier**, until it reaches the orb on a multiple of `sub` beats. Clear times therefore only grow, and the fairness validator still runs on the result. Because the speed ramp is fixed to the stage's *unaligned* length (`track.speedLength`), the arrival time is an exact function of position, and alignment is computed against the actual screen (the orb sits at 70% of the track length), so it holds from 860 px to 1240 px wide. Stages with no `on()` items compile exactly as before.

## Moving Gaps

```js
on(slide(44, 0.6, 14, 4, 0), 0.5)   // clearance 44 at its tightest, swings ±14 px every 4 beats, passing the middle as it reaches the orb, aligned to half beats
```

- The gap is a normal gap wall whose edges move. **`need` is the clearance at its tightest**, so a moving gap is never harder than a static gap of that `need` to pass at minimum size; at the middle of its swing it is `amp` wider.
- The player still only controls size. Holding through is always safe; the swing just changes how late a release can be.
- `phase` is where the gap is *when it reaches the orb*, so the author controls what the player faces: 0 = through the middle, 0.25 / 0.75 = at an end of its swing.
- Position depends only on the run clock, so a run is repeatable (and a retry matches a fresh run exactly).
- Rules enforced by `Pulse.Campaign.validate`: gaps only (no tunnels or barriers), must be beat-aligned, period ≥ 2 beats, edge speed ≤ 100 px/s (the orb shrinks at 190), swing stays inside the lane, and the tightest clearance obeys the usual fair minimum.
- The autopilot and the "needs to shrink" test use the *worst-case* clearance (`seg.minNeed`).

### Where they appear

| Stage | Moving gaps |
|-------|-------------|
| 3 Alternating Rhythm | 2, gentle: ±14 px, 4 beats, passing the middle on arrival (first moving gaps in the game; the stage intro says "swaying gaps move with the music") |
| 4 Split Decision | 2, ±20 px, 4 beats, at the ends of their swing (phase 0.25 / 0.75) |
| 5–12 | none yet |

Gold counts, star thresholds, speeds, and every other item are unchanged. Stages 3 and 4 are a little longer: each aligned item waits at most half a beat.

## Orb Animation

- **Idle beat pulse:** the outer glow breathes on every beat (up to +8%, easing out). It also runs on the ready screen; it holds still on the pause and game-over screens.
- **Squash and stretch:** while the orb changes size its body lengthens along the direction of travel (up to +5%), smoothed and frame-rate independent.
- **No collision exploits:** effects only ever *add* to the drawn orb (all scales ≥ 1; nothing is ever narrower across the lane than the collision circle), and the rules read `Pulse.Orb` state only. A scene test checks the collision radius is untouched.

## Tests

- `tests/rhythm.html` (**993 checks, all passing**): beat/bar maths at 4 tempos × 6 frame rates over 10 minutes (no drift); pause, resume, retry and track change; audio-sync decisions (loop seam, muted, unavailable); the speed-ramp maths against brute-force integration; beat alignment of every item of the aligned stages on 4 screen lengths, both compiled and *in play*; moving gaps (never below the fair minimum or the authored `need`, bounded swing and speed, identical on every run, correct phase on arrival, right collision geometry); authoring rules reject unfair motion; orb effect bounds; save-compatibility basics.
- `tests/scene.html`: new checks for the run clock (frozen while paused, continues after resume, restarts on retry, follows Endless track changes) and orb effects.
- `tests/campaign.html` (647) and `tests/logic.html`, `tests/assets.html` still pass.

**Known test-environment limits:** headless/hidden-browser runs throttle frames, which breaks three timing-sensitive checks in `tests/scene.html` and the window-size check in `tests/landscape.html`; they fail identically on the base commit `deb0670`. See the PR for exact results.

## Not Done Yet (next iteration)

- Rotating gates or rings, oscillating and pulsating obstacles, and moving obstacles in stages 5–12 (each needs its own teach-then-combine step).
- Neon trails, richer pickup / barrier-break / combo / stage-complete feedback (the existing effects still play).
- Music and sound-effect controls already exist (⚙ on the menu); no new audio assets were needed.
- On-device checks: music alignment feel and latency, loop seams, performance on the target phones.
