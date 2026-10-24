# Pulse Campaign System (v1)

> Status: **Three stages built, tested automatically, not yet played on a phone.** Placeholder visuals. Branch `feature/pulse-campaign-system`.

## Structure

- **Main menu:** Campaign, Endless, total stars, Endless best score, and the orb skin picker.
- **Campaign:** stage list grouped by sector, with locked/unlocked state and best stars. Play, pause, crash, retry, stage clear, next stage, back to stages.
- **Endless:** unchanged from the prototype (random obstacles, ×5 multiplier, best score). Players now reach it from the menu.

## Stages

| # | Id | Name | Speed (px/s) | Teaches | Energy | Bonus | Autopilot time |
|---|----|------|--------------|---------|--------|-------|----------------|
| 1 | `s1-first-pulse` | First Pulse | 220 → 240 | Gaps first, then cyan barriers (first one on its own) | 6 | 0 | 21.6 s |
| 2 | `s2-find-the-rhythm` | Find the Rhythm | 260 → 300 | Squeeze/smash beat, then charged barriers (first one on its own) | 5 | 0 | 21.8 s |
| 3 | `s3-controlled-overload` | Controlled Overload | 300 → 400 | Combos, long hold → charged barrier, two optional mint dares | 5 | 2 | 22.4 s |

Refined in Gameplay Evolution v2. Why and how is in [GAMEPLAY_EVOLUTION.md](GAMEPLAY_EVOLUTION.md) and [GAMEPLAY_VARIETY.md](GAMEPLAY_VARIETY.md). Every stage ends at a checkered finish line. Times come from the test autopilot.

**Design note:** the orb always stays in the middle of the screen, so a gap's left/right `shift` is visual only. Variety comes from *what size* each obstacle demands and *when*.

## Stars

| Stars | Rule (per stage, configurable via `stars: { two, three }`) |
|-------|------------------------------------------------------------|
| ★ | Reach the finish line |
| ★★ | Finish having collected at least 60% of energy pairs (rounded up) |
| ★★★ | Finish having collected at least 90% of energy pairs (rounded up) |

- A crash records nothing.
- Replaying never lowers a stage's best stars.
- Bonus diamonds don't count toward stars.
- A stage with no energy awards 3 stars on completion.
- Total stars are always recomputed from each stage's best record; no separate counter is stored.

## Skins (cosmetic only)

| Skin | Unlocks at |
|------|-----------|
| Classic | Always |
| Solar Flare | 3 stars |
| Void Prism | 6 stars |
| Retro Green | 9 stars |

Choose a skin with the arrows on the main menu; locked skins show their requirement. Skins only change colours (`src/js/skins.js`). A test checks that skin entries contain no gameplay fields. Once earned, a skin stays unlocked.

## How Stages Are Defined

Stages are plain data in [`src/js/stages.js`](../src/js/stages.js); the schema is documented at the top of that file. Each item's `space` is the clear distance from the previous item, in game pixels (the field is 540 px wide):

```js
{ type: 'gate', space: 260, need: 44, shift: 70 }  // wall; 44 px clearance (below 56 = must shrink)
{ type: 'gate', space: 270, need: 38, length: 220 } // tunnel: hold through its whole length
{ type: 'barrier', space: 260 }                     // cyan barrier: smash it at full size
{ type: 'energy', space: 220 }                      // gold pair (counts for stars)
{ type: 'bonus', space: 190 }                       // mint pair (optional, tighter timing allowed)
```

`src/js/campaign.js` compiles a stage into fixed track positions and runs it through the same obstacle pool, collision and pickup code as Endless. Speed rises linearly from `speed.start` to `speed.end` over the stage's length, so a stage plays the same way every time.

### Adding a Stage

1. Add an object to `Pulse.STAGES` with a new, permanent `id`. Never rename a shipped id; saves key on it.
2. Open `tests/campaign.html`. It validates every stage and fails if any of these are wrong:
   - a field is missing
   - a gap is narrower than a fully shrunk orb plus 8 px
   - there's too little time to switch size: to shrink 0.35 s, to grow for a barrier or gold 0.32 s, either side of mint 0.22 s, checked across whole sequences (see GAMEPLAY_VARIETY.md)
   - walls closer than 40 px
   - the autopilot can't finish, or can't collect every energy pair, at screen heights 860, 1100 and 1240
3. Update the stage-count check in that test, which currently expects exactly 3 stages.

Stage selection, unlocking and stars pick up new stages automatically.

## Save Data

Stored under the browser storage key `pulse.save.v1` inside the app ([`src/js/storage.js`](../src/js/storage.js)):

```json
{ "version": 1,
  "endless": { "best": 77 },
  "campaign": { "stages": { "s1-first-pulse": { "completed": true, "bestStars": 3 } } },
  "skins": { "selected": "solar-flare", "unlocked": ["classic", "solar-flare"] } }
```

- **Migration:** the prototype's best score (`pulse.best`) is read on every load, and the higher of the two values wins. It's also still written, so the old best can never be lost.
- **Malformed data:** an unreadable save is copied once to `pulse.save.corrupt` and the game starts with defaults (keeping the old best score). Bad fields are cleaned field by field: stars are clamped to 0–3, unknown or locked skin choices fall back to Classic.
- **Blocked storage:** the game runs with defaults and doesn't crash.
- There's no reset-progress option (it would need approval).

## Other Changes in This Branch

- **Pickup dimming:** while the orb is too small to collect (below 48 px radius), all pickups draw at 45% opacity. Collection still uses the same size rule, so dimming exactly matches what's collectible.
- **Pause button:** top-left during play. Focus loss still pauses automatically.
- **Results screen:** dims the play field behind stars and buttons.
- **Audio:** Phaser's built-in audio engine is turned off. Sounds still come from `sfx.js`.

## Tests

| Test | Covers | Result (this branch) |
|------|--------|----------------------|
| `tests/campaign.html` | Stage schema; rejection of bad data; fairness; completion and full energy reachability at 3 screen heights; deterministic compile and playback; idle crashes; held-down collects nothing; star thresholds and boundaries; unlocks; replay never lowers stars; skin thresholds and selection; save migration, corrupt data, blocked storage, round trip | **PASS 168/168** |
| `tests/scene.html` | The real game with simulated mouse input: hold and release; focus loss releases and pauses; pause button; resume; pickups dimmed while shrunk; crash records nothing and unlocks nothing; retry lock; completion saves stars and unlocks; old best preserved; Endless still uses the random generator and scores; menus open | **PASS** |
| `tests/logic.html` | Endless generator fairness (regression) | **PASS** (results identical to before) |
| `tests/gameplay.html?bot=1&mode=campaign&stage=N` | Real game, each stage with the autopilot | All 3 stages complete with 3 stars |
| `tests/gameplay.html?bot=1&seconds=100` | Real game, Endless with the autopilot | Survives |

The tests prove the stages are valid, fair and completable. They don't prove the stages are fun or well paced; that needs playing on the phone.

## Known Limitations

- Visuals: Gemini's v2.0 art is integrated on `feature/pulse-art-v2` (see ART_BIBLE.md). This branch alone still uses shapes.
- No haptics, music, mute or settings.
- The Android back button still closes the app; there's no in-app back handling.
- Stage pacing numbers are first guesses.
