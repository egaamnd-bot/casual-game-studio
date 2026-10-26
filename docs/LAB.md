# Prototype Lab

Status: foundation for isolated experiments (Producer decision 2026-10-26, Issues #28 / #31 / #32 / #33). **NOT DEVICE-TESTED.**

The Lab is a menu entry (**LAB**, bottom-left of the main menu) that lists playable prototypes. A lab stage is *not* part of the campaign:

- it is not in `Pulse.STAGES`, so the 24 (later 30) campaign stages, their ids, order, star totals and unlocks are untouched;
- a completed lab run shows its stars but **never writes the save** (no record, no unlock, no skin), crashes and retries included;
- it inherits the look of a real *base* stage (arc, world audio theme, portrait backdrop) so it needs no new art;
- the end screen says "Prototype clear" and "Lab" instead of "Stage clear" / "Stages", and never shows a finale title or a Next button.

## Adding a prototype

```js
Pulse.Lab.register({
  id: 'my-prototype',                 // unique
  title: 'My prototype',              // button text on the LAB screen
  desc: 'One line for the Producer',
  base: 's05-...',                    // id of a real stage to inherit look/world from
  stage: Pulse.Lab.derive('s05-...', { id: 'lab-my-prototype', name: '...', items: [...] }),
  flags: { myFeature: true },         // read in the game as scene.lab.flags
});
```

`register` validates the stage with the campaign validator and refuses duplicate ids, unknown bases and ids that collide with a campaign stage. In game code a prototype checks `scene.lab && scene.lab.flags.myFeature`, so with no lab entry the old behaviour runs exactly.

Switch the whole menu entry off with `CONFIG.lab.enabled = false`.

## Files

`src/js/lab.js` (registry), `src/js/lab-scene.js` (LAB screen), a few guarded lines in `game-scene.js`, `menu-scenes.js`, `main.js`; tests in `tests/lab.html`.
