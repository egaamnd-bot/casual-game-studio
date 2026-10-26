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

## Not yet integrated (next batches)
World backgrounds (6 x 540x960), world wall/route/mirror silhouettes (9), 4 skins + 21-frame expansion atlas, 12 SFX (WAV masters + OGG runtime) and 3 Overdrive stems: VALIDATED in the ZIP only, see the handoff for their status. Still MISSING from Gemini's proposal: alternate base gameplay loops, finale tracks, world-completion and campaign-completion stings, completion UI art.
