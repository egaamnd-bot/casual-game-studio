# Gameplay Evolution v2

> Status: **built and tested automatically; not yet playtested on the phone; not merged.** Branch `feature/pulse-gameplay-evolution`, started from **`648dcf5`** (Gameplay Variety v1, verified on GitHub as the head of `feature/pulse-gameplay-variety`, parent `f17a952`). `648dcf5` is the recoverable baseline.

## Key Constraint Found in the Audit

The orb's forward speed is fixed: **the player never controls *when* they reach an obstacle, only what size they are when they get there.** So every new "timing" mechanic is built on *size over time*. Anything driven by its own clock would ask the player to predict a phase they can't influence, and failures would feel like guessing.

## What's New

### 1. Charged Barriers: "Let Go *Early Enough*"

- The orb has a **charge ring**. It fills over 0.3 s while the orb is at full size (the same "charged" size that collects energy) and empties the instant you shrink.
- A **charged barrier** is thicker, with a second inner edge and diamond studs. It only breaks if the ring is **full** at impact; otherwise you crash, the same outcome as any barrier hit while small.
- **The decision:** plain barriers forgive a last-moment release (0.14 s regrow). Charged barriers need about 0.45 s at full size, so you must let go early, sometimes right after a tight gap.
- **Readability without relying on colour:**
  - Barriers are cyan with solid edges when hitting them now would smash them, and red with *dashed* edges when it would crash you.
  - The ring is a filling arc, closing into a thick bright circle when full.
  - The ring only appears while a charged barrier is on screen.
- **Why a failure is explainable:** "my ring wasn't closed". A test checks that what a barrier *shows* always matches what *would happen* (`tests/logic.html`).
- **Fairness:** from shrunk to a charged barrier, at least 0.62 s (0.32 s regrow + 0.3 s charge), enforced by the same sequence checker.

### 2. Combo Sequences, Recovery and Gradual Unlocks ([`src/js/patterns.js`](../src/js/patterns.js))

There are 19 named, data-driven patterns:

| Family | Patterns | Unlock |
|--------|----------|--------|
| Singles | squeeze, smash | 0 s |
| Recovery | breather, gold-run | 0 s / 15 s |
| Pairs | squeeze-smash, smash-squeeze, gold-dare, double-squeeze, long-hold, mint-dare | 6–20 s |
| Combos | squeeze-smash-squeeze, smash-gold-double, hold-recover-smash, squeeze-mint-smash, rhythm | 15–25 s |
| Charged | charged-smash (alone; gentler the first time), squeeze-charged, charged-squeeze | 30 s / 40 s (combos only after charged-smash has appeared) |
| Hardest | gauntlet (squeeze, smash, squeeze, charged, squeeze) | 55 s (only after squeeze-charged) |

- **Recovery:** every pattern has an intensity (0–5). When a stretch exceeds a budget (7 rising to 11 with difficulty), the next pattern is a recovery: a wide gap with gold, or a run of three golds.
- **No repeats:** a pattern never repeats back to back.
- **Read-ahead:** the existing layout shows about 3.2 s ahead at start speed and about 1.2 s at top speed, enough to read a 2–3 obstacle sequence. No preview UI was added.
- **Readability:** a gap wall and a barrier are always at least 80 px apart.

### 3. Multiplier Feedback (No New Meter, No New Points)

- Scoring moved into one shared function, `Pulse.Scoring` (`level.js`), used by the game and the tests. **Values are unchanged:** +1 × multiplier per wall or barrier; gold or mint adds +1 to the multiplier up to ×5; missing gold resets it; missing mint doesn't.
- New feedback only:
  - the multiplier text pops when it rises
  - reaching ×5 shows "MAX ×5" with a gold shockwave and a rising tone
  - every 10 obstacles cleared at ×5 shows "×5 streak 10/20/…"
- Near-miss stays visual-only.

### 4. Campaign (Same Ids, Stars, Unlock Order, Saves)

| Stage | Identity | Plain / charged barriers | Action flips* | Hold-always | Releases 0.3 s before barriers |
|-------|----------|--------------------------|---------------|-------------|------------------------------|
| First Pulse | Learn the rules: gaps first, then barriers, the first one on its own | 3 / 0 | 5/7 | crashes | finishes |
| Find the Rhythm | Squeeze/smash beat, then charged barriers (first one on its own) | 4 / 3 | 13/13 | crashes | crashes on charged barrier |
| Controlled Overload | Mastery: combos, long hold → charged barrier, 2 mint dares | 5 / 2 | 14/17 | crashes | crashes on charged barrier |

