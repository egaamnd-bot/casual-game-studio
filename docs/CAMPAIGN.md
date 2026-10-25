# Pulse Campaign (12 Stages)

> Status: **built and tested automatically; not yet played on a phone; not merged.** Branch `feature/pulse-12-stage-campaign` (from `feature/pulse-landscape` @ `8e2d6de`).

## Structure

- **Three worlds** (Gemini v4 art and music) of **four stages** each. Each world has its own backgrounds, intro banner, stage-card plates and gameplay track.
- **Four acts** (ChatGPT's design brief) run across the worlds: Learn (1–3), Build (4–6), Test (7–9), Mastery (10–12).
- **Unlocking:** each stage unlocks when the one before it is cleared. A stage you've already cleared never re-locks.
- **Stars:** unchanged. 1 = finish; 2 = at least 60% of the gold; 3 = at least 90% (rounded up). Mint bonuses never count toward stars. Replays never lower a stage's best.
- **Skins:** cosmetic only. Solar Flare 3★, Void Prism 6★, Retro Green 9★, **Violet Nova 12★**, **Whiteout 15★** (36★ maximum).

## The 12 Stages

| # | World | Name | Speed (px/s) | Teaches | Gold | Mint | Pressure* |
|---|-------|------|--------------|---------|------|------|-----------|
| 1 | Neon Circuit | First Contact | 200→220 | Shrinking through gaps, releasing for gold. No barriers. | 6 | – | 0.40 |
| 2 | Neon Circuit | Break the Barrier | 220→240 | **Barriers.** First one alone while already big, then after a gap with lots of time. | 6 | – | 0.34 |
| 3 | Neon Circuit | Alternating Rhythm | 240→260 | Gaps and barriers alternating at a steady beat. | 5 | – | 0.44 |
| 4 | Neon Circuit | Split Decision | 255→280 | Quicker switches; gold dares (a short release between gaps). | 5 | – | 0.61 |
| 5 | Chromatic Overdrive | Charged Energy | 270→290 | **Charged barriers.** First while already charged, then after a gap with a long lead. | 6 | – | 0.50 |
| 6 | Chromatic Overdrive | The Long Hold | 280→305 | **Tunnels** (sustained holds) with recovery gold, then barriers after them. | 7 | – | 0.40 |
| 7 | Chromatic Overdrive | Double Trouble | 290→315 | **Double and triple squeezes** (hold through), mixed with barriers. | 6 | – | 0.40 |
| 8 | Chromatic Overdrive | Greed Is Optional | 300→325 | **Mint dares:** a risky release for a bonus, or a safe hold-through. | 5 | 4 | 0.63 |
| 9 | Pulse Collapse | Overload | 320→360 | Everything known, faster and denser. | 5 | 1 | 0.63 |
| 10 | Pulse Collapse | Precision | 335→365 | Switch windows close to the fair minimum; narrow gaps. | 5 | – | **0.77** |
| 11 | Pulse Collapse | Final Circuit | 345→385 | Every mechanic combined, with a recovery section. | 7 | 2 | 0.68 |
| 12 | Pulse Collapse | The Final Pulse | 355→410 | Climax: build-up, recovery, final gauntlet. | 9 | 1 | 0.72 |

\* **Pressure** = how close each required size switch is to its fair minimum (1.0 = exactly the minimum), averaged over the stage. It's measured by `tests/campaign.html`.

**How difficulty rises.** Top speed rises every stage, and pressure rises world by world (average 0.45 → 0.53 → 0.70). It deliberately dips on the stages that introduce a mechanic (5, 6, 7): a new rule is taught at gentler timing, and those stages don't speed up either. Each new mechanic follows the brief's sequence: teach it on its own, practise it, combine it with one familiar mechanic, then use it in longer sequences and the mastery stages.

**Every stage takes about 20–28 s** with perfect play (12 stages ≈ 4.5 minutes). Stages are short but varied; content comes from the sequences, not from length.

### Save Compatibility

- The first three stages keep their original ids (`s1-first-pulse`, `s2-find-the-rhythm`, `s3-controlled-overload`), so existing saves keep their stars and completion. Their *content* and display names now match the new stages 1–3.
- A player who had cleared the old three stages continues at Stage 4 with their stars, best score and skin.
- Save version unchanged (`pulse.save.v1`). The only new field is `settings` (audio levels), which is optional and defaulted for older saves.

## How Stages Are Defined

Stages are data in [`src/js/stages.js`](../src/js/stages.js), written with small helpers:

```js
gap(44, 0.45, 60)    // gap wall, 44 px clearance, 0.45 s of clear time before it, shifted (visual)
bar(0.5)             // barrier: be full size
charged(0.8)         // charged barrier: full size AND a full charge ring
tunnel(42, 280, 0.6) // 280 px long gap: hold through
gold(0.4) / mint(0.24) / wide(0.6)
```

`t` is seconds of clear time before the item. It's converted to distance at the stage's **top** speed, so the real time is never shorter than written. `Pulse.Track.validateItems` (`level.js`) rejects any stage that doesn't leave enough time to switch size: shrink 0.35 s, grow for a barrier or gold 0.32 s, fill the charge ring 0.62 s, either side of a mint 0.22 s. Pixel `space` values are still accepted.

### Adding a Stage

1. Append it to `Pulse.STAGES` with a new, permanent `id`, a `world`, a `teaches` line and an `intro`.
2. Add a stage-card plate `ui_stage_card_sNN_wW.png` in `src/assets/stage_cards/` (or ask Gemini).
3. Update the stage count and the introduction table in `tests/campaign.html`, then open it. It must pass.

## Tests (`tests/campaign.html`, 647 checks, all passing on this branch)

- **Data:** all 12 stages exist and are valid; unique ids; the original ids are in their places; world assignment; every stage documents what it teaches; at least 5 gold each.
- **Fairness:** every stage passes the shared sequence checker, and bad data is rejected, including new cases (missing world, charged barrier without time to fill the ring).
- **Introduction order:** barrier in 2, charged in 5, tunnel in 6, double squeeze in 7, mint in 8; never earlier. Each first encounter is gentle, and teaching stages don't raise the speed.
- **Difficulty curve:** top speed rises every stage; no pressure jump above 0.25 between stages; pressure rises world by world; Precision is the tightest.
- **Playable by different players:**
  - the competent autopilot finishes every stage with **all** gold (3 stars reachable), at 3 screen widths
  - a cautious player who skips every dare finishes every stage
  - holding the whole time crashes on stages with barriers
  - letting go only 0.3 s before barriers crashes on charged barriers
  - no input crashes
  - playback is deterministic
- **Progress:** each of the 12 unlocks in order; the "next stage" logic; 36 stars; skin thresholds 3/6/9/12/15; migration of a 3-stage save; completed stages never re-lock; audio settings clamp and round-trip.

The real game was also played start to finish by the autopilot: all 12 stages cleared with 3 stars (20–28 s each). **None of this proves the stages are fun.** That needs playing on the phone.
