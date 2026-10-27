# Developer Campaign / QA Gauntlet

Status: **REQUIREMENT RECORDED, NOT BUILT** (Producer rule 2026-10-27, Issue #28). Nothing here exists in the game yet. **NOT DEVICE-TESTED.**

## Purpose

Let the Producer exercise every existing and approved new mechanic in one short developer session on the phone, without playing the 30-stage campaign. It is a developer/QA tool, not content: it never changes what a normal player sees or earns.

## Producer requirements (verbatim intent, from Issue #28)

1. One clearly labelled **Developer Campaign / QA Gauntlet** entry, inside the existing Prototype Lab (`docs/LAB.md`) where possible. Separate from Campaign, Endless, unlocks and the production-facing menu.
2. A short, curated sequence that runs the **actual game systems and feature modules** (no visual-only showcase). Where a mechanic needs setup, curate controlled conditions with a meaningful trigger.
3. Coverage: core shrink/grow control; ordinary hazard avoidance; cyan barrier smashing and the ready cue; routes / risk-reward; Mirror Pulse; near-miss → existing Overdrive; Resonance Gates; Shatter Symphony / audio reactions; World Shift transitions; and any further feature that becomes approved and implemented.
4. Clear section labels or brief prompts; **fast retry/reset**; replay or direct selection of a section where practical.
5. **Isolation:** no campaign completion, unlock, star, best-score, save write, Endless progression or reward change; no prototype flag leaking into normal Campaign or Endless afterwards.
6. **Guarded:** can be disabled or hidden in production builds.
7. **Tests** for every section, reset/retry, mode exit, save isolation and flag cleanup. Existing per-feature tests stay; the Gauntlet supplements them.
8. **Acceptance evidence:** a checklist mapping each mechanic to its section, trigger and expected outcome, plus an APK built from the exact tested commit SHA. Real-device validation stays PENDING until the Producer tests it.

Hard limits: no change to campaign stage IDs, layouts, rules, `docs/CAMPAIGN_30.md`, controls, collision, scoring, stars or `pulse.save.v1` compatibility. No new currency or meter, no duplicate game logic.

## Integration seam (design only)

The Lab already gives the isolation this needs, so the Gauntlet is a thin layer on top, not a new engine.

- **Registry:** a Lab entry of a new kind, `Pulse.Lab.registerSequence({ id, title, sections: [...] })`, in its own module (`src/js/gauntlet.js`, script tag after the last prototype module). Each section is `{ id, label, prompt, base, stage, flags, expect }`. A section's `stage` is a normal Lab stage (validated like a campaign stage, not in `Pulse.STAGES`) and its `flags` are the same switches the prototype already reads as `scene.lab.flags`.
- **Flags are per section:** they live on the scene's lab entry, never on `CONFIG` or `Pulse.*` globals, so leaving a section drops them by construction. The test asserts it anyway (flags and globals identical before entry and after exit).
- **Flow:** LAB → Gauntlet → section list (direct select) → section run with its prompt banner → clear shows "Next section / Replay / Sections". Retry restarts only the current section. No save writes: the Lab's existing no-save rule is reused and tested again for the sequence.
- **Production guard:** `CONFIG.gauntlet.enabled` (default decided at build time; off in release builds) hides the entry; `CONFIG.lab.enabled = false` hides the whole Lab and therefore the Gauntlet.
- **Shared files:** `config.js` gets one small block, `index.html` one script tag, `lab-scene.js` the section screen. Everything else lives in `gauntlet.js` and `tests/gauntlet.html`. A mechanic joins by registering one more section from its own module or from `gauntlet.js`.

## Planned sections (draft; final list when built)

| # | Section | Mechanic exercised | Trigger the tester performs | Expected outcome |
|---|---------|--------------------|------------------------------|------------------|
| 1 | Shrink / grow | Core control | Hold to shrink through gates, release to grow | Orb resizes smoothly; gates pass or fail by the existing collision rule |
| 2 | Hazards | Walls and gates | Steer around hazards | Contact ends the run as in the campaign |
| 3 | Cyan barriers | Charged barriers + ready cue | Grow past the charge size, smash a barrier | Cue shows when the orb is ready; barrier smashes; below the charge size it blocks |
| 4 | Routes | Risk-reward forks | Take the safe lane, then the risk lane | Each lane's reward as in the route stages |
| 5 | Mirror Pulse | Echo zone | Pass the telegraph, then the paired obstacles | Echo mirrors the orb; both must clear |
| 6 | Near-miss | Graze → Overdrive | Brush gates within the margin | Overdrive charge rises per graze, capped as in the near-miss prototype |
| 7 | Resonance Gates | PR for #31 | As defined by that prototype | As documented in `docs/RESONANCE_GATES.md` |
| 8 | Shatter Symphony | PR for #32 | As defined by that prototype | As documented in `docs/SHATTER_SYMPHONY.md` |
| 9 | World Shift | PR for #33 | As defined by that prototype | As documented in `docs/WORLD_SHIFT.md` |

Sections 7-9 are added only when their prototype PRs are merged. A section for a mechanic that is not approved or not merged does not ship.

## Build order and acceptance

1. Wait for the four current workstreams (#31, #32, #33, Campaign Batch 3) to reach safe integration checkpoints and for their PRs to merge one at a time. The Gauntlet must not disturb their shared browser-test queue.
2. Implement on its own branch (`feature/dev-gauntlet`) and PR.
3. `tests/gauntlet.html`: every section loads and runs through the real systems; reset/retry; direct section select; mode exit; save bytes unchanged before/after a full pass and after crashes; flags and `CONFIG` unchanged after exit; the entry hidden when the guard is off; campaign stage list, ids and order unchanged. Full existing suite at 540×960, 360×640, 412×915 through `pulse-test`.
4. Checklist (the table above, filled with observed results), APK from the exact tested head, exact-SHA merge, verified main build. Producer phone result recorded separately and marked PENDING until tested.

## Permanent rule

Every newly approved mechanic must add its Gauntlet section (or an explicit written reason it cannot) as part of its own PR or the next Gauntlet PR. See `docs/AI_HANDOFF_PROTOCOL.md` and Decision #25.
