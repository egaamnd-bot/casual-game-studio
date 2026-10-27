# Softer hazard palette (Issue #29)

Status: **visual comfort change, switchable. NOT DEVICE-TESTED** — the Producer judges the final look on the phone. `CONFIG.palette.soft: false` restores the earlier look exactly.

## Why
The Producer found the black-and-saturated-crimson hazards harsh. Goal: a softer burgundy/plum fill with a gentler coral/rose-red edge and less glow, while hazards stay unmistakable on every world backdrop and distinct from the cyan smashable barrier, the orb, pickups and route colours.

## What changed (colours and glow only)
| Element | Before | After |
|---|---|---|
| Code-drawn wall hull (gates, route forks, rings) | `0x16060f` near-black | `0x30182a` burgundy-plum |
| Wall / tunnel body fill (`T.wall`) | `0x2b111b` | `0x3a1d2f` |
| Rim / chevron colour (`T.wallEdge`) | `0xff2a54` saturated crimson | `0xf25066` rose-red |
| Glow stroke alpha / rim alpha / chevron alpha | 0.14 / 0.95 / 0.60 | 0.07 / 0.88 / 0.50 |
| Ring glow alpha | 0.12 | 0.06 |
| Barrier danger tiles, charged-barrier danger emblem, tunnel edge, wall body/cap/divider (Gemini atlas pixels) | crimson `(242,39,80)` on maroon `(42,9,19)` | rose `~(230,76,100)` on burgundy-plum (see `scripts/soften_hazard_palette.py`) |

Unchanged: orange gap edges (they mark the exact collision edge), cyan ready barriers and orb, route colours, crash tint (`T.danger`) and every shape, size, hitbox, timing, score, star, stage, save and audio.

Menu buttons that reuse `T.wallEdge` (Campaign button edge, locked stage tiles) follow the new rose edge.

## How it works
- `src/js/config.js`: `CONFIG.palette.soft` and the theme values `hull`, `glowAlpha`, `rimAlpha`, `chevronAlpha` (soft vs earlier values side by side). `src/js/render.js` reads them instead of hard-coded numbers.
- Sprites: `scripts/soften_hazard_palette.py` (deterministic; Python 3 + Pillow + numpy) writes `src/assets/atlases/pulse_gameplay_atlas_soft.png` from the untouched original by remapping only the red-family pixels of 8 hazard frames: bright crimson → hue 352°, saturation ×0.8, value ×0.95; dark maroon → hue 335°, saturation ×0.85, value ×1.15 + 0.03. Alpha, orange, cyan and every other frame are bit-identical. `src/js/assets.js` loads the `_soft` PNG for `pulse_gameplay` when the flag is on (same JSON). The original PNG stays in the repo. Cost: +0.5 MB in the APK.
- To tune: change the numbers in the table (theme) and the factors in the script, rerun the script.
- To revert: `CONFIG.palette.soft = false` (and, to also drop the extra file, delete `*_soft.png`).

## Measured (WCAG contrast, `tests/palette.html`)
| | before | after |
|---|---|---|
| rim vs field (`0x0b0f19`) | 5.21:1 | 5.58:1 |
| rim vs its hull | 5.35:1 | 4.74:1 |
| hull vs field | 1.03:1 | 1.18:1 |
The rim is also checked against the average colour of all six portrait backdrops (≥ 3:1 and at least 80% of the earlier ratio), the hue distance from the cyan barrier / safe-route cyan (> 120°), the amber gap edge (≥ 30°) and the pink risk lane (no closer than before).

## Evidence
- `tests/palette.html` (32 checks): classic theme reproduced exactly with the flag off; softer saturation/alphas; contrast and hue-distance floors; recoloured atlas differs only in red-family opaque pixels of the 8 hazard frames, alpha identical everywhere, cyan ready tiles identical, the game really loaded the soft atlas.
- Screenshots before/after on worlds 1-3 with a tunnel, route fork and barrier in danger and smash-ready states: `docs/art/palette_soft/cmp_w{1,2,3}_{danger,ready}.png` (left = before, right = after), headless Chromium 540×960.
- Full regression suite at three viewports: see the PR.

## For the Producer to judge on a phone
Is the new colour comfortable at your usual brightness, and do hazards still read instantly (especially on world 2/3 backdrops, behind the orb, and during Overdrive)? If the rose edge feels too pale or the plum too light, say which and I will adjust the numbers above.
