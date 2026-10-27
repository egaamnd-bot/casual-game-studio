# PULSE Campaign: 30 stages in three worlds

Status: all 30 stages are IMPLEMENTED (Batch 1 = 13-18, Batch 2 = 19-24, Batch 3 = 25-30; see the "as built" tables at the end). Nothing in stages 13-30 is device-tested. The per-stage text below is the original design; where the built stage differs, the "as built" tables say so. Design rules, validators and the test plan are in this document; the missing-asset list is in [GEMINI_WORLD_ASSET_BRIEF.md](GEMINI_WORLD_ASSET_BRIEF.md).

## 1. Audit of what exists (facts, from the repository)

| Area | Today |
|---|---|
| Stages | 12, ids `s1-first-pulse` ... `s12-the-final-pulse`, authored in `src/js/stages.js`, compiled/validated in `campaign.js`. Saves are keyed by stage **id**; unlock is "previous stage in the array completed", so appending is safe and inserting is not. |
| Length | 25-41 s per stage (about 36-51 items); about 6.5 minutes for the whole campaign. |
| Speed | Linear start-end px/s per stage: 205-235 (stage 1) rising to 375-440 (stage 12). `tests/campaign.html` asserts "top speed rises every stage" for these 12. Speed is already near its sensible ceiling, so 13-30 must grow in variety and precision, **not** speed. |
| Worlds | `Pulse.WORLDS` = 3 audio/visual themes (Neon Circuit 125 bpm, Chromatic Overdrive 133, Pulse Collapse 140), each with 3 parallax layers, intro banner and a music track. A stage's `world` carries art, music, bpm and the melody palette. Stage select shows one world per page as a 2x2 grid. Endless follows the same worlds by tempo. |
| Mechanics | Gates (wide / narrow, shrink to pass), tunnels (hold), swaying and breathing gates, standard and charged barriers, gold (counts for stars) and mint (optional bonus) notes, **risk/safe route forks** (stage 4), **Mirror Pulse** (stage 7), musical combos (milestones 4/8/16), Overdrive. |
| Stars | 1 = finish, 2 = 60% gold, 3 = 90% gold (defaults in `config.js`; a stage may override). Skins unlock at 3/6/9/12/15 total stars. |
| Cards | Stage cards are plain plates (`ui_stage_card_sNN_wN`: a coloured frame); the number and name are drawn on top. Only the frame colour depends on the world. |
| Tests | `campaign.html` hard-codes 12 stages, the order mechanics appear in, the "speed rises every stage" curve and world-by-world density averages (0-4, 4-8, 8-12). Bots complete every stage with all gold at six track lengths and 30/60/144 fps. |

Constraints this puts on the expansion
1. Append only: ids, order and unlock rule of stages 1-12 must not change.
2. Stage 1-12 layouts, speeds, gold counts and tempos must not change (they were phone-tested and tune the stars).
3. The `speed` model is linear per stage and the beat alignment is built on it, so no new speed-curve system is introduced here.
4. The stage-select page, "N stages" text, asset checks and tests all assume 12 stages / 4 per world; they are generalised, not worked around.

## 2. Structure: three worlds of ten (decision and default)

The brief asks for three worlds with finales at stages 10, 20 and 30, but the shipped 12 stages are grouped 4/4/4 and stage 12 is called "The Final Pulse". Both cannot hold literally. **Default chosen (recommended, changeable by the Producer):**

- **Progression worlds ("arcs") are 1-10, 11-20, 21-30.** They drive the stage-select pages, banners, finales and the "WORLD n" labels.
- **Stages 1-12 keep their ids, names, order, layouts, speed, gold, bpm and music exactly.** Their `world` (audio theme: music, bpm, melody palette) is untouched, so every legacy stage plays and sounds as it did. Only the background *look* follows the arc: stages 5-10 show the Neon Circuit look, stages 11-12 the Chromatic Overdrive look. This is a visual change to 8 legacy stages, with no gameplay effect. It is implemented as a separate `look` so it can be reverted in one line.
- Stage 12 keeps its name and layout; only its intro text changes from "The last run" to a mid-campaign line, because it is no longer the last stage. A rename is a Producer decision and is not made here.
- Stage 10 ("Precision") is the arc-1 finale **by presentation only**: a world-complete moment (banner, sting, stage-clear flourish). Its layout is unchanged. Real finale *sequences* are authored for stages 20 and 30.
- **Arc 1 "Neon Circuit" (1-10): learn every mechanic.** Arc 2 "Chromatic Overdrive" (11-20): mastery through variation, risk/reward and combinations. Arc 3 "Pulse Collapse" (21-30): precision and sequencing.
- New stages are audio-themed by arc (13-19 Chromatic Overdrive audio, 20 and 21-30 Pulse Collapse audio) and may set their own `bpm`.
- No new save fields. Stars per stage as now; total 90 stars. Skin thresholds are unchanged.
- Endless is untouched (it uses `Pulse.WORLDS`, which keeps its three entries).

