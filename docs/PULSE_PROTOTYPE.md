# Pulse: Playable Prototype

> **Historical.** This page describes prototype 1. Since then:
> - Campaign was added ([CAMPAIGN.md](CAMPAIGN.md)).
> - Endless moved from independent random walls to patterns, and cyan barriers were added ([GAMEPLAY_VARIETY.md](GAMEPLAY_VARIETY.md)).
>
> The rules below on orb size, speed, points and multiplier still apply. The generator and fairness sections are superseded.

> Status: **Prototype 1, not yet playtested on a phone.** Placeholder visuals and sounds only. Branch `feature/pulse-playable-prototype`.

## How to Play

Your energy orb flies forward on its own. **Hold anywhere to shrink. Release to grow back.**

- Shrink to fit through gaps in walls and through long, narrow tunnels.
- Stay full size to collect pairs of gold energy pickups on either side of your path.
- Touching a wall ends the run. Tap to retry immediately.

## Rules

| Rule | Value |
|------|-------|
| Orb size | 56 px radius at full size, 20 px fully shrunk (on a 540 px wide game) |
| Shrink / grow speed | Full shrink in about 0.19 s, full regrow in about 0.14 s |
| Points | +1 per wall or tunnel passed, multiplied by the current multiplier |
| Multiplier | Each pickup collected adds ×1, up to ×5. Letting a pickup pair pass uncollected resets it to ×1 |
| Speed | Starts at 270 px/s, rises 8 px/s every second, caps at 640 px/s (reached after about 46 s) |
| Difficulty | Over the first 70 s: tighter gaps become more common and obstacles get closer together. Tunnels appear after 12 s |
| Game over | Any contact with a wall |
| Best score | Saved on the device |

The shrinking mechanic has a cost: a shrunk orb can't reach pickups, so playing it safe keeps your multiplier at ×1.

## Fairness Guarantees

The obstacle generator ([src/js/level.js](../src/js/level.js)) guarantees:

- Every gap leaves at least 8 px of clearance around a fully shrunk orb.
- Gaps always contain the orb's path and stay inside the screen.
- Pickups are reachable only at near-full size (within 8 px) and never while fully shrunk.
- There are at least 0.32 s between clearing an obstacle and reaching a pickup, and between the pickup and the next obstacle. The gap widens at high speed to keep this.
- The first wall teaches a gentle shrink; the second is wide, with a pickup after it.

These are checked automatically (see Testing).

## Code Structure

| File | Responsibility |
|------|----------------|
| `src/js/config.js` | All tuning numbers and the **placeholder** palette |
| `src/js/level.js` | Obstacle generation and collision. No Phaser, so it can be tested on its own |
| `src/js/game-scene.js` | Game states (ready, playing, paused, over), input, scoring, HUD |
| `src/js/render.js` | **Placeholder** geometric drawing. Replace these functions with sprites when art is approved |
| `src/js/sfx.js` | **Placeholder** synthesized sounds, called by name (`start`, `pass`, `pickup`, `multiplierLost`, `crash`) |
| `src/js/storage.js` | Best score in local storage |
| `src/js/main.js` | Boots Phaser at 540 px wide; height follows the phone's aspect ratio (860–1240) |

Swapping in Gemini's assets means changing `render.js`, `sfx.js` and the palette in `config.js`. Gameplay files don't change.

## Input Safety

- Hold state is read from every active touch pointer each frame (up to 3 fingers), not from a single event.
- When the app loses focus or goes to the background, all pointers are released and a running game pauses ("Paused · Tap to resume"). The orb can't stay stuck shrunk.
- After a crash, taps are ignored for 0.38 s so a finger still on the screen doesn't restart by accident.

## Testing

### Automated (run by Claude in headless Microsoft Edge)

| Test | What it checks | Result on this branch |
|------|----------------|-----------------------|
| `tests/logic.html` | Collision maths; 60 random seeds × 150 s with a perfect-timing autopilot (no crashes allowed); every gap, tunnel and pickup against the fairness rules; no input crashes on the first wall; holding forever collects nothing | **PASS**: 7,940 obstacles, 4,376 pickups checked |
| `tests/gameplay.html?bot=1&seconds=100` | The real Phaser game with the autopilot for 100 s, through maximum speed | **Survived 99 s**, score 391, ×5 |
| `tests/gameplay.html?seconds=10` | The real game with no input | **Crashed at 2.9 s** on the first wall, as expected |

To rerun: open the file in Chrome or Edge on a PC (double-click it). The tab title shows the result. `gameplay.html` loads Phaser from a CDN, so it needs internet.

These tests prove the rules and the generator. They don't prove that it **feels** good or that touch works on a phone.

### On the Phone (Producer)

1. Wait for **Actions → Android debug APK** to finish on this branch, then download `pulse-debug-apk-run<N>`.
2. Install it as before (see [ANDROID_PIPELINE_TEST.md](ANDROID_PIPELINE_TEST.md)). It installs over the pipeline test app (same app ID) and shows as **Pulse Prototype**.
3. Check:
   - [ ] Starts in portrait and stays portrait when the phone rotates
   - [ ] Holding shrinks the orb immediately; releasing grows it back
   - [ ] Nothing important is hidden under the status bar or navigation bar
   - [ ] Pickups, walls and the orb are easy to tell apart at full speed
   - [ ] Crash feedback (shake, red flash, red orb) is clear
   - [ ] Retry is instant
   - [ ] Home button mid-run, then reopen: shows "Paused", and the orb isn't stuck small
   - [ ] Best score survives closing and reopening the app
   - [ ] No stutter after 2 minutes of play
4. Playtest targets with 3–5 people, each told only "hold to shrink":

| Measure | Target |
|---------|--------|
| Understanding | At least 4 of 5 pass the first wall within 3 tries |
| Engagement | Median first sitting of 8 or more runs, or 3 or more minutes |
| Fairness | At least 4 of 5 can say why they died |
| Learning | Most testers score higher in runs 6–10 than in runs 1–5 |
| Replay | At least 3 of 5 rate "would play again" 4 or higher out of 5 |

## Known Limitations

- All visuals and sounds are placeholders; there's no music.
- The portrait lock is added to the generated Android project during the build. If Capacitor changes its manifest format, the build shows a warning and the app may rotate.
- The display hasn't been checked against Android's edge-to-edge status and navigation bars. The HUD starts about 9% down the screen as a margin.
- No haptics, settings, or mute button.
- Best score uses web storage inside the app. Clearing the app's data erases it.
- The difficulty curve is a first guess, untested with people.
- The app ID is still `com.casualgamestudio.pipelinetest` (see DECISIONS.md, pending decisions).

## Out of Scope

Ads, analytics, purchases, accounts, cloud saves, extra modes, a settings screen and final art.
