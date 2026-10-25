# Audio (Gemini v4 Synthwave Pack)

> Status: **integrated and loading in automated tests; not yet heard on a phone.** Mix levels, loop seams and latency need an on-device listen.

## What Ships

| Kind | Files | Size |
|------|-------|------|
| Music loops | `MENU_THEME` (68.6 s), `WORLD_1_GAMEPLAY` (76.8 s), `WORLD_2_GAMEPLAY` (79.4 s), `WORLD_3_GAMEPLAY` (82.3 s) | 5.6 MB |
| Stings | `STAGE_CLEAR` (4.5 s), `GAME_OVER` (4.0 s), `WORLD_TRANSITION` (4.8 s), `MAX_MULTIPLIER_STING` (2.0 s) | 0.26 MB |
| Sound effects | 31 files, 0.06–0.49 s | 0.19 MB |

- **Format:** all files are OGG Vorbis, 44.1 kHz, in `src/assets/audio/`. I checked durations and formats from the file headers.
- **Not shipped:** the pack's WAV masters and `OST_Preview_Medley`. They're in the original zip; the WAVs would add about 4 MB for no audible gain.
- **iOS note:** OGG plays in Android WebViews. iOS (deferred) would need M4A/MP3 copies.

## How It Works (`src/js/sfx.js`)

- **Music** streams through a single `<audio>` element (`Pulse.Music`), switching tracks with a short crossfade. Streaming matters on phones: decoding an 80 s stereo loop into memory would take about 28 MB of RAM per track.
- **Effects and stings** are decoded once into WebAudio buffers (`Pulse.Sfx`) for zero latency. Limits: at most **6 at once**, and the same effect can't retrigger within **35 ms**.
- **Mix** (Gemini's recommendation): music at 55%, effects at 85%, shrink hum at 25%, times the player's settings.
- **Fallback:** if a file isn't loaded (still loading, or blocked), the prototype's synthesized tone plays instead. The game never goes silent or errors.
- **Tap to start:** browsers start audio only after a real tap. `Pulse.Audio.unlock()` runs on every tap and starts any music that was waiting.
- **Lifecycle:** when the app goes to the background (Home button, screen off), music pauses, the hum stops and the audio engine suspends. They resume when the app returns. The run itself also pauses, as before.
- **Settings:** Music and Sound effects levels (0–100% in 20% steps, plus mute icons) on the main menu's ⚙ button. They're saved as `settings` in the save file and applied at start-up.

## When Things Play

| Moment | Sound |
|--------|-------|
| Main menu, stage select | `MENU_THEME` |
| Campaign stage | Its world's track. On a world's first stage (1, 5, 9), the `WORLD_TRANSITION` sting plays on the ready screen and the track starts with the run. |
| Endless | World 1 track, then World 2 at 30 s and World 3 at 60 s. This matches the pattern unlocks (charged barriers start at 30 s). |
| Pause | Music drops to 40%; `sfx_ui_pause` / `sfx_ui_resume` |
| Hold / release | `sfx_player_shrink_start` + looping `sfx_player_shrink_loop` / `sfx_player_expand` |
| Charged barrier on screen | `sfx_charge_start_fill` as the ring fills, `sfx_charge_complete` when full, `sfx_charge_cancelled` if you shrink |
| Gap passed / near miss | `sfx_obstacle_gate_pass` / `sfx_near_miss_graze` |
| Barrier smashed | `sfx_barrier_smash_ordinary` or `sfx_barrier_smash_charged` |
| Gold / mint / multiplier up / ×5 / streak | `sfx_pickup_gold`, `sfx_pickup_mint_bonus`, `sfx_multiplier_increase`, `MAX_MULTIPLIER_STING`, `sfx_multiplier_x5_streak` |
| Crash | `sfx_player_death_collision` (or `sfx_barrier_charged_fail`), music stops, `GAME_OVER` |
| Stage clear | Music stops; `sfx_stage_finish_line` + `STAGE_CLEAR`; panel sound; `sfx_stage_star_earned` per star; `sfx_ui_stage_unlocked` |
| Menus | Tap, navigate, skin selected, settings toggle |

**Unused files** (in the repo, available later): `sfx_barrier_charged_ready` and `sfx_obstacle_approach_cue`, held back to avoid clutter. `sfx_ui_retry` doubles as the run-start sound.

## Rhythm Alignment

The run has a beat clock (125 / 133 / 140 BPM per world). The music is re-aligned to it at run start, on resume and when it drifts over 80 ms; see [RHYTHM.md](RHYTHM.md).

## Tests

- `tests/assets.html`: all 32 effect and sting files decode; every music track exists.
- `tests/scene.html`: Endless track escalation; pause ducking; background/foreground; crash stops music; world-opener sting; menu theme; volume 0 silences music.

Headless test browsers block real playback without a genuine tap, so these check the audio system's *state*. Hearing it, and its loudness, needs the phone.

## Phone Checklist

1. First tap on the menu starts the menu music.
2. Music doesn't stutter or click at the loop point (each track loops after 68–82 s).
3. Effects are audible over the music without being harsh.
4. The shrink hum isn't annoying over a 2-minute session.
5. The Home button stops all sound; reopening resumes it.
6. Settings: muting and levels apply immediately and survive restarting the app.
