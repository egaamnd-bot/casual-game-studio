# Gameplay Variety v1

> Status: **built and tested automatically; not yet playtested on the phone; not merged.** Branch `feature/pulse-gameplay-variety` (from `feature/pulse-art-v2` @ `f17a952`, which stays as the recoverable previous version).

## Why It Felt Repetitive (Measured Before the Change)

1. **Holding the whole time always worked.** On `f17a952` an "always hold" player completed all three campaign stages and survived 150 s of Endless. The smallest orb (20 px) fit every gap (28 px minimum); the only cost was missed energy.
2. **Every obstacle asked the same question.** Each wall only asked "smaller than X?", and a full shrink always answered it. The left/right gap shift was cosmetic: the orb never moves sideways.
3. **Energy only asked "let go between walls".** Gold always sat in a comfortable gap. Nothing demanded being big at a precise moment, and Endless chose each wall independently, so there were no sequences to learn.

## What Changed

### 1. Cyan Barriers (the opposite question)

A full-width barrier that **shatters if the orb hits it at full size and is fatal if the orb is shrunk**. "Full size" is the same *charged* rule pickups already use: within 8 px of 56. So there's one rule to learn: big enough to collect means big enough to smash.

- The barrier glows **cyan** while the orb is charged and turns **red** while it's too small, the same moment pickups dim. You can see whether you're ready before you get there.
- A smashed barrier counts as a passed obstacle (Endless: +1 × multiplier). No other scoring change.
- It's drawn in code; Gemini's pack has no barrier art yet (see "Art request").

### 2. Endless Built from Patterns ([`src/js/patterns.js`](../src/js/patterns.js))

| Pattern | Unlocks | The decision |
|---------|---------|--------------|
| squeeze | 0 s | Shrink for one gap |
| smash | 0 s | Stay big for a barrier |
| breather | 0 s | Wide gap (no shrink) then gold: rest beat |
| squeeze-smash | 6 s | **Release timing:** let go right after the gap to be full size for the barrier |
| smash-squeeze | 6 s | **Shrink timing:** stay big through the barrier, then shrink fast |
| gold-dare | 10 s | A short release between two gaps grabs gold (keeps the multiplier) |
| double-squeeze | 12 s | **Hold through:** gaps too close to let go between |
| long-hold | 18 s | Tunnel: letting go early crashes; gold at the exit |
| mint-dare | 20 s | Mint bonus in a tight window between gaps. **Holding through is safe** |
| rhythm | 25 s | Squeeze, smash, squeeze, smash at a steady beat |

- Every run opens with a fixed gap → gold → barrier, so both rules are shown before mixing.
- Patterns never repeat back to back. Spacing tightens with difficulty over 70 s; speed rules are unchanged.

### 3. Fairness Checked Over Sequences ([`src/js/level.js`](../src/js/level.js), `Pulse.Track.validateItems`)

The checker tracks the last moment the orb had to be **small** and the last moment it had to be **big**, and guarantees enough clear time to switch, however many items sit in between:

| Switch | Minimum |
|--------|---------|
| big/start → small (gap) | 0.35 s |
| small → barrier | 0.32 s |
| small → gold, gold → small | 0.32 s |
| either side of a mint bonus | 0.22 s (that's the risk) |
| two walls in a row | 40 px apart (readability) |

Gaps that both need shrinking may sit close together: holding through them is fair. Campaign stages and every generated Endless item go through the same checker. Endless spacing uses the speed the orb *will* have when it arrives (rounded up), and a test confirms reality is never faster.

### 4. Mint: Risky, Optional

- Campaign: unchanged (bonus count shown, not used for stars).
- **Endless (scoring change, documented):** mint adds +1 to the multiplier like gold, but **letting a mint pass no longer resets the multiplier**. Before, any missed pickup reset it, so a "safe" decline cost you. Now declining a dare is truly safe. Gold misses still reset the multiplier.

### 5. Campaign Stages Redesigned (same ids, stars, unlocks)

| Stage | Teaches | Barriers | Action flips* | Hold-always |
|-------|---------|----------|---------------|-------------|
| First Pulse | Shrink basics, gold between gaps, one hold-through | 0 | 0/6 | finishes (tutorial) |
| Find the Rhythm | Barriers alone, then after gaps, then squeeze/smash rhythm | 6 | 11/11 | **crashes** |
| Controlled Overload | Quick release into barriers, hold-throughs, long hold, 2 mint dares | 6 | 12/16 | **crashes** |

\* How often the required action switches between "shrink" and "stay big" from one obstacle to the next.

### Not Changed

One-touch control, orb sizes and speeds, collision shapes, touch release and pause handling, retry, saving and its migration, best score, star thresholds, unlock order, stage ids, cosmetic-only skins, near-miss (visual only).

### Considered and Skipped

**A clean-pass streak meter.** Endless already has the ×5 multiplier, which is exactly a collection streak. A second meter would add clutter, not a decision.

## Tests (headless Edge; results on this branch)

| Test | Result |
|------|--------|
| `tests/logic.html` | **PASS.** Barrier rules frame by frame. 60 seeds × 150 s autopilot (14,097 items, 2,752 barriers): no crash, every item fair, predicted speeds never too slow, all 10 patterns used, 0 back-to-back repeats, same seed gives the same stream. A cautious player skipping every dare survives 20 seeds. Always-hold crashes at 6.0 s; never-hold at 3.9 s. |
| `tests/campaign.html` | **PASS 177/177.** Stage content, fairness rejections (new barrier and mint cases), completable with all gold at 3 screen heights, deterministic, hold-always crashes in stages 2–3, cautious play finishes, stars, unlocks, skins, saves. |
| `tests/scene.html` (sprites and shapes) | **PASS** both |
| `tests/assets.html` | **PASS** |
| Real game, autopilot | Stages 1–3 complete with 3 stars (20.6 s / 19.3 s / 21.4 s). Endless survives 100 s (score 476). Idle crashes at 3.4 s. |

The tests prove the patterns are fair and varied. They can't prove they're fun or readable at speed; that needs the phone.

## Playtest Checklist (Phone)

1. Endless: does the opening (gap → gold → barrier) make the barrier rule obvious without reading anything?
2. Can you tell, *before* reaching a barrier, whether you'll smash it? (cyan = ready, red = too small)
3. After a crash, can you say why ("let go too late", "shrunk too early", "got greedy on the mint")?
4. Squeeze → smash: does letting go just after the gap feel tight but fair?
5. Smash → squeeze: is there enough time to shrink after the barrier?
6. Hold-throughs and the long hold: do they read as "keep holding"?
7. Mint dares: does skipping them feel like a real choice rather than a forced loss?
8. Stage 2: does it feel rhythmic? Stage 3: hard but learnable after a few tries?
9. Does Endless still feel repetitive after 60 s? Which pattern feels the same as another?
10. Regression: pause/resume, retry, best score, stars, skins still behave as before.

## Known Limitations

- Stage 1 is still squeezes and gold only (the tutorial); holding all the way through it still finishes with 1 star.
- The barrier is a thin code-drawn band; it may need stronger art at high speed.
- Tunnels (long holds) are drawn in code, as before.
- Difficulty numbers are first guesses; tune after playtesting via `src/js/patterns.js` and `config.js` (`track`).

## Art Request for Gemini

A **barrier** sprite set in the Kinetic Vector style:
- A full-width tileable energy membrane, 22 px tall on screen (44 px in 1080-space).
- Two states: charged (cyan, "breakable") and danger (red, "too small").
- A shatter effect.

Optionally a **tunnel** body tile that works at any height.