\* How often the required action switches between "shrink" and "stay big" from one obstacle to the next.

Stage length stays about 22 s each with the autopilot. Difficulty comes from sequences, not length.

## Deferred: Pulse Fields

Evaluated after charged barriers and combos worked, and **not implemented**. Because arrival time is fixed, a field that cycles active/inactive would only ask "which size will it want when I get there?" That's the gap/barrier question in disguise, plus phase prediction the player can't influence. It adds reading load rather than a new decision, and failures would feel like bad luck. A field whose behaviour reacts to the *player's* size or charge could be worth prototyping later.

## Tests (headless Edge, results on this branch)

| Test | Result |
|------|--------|
| `tests/logic.html` | **PASS.** Charge ring timing; plain and charged barrier rules frame by frame; shown state = actual outcome in 5 cases; scoring rules and milestones. 60 seeds × 150 s (14,259 items, 3,029 barriers): no unfair item, predicted speeds never too slow, all 19 patterns used, 0 back-to-back repeats, 0 unlock or prerequisite violations, first charged barrier at 31.1 s, ≥ 14 distinct patterns after the first minute in every run, recovery sections ≈ 22% of patterns. |
| `tests/campaign.html` | **PASS 190/190**, including the table above |
| `tests/scene.html` (sprites and shapes), `tests/assets.html` | **PASS** |
| Real game, autopilot | Stages 1–3 complete with 3 stars (21.6 / 21.8 / 22.4 s). Endless survives 100 s (score 446). Idle crashes at 3.4 s. |

**Player strategies, Endless, 20 seeds × 150 s:**

| Strategy | Survived | Avg time | Avg score | Mint taken | Crashes |
|----------|----------|----------|-----------|------------|---------|
| Always shrink | 0/20 | 6.0 s | 1 | 0 | barrier ×20 |
| Always large | 0/20 | 3.9 s | 0 | 0 | gap ×20 |
| Cautious (skips dares) | 20/20 | 150 s | 254 | 70 | none |
| Competent | 20/20 | 150 s | 654 | 138 | none |
| Aggressive (later shrink) | 20/20 | 150 s | 656 | 138 | none |

Honest note: the "aggressive" bot barely differs from the competent one (it only shrinks slightly later), so it doesn't tell us much. Real greedy play needs a human. Skilled play scores about 2.6× cautious play, through the multiplier rather than new point values.

## Risks

- **Balance:** the charge time (0.3 s) and the 0.62 s window are first guesses. If charged barriers feel unfair, raise `toChargedBarrier` or lower `chargeTime` in `config.js`.
- **Readability:** barriers are still code-drawn, and a barrier passing behind the score/pause HUD at the top is briefly cluttered. Red-plus-dashed vs cyan-plus-solid relies on the player noticing edge style at speed.
- **Performance:** the charge ring and barriers are a few extra shape draws per frame; particle bursts are unchanged. Not measured on the phone.
- **Difficulty:** recovery sections are about 1 in 5 patterns. Tune `heatBudget` if Endless feels too gentle or too relentless.

## Art Request for Gemini (Updated)

- **Plain barrier:** a full-width energy membrane, 44 px tall in 1080-space, in "ready" (cyan, solid) and "danger" (red, broken edge) states, plus a shatter effect.
- **Charged barrier:** 60 px tall in 1080-space, double-edged with a distinct stud/icon motif, in the same two states.
- **Charge ring:** an arc that fills around the orb and a "full" flash, matching the orb ring style.

## Phone Playtest Checklist

1. Stage 1: are barriers clear on first sight, without reading the intro?
2. Stage 2: does the first charged barrier teach the ring (you pass it just by staying big)?
3. Can you *see* that a charged barrier will break or crash you before you reach it (ring closed? edges solid?)
4. After a charged-barrier crash, can you say "I let go too late"?
5. Squeeze → charged: is letting go early tense but fair?
6. Endless: after 60 s, does it still feel varied? Does any pattern feel unfair or unreadable?
7. Are recovery sections welcome breathers, or too frequent?
8. Does "MAX ×5" and the streak call-out feel rewarding rather than noisy?
9. Skipping every mint: do you still feel safe?
10. Regression: pause, retry, best score, stars, skins, portrait, frame rate.
