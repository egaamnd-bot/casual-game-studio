# Asset manifest (Gemini integrations)

Status: INTEGRATED (used in the build and covered by tests), VALIDATED (checked, not yet used), PROVISIONAL, MISSING. Sources are Gemini's `PULSE_Batch1_Comet_Tail_and_Mirror_VFX_Pack.zip` and `PULSE_Master_30Stage_Complete_Asset_and_Audio_Library.zip` (its `batch1_comet_and_orb_vfx` folder is byte-identical to the Batch 1 pack; the standalone sprites in both ZIPs equal the atlas cells and are not copied, to avoid duplicates). The production bible's stage matrix is **not** authoritative; `docs/CAMPAIGN_30.md` is.

## Comet / Mirror VFX atlas: INTEGRATED
Runtime: `src/assets/atlases/pulse_comet_vfx_atlas.png` (1024x1024 RGBA) + `.json` (13 frames, verified against the PNG: names, sizes, bounds, non-empty cells). Key `pulse_comet_vfx`, optional load.

| Frame | Size | Used for |
|---|---|---|
| comet_ribbon_seg | 128x128 | player ribbon and core stamps |
| comet_taper_short / med / long | 64x160 / 80x256 / 96x384 | head taper by tail length |
| comet_streak_fine | 32x192 | head filament |
| comet_core_disc | 128x128 | orb disc (edge = collision radius) |
| comet_halo_bloom | 256x256 | orb glow |
| comet_spark_micro | 32x32 | sparks |
| comet_spark_star | 48x48 | VALIDATED, not used yet |
| comet_overdrive_corona | 192x192 | Overdrive ring |
| mirror_echo_orb_disc | 128x128 | echo orb (Mirror Pulse stages) |
| mirror_echo_ribbon_seg | 128x128 | echo ribbon |
| mirror_echo_fold_burst | 160x160 | echo appears |

## Portrait world backdrops: INTEGRATED (stages that exist today)
Runtime: `src/assets/backgrounds/bg_portrait_*.png`, 540x960 RGBA, optional load. Each repeats every 192 px, so it tiles vertically with no seam at any screen height (checked in `tests/worldart.html`); mean luminance 12-21 of 255 and under 2 % bright pixels, so they sit quietly behind the lane. Drawn as a tile layer under the grid, scrolling at 0.3x the distance travelled. Campaign only; Endless keeps the plain backdrop.

| File | Source | Used for |
|---|---|---|
| bg_portrait_w1_neon_circuit | Master ZIP, batch2_worlds_and_backgrounds/backgrounds_portrait | arc 1, stages 1-9 |
| bg_portrait_w1_finale_s10 | same | stage 10 (arc 1 finale) |
| bg_portrait_w2_chromatic_overdrive | same | arc 2, stages 11-19 (11-18 exist) |
| bg_portrait_w2_finale_s20 | same | stage 20 (arc 2 finale): PROVISIONAL, stage not built yet |
| bg_portrait_w3_pulse_collapse | same | arc 3, stages 21-29: PROVISIONAL, stages not built yet |
| bg_portrait_w3_finale_s30 | same | stage 30: PROVISIONAL, stage not built yet |

Arcs, not the shipped audio worlds, choose the backdrop (see DECISIONS #17); stages 11 and 12 keep world-3 music but get the arc 2 backdrop.

## Expansion skins: INTEGRATED
Runtime: `src/assets/atlases/pulse_expansion_30stage_atlas.png` + `.json` (21 frames, verified against the PNG by `tests/skins.html`: names, sizes, bounds, non-empty cells). Key `pulse_expansion`, now a required atlas. Source: master library ZIP, expansion atlas.

| Skin id | Frames (normal 128, ring 128, shrunk 76) | Unlocks at |
|---|---|---|
| cyber-katana | `skin_cyber_katana_*` | 24 stars |
| chrono-shard | `skin_chrono_shard_*` | 36 stars |
| plasma-singularity | `skin_plasma_singularity_*` | 54 stars |
| aether-crown | `skin_aether_crown_*` | 72 stars (needs stages beyond 18; unreachable today) |

No tension-arc frames exist for these, so `arcPrefix` is null and no arcs animation is made. Device appearance NOT DEVICE-TESTED.

## Audio pack: INTEGRATED (10 of 12 SFX, 3 stems)
Source: master library ZIP, `batch4_audio_library`. Runtime uses the OGG versions only (`src/assets/audio/sfx/`, stems in `src/assets/audio/music/`); the WAV masters are not in the repo and never fetched. All mono 44.1 kHz Vorbis, peaks -0.1 to -5.5 dB, mean about -15 dB (about 3 dB quieter than the v4 effects, so they play at gain 0.6-0.65). Switches: `CONFIG.audioPack.samples` / `.stems`.

| File | Length | Event (game name) |
|---|---|---|
| sfx_combo_milestone_04 / 08 / 16 | 0.26 / 0.36 / 0.52 s | combo 4 / 8 / 16 (`packCombo*`) |
| sfx_route_risk_clear | 0.48 s | full risk route (`packRouteClear`) |
| sfx_route_fork_discover | 0.24 s | first show of a fork's hint card, once per fork (`packForkDiscover`) |
| sfx_mirror_pulse_warning | 0.34 s | Mirror telegraph (`packMirrorWarn`) |
| sfx_mirror_echo_appear | 0.42 s | echo appears (`packMirrorAppear`) |
| sfx_mirror_echo_exit | 0.34 s | echo dissolves, with IN SYNC (`packMirrorExit`) |
| sfx_overdrive_activate / deactivate | 0.55 / 0.42 s | Overdrive start / end (`packOdOn/Off`) |
| WORLD_1/2/3_OVERDRIVE_STEM | 7.68 / 7.22 / 6.86 s | looping stem over the world's music while Overdrive is on; each is exactly 16 beats at 125 / 133 / 140 bpm |

Rules: the synthesized melody phrases still play for every one of these moments (the samples are a short layer, not a replacement, and they have no synth stand-in if undecoded). Stems decode lazily per world when a run starts, start in phase with the run clock (offset = clock time mod loop), fade 0.12 s in / 0.3 s out, stop on pause, crash, clear, retry, mute and end of Overdrive, and only play when the stage tempo fits the stem (16 beats), so a stage with its own bpm gets none.
NOT wired, deliberately: `sfx_mirror_sync_pulse` (no separate event from the echo exit) and `sfx_pickup_chain_sparkle` (pickups already have pitched scale notes, accent chords and cadence hits; adding it would be the stacking to avoid). Both are left out of the repo.
NOT DEVICE-TESTED: loudness balance, how the layers sound against the melody, stem blend.

## VALIDATED in the ZIP, NOT integrated (reason)
- `wall_w1_chevron_cap`, `wall_w2_prism_cap`, `wall_w3_reactor_cap`, `mirror_gate_cap_left/right`, `route_chevron_risk/safe`, `route_divider_pillar`, `mirror_axis_tile` (expansion atlas): the shipping comet look draws walls, forks and the mirror axis procedurally from the collision numbers (`Render.cometGate`, `forkGate`, `mirrorAxis`); the sprite caps are only used by the non-comet path. The prism and reactor caps also have notched edges that sit up to 6 px inside the collision edge on some rows, which would misstate where a wall collides. Revisit only as a deliberate wall-style change.
- The 9 non-skin frames of the expansion atlas stay in the atlas (loaded, unused), see above.

## MISSING from Gemini's proposal
Alternate base gameplay loops, finale tracks, world-completion and campaign-completion stings, completion UI art.
