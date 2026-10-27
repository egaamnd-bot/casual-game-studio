# Handoff: Resonance gates prototype (Lab, Issue #31)

- Date: 2026-10-26/27. Branch `feature/resonance-gates`. Base: `origin/main` @ `66f355f` (merged; the earlier base was `4b06814`, PR #35 Prototype Lab).
- Head SHA, PR URL, CI run, APK run and the full-suite output per viewport for that exact head are in the PR description (a note committed in the branch cannot contain its own SHA). Test results below describe the code, which has not changed since the run.
- Status: ready for review. **NOT DEVICE-TESTED.** Not merged.

## Summary
An optional intermediate-size target gate, playable only from the LAB menu ("Resonance gates"). It is an ordinary wide gate (passable at any size) with a target band for the orb radius (standard `[26,46]`, also `[24,38]` and `[32,46]`). If the collision radius is inside the band at any instant while the gate's middle line is within 14 px of the orb (about +-47 ms at 300 px/s), the pass earns one `Overdrive.award` of 4 units (cap 20 per run, nothing while Overdrive is on), with a mint burst, `packCombo4` sample and "RESONANCE". Too small or too large: safe pass, nothing. Design, rules, timing slack and off-switch: [docs/RESONANCE_GATES.md](../RESONANCE_GATES.md).

## Changed files
- New: `src/js/resonance.js`, `tests/resonance.html`, `tests/resonance-run.html`, `tests/resonance-common.js`, `docs/RESONANCE_GATES.md`, this note.
- `src/index.html`: one line, `<script src="js/resonance.js"></script>` right after `js/campaign.js` (it loads before `lab.js`; the module registers its lab entry when `Pulse.Lab` appears).
- `src/js/game-scene.js` (5 added lines, all guarded by `Pulse.Resonance`):
  1. `startRun`, after `this.grazes = 0;`: `if (Pulse.Resonance) Pulse.Resonance.reset(this);`
  2. `step`, after `const grazing = this.grazeOn();`: `const resonance = !!Pulse.Resonance && Pulse.Resonance.on(this);`
  3. `step`, after the `Pulse.Graze.observe` line: `if (resonance && s.kind === 'gate' && !s.ring && !s.scored) Pulse.Resonance.observe(...)`
  4. pass branch, after `this.contact('pass', s, prevCombo);`: `if (resonance) Pulse.Resonance.cleared(this, s, r);`
  5. `draw`, after `this.drawOverdrive();`: `if (Pulse.Resonance) Pulse.Resonance.draw(this);` **This one goes beyond the seams named in the brief**: a per-frame overlay needs a per-frame hook, and tests drive `update()`/`draw()` by hand so a Phaser scene event would not fire. Easy to move if the lead prefers.
- Not touched: `config.js`, `stages.js`, `campaign.js`, `level.js`, `sprite-view.js`, `sfx.js`, save schema, `AI_HANDOFF.md`, `DECISIONS.md`. `CONFIG.resonance` is defined at the top of `resonance.js`.

## Tests
Commands: `/home/claude/bin/pulse-test /home/claude/wt/resonance <w> <h>` (full suite) at `540 960`, `360 640`, `412 915`. New pages: `resonance.html` (70 checks) and `resonance-run.html` (42 checks); both PASS at 540x960 on the code now in the branch (earlier run, before the docs-only main merge). Existing pages `lab.html scene.html barriercue.html graze.html` are in the full suite. `gameplay.html` is the known manual page that fails identically on main. Exact per-viewport output: PR description.
Covered: band edges (just inside / outside / exactly on), window edges, changing radius, one award per gate (pool reuse, retry, pause, tall / sliding / left / right gates), cap, no award during Overdrive, crash pays nothing, lifecycle (stage change, retry, scene restart: no leaked overlay or state), lab never writes the save, collision unchanged (8000-sample property test with the module on and off), enabled-vs-disabled bot runs (lab stage, stage 1, stage 10) with identical state, score, energy, time and stars, 30/60/144 fps and a 50 ms hitch, repeated runs identical.

## Known issues / limits
- NOT DEVICE-TESTED: readability, feel and timing on a phone. Headless screenshots (worlds 1 and 3) looked readable.
- A normal run can fill the Overdrive meter from ordinary contacts, after which resonance adds nothing (by design); the effect still shows.
- Lab only: no campaign stage, Endless, save or score uses it.
- No new art or audio requested.

## Producer decision requested
Try the LAB "Resonance gates" stage on a phone. Decide: keep as a Lab prototype, develop toward a campaign stage, or drop. Approval to merge is requested only for the Lab-only prototype (campaign placement is a separate decision). Next recommended task: Producer phone feedback on ring readability, the 4-unit reward and the timing window.
