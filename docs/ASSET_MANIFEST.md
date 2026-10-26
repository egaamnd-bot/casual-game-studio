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

## VALIDATED in the ZIP, NOT integrated (reason)
- `wall_w1_chevron_cap`, `wall_w2_prism_cap`, `wall_w3_reactor_cap`, `mirror_gate_cap_left/right`, `route_chevron_risk/safe`, `route_divider_pillar`, `mirror_axis_tile` (expansion atlas): the shipping comet look draws walls, forks and the mirror axis procedurally from the collision numbers (`Render.cometGate`, `forkGate`, `mirrorAxis`); the sprite caps are only used by the non-comet path. The prism and reactor caps also have notched edges that sit up to 6 px inside the collision edge on some rows, which would misstate where a wall collides. Revisit only as a deliberate wall-style change.
- 12 SFX, 3 Overdrive stems: next batch.
- The 9 non-skin frames of the expansion atlas stay in the atlas (loaded, unused), see above.

## MISSING from Gemini's proposal
Alternate base gameplay loops, finale tracks, world-completion and campaign-completion stings, completion UI art.
