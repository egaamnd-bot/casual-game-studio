# Pulse Campaign System (v1)

> Status: **Three stages built, tested automatically, not yet played on a phone.** Placeholder visuals. Branch `feature/pulse-campaign-system`.

## Structure

- **Main menu:** Campaign, Endless, total stars, Endless best score, and the orb skin picker.
- **Campaign:** stage list grouped by sector, with locked/unlocked state and best stars. Play, pause, crash, retry, stage clear, next stage, back to stages.
- **Endless:** unchanged from the prototype (random obstacles, ×5 multiplier, best score). Players now reach it from the menu.

## Stages

| # | Id | Name | Speed (px/s) | Teaches | Energy | Bonus | Autopilot time |
|---|----|------|--------------|---------|--------|-------|----------------|
| 1 | `s1-first-pulse` | First Pulse | 220 → 240 | Shrink and release, collecting at full size. Generous, centred gaps | 7 | 0 | 23.5 s |
| 2 | `s2-find-the-rhythm` | Find the Rhythm | 260 → 300 | Gaps shifted left or right, alternating; tighter and closer together | 8 | 0 | 22.6 s |
| 3 | `s3-controlled-overload` | Controlled Overload | 300 → 400 | Everything combined, faster and longer. Optional bonus diamonds with tighter timing | 9 | 3 | 24.9 s |

No tunnels and no moving hazards in the campaign yet. Every stage ends at a checkered finish line. Times come from the test autopilot; a person will take about the same, since speed is fixed.

**Design note for review:** the orb always stays in the middle of the screen. So "alternating gap positions" means the *tight* edge switches sides while the gap still contains the orb's path. It's a reading challenge, not a steering one.

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
{ type: 'gate', space: 260, need: 44, shift: 70 }  // wall; 44 px clearance on the tight side; gap extends 70 px right
{ type: 'energy', space: 220 }                      // energy pair (counts for stars)
{ type: 'bonus', space: 190 }                       // bonus diamonds (extra, tighter timing allowed)
```

`src/js/campaign.js` compiles a stage into fixed track positions and runs it through the same obstacle pool, collision and pickup code as Endless. Speed rises linearly from `speed.start` to `speed.end` over the stage's length, so a stage plays the same way every time.

### Adding a Stage

1. Add an object to `Pulse.STAGES` with a new, permanent `id`. Never rename a shipped id; saves key on it.
2. Open `tests/campaign.html`. It validates every stage and fails if any of these are wrong:
   - a field is missing
   - a gap is narrower than a fully shrunk orb plus 8 px
   - there's too little time between walls (0.35 s)
   - there's too little time between a wall and energy (0.32 s) or bonus (0.22 s)
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

- All visuals are still placeholders. Gemini's v2.0 asset pack arrived during this work and will be integrated in a separate branch (see the PR description).
- No haptics, music, mute or settings.
- The Android back button still closes the app; there's no in-app back handling.
- Stage pacing numbers are first guesses.
