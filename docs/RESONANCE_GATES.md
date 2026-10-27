# Resonance gates prototype

Status: **experiment, Lab only (`LAB` > "Resonance gates"). NOT DEVICE-TESTED.** Approved direction: GitHub Issue #31, master tracker #28 (Producer decision 2026-10-26).

## What the player sees and hears

A resonance gate is an ordinary wide gate with a glowing target ring on it. The ring is two concentric circles with a soft band between them: the range of orb sizes that "resonate". As the gate approaches, the orb shows the same two radii as faint guides, and the orb's own ring lights up mint while its size is inside the band.

- **Size inside the band as the gate passes:** a mint burst around the orb (comet bloom + expanding ring and spokes), the existing soft chime (`packCombo4`), a little orb pulse, the word "RESONANCE", and a small amount of Overdrive meter (4 units, capped at 20 per run).
- **Too small or too large:** nothing at all. The gate is passed exactly like any other wide gate. No message, no sound, no penalty.

Nothing about finishing the stage, score, stars or the save depends on it. There is no new button, currency or meter, and no required timing: a player who never touches the screen simply passes every gate at full size.

## Rules

- **Passable at any size.** A resonance gate is a normal gate whose half-width (84 px) fits a full-size orb (56 px) with room to steer. The walls, the hit rectangles and `Level.hitsWall` are not touched. A crash on a resonance gate is a normal crash and pays nothing.
- **The band.** `[lo, hi]` px of the orb's **collision radius** (`GameScene.radius`, the value `Level.hitsWall` reads), closed at both ends: a radius exactly equal to `lo` or `hi` is inside. Standard band `[26, 46]` (20 px wide); the lab also uses a low band `[24, 38]` and a high band `[32, 46]` (14 px wide). Bands are clamped to `[24, 46]` and must be at least 12 px wide, so a band never reaches the smallest size (20) nor the sizes that count as charged for smashing barriers (more than 48; `hi` is at most 46). The barrier rule keeps its meaning and is untouched.
- **When it counts.** The gate pays if, at any instant while the gate's **middle line is within 14 px of the orb's centre** (`window`, about 47 ms at 300 px/s, on either side of the exact moment of contact), the radius was inside the band. That is the same "moment of contact" the stage builder aligns to the beat grid, so a well-timed tap lines up with the music.
- **Frame-rate independent.** Each frame the pair (distance of the gate's middle line from the orb, radius) is treated as a straight line from the previous frame to this one, and the exact overlap of "within the window" and "inside the band" is solved. A single 50 ms frame, 30, 60 or 144 fps all give the same answer for the same radius over time. (The game itself samples whether the screen is held once per frame, so the *radius over time* can differ by a few ms of tap between frame rates; that is the engine's input sampling, not this rule.)
- **Once per gate.** The record lives on the segment for the current run; a pooled segment reused for another gate, a retry, many frames, a pause in the middle of the crossing, or a tall gate all give at most one payment per gate. Payment is made when the gate has been passed, so a crash never pays.
- **Existing meter only.** `Pulse.Overdrive.award` (as `GameScene.graze` does): no new currency, nothing while Overdrive is on, `CONFIG.resonance.runCap` (20) units per run in total. The meter needs 100, so resonance alone can never fill it. After the cap, or while Overdrive is on, the effect still shows but adds nothing.
- **Which gates.** The stage DSL and validator (`campaign.js`) are not edited. The lab entry carries `flags.resonance.gates = { <stage item index>: [lo, hi] }`; the module matches a segment to its item by the item's distance along the track (`level.travelled - seg.y - seg.h`), so no hook in the level core is needed. Only plain gates are supported (rings and route forks are ignored); sliding gates and tunnels work, because the band is about the radius only.

## Is it achievable with the real shrink and grow rates?

Orb radius moves at 190 px/s (hold) and 260 px/s (release), between 20 and 56 px, so an intermediate size is always passed through, never held. Time spent inside a band while sweeping through it: `[26, 46]` 105 ms shrinking / 77 ms growing; `[24, 38]` and `[32, 46]` (14 px) 74 ms / 54 ms. The 14 px window on each side of the gate adds about 93 ms at 300 px/s, so the timing slack for a tap (how much earlier or later the start of the tap may be and still pay) is the sum of the two.

Measured by simulation with the real `Pulse.Orb.step` (screen sampled once per frame) over tap lengths of 100-300 ms: see the numbers in "Tests". In short a tap has roughly 100-400 ms of start-time slack, 170-340 ms for the sensible tap length of 150-200 ms, at 30, 60 and 144 fps and at stage speeds of 250 and 300 px/s. That is comfortably above human timing error; a deliberate pulse (tap, release) is needed, not a frame-perfect one.

## Lab stage

`Pulse.Lab` entry `resonance` (`src/js/resonance.js`), base `s3-controlled-overload` (world 1, Neon Circuit backdrop and music), speed 250 to 300 px/s, 7 resonance gates (3 standard, 2 low, 2 high; left, centre and right) mixed with 5 ordinary wide gates and 7 gold notes, about 30 s. Flag: `CONFIG.resonance.enabled` and `scene.lab.flags.resonance`.

## How to turn it off

- `CONFIG.resonance.enabled = false` (defined at the top of `src/js/resonance.js`): the gates are plain gates, no overlay, nothing earned.
- Remove the `js/resonance.js` script tag (or the lab entry): the game is the old game; every hook in the shared files is guarded by `Pulse.Resonance`.

## Files

- New: `src/js/resonance.js` (rules, state, overlay, lab entry, `CONFIG.resonance`), `tests/resonance.html`, this document.
- Shared files, guarded one-liners only (exact lines in the handoff note): `src/js/game-scene.js` (reset in `startRun`, observe next to `Graze.observe`, `cleared` in the pass branch, overlay at the end of `draw` after `drawOverdrive`), `src/index.html` (one script tag after `js/campaign.js`).
- Not edited: `config.js`, `stages.js`, `campaign.js`, `level.js`, `sprite-view.js`, `sfx.js`, the save schema.
- Load order: `index.html` loads `resonance.js` before `lab.js` (the anchor chosen for this track), so the module registers its lab entry the moment `Pulse.Lab` is created (a one-time setter on `Pulse.Lab`); if `Pulse.Lab` already exists it registers at once.

## Assets

Only existing ones: the comet VFX atlas frame `comet_halo_bloom` (when that atlas loaded; a failed load just skips the bloom), procedural circles drawn with Phaser graphics for the rings, and the existing `packCombo4` sample. No new art or audio is requested.

## Tests (`tests/resonance.html`)

RESULTS_PLACEHOLDER

## For the Producer to judge on a phone

1. Is the target ring readable at a glance while the orb is moving, on the world-1 backdrop? Does the orb's lit ring tell you when you are "in"?
2. Is the timing fair: do you get the reward on most deliberate taps without needing to think in milliseconds? (Slack is about 0.2-0.3 s.)
3. Does 4 units per gate (cap 20) feel worth the effort, too small or too big? Is "RESONANCE" plus the chime a good enough answer, or should a miss feel different (it deliberately does not)?
4. Does pulsing the screen to hit rings feel like the core mechanic (hold = shrink, release = grow) or like a new chore?

Not done (needs a decision): campaign placement. Resonance gates exist only in the Lab; nothing in stages 1-24 or Endless changes.
