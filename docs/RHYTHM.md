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

- On run start the music restarts so bar 1 lines up with the run. Twice a second the scene compares `Music.position()` with the clock and seeks only if the gap is over 150 ms (real drift), at most 4 times a track: a seek is audible, so it is the exception. Loop seams are handled by measuring the error the short way round.
- **Pause holds the music where it is** (it dips, then pauses) and resuming plays on from that spot. The run clock froze at the same moment, so they stay in step with no seek, and no click.
- Muted, still loading, cross-fading or backgrounded: nothing is aligned and the clock carries on. After 12 seeks in a track the scene stops trying.

## Sound that lands on the music (`Groove`)

Reward sounds are heard *in time with the track*, without ever delaying the game: the orb and every rule react instantly; only the sound waits, **never more than 40 ms, never plays early**, for the next 16th note. **Input sounds (shrink, release) are never delayed at all** (`CONFIG.groove.inputDelay = 0`), because even 40 ms between your finger and the sound reads as a laggy control. Set `groove.enabled: false` to play every sound at once.

- **Pass / pickup / smash** are quantised to the 16th-note grid (only while the music is aligned; otherwise they play at once).
- **Pickups play a melody.** Each pickup in a run is the next note of the world's scale (F minor, C dorian, D harmonic minor pentatonic-style), climbing then descending; a missed gold or a crash resets it. A streak of gold literally plays a tune.
- **Accent chords** (`sfx_accent_chord_w1/2/3`) sit under pickups and smashes that land within 75 ms of a beat, at most one per beat.
- **Charged smash and max multiplier** dip the music briefly (`Music.pulseDuck`) so the hit cuts through; **every 8 obstacles** cleared in a row plays a rising cadence on the next beat.
- **Moving gaps** get a sonar ping two beats before they arrive; a charged barrier coming plays the approach cue.
- All 8 new v5 sound effects are in `assets/audio/sfx/` and registered in `sfx.js`; the three v4 files that were unused (`approach_cue`, `charged_ready`, `max_x5`) are now wired too.

No new music was composed: the three world tracks and menu theme are Gemini's v4 synthwave. If a different soundtrack is wanted (for example the trailer's), it needs a clean audio file and its licence.

## Game Feel (fluid orb)

The rules move the orb's *collision* radius at a constant rate (shrink 190 px/s, grow 260 px/s) and that never changes: the validator, the stars and every stage depend on it. What changed is how the orb is *drawn* (`Pulse.Rhythm.OrbFx`, springs stepped in fixed 4 ms slices, so the motion is the same at 30, 60 or 144 fps):

- **Eases into a shrink** instead of snapping to full speed (a lagging spring), and **pops slightly past full size** when you let go (an under-damped spring), then settles. Both are *bigger* than the collision circle, never smaller: the drawn radius is `collision + extra`, `0 <= extra <= 7 px`.
- **Stretch and bulge**: while shrinking the body lengthens along the direction of travel (streamlined, up to +6%); while growing it bulges across the lane (up to +4.5%). Both scales are always >= 1, so the drawn orb always covers the collision circle.
- **Squeeze**: the orb tightens a touch as a gap wall passes it.
- **Reward pulse**: a pickup, a smash and the max multiplier each make the orb pulse once (small, medium, large), so ordinary movement stays calm and rewards stand out. A charged smash also gets a small camera punch (the only one).
- **Comet tail**: its length follows the orb through a spring, so it trails and recovers instead of snapping; it stretches while the orb shrinks, lilts once every two beats, and the sparks are shed faster at speed, spread sideways, drag and fade with an ease-out.
- **The field breathes with the beat**: the neon rails and backdrop pulse quietly on every beat (a pulse, not a strobe); a ring pings out of the orb each beat.
- **Charge ring**: eased up toward the real charge and dropped the instant the charge is lost, so it never shows more charge than the rules have.
- **Input stays instant**: the orb's collision radius, the rules and the input sounds react on the same frame as your touch; nothing waits for the music.

