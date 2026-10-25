# Rhythm, Motion and the Trailer Look

> Status: **built and tested automatically; not yet played on a phone; not merged.** Branch `feature/pulse-rhythm-motion` (PR #11), started from `deb0670` (the head of `feature/pulse-12-stage-campaign`, PR #9). Producer approval to base on that stack: given in chat. The trailer look and Gemini's v5 pack were integrated on the producer's request.

The music enhances the game; the mechanic is unchanged. **Nothing asks the player to act on the beat**, input is never delayed, and the controls, collision rules, scoring, stars, stage ids and save file are untouched.

## The Beat Grid (`src/js/rhythm.js`)

Gemini's tracks are cut on exact bar boundaries: World 1 = 125 BPM, World 2 = 133, World 3 = 140, menu = 112 ([audio manifest](art/v4/audio_manifest_v4.json)). So beat *n* of a run is at *n* × 60 / BPM seconds. (The trailer's soundtrack measures about 130 BPM, in the same range.)

| Piece | What it does |
|-------|--------------|
| `Clock` | Run time → beat / bar / phase. The game steps it with its own frame time **only while playing**, so pause, resume and retry need no special cases. The beat is *computed* from the time, never counted up, so it can't drift at any frame rate. `retune()` restarts the beat count when Endless moves to the next world's track. |
| `profile` | Exact time ↔ distance for a stage's speed ramp (closed form). Lets the campaign place an item so it reaches the orb on a beat. |
| `motionShape` | A moving gap's offset and width as a pure function of the beat. |
| `seekTarget` | Decides when the streamed music has drifted from the clock. **The music follows the run clock; gameplay never waits for the music.** |
| `Groove` | Makes player *sounds* land on the music (below). |
| `OrbFx` | Cosmetic orb scales (beat pulse, stretch). |

### Music alignment (`game-scene.js`, `sfx.js`)

- On run start the music restarts so bar 1 lines up with the run. Twice a second the scene compares `Music.position()` with the clock and seeks only if the gap is over 80 ms (start-up latency, a long pause). Loop seams are handled by measuring the error the short way round.
- Resuming from pause re-aligns at once. Muted, still loading, cross-fading or backgrounded: nothing is aligned and the clock carries on. After 12 seeks in a track the scene stops trying.

## Sound that lands on the music (`Groove`)

Every player action is heard *in time with the track*, without ever delaying the game: the orb and every rule react instantly; only the sound waits, **never more than 50–70 ms, never plays early**, for the next 16th note.

- **Hold / release / pass / pickup / smash** are quantised to the 16th-note grid (only while the music is aligned; otherwise they play at once).
- **Pickups play a melody.** Each pickup in a run is the next note of the world's scale (F minor, C dorian, D harmonic minor pentatonic-style), climbing then descending; a missed gold or a crash resets it. A streak of gold literally plays a tune.
- **Accent chords** (`sfx_accent_chord_w1/2/3`) sit under pickups and smashes that land within 75 ms of a beat, at most one per beat.
- **Charged smash and max multiplier** dip the music briefly (`Music.pulseDuck`) so the hit cuts through; **every 8 obstacles** cleared in a row plays a rising cadence on the next beat.
- **Moving gaps** get a sonar ping two beats before they arrive; a charged barrier coming plays the approach cue.
- All 8 new v5 sound effects are in `assets/audio/sfx/` and registered in `sfx.js`; the three v4 files that were unused (`approach_cue`, `charged_ready`, `max_x5`) are now wired too.

No new music was composed: the three world tracks and menu theme are Gemini's v4 synthwave. If a different soundtrack is wanted (for example the trailer's), it needs a clean audio file and its licence.

## The Trailer Look (`Pulse.CONFIG.comet`)

Switch off with `comet.enabled: false` to return to the v4 octagon orb and sprite walls.

- **Comet orb:** a round glowing sphere with a long tapering tail, drawn procedurally (no new art). The tail is longer the faster you go and shorter and thinner while you are shrunk; a short bright streak runs down its middle; a fixed pool of 10 sparks drifts back behind the orb. The tail always trails *behind* the orb (the left, in landscape), so the area ahead stays clear.
- **Beat feedback:** a ring pings out of the orb on every beat (bigger on the bar); a ripple on release; the charge ring is drawn round to match.
- **Walls:** dark hulls with a crimson rim and chevrons pointing at the gap, amber lines on the gap-facing edges (they are the collision edges). The cyan barriers and pickups keep Gemini's art.
- **Field:** the v4 backdrop is dimmed and neon blue rails run along the lane edges.
- **Hint cards:** stages 1-4 open with trailer-style cards ("ONE TOUCH.", "MASTER THE TIMING.", ...).
- **Collision truth:** the sphere's disc is drawn at exactly the collision radius across the lane; glow, tail and ring only add to it; stretch only lengthens it along the direction of travel. Nothing visual ever changes `orbState`.

## Beat-aligned Items and Moving Gaps (`campaign.js`, `level.js`)

An item marked `on(item, sub)` is **nudged later, never earlier**, until it reaches the orb on a multiple of `sub` beats, so clear times only grow and the fairness validator still passes. The speed ramp of an aligned stage is fixed to its unaligned length, so arrival time is an exact function of position on any screen length (860-1240 px).

Two kinds of moving gap (a *gap* is the only thing that moves; barriers and gold are as before):

```js
on(slide(44, 0.6, 14, 4, 0), 0.5)     // swings ±14 px side to side every 4 beats (phase 0 = through the middle as it arrives)
on(breathe(44, 0.55, 10, 4, 0), 0.5)  // stays centred and pinches: clearance 44 at its tightest, opens 10 px wider, every 4 beats
```

- `need` is the clearance at its **tightest**, so a moving gap is never harder to pass at minimum size than a static gap of that `need`. The player still only controls size; holding through is always safe.
- Position depends only on the run clock, so a run is repeatable and a retry matches a fresh run exactly.
- Authoring rules (`Pulse.Campaign.validate`): gaps only, beat-aligned, period >= 2 beats, edge speed <= 100 px/s (the orb shrinks at 190), stays inside the lane, tightest clearance obeys the usual fair minimum.
- Drawing: a dotted rail through the gate and small arrows. A swinging gap's arrows point the way it is heading; a breathing gap's arrows point inward (closing, amber) or outward (opening, mint).

### Where they appear (introduced, then combined)

| Stage | Moving gaps |
|-------|-------------|
| 3 Alternating Rhythm | 2 gentle swings (±14 px) — the first moving gaps |
| 4 Split Decision | 1 gentle pinch (+10 px) — first breathing gap — and 2 stronger swings at the ends of their arc |
| 5 Charged Energy | 1 swing between charged barriers |
| 6 The Long Hold | 1 pinch before a tunnel, 1 swing before a charged barrier |
| 7 Double Trouble | the lead gap of each double / triple squeeze moves; the trailing gaps stay static so a squeeze is still a squeeze |
| 8 Greed Is Optional | a swing and a pinch around the mint dares |
| 9-12 | 3-4 each, larger swings (up to ±24 px), always tightest-clearance the same as before |

Gold counts, star thresholds, speeds and stage ids are unchanged. Stages are a little longer (aligned items wait at most half a beat): 20.4-28.9 s.

## Orb Animation

Beat pulse, beat-ping ring, release ripple, smooth stretch while changing size, round charge ring, sparks, tail. Pickup, barrier-break, crash and stage-clear effects are the existing v3/v4 ones (burst sprites, shards, shake).

## Gemini's v5 Pack

- `pulse_gameplay_atlas` in the repo already contained the 72 frames of the v5 atlas (identical file), so no atlas change was needed. The v5 *sound effects* were missing and are added.
- **Not used yet:** the octagonal orb-echo / ripple / trail sprites (replaced by round procedural versions to match the sphere); rotor, wave-rib, piston-strut, rail-bracket, pulse-barrier and telegraph-ring art; `fx_fail_size_clip`; `slideLock` / `rotorWhoosh` / `pulseBeat` sounds. They belong to obstacle types not built yet.
- Gemini's stage proposal (`docs/stages_v5_proposal.js` in the pack) was *not* adopted wholesale: it moves gaps on a time-to-impact curve that locks 0.18 s before arrival, and adds rotors, wave tunnels, pulsating barriers and hybrids to every stage. This build keeps the repo's own tested, beat-driven motion and teaches one new thing at a time.

## Tests

- `tests/rhythm.html` (**4,509 checks, all passing**): beat/bar maths at 4 tempos x 6 frame rates over 10 minutes (no drift); pause, resume, retry and track change; audio-sync decisions (loop seam, muted, unavailable); speed-ramp maths against brute-force integration; beat alignment of every aligned item of every aligned stage on 4 screen lengths, compiled and *in play*; moving gaps (never below the fair minimum or authored `need`, bounded swing, edge speed within limits, identical on every run, correct phase on arrival, right collision geometry; swinging and breathing); authoring rules reject unfair motion; groove (never early, at most the allowed wait, lands on the grid, melody stays in range, no big leaps); orb effect bounds; save compatibility.
- `tests/campaign.html` (647), `tests/logic.html`, `tests/assets.html` (112 frames, **43** sounds decode, comet disc = collision radius) pass.
- `tests/scene.html`: new run-clock and orb-effect checks pass. In this hidden-browser environment frames are throttled; 1-3 older timing checks ("hold shrinks orb fully", "pause button pauses", "endless plays and scores") fail intermittently, and fail identically on the base commit `deb0670`.
- `tests/landscape.html` fails only in a hidden (0x0) window.

## Not Done Yet (next iteration)

- Rotating rings, wave tunnels, pulsating barriers and hybrid obstacles (Gemini's art for them is in the atlas), and their sounds.
- Menu-side music-synced effects (menu has no run clock).
- Everything on a real phone: how the quantised sounds feel, music alignment latency and loop seams, comet look and performance on target devices.
