#!/usr/bin/env python3
"""Writes src/assets/atlases/pulse_gameplay_atlas_soft.png from the original Gemini atlas (docs/PALETTE_SOFT.md).

Only the red-family pixels of the hazard frames are remapped (barrier danger tiles, the charged-barrier danger
emblem, wall and tunnel pieces):
  * bright crimson (the rims, X marks, chevrons)  -> a gentler rose-red: hue 352 deg, saturation x0.8, value x0.95
  * dark maroon / near-black red (the hull fills) -> a softened burgundy-plum: hue 335 deg, saturation x0.85, value x1.15 + 0.03
Orange (gap edges), cyan (ready barriers), alpha, shape and every other frame are untouched.
Run from the repo root:  python3 scripts/soften_hazard_palette.py   (deterministic; the original PNG is never modified)
"""
import json
import colorsys  # noqa: F401  (documentation of the model; the vectorised version below is used)
import numpy as np
from PIL import Image

SRC = 'src/assets/atlases/pulse_gameplay_atlas'
FRAMES = [
    'barrier_smash_danger_tile', 'barrier_charged_danger_tile', 'barrier_charged_emblem_danger',
    'tunnel_wall_edge_tile', 'wall_body_tile', 'wall_cap_left', 'wall_cap_right', 'wall_joint_divider',
]
RIM_HUE, HULL_HUE = 352 / 360, 335 / 360


def rgb_to_hsv(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(-1), a.min(-1)
    d = mx - mn
    h = np.zeros_like(mx)
    nz = d > 1e-9
    rc = np.where(nz & (mx == r), ((g - b) / np.where(nz, d, 1)) % 6, 0)
    gc = np.where(nz & (mx == g) & (mx != r), (b - r) / np.where(nz, d, 1) + 2, 0)
    bc = np.where(nz & (mx == b) & (mx != r) & (mx != g), (r - g) / np.where(nz, d, 1) + 4, 0)
    h = (rc + gc + bc) / 6.0
    s = np.where(mx > 0, d / np.where(mx > 0, mx, 1), 0)
    return h, s, mx


def hsv_to_rgb(h, s, v):
    i = np.floor(h * 6).astype(int) % 6
    f = h * 6 - np.floor(h * 6)
    p, q, t = v * (1 - s), v * (1 - f * s), v * (1 - (1 - f) * s)
    out = np.zeros(h.shape + (3,))
    for k, (r, g, b) in enumerate([(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)]):
        m = i == k
        out[..., 0][m], out[..., 1][m], out[..., 2][m] = r[m], g[m], b[m]
    return out


def main():
    atlas = json.load(open(SRC + '.json'))
    frames = atlas['frames']
    if isinstance(frames, list):
        frames = {f['filename']: f for f in frames}
    im = np.array(Image.open(SRC + '.png').convert('RGBA'), dtype=np.float64)
    changed = 0
    for name in FRAMES:
        f = frames[name]['frame']
        x, y, w, h = f['x'], f['y'], f['w'], f['h']
        px = im[y:y + h, x:x + w]
        rgb = px[..., :3] / 255.0
        hue, sat, val = rgb_to_hsv(rgb)
        red = ((hue <= 22 / 360) | (hue >= 325 / 360)) & (sat > 0.35) & (px[..., 3] > 0)
        bright = red & (val >= 0.55)
        dark = red & (val < 0.55)
        nh, ns, nv = hue.copy(), sat.copy(), val.copy()
        nh[bright], ns[bright], nv[bright] = RIM_HUE, sat[bright] * 0.8, val[bright] * 0.95
        nh[dark], ns[dark], nv[dark] = HULL_HUE, sat[dark] * 0.85, np.minimum(1.0, val[dark] * 1.15 + 0.03)
        out = hsv_to_rgb(nh, ns, nv)
        px[..., :3] = np.where(red[..., None], np.clip(np.rint(out * 255), 0, 255), px[..., :3])
        changed += int(red.sum())
    Image.fromarray(im.astype(np.uint8), 'RGBA').save(SRC + '_soft.png', optimize=True)
    print(f'{SRC}_soft.png written, {changed} pixels remapped in {len(FRAMES)} frames')


if __name__ == '__main__':
    main()
