# Comet trail and Mirror Pulse echo trail

Cosmetic only: nothing here is read by collision, scoring, stars, steering or saves.

## What it is
The orb's tail is a **ribbon along the path the orb actually took**, not a rotated bar. The world scrolls past an orb that stays at one screen height, so a place the orb was is now lower on the screen by exactly the distance travelled since (`y = orbY + (travelledNow - travelledThen)`, the same rule every obstacle follows). `src/js/trail.js` records the orb's x on a fixed grid of 4 px of travel (ring buffer, 256 entries), so spacing does not depend on frame rate, a pause adds nothing, and a retry (travelled rewinds) restarts the history. The path is a function of distance, so it can never fold back; fast steering shows as a strong lean.

`SpriteView.renderComet` evaluates it with uniform Catmull-Rom and places pooled stamps:
- outer ribbon: 20 `comet_ribbon_seg` stamps (skin colour, gold-mixed in Overdrive), overlapping 2.35x so there are no beads or seams; wide at the orb, tapering to nothing;
- core filament: 12 narrower white-hot stamps over the first 60 %;
- head: `comet_taper_short/med/long` (chosen by length, with hysteresis) and `comet_streak_fine`, short and laid along the tangent at the orb;
- sparks: the existing 10-node pool, now shed from the curve and `comet_spark_micro`, more often while turning;
- `comet_core_disc` (the disc is exactly the collision circle), `comet_halo_bloom`, `comet_overdrive_corona` (Overdrive only).
Stamp width/length follow the drawn orb radius, speed, shrink and Overdrive. A stamp is narrowed if its tilted corner would reach above the orb's top edge, so the tail never sits ahead of the orb.

Mirror Pulse: `renderEcho` keeps a second history of the echo's own positions (`echoX`, which already includes the event strength), drawn as a 12-stamp violet ribbon (`mirror_echo_ribbon_seg`) plus `mirror_echo_orb_disc` (its disc spans the collision circle) and a fold burst (`mirror_echo_fold_burst`) when the echo forms. `Render.echo` keeps the link line and halo only. When the echo ends, the ribbon and orb are hidden and the history is dropped.

## Lifecycle
Ready: tail hangs straight. Playing/complete: history recorded. Paused: everything (springs, sparks, tail) frozen. Crash: tail hidden. Retry (`spawn`): history, echo and sparks reset. New stage: new scene objects.

## Fallback
The comet atlas is optional (`Pulse.Assets.OPTIONAL_ATLASES`, `vfxReady`). If it fails to load or lacks a frame, the same code runs with procedural textures (`comet_ribbon_fb`, `comet_tail`, `comet_body`, `comet_glow`, `comet_dot`), no corona, and the echo disc drawn by `Render.echo`.

## Cost
About 52 sprites for the trails (20 + 12 + 12 + 10 sparks, plus a handful) with additive blending. Not profiled on a phone: NOT DEVICE-TESTED. Tunables are in `CONFIG.comet.ribbon`.

## Tests
`tests/trail.html` (and `?novfx=1` for the fallback): path logic at 30/60/144 fps (sine, steering-limit S-turns, reversals with the game's own steering), atlas JSON vs PNG, path following in the real scene, shrink/grow, Overdrive, pause, crash/retry, 60-cycle object growth, echo alignment and cleanup, and identical results (score, stars, time, distance) with and without the trail on stages 1, 7 and 12. Headless screenshots were reviewed by eye; a phone has not.
