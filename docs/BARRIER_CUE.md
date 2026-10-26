# Barrier-ready cue

Status: built and tested automatically; NOT DEVICE-TESTED. Feedback only (Issue #24, priority A).

## The authoritative rule (audited in `src/js/level.js`)
- `CHARGED_RADIUS = C.orb.radius - C.pickup.sizeTolerance` = 56 - 8 = **48 px (a radius, i.e. a 96 px diameter)**.
- `isCharged(r) = r > CHARGED_RADIUS`: strictly greater, so a radius of exactly 48 is NOT ready; 48.001 is.
- `Level.canSmash(seg, r, charge) = isCharged(r) && (!seg.charged || charge >= 1)`; `Level.resolve` uses it, so a plain barrier breaks only when the radius is above 48 and a charged one also needs a full ring (`barrier.chargeTime` 0.3 s of staying big).
- Nothing about this rule, the radius, grow/shrink rates, charge time, scoring, stars, saves or stages was changed.

## What already existed
The barrier itself switches between its "ready" (cyan) and "danger" (red) tile through `canSmash`, a charged barrier shows a charge ring and the ring sounds; `barrierReady` (`sfx_barrier_charged_ready`) was defined in the SFX table but never played. The orb itself said nothing for plain barriers.

## What this adds
While the nearest unbroken barrier is within `CONFIG.barrierCue.lookAhead` (420 px) ahead of the orb (or touching it) and `Level.canSmash` is true for the orb's current radius and ring:
- the orb gets a thin additive corona ring just outside it (1.28 x the drawn radius, pulsing very slightly), a white-hot core (46% -> 60% of the disc) and a slightly brighter, whiter glow;
- the level eases in/out with an exponential (about 14/s), so it looks the same at 30/60/144 fps, and freezes while paused;
- one short sound, `barrierReady`, plays once per plain barrier, the first time it is ready inside the window (not for charged barriers, which already have ring sounds; not while paused; not at sfx volume 0).
The cue uses the same predicate as the collision (`Level.canSmash`), not a copy of the threshold. Switch off with `CONFIG.barrierCue.enabled = false`. Haptics: not added (no dependency).

## Tests (`tests/barriercue.html`)
Radius sweep from the minimum to full size including 47.9999 / 48 / 48.0001 / 48.01 / 49 for plain and charged barriers: the cue equals `r > 48` and equals the real `Level.resolve` outcome; charged barrier ring 0 / 0.5 / 0.999 / 1; which barrier counts (beyond the window, behind, broken, nearest wins); corona on/off with the flag, 0.5 px above the threshold on, exactly at it off; identical easing at 30/60/144 fps; pause freezes; sound once per barrier, none when too small, none for charged ones, mute respected; 25 retries add no display objects; stages 1, 2, 5 and 17 play identically with the cue on and off; sprite look and Endless run.