Difficulty curve (rating is a design target on a 1-10 scale; see section 4 for measured acceptance). Each arc opens a little easier than the previous finale (new look, new idea), then climbs.

```
1  2  3  4 | 5  6  7  8 | 9  10 | 11  12 | 13  14  15  16  17  18  19  20 | 21  22  23  24  25  26  27  28  29  30
1.5 2 3  4 |4.5 4.5 5.5 5 |6  6.5 | 7  7.5 | 6.5 6.8 7  7.3 7.5 7.2 7.8 8.2 | 7.6 8  8.2 8.4 8.7 8.8 9  8.9 9.4 10
```
Speed ceiling: 460 px/s. 13-20 run 360-450, 21-30 run 380-460. Late stages get harder through narrower exact gaps, shorter windows, more simultaneous things to track and longer sequences, never through unannounced hazards.

## 3. Design rules for every stage
- **One signature:** each stage has one idea that no neighbour shares (a "set-piece"), taught or reprised by a short readable opening, then used, then combined at most with one familiar mechanic.
- **Introduce, practise, combine:** new mechanic first appears alone, gently, with a hint card; harder combinations only in later stages.
- **Fair failure:** every wall is validated against the fairness floors (minimum time to change size, reachable next gap or note at `config.steer.fairSpeed`); hazards are visible a full screen ahead; telegraphs for events (Mirror Pulse) are at least 1.5 s; nothing is hidden or fake.
- **Readability:** at most one gimmick on screen at a time except in the finales; effects never cover hazards.
- **Rhythm:** every contact lands on the beat grid (0.25 beat for stage 4+); sound never delays control.
- **Rewards:** stars = gold only. Mint, route notes and Overdrive are optional extras that never gate stars.

