# Game Design Document

> Status: **Concept approved for prototyping** (Pulse, see [DECISIONS.md](DECISIONS.md)). Prototype 1 rules and test plan: [PULSE_PROTOTYPE.md](PULSE_PROTOTYPE.md). Sections marked TODO wait for playtest results.

## 1. Overview

- **Working title:** Pulse
- **Genre:** One-touch arcade, endless
- **Platforms:** Android first, **landscape** (see [LANDSCAPE.md](LANDSCAPE.md)); iOS deferred
- **Target audience:** Broad age range; short sessions on the go
- **Elevator pitch:** Hold to shrink, release to grow. Squeeze your energy orb through gaps, and stay big to grab the energy that multiplies your score.

## 2. Design Pillars

Three to five principles every feature must support. Starting suggestions:

1. **Instant to learn:** playable within 10 seconds, little or no text
2. **Short sessions:** a round fits in 1–3 minutes
3. **Satisfying feedback:** every action gets a clear visual and audio response
4. **Fair to everyone:** suitable for all ages, never pay-to-win

TODO: Confirm or replace.

## 3. Core Loop

```
Run (30 s – 2 min) → crash → see score vs. best → instant retry
```

Moment to moment: read the next gap, shrink just enough and just in time, then grow back to catch energy. Players return to beat their best score and to hold a ×5 multiplier longer.

## 4. Mechanics & Controls

| Input | Action |
|-------|--------|
| Hold anywhere | Orb shrinks continuously down to its minimum size |
| Release | Orb grows back to full size |
| Tap (start / game over) | Start or retry |

Full rules, scoring and fairness guarantees are in [PULSE_PROTOTYPE.md](PULSE_PROTOTYPE.md).

## 5. Progression

- Levels / stages: Campaign with hand-made stages (3 so far) plus Endless. See [CAMPAIGN.md](CAMPAIGN.md)
- Difficulty curve: speed rises for about 46 s; gap tightness and obstacle density rise over 70 s
- Stars: up to 3 per stage, for finishing and collecting energy
- Unlockables: cosmetic orb skins at 3, 6 and 9 stars. Next stage unlocks when the previous one is finished

## 6. Monetization

Not in the prototype. TODO after playtesting: e.g. rewarded ads, interstitials, in-app purchases, ad-free purchase. Include player-friendly rules (e.g. no ads during the first sessions, no interstitials mid-round). Check age-rating and store policy requirements for a broad audience.

## 7. Art & Audio Direction

See [ART_BIBLE.md](ART_BIBLE.md). Summarize mood and references here: TODO.

## 8. Success Metrics

- Day 1 / Day 7 retention
- Average session length and sessions per day
- Level completion and drop-off rates
- Ad and purchase conversion (if monetized)
- TODO: game-specific metrics

## 9. Open Questions

- TODO