## The Trailer Look (`Pulse.CONFIG.comet`)

Switch off with `comet.enabled: false` to return to the v4 octagon orb and sprite walls.

- **Comet orb:** a round glowing sphere with a tapering tail, drawn procedurally (no new art). The tail trails *behind* the orb (the left, in landscape), so the area ahead stays clear.
- **Walls:** dark hulls with a crimson rim and chevrons pointing at the gap, amber lines on the gap-facing edges (they are the collision edges). The cyan barriers and pickups keep Gemini's art.
- **Field:** the v4 backdrop is dimmed and neon blue rails run along the lane edges.
- **Hint cards:** stages 1-4 open with trailer-style cards ("ONE TOUCH.", "MASTER THE TIMING.", ...).
- **Collision truth:** the disc is never smaller than the collision circle; glow, tail and ring only add to it. Nothing visual ever changes `orbState`.

## Beat-aligned Items and Moving Gaps (`campaign.js`, `level.js`)

An item marked `on(item, sub)` is **nudged later, never earlier**, until it reaches the orb on a multiple of `sub` beats, so clear times only grow and the fairness validator still passes. The speed ramp of an aligned stage is fixed to its unaligned length, so arrival time is an exact function of position on any screen length (860-1240 px).

```js
on(slide(44, 0.6, 14, 4, 0.25), 0.5)  // swings ±14 px every 4 beats; phase 0.25 = at the far end of its swing as you arrive
on(breathe(44, 0.55, 10, 4, 0), 0.5)  // stays centred and pinches: clearance 44 at its tightest, opens 10 px wider, every 4 beats
```