## 4. Measurable acceptance (applies to every new stage; enforced by `tests/campaign.html`, `tests/stages-30.html`)
1. `Campaign.validate` returns no errors (fairness, lane bounds, item types, zone and fork rules).
2. A perfect bot, a cautious bot (hold 0.75) and a sloppy steerer (20% skill) complete it **with all gold** at track lengths 860, 900, 960, 1080, 1180, 1240 (and 30/60/144 fps for the perfect bot).
3. At least 90% of contacts are within 70 ms of the planned beat moment.
4. Duration (finish distance / mean speed) within the stage's stated range; item and gold counts as designed.
5. Top speed within the arc rules (<= 460, non-decreasing from each arc's second stage; the first stage of an arc may drop).
6. Signature mechanic present, and no two stages have the same fingerprint (mechanic set + density band + profile text).
7. The first stage in which a mechanic appears carries a hint card; stage `intro`, `teaches`, `profile` documented.
8. Save: ids of 1-12 unchanged, stage 13 unlocks after 12, stars computed as before, no save fields added.

## 5. The 30 stages
Legend: **EXISTS** = shipped (facts from the repository); **PLANNED** = new design. Ratings are design targets. "Replay" says why a player returns beyond finishing; "3★" is the 90%-gold challenge.

### Arc 1: Neon Circuit (look and 125 bpm for 1-4; legacy audio kept for 5-10)

**1 First Contact** (EXISTS) - purpose: steering and notes, first narrow gaps. Obstacles: wide and narrow gaps, trails. Mechanics: steer, shrink. Notes: gold only (24). Music: world 1, 125 bpm. Difficulty 1.5. Fail: wide gaps, long clear times. 3★: 22 of 24 gold. About 35 s.
**2 Break the Barrier** (EXISTS) - standard barriers, smash at full size. Difficulty 2. About 38 s.
**3 Alternating Rhythm** (EXISTS) - gap/barrier drum, first swaying gaps. Difficulty 3. About 35 s.
**4 Split Decision** (EXISTS) - slalom, breathing gaps, first route forks (safe vs risky, mint notes). Difficulty 4. About 41 s.
**5 Charged Energy** (EXISTS) - charged barriers and the charge ring. Difficulty 4.5. About 33 s.
**6 The Long Hold** (EXISTS) - sustained holds and recovery. Difficulty 4.5. About 30 s.
**7 Double Trouble** (EXISTS) - squeezes bending across the lane and the first Mirror Pulse. Difficulty 5.5. About 38 s.
**8 Greed Is Optional** (EXISTS) - optional mint detours; the safe line stays open. Difficulty 5. About 25 s.
**9 Overload** (EXISTS) - every mechanic so far at higher density. Difficulty 6. About 27 s.
**10 Precision** (EXISTS; arc finale by presentation) - tight windows and exact transitions. Difficulty 6.5. About 29 s. New: a "WORLD 1 COMPLETE" moment (banner and sting; no layout change).

### Arc 2: Chromatic Overdrive (look 133 bpm; 11-12 legacy)

**11 Final Circuit** (EXISTS) - every mechanic plus a mid-stage breather. Difficulty 7. About 26 s.
**12 The Final Pulse** (EXISTS) - build-up, recovery, densest gauntlet. Difficulty 7.5. About 28 s. Intro text becomes mid-campaign wording.

**13 Prism Sway** (PLANNED, set-piece: COUNTER-SWAY)
1. First new stage (world 2 starts at stage 11); relaxes after stage 12. 2. Chromatic look. 3. Purpose: learn to read *motion phase*: gates that sway in opposite directions. 4. Pairs of swaying gates 1.5 beats apart, phase-offset so the second opens where the first closes, with a gold arc that follows each sway; wide breathers between pairs. 5. Introduces counter-sway; practises sway, standard barrier, hold. 6. Gold sits on the sway path (follow the gap = 90%); mint at the outer sway ends (greed = wait a beat). 7. 133 bpm (world 2 track), sways in 6-beat cycles; grid 0.25. 8. 6.5: slower than stage 12 (360-405 px/s), but two things move at once. 9. Hint card "TWO GATES, OPPOSITE WAYS"; sways never faster than the existing 6-beat minimum; the second gate's opening is always reachable from the first's. 10. Replay: mint at the sway extremes; 3★ = 90% (16 of 18) gold. 11. 42-48 s; 46-52 items; gold 18, mint 4; accept section 4.

**14 Safe or Sorry** (PLANNED, set-piece: ROUTE ECONOMY)
Purpose: use risk/reward routes as an Overdrive economy. Two forks (a 4-row and a 6-row), each with a *long* risk lane of narrow gaps holding 4-5 route notes, and a safe lane that is short and wide; the second fork swaps sides and the risk lane has tighter gaps. Mechanics practised: routes, shrink precision, combos (a full risk lane tends to start Overdrive; route clear bonus exists). Gold is on shared tracks so stars never depend on the route (risk is bonus only). Music: 133, the lane notes are the melody. Difficulty 6.8. Fair: a fork is announced by a hint card and a 2 beat preview; both lanes validated independently. Replay: both routes clear (not saved), Overdrive. 3★: 90% gold on either route. 44-50 s, 60-68 items.

**15 Bend** (PLANNED, set-piece: BENT TUNNELS)
Purpose: hold *while steering*. Chains of three tunnels at shifting x (S-curves) joined by short recoveries, ending in a charged barrier you must smash after the last tunnel. Practises tunnel, charged barrier, steering under hold; no new obstacle type. Gold inside the tunnels' lanes (hold = reward). Difficulty 7.0. Fair: tunnel lengths 240-340, every joint has a recovery of at least the fair minimum; hint card "HOLD AND BEND". 3★: 90% of 16 gold requires staying on line through the third tunnel. 46-52 s.

**16 Echo Chamber** (PLANNED, set-piece: MIRROR MASTERY, provisional)
Purpose: master the echo after stage 7's introduction. Three Mirror Pulse zones: (a) barriers and centred gates only (feel the echo with no pairs), (b) pairs and a centre pinch, (c) a weave of pairs of different widths ending in a barrier. Uses the existing zone, validation and telegraph rules (>= 1.5 s warning, 0.6 s intro, 0.5 s outro). Difficulty 7.3. Fair: symmetric by construction; the echo never overlaps hazards the orb cannot also pass. **Risk:** Mirror Pulse is NOT DEVICE-TESTED; stage 16 is authored but its zones are tuned to be *no harder than stage 7 zone 2* until phone feedback exists. Gold outside zones only (stars never depend on the echo). 48-54 s.

**17 Charge Chain** (PLANNED, set-piece: RING MANAGEMENT)
Purpose: charge economy. Sequences of two or three charged barriers separated by exactly the fair refill window, with gold that forces you to stay big (inside the ring window) rather than shrink. Mechanics: charged, standard barrier, narrow gaps between chains. Difficulty 7.5. Fair: ring refill windows validated at every speed; a hint card shows the ring. 3★: gold between chain links (tight). 44-50 s.

**18 Mint Rush** (PLANNED, set-piece: GROOVE)
Purpose: a rhythm-forward, forgiving-but-greedy stage built for combos and Overdrive: long mint trails across the lane on the beat, joined by gates, so a perfect run reaches combo 16 and Overdrive twice. Gold is on the safe line (stars easy: 90% is generous); mint rewards play. Difficulty 7.2 (hard to perfect, easy to finish). Music: stays on the stage's world track (133 bpm); the combo melody carries the stage. Replay: a flawless combo. 40-46 s.

**19 Off-Beat** (PLANNED, set-piece: SYNCOPATION)
Purpose: read rhythm instead of position. Gates and barriers arrive on off-beat positions (beat grid 0.5 of a beat for some items via `on`) in call-and-response phrases (gate-gate-bar, gate-gate-bar, then the pattern breaks). Mechanics: gates, barriers, sway, breathing. Difficulty 7.8. Fair: the grid stays 0.25 beat; each phrase repeats once before it varies. 48-54 s.

**20 Chromatic Overload** (PLANNED, WORLD FINALE sequence)
Four movements with distinct feels and clear transitions, ~70 s:
 I. **Sway** (counter-sway pairs, build); II. **Echo** (one Mirror Pulse zone, the mirrored pair + barrier); III. **Charge chain** with tunnel; IV. **The Fork**: a final route fork (safe lane finishes, risk lane adds the final mint trail and a route clear) into a victory runout with the Overdrive sting and a "WORLD 2 COMPLETE" moment.
Difficulty 8.2. Reuses Pulse.Melody cues; music: Pulse Collapse audio at 140 bpm for the climb. Gold spread across movements (90% requires I-III). Fair: each movement ends in a recovery of gold; the fork has a hint card. 68-76 s, 80-90 items.

### Arc 3: Pulse Collapse (look 140 bpm)

**21 Static** (PLANNED, set-piece: PRECISION WEAVE)
1. Arc 3 opener, relaxes after stage 20 (380-425 px/s). 2. Pulse Collapse look: dark red/violet, glitching rails. 3. Purpose: exact shrink timing before the pace rises. 4. Slalom of narrow gates (need 38-40) with a wide recovery gate every four. 5. Practises narrow gaps, standard barriers; no new mechanic. 6. Gold sits between narrow gates (you must come out of the shrink to collect it); mint on the recovery gates. 7. 140 bpm, grid 0.25. 8. 7.6: narrower than arc 2 but slower and spaced. 9. Hint card "SHRINK LATE, GROW EARLY"; windows at 1.3x the fair floor. 10. Replay: perfect passes; 3★ = 90% (13 of 14) gold. 11. 44-50 s, 46-52 items.

**22 Fracture** (PLANNED, set-piece: TWO RISKS)
1. Route mastery in the collapse. 2. Split-lane rails, one lane in violet and one in red. 3. Purpose: choose between two *different* costs, not safe vs risky. 4. Forks whose left lane is tight gaps (shrink-heavy) and whose right lane is wider but longer with more rows. 5. Practises routes, narrow gaps, steering commitment. 6. Mint notes on both lanes in equal number; gold on the shared track. 7. 140 bpm; each lane has its own phrase of the lead synth (existing route cues). 8. 8.0. 9. Hint card names both lanes ("TIGHT OR LONG"); each lane validated independently. 10. Replay: clearing both lanes across two runs; 3★ = 90% gold. 11. 48-54 s, 56-64 items.

**23 Feedback** (PLANNED, set-piece: MIRROR + CADENCE)
1. Mirror reprise with pressure. 2. Echo violet against the collapse red (checked for contrast). 3. Purpose: stay calm while the echo is out. 4. Two Mirror Pulse zones with a barrier cadence between; zone 2 has a centre pinch gate that both orbs pass. 5. Practises mirror pairs, barriers, charged barrier. 6. Gold only outside zones; mint inside. 7. Telegraph cue per zone (existing). 8. 8.2, provisional like 16. 9. >= 1.5 s warning; pairs symmetric by construction. 10. Replay: mint inside zones; 3★ = 90% gold. 11. 50-56 s, 54-60 items.

**24 Cascade** (PLANNED, set-piece: ENDURANCE)
1. Stamina stage. 2. Long rail glitch. 3. Purpose: sustain focus over the longest unbroken stream. 4. Four phrases of alternating gaps and barriers (8-10 walls each), one gold-only recovery trail between phrases. 5. Practises rhythm of gap/barrier, charged barrier, breathing gate. 6. Gold on the recoveries and one per phrase. 7. 140 bpm, grid 0.25; combo melody climbs through each phrase. 8. 8.4. 9. Recoveries are exactly where the previous phrase ends; no wall in a recovery. 10. Replay: combo 16 through a phrase; 3★ = 90% (17 of 19) gold. 11. 52-58 s, 62-70 items.

**25 Narrow Margin** (PLANNED, set-piece: SMALLEST GAPS)
1. Precision peak. 2. Spare, monochrome-leaning look. 3. Purpose: the narrowest gaps the validator allows (need 32-34) with generous time. 4. One narrow gate per phrase, long clear time, one barrier per phrase; two tunnels at need 34. 5. Practises narrow gates, hold. 6. Gold directly on the line, so a sloppy line loses stars. 7. Quieter mix (fewer accents) so the rhythm of contact is audible. 8. 8.7: hard to be exact, not fast. 9. Every gap passes the fairness validator at the stage's top speed; window times are shown in tests. 10. Replay: 3★ = 90% (14 of 15) gold. 11. 46-52 s, 44-50 items.

**26 Counterpoint** (PLANNED, set-piece: TRIPLE SWAY)
1. Motion mastery. 2. Wave-patterned rails. 3. Purpose: ride a wave of sways. 4. Three swaying gates per phrase with staggered phases (a travelling wave), charged barriers between waves. 5. Practises sway, charged. 6. Gold on the wave crest path. 7. 140 bpm, sway cycle 6-8 beats. 8. 8.8. 9. The wave's path is always reachable at fair speed; hint card "RIDE THE WAVE". 10. Replay: a perfect wave; 3★ = 90% gold. 11. 50-56 s, 56-64 items.

**27 Convergence** (PLANNED, set-piece: PINCH)
1. Mirror finale prelude. 2. Converging rail lines. 3. Purpose: both orbs through the same gap. 4. Mirror pairs that converge toward the centre, a centre pinch, then diverge; barriers between. 5. Mirror pairs, narrow centre gap. 6. Mint in the pinch. 7. Echo cues. 8. 9.0, provisional. 9. Symmetric by construction; the pinch is a plain centred gate. 10. 3★ = 90% gold outside zones. 11. 52-58 s, 54-62 items.

**28 Overdrive Protocol** (PLANNED, set-piece: GREED CHAINS)
1. Economy stage. 2. Charged-energy glow. 3. Purpose: spend risk as power. 4. Long risk lanes with mint ladders, short Overdrive windows, a dense stretch to spend them. 5. Routes, mint, combos, Overdrive. 6. Risk lanes pay mint and route clears; gold shared. 7. Overdrive riser and release cues (existing). 8. 8.9: optional risk is the difficulty. 9. Safe lane always open; stars never need risk. 10. Replay: Overdrive twice; 3★ = 90% gold. 11. 52-58 s, 62-70 items.

**29 Call and Response** (PLANNED, set-piece: SEQUENCES)
1. Memory stage. 2. Repeating glitch motifs. 3. Purpose: learn a pattern, then execute its variation. 4. Four-bar patterns that repeat with one change (a mirrored phrase, a swapped lane, a different barrier). 5. All known mechanics, one at a time. 6. Gold on the changed element. 7. Call-and-response melody phrases tied to the pattern. 8. 9.4. 9. Every pattern is shown once before it is varied. 10. 3★ = 90% (19 of 21) gold. 11. 56-62 s, 66-74 items.

**30 Pulse Zero** (PLANNED, WORLD FINALE and campaign finale)
1. The last stage. 2. The collapse at full intensity; "CAMPAIGN COMPLETE" art (Gemini brief). 3. Purpose: reprise every mechanic exactly once, no new gimmick. 4. Five movements, ~90 s: precision weave; counter-sway; echo (Mirror Pulse zone); the fork (risk lane = a long mint ladder); the final gauntlet of barriers and a charged chain into the runout. 5. Combines all. 6. Gold across movements; the last gold block is a deliberate recovery before the finish. 7. Music: finale track (Gemini brief); until delivered, world 3 at 140 bpm. 8. 10: the hardest, with the longest memory demand; never the fastest. 9. Each movement has a recovery; the fork and the echo carry hint cards. 10. 3★ = 90% gold across all five movements; replay for Overdrive and the risk lane. 11. 86-96 s, 100-110 items.

## 6. How the architecture is generalised (implementation plan)
1. `Pulse.ARCS` (3 entries: index, id, name, banner, look) and per-stage `arc`; `stage.look` (visual layers) defaults to the arc's look; `stage.world` stays the audio theme. `stage.sector` stays equal to `world` for old code.
2. Stage select: arc pages of ten stages (two columns x five rows of compact tiles, or scroll), the page opens on the arc of the next stage; star total `n / 90`; main menu shows `30 stages`.
3. `Assets.stageCardKey(i)` maps by arc look; asset checks cover 30 stages by reusing the existing plates.
4. The first stage of an arc opens with the arc banner (generalises "first stage of a world"); a world-complete moment on stages 10, 20 and 30.
5. `tests/campaign.html`: legacy assertions are kept for stages 1-12 verbatim; the curve tests are generalised, not loosened, for 1-30 (see section 4); new `tests/stages-30.html` for per-stage signatures.
6. Batches: **1** = 13-18 (plus the infrastructure above), **2** = 19-24 (20 is the arc-2 finale), **3** = 25-30. Each batch is merged only after the checklist in the handoff protocol passes.

## 7. Risks and honest limits
- All new stage feel is bot-tuned, NOT DEVICE-TESTED. Mirror stages (16, 23, 27, 30) depend on Mirror Pulse, which has had no phone test; they are authored conservatively and flagged.
- Alternate audio (tracks beyond the three world tracks) and art for arcs/finales are requested from Gemini, not invented here. Until delivered, new stages reuse the existing art and music and are labelled provisional.
- Estimated durations come from path length / mean speed; bot clear times are checked in tests, human times will differ.
- Eight legacy stages (5-12) change background look only; this is cosmetic and reversible.

## Batch 1 as built (stages 13-18, status: IMPLEMENTED, NOT DEVICE-TESTED)

Measured by the stats script (bot path length / mean speed). Existing stages run 25-41 s, so these sit in the same range; the longer 42-48 s targets above were not needed for readability and are replaced by the measured values.

| # | Stage | Speed px/s | Items | Gold | Signature | Measured |
|---|-------|-----------|-------|------|-----------|----------|
| 13 | Prism Sway | 360-405 | 64 | 27 | counter-sway slide pairs | ~41 s |
| 14 | Safe or Sorry | 370-415 | 47 | 13 | two risk/safe forks, 10 fork rows | ~29 s |
| 15 | Bend | 375-420 | 47 | 21 | tunnel chains into charged barriers | ~35 s |
| 16 | Echo Chamber | 380-425 | 68 | 21 | three mirror zones (openings no tighter than stage 7) | ~43 s |
| 17 | Charge Chain | 385-430 | 52 | 26 | 11 charged barriers, Overdrive refills | ~30 s |
| 18 | Mint Rush | 385-430 | 68 | 18 | 34 mint notes, combo-first | ~33 s |

Validator rule added in this batch: a route's risk/safe note may not come after the route's last row (it could never count).

## Batch 2 as built (stages 19-24, status: IMPLEMENTED, NOT DEVICE-TESTED)

Measured by the campaign bots (perfect run, 540x960). All six pass validation, finish with all gold for the perfect, cautious (hold 0.75) and sloppy-steer bots, and at 30/60/144 fps. Durations are again shorter than the design targets above (as in Batch 1); item counts follow the stage text.

| # | Stage | Audio | Speed px/s | Gold | Signature | Measured |
|---|-------|-------|-----------|------|-----------|----------|
| 19 | Off-Beat | Chromatic Overdrive 133 | 390-430 | 33 | gate-gate-barrier phrases that repeat once, then break; off-beat sways | ~42 s |
| 20 | Chromatic Overload (arc 2 finale) | Pulse Collapse 140 | 395-430 | 29 | four movements: sway, one Mirror zone, charge chain with tunnels, a last fork | ~48 s |
| 21 | Static | Pulse Collapse 140 | 380-425 | 30 | slalom of half-width 38-40 gates, a wide breather after every four | ~44 s |
| 22 | Fracture | Pulse Collapse 140 | 385-430 | 14 | three forks with two different prices (tight lane vs far-over wide lane), mint on both | ~33 s |
| 23 | Feedback | Pulse Collapse 140 | 390-430 | 16 | two Mirror zones with a barrier cadence between, the second ends in a centre pinch | ~27 s |
| 24 | Cascade | Pulse Collapse 140 | 395-440 | 28 | four phrases of 8-10 walls, a gold trail after each | ~52 s |

Deviations from the design text above (all conservative, none touch stages 1-18):
- **Speed**: stages 19, 20 and 23 are capped at 430 px/s. A Mirror Pulse telegraph is a fixed 560 px, and the validator requires 1.3 s of warning, which limits any stage with a zone to 430 px/s. Stage 20 is therefore not faster than 19. Stage 24 (no zone) reaches 440.
- **Stage 20** has one Mirror zone and one fork (as designed), so the mirror/route tests accept one zone/fork for it (two for every other zone/fork stage). It is shorter than the 68-76 s target.
- **Stage 22**: a fork's rows are shared by both lanes, so "wider lane with more rows" became "wide lane that needs a long sideways move": the tight lane (half-width 38-40) is the risk lane and carries the route clear.
- **World finale moment**: the last stage of each arc shows "World n complete" (stage 10, 20) and "Campaign complete" (stage 30) on the clear panel with the existing max-multiplier sting after 0.9 s. There is no dedicated finale music or completion art (not supplied).
- Backdrops: stage 20 uses `bg_portrait_w2_finale_s20`, stages 21-24 `bg_portrait_w3_pulse_collapse` (both PROVISIONAL per the manifest).

## Batch 3 as built (stages 25-30, status: IMPLEMENTED, NOT DEVICE-TESTED)

Measured by the campaign bots (perfect run, 540x960, 60 fps). All six pass validation, finish with all gold for the perfect, cautious (hold 0.75) and sloppy-steer bots at six track lengths and at 30/60/144 fps (`tests/campaign.html`, plus the mirror and route suites for 27/28/30). Durations and item counts again fall below the design text (as in Batches 1-2) except where noted. Every stage keeps the Pulse Collapse audio (140 bpm) and the arc-3 look; 30 uses the existing `bg_portrait_w3_finale_s30` backdrop.

| # | Stage | Speed px/s | Items | Gold | Mint | Signature | Measured |
|---|-------|-----------|-------|------|------|-----------|----------|
| 25 | Narrow Margin | 400-440 | 46 | 16 | 5 | nine phrases, each one half-width 34-36 gate + a barrier; two tunnels at 34; gold exactly on the line | ~48 s |
| 26 | Counterpoint | 410-450 | 60 | 30 | 1 | seven travelling waves of three swaying gates (6-8 beat cycles), gold on each gate's path, a charged barrier after every wave | ~45 s |
| 27 | Convergence | 395-430 | 62 | 20 | 3 | three Mirror zones whose pairs close in on the centre, a centred pinch both orbs pass, then open out again | ~48 s |
| 28 | Overdrive Protocol | 415-455 | 79 | 20 | 18 | three forks (5, 6, 7 rows) whose risk lane is a mint ladder (4, 5, 6 notes), each followed by a dense burst of walls | ~52 s |
| 29 | Call and Response | 420-460 | 66 | 21 | 2 | five motifs, each played as a call and then as a response with one change (swapped side, mirrored sway, plain vs charged barrier); gold on the change | ~49 s |
| 30 | Pulse Zero (campaign finale) | 400-430 | 102 | 36 | 9 | five movements: precision weave, counter-sway, one Mirror zone, a fork with a 6-note mint ladder, a gauntlet of barriers + charged chain, ending on a gold recovery | ~84 s |

Difficulty proxies (design targets 8.7, 8.8, 9.0, 8.9, 9.4, 10 are provisional; the Producer tunes from phone feedback). Measured on the compiled track at 540x960: narrowest half-width (`need`), the smallest aiming window that implies (`2 x (need - 20)`; the validator floor is 28 px), median clear time between items, walls per second, how many tight (<40) gates, and what must be tracked at once.

| # | Narrowest need | Aiming window | Median clear | Walls/s | Tight gates | Simultaneous demands |
|---|---|---|---|---|---|---|
| 21 (ref) | 38 | 36 px | 0.60 s | 0.79 | 52% | one |
| 24 (ref) | 40 | 40 px | 0.61 s | 1.01 | 0% | one |
| 25 | 34 | 28 px (the floor) | 0.95 s | 0.53 | 69% | one: size and line |
| 26 | 48 | 56 px | 0.60 s | 0.64 | 0% | three moving gaps in sequence |
| 27 | 44 | 48 px | 0.68 s | 0.81 | 0% | two orbs (echo) |
| 28 | 40 | 40 px | 0.61 s | 0.79 | 0% | route choice + a streak to protect |
| 29 | 38 | 36 px | 0.67 s | 0.87 | 13% | memory of the call |
| 30 | 36 | 32 px | 0.72 s | 0.68 | 29% | everything, one at a time |

The curve is climbed by different dials, not raw speed: 25 by the smallest windows with the most time (nothing else on screen), 26 by motion, 27 by the echo, 28 by optional risk, 29 by memory, 30 by length (84 s) and the largest set of different demands. Tuning knobs in `src/js/stages.js`: `speed`, `pace` (multiplies every authored clear time; validation still enforces the fairness floors), `spread`, each gap's `need`, `amp` and `beats` of sways, the rows and notes of a fork.

Deviations from the design text above (all conservative, none touch stages 1-24):
- **Speed**: stage 24 already runs to 440, so 25-26 start the cap at 440 and 450. Stages 27 and 30 contain a Mirror zone (a fixed 560 px telegraph needs 1.3 s), so they are capped at 430 and run below stage 26 and 29. `tests/campaign.html` therefore states the rule as: a stage with a zone must stay at or under 430 and not fall below the lower of 430 and the previous stage; every other stage may not fall. Stage 29 reaches the 460 ceiling; stage 30 is deliberately not the fastest (a new check).
- **Stage 26** uses half-widths 48-50 (not the 40-44 of earlier sways): a swaying gate with a 60-80 px swing at that tempo must keep the 28 px aiming window over the whole crossing, which the validator enforces. Its difficulty is the travelling wave, not the narrowness.
- **Stage 27** has three zones (the design says one converge-pinch-diverge): the first converges and diverges once, the second pinches twice, the third converges tighter (pairs down to a 72 px divider, close to the 64 px minimum the divider rule allows). No zone opening is tighter than stage 7's. Gold only outside zones.
- **Stage 28**: a fork row's note after its last row could never count, so a ladder of N notes needs N + 1 rows (a rule from Batch 1). The forks therefore have 5, 6 and 7 rows with 4, 5 and 6 risk notes. It has 79 items (design 62-70) because of those rows.
- **Stage 29** does not include a Mirror zone or a fork: either would cap or crowd the fastest stage in the game. Its five motifs use gaps, narrow gaps, sway, breathing gaps, a tunnel, plain and charged barriers and mint, each introduced as a call before it is answered.
- **Stage 30** has the five movements of the design, one mechanic each (the tunnel, charge-chain-with-tunnel and breathing gaps are not repeated, so nothing new and nothing doubled). It has 102 items (design 100-110) and runs about 84 s (design 86-96). The finale has no dedicated music or art (none supplied): it uses world 3 at 140 bpm, the arc-3 finale backdrop, the "Campaign complete" title and the existing max-multiplier sting after 0.9 s. There is no Next button on the last stage.
- **Stars**: 90 stars are now available; skin thresholds are unchanged and Aether Crown (72 stars) becomes reachable (`tests/skins.html`).
- Stage 25's "quieter mix" is not implemented: it would need an audio-mix change (no new audio was added or requested).