- `need` is the clearance at its **tightest**, so a moving gap is never harder to pass at minimum size than a static gap of that `need`. Holding through is always safe.
- **Settled as you cross.** Swings are authored to be at the end of their arc (phase 0.25 / 0.75) and pinches at their tightest (phase 0) at the moment the orb arrives, where the motion is momentarily still. Nothing lurches in the last instant.
- **Telegraph**: a dotted rail through the gate, arrows showing which way it is heading (a pinch's point inward when closing, mint and outward when opening), and **ghost brackets** that mark exactly where the opening will be when it reaches the orb (the motion is deterministic, so this is exact).
- Position depends only on the run clock: a run is repeatable and a retry matches a fresh run exactly.
- Authoring rules (`Pulse.Campaign.validate`): gaps only, beat-aligned, period >= 2 beats, edge speed <= 100 px/s, stays inside the lane, tightest clearance obeys the fair minimum.

## The Rotating Ring (new obstacle family)

```js
on(ring(44, 0.9, 1), 0.5)   // need 44, 0.9 s clear before it, turns clockwise (-1 = anticlockwise)
```

A ring centred on the lane, travelling toward the orb, with one opening (the notch). **The orb flies through the front arc and, half a turn later, the rear arc**, so the ring turns exactly half a revolution (two beats) while the orb is inside it: the opening faces the orb at the front arc and is on the far side for the rear arc. Whole-beat timing makes it musical: one full rotation = four beats.

- **Same rule as every gap.** `need` is the biggest orb that always fits through the opening, and the opening is wide enough (found numerically at compile time) that an orb of that size clears both arcs for the whole crossing. A shrunk orb always passes; a full-size orb is stopped. So the player's decision is unchanged: shrink, and fly through. The ring is treated as a long gate by the fairness validator, so there is always time to shrink before it and to grow after it.
- **Exact geometry.** `Pulse.Rhythm.Ring.hits` tests the orb circle against the ring's arc: it is safe only if every part of the ring it overlaps is inside the opening. The renderer draws the ring from the same numbers (centre, radius, thickness, live notch angle and half-width), and a test checks that collision flips exactly at the drawn edge of the opening.
- **Reads at a glance.** Crimson ring with chevrons pointing the way it turns, amber edges (the edge it turns toward is brighter), an amber marker riding the opening, and two faint ticks at the front and rear points where the opening must be. A sonar ping sounds two beats before it arrives, and it whooshes as the orb meets the front arc.
- **Deterministic.** The notch angle is a pure function of the run clock; the ring's radius is solved from the speed ramp so the half turn takes exactly the authored beats on any screen length.
- **Limits**: radius 78-215 px (fits the lane), turns at most 4.2 rad/s, notch half-angle at most 109 degrees (so it still reads as a ring).
- **Performance**: one Graphics path per ring (~40 chevron strokes); no sprites or allocations.

### Where the ring (and the other moving gaps) appear

| Stage | New / moving content |
|-------|----------------------|
| 3 Alternating Rhythm | 2 gentle swings, settled as you cross (first moving gaps) |
| 4 Split Decision | **First rotating rings**: one alone, with room to read it, then one the other way; plus 1 swing. Hint card explains it |
| 5 Charged Energy | 1 swing (this stage teaches charged barriers) |
| 6 The Long Hold | first pinch, 1 swing (this stage teaches tunnels) |
| 7 Double Trouble | a ring leads the squeeze; swings lead the others |
| 8 Greed Is Optional | a ring and a pinch around the mint dares |
| 9-12 | 2-3 rings each, mixed with swings, pinches, barriers and gold; the finale's final gauntlet has a ring into a charged barrier |

Gold counts, star thresholds, speeds and stage ids are unchanged. Stages are longer by about a second per ring: 21-30 s.

## Gemini's v5 Pack

- `pulse_gameplay_atlas` already contained the 72 frames of the v5 atlas (identical file). The v5 *sound effects* were missing and are added (and `rotorWhoosh` is now used by the ring).
- **Not used yet:** the octagonal orb-echo / ripple / trail sprites (replaced by round procedural versions to match the sphere); rotor-hub / blade / ring-segment art (the ring is drawn procedurally); wave-rib, piston-strut, rail-bracket, pulse-barrier and telegraph-ring art; `fx_fail_size_clip`; `slideLock` / `pulseBeat` sounds.
- Gemini's stage proposal was *not* adopted wholesale (see PR #11).

## Tests

- `tests/rhythm.html` (**4,870 checks, all passing** in this run): beat/bar maths at 4 tempos x 6 frame rates over 10 minutes; pause/resume/retry/track change; audio-sync decisions; speed-ramp maths; beat alignment of every aligned item on 4 screen lengths, compiled and *in play*; moving gaps; **rings: every ring in the campaign on 4 screen lengths (radius, turn rate, notch, exact half-turn timing, opening at the front for the front arc and at the rear for the rear arc, an orb of the authored size and a fully shrunk orb pass both arcs in a 1 ms brute-force sweep with the real speed ramp, smaller never worse, a full-size orb is stopped), drawn arcs match collision, retry replays identically; the fluid orb at 20-144 fps (never smaller than the collision circle, at most 7 px bigger, stretch never below 1, the same motion at any frame rate, settles exactly, pops and never goes under, reward pulse settles, the rules are untouched)**; input sounds are not delayed; groove; save compatibility.
- `tests/campaign.html` (647 checks, all 12 stages completable at full gold at 3 screen widths, difficulty curve), `tests/logic.html`, `tests/assets.html` (112 frames, 43 sounds), `tests/scene.html` (also with `?noassets=1`) and `tests/landscape.html` pass when the browser window has a real size (960x540). In a hidden or zero-sized window some timing and layout checks fail, and did so on the base commit as well: those are environment failures, not regressions.

## Not Done Yet

- The other obstacle families, in the order suggested: **pulsating barriers** (a barrier whose band breathes on the beat; the collision band must stay constant at the moment of impact), then **wave tunnels** (a long gap whose centre line undulates), then **hybrids** (a static frame with a moving inner part). Each one: define its collision geometry first, draw it from the same numbers, add a validator rule, teach it alone in one stage, test it with a brute-force sweep like the ring, then combine.
- Menu-side music-synced effects (the menu has no run clock).
- Everything on a real phone: how the springy orb and the quantised reward sounds feel, music alignment, the ring's readability, and performance on the target devices.