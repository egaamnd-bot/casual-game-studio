# PULSE v5.0 — Rhythm-Driven Motion Arcade: Master Design Brief & Phaser 3.90.0 Integration Specification

**Document Version:** 5.0 (Evolution of `run19` / Commit `deb0670` / Art & Audio Pack v4.0)  
**Target Engine & Platform:** Phaser 3.90.0 · Capacitor Android WebView (Landscape `540px` Height × `860..1240px` Dynamic Width; `960×540` 16:9 Baseline)  
**Prepared By:** Lead Game Designer, Motion Designer & Audio Director  
**Implementation Owner:** Claude (Engineering & Phaser 3 Integration)  

---

## Executive Overview & Core Preservation Mandate

**PULSE v5.0** evolves the existing v4.0 (`run19`) build from a static-obstacle corridor runner into a cohesive **Rhythm-Driven Motion Arcade** experience inspired by high-energy electronic music arcade trailers. Rather than replacing working code or discarding approved v4.0 assets, this specification builds directly on the existing `run19` architecture (`config.js`, `level.js`, `stages.js`, `patterns.js`, `sprite-view.js`, `render.js`, `game-scene.js`, `sfx.js`).

### Non-Negotiable Core Gameplay Rules (100% Preserved)
1. **One-Touch Size Control (`Pulse.Orb`):**
   - **Hold anywhere to shrink:** Orb radius contracts at `shrinkRate = 190 px/s` from `radius = 56px` down to `minRadius = 20px` (`0.189s` full transition).
   - **Release to grow:** Orb radius expands at `growRate = 260 px/s` back to `radius = 56px` (`0.138s` full transition).
   - **Fixed Lane Center (`orbX = 270`):** In track space (`width = 540`), the orb stays on the center line `x = 270` (`screenY = 270`) at `orbY = Math.round(H * 0.7)` (`screenX = SW - orbY`).
2. **Threshold & Charge Mechanics (`Pulse.isCharged`):**
   - **Expanded / Charged Threshold:** `CHARGED_RADIUS = 56 - 8 = 48px` (`isCharged(r) === r > 48`).
   - **Charge Ring (`orbState.charge`):** Fills linearly from `0.0` to `1.0` over `chargeTime = 0.30s` while `isCharged(r)` is true; resets immediately to `0.0` if `r <= 48`.
3. **Obstacle & Collectible Rules (`Pulse.Level.resolve`):**
   - **Gates & Tunnels (`type: 'gate'`):** Require `r <= s.need` across the gap `[s.gapL, s.gapR]`. Every narrowing gate guarantees `s.need >= minRadius + fairMargin` (`20 + 8 = 28px`).
   - **Standard Cyan Barriers (`type: 'barrier'`):** Shatter on contact when `isCharged(r)` (`r > 48`); fatal crash if shrunk (`r <= 48`).
   - **Charged Cyan Barriers (`type: 'barrier', charged: true`):** Shatter on contact only when `isCharged(r) && charge >= 1.0`; fatal crash otherwise.
   - **Collectibles (`energy` Gold `#FFB800` & `bonus` Mint `#00FF9D`):** Sit at `orbX ± PICKUP_OFFSET` (`270 ± 62px`). Reachable only when expanded (`r > 48`); when `r <= 48`, pickups dim to `dimAlpha = 0.45` with slate tint `#475569`.
4. **Save & Test Compatibility:**
   - All 12 campaign stage IDs (`s1-first-pulse` … `s12-the-final-pulse`) and `pulse.save.v1` schema in `storage.js` are preserved unchanged.
   - All campaign stages and endless patterns continue to pass `Pulse.Track.validateItems` (`toSmall = 0.35s`, `toBarrier = 0.32s`, `toChargedBarrier = 0.62s`, `toEnergy = 0.32s`, `energyToSmall = 0.32s`, `bonusTime = 0.22s`).

---

## Deliverable 1: Visual & Audio Direction Document (`ART_BIBLE.md` v5.0 Evolution)

### 1.1 Aesthetic Pillar: *Kinetic Harmonic Synesthesia*
PULSE v5.0 extends the v4.0 *Neon Geometric Precision* art bible (`#0B0F19` obsidian void, `#00F0FF` player cyan, `#FF2A54` danger crimson, `#FF7A00` gate amber, `#FFB800` gold energy, `#00FF9D` mint bonus) with **synchronized motion and musical reactivity**:
- **The World Breathes on the Beat:** A lightweight beat tracker (`Pulse.BeatClock` in `sfx.js`) derives real-time `beatPhase` (`0.0 .. 1.0`) and `barPhase` (`0.0 .. 1.0`) from the active music track's BPM (`112` Menu, `125` World 1, `133` World 2, `140` World 3). Background speed rails (`railTop`/`railBottom`) pulse alpha (`0.65 -> 0.88`) on every quarter-note downbeat, and the orb emits a subtle geometric beat-echo ring (`fx_orb_beat_echo`).
- **Motion with Mechanical Grounding:** Moving obstacles never float arbitrarily in empty space. Sliding and oscillating walls ride on anchored laser guide rails (`obs_rail_track_tile`) and hydraulic lattice struts (`obs_piston_strut_tile`), rotating gates pivot around octagonal cyber-hubs (`obs_rotor_hub`), and wave corridors flex via articulated neon ribs (`obs_wave_rib_tile`).
- **Readability & Telegraph Hierarchy (The 3-Layer Contrast Rule):**
  1. **Background Layer (Depth `0–1`, Low Contrast `15–50%` Alpha):** Scrolling world grids and parallax ridges (`#080D1A` / `#0C0A1C` / `#100816`).
  2. **Telegraph & Guide Layer (Depth `1.8–2.2`, Medium Contrast `65–85%` Alpha):** Laser rail tracks (`obs_rail_track_tile`), ghost lock-brackets (`ind_rail_stop_bracket`), directional chevrons (`ind_telegraph_arrow_in/out`), and 4-beat countdown rings (`ind_beat_telegraph_ring`).
  3. **Active Collision Layer (Depth `2.5–6.0`, Maximum Contrast `100%` Alpha):** Solid hazard edges (`#FF2A54` / `#FF7A00`), smashable cyan barriers (`#00F0FF` / `#E0FFFF`), collectibles (`#FFB800` / `#00FF9D`), and the player orb.

### 1.2 Color & Semantic Signal Discipline
To guarantee instant peripheral readability at `200–640 px/s` on mobile screens, color semantics are strictly locked:

| Semantic Role | Primary Hex | Core / Rim Hex | Meaning to Player |
| :--- | :--- | :--- | :--- |
| **Safe / Smashable / Player Full** | `#00F0FF` (Electric Cyan) | `#E0FFFF` (Ice White) | Safe to hit at full size (`r > 48px`); Charge Ring ready |
| **Lethal Wall / Unready Barrier** | `#FF2A54` (Neon Crimson) | `#2B111B` (Dark Hull) | Fatal on contact; shrink to avoid or finish charging |
| **Gap Aperture / Motion Telegraph** | `#FF7A00` (Laser Amber) | `#F8FAFC` (White Tick) | Marks exact passable gap boundary and target lock position |
| **Primary Objective Pickup** | `#FFB800` (Solar Gold) | `#FFF3B0` (Warm Core) | Collect at full size for Campaign Stars / Endless Multiplier |
| **Optional Risk Pickup / Opening** | `#00FF9D` (Hyper Mint) | `#E0FFF4` (Mint Core) | Optional high-skill dare or outward-opening gate telegraph |
| **Inactive / Uncollectible State** | `#475569` (Muted Slate) | `45%` Opacity | Orb is currently shrunk (`r <= 48px`); pickups cannot be taken |

---

## Deliverable 2: Twelve-Stage Rhythm/Motion Campaign Progression Proposal

### 2.1 Pacing & Pedagogical Architecture
The 12-stage campaign is structured across the 3 existing worlds (**World 1: Neon Circuit** at `125 BPM`, **World 2: Chromatic Overdrive** at `133 BPM`, **World 3: Pulse Collapse** at `140 BPM`), grouped into four 3-stage pedagogical acts:
- **Act I (Stages 1–3) — Foundation & Simple Motion:** Teaches core shrink/grow/smash mechanics and introduces single-axis telegraphed motion (**Sliding Gates** and **Breathing Pinch Jaws**) at generous `125 BPM` intervals while keeping speeds low (`200–260 px/s`).
- **Act II (Stages 4–6) — Barriers, Sustained Holds & Collectible Decisions:** Combines moving gaps with **Gold Dares**, introduces **Charged Barriers** (`0.30s` full-size lock) and **Sustained Tunnels**, and layers slow **Oscillating Gates** after tunnels (`255–305 px/s`).
- **Act III (Stages 7–9) — Complex Motion Archetypes & Faster Musical Phrases:** Introduces **Moving Gap Wave Corridors**, **Rotating Gates/Rings**, **Pulsating Energy Barriers**, and **Mint Bonus Dares** synced to eighth/quarter-note phrases (`290–360 px/s`).
- **Act IV (Stages 10–12) — Mastery Challenges:** Combines **Static + Moving Hybrid Hazards**, tight transition windows, and multi-bar rhythmic gauntlets punctuated by deliberate musical recovery breathers (`335–410 px/s`).

> **Speed vs. Complexity Rule:** Whenever a stage introduces a new moving obstacle archetype (e.g., Stage 2 Sliding Gate, Stage 5 Charged Barrier, Stage 6 Tunnel + Breathing Exit, Stage 7 Wave Corridor, Stage 8 Rotating Gate, Stage 9 Pulsating Barrier), forward speed increases by at most `+10 to +15 px/s` over the previous stage, and the first two encounters occur in isolation with `1.0–1.2s` (`2+` beats) of clear lead time.

### 2.2 Complete 12-Stage Progression Table

| Stage & ID (Preserved) | World & BPM | Speed (`start→end` px/s) | New Mechanic / Motion Combination | Rhythm & Movement Concept | Difficulty Increase | Player Learning Objective |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **S01 · First Contact**<br>`s1-first-pulse` | **W1 · Neon Circuit**<br>125 BPM (`0.48s`/beat) | `200 → 220` | Core shrink/grow + gentle **Open-Slide Gate** (`slide` widening to `need=48`) on final two gates | Whole-note (`1.92s`) & dotted-half (`1.44s`) pulse; rail brackets show where sliding jaws stop | Baseline tutorial speed; wide `46–50px` clearances (`26–30px` margin over `r=20`) | Master hold-to-shrink through gaps and release-to-grow for Gold; read amber rail brackets |
| **S02 · Break the Barrier**<br>`s2-find-the-rhythm` | **W1 · Neon Circuit**<br>125 BPM (`0.48s`/beat) | `220 → 240` | **Standard Cyan Barriers** (`bar`) + **Sliding Offset Gates** (`slide` locking 1.5 beats ahead) | Half-note (`0.96s`) release-and-smash cadence; sliding gate aligns on beat 2 before barrier on beat 4 | Introduces lethal-if-shrunk barriers; requires releasing after a sliding gate | Release early after clearing a gate to reach full size (`r > 48px`) before cyan barrier impact |
| **S03 · Alternating Rhythm**<br>`s3-controlled-overload` | **W1 · Neon Circuit**<br>125 BPM (`0.48s`/beat) | `240 → 260` | **Oscillating Pinch Jaws** (`oscillate`, slow `±6px` symmetric breathing) alternating with Barriers | Steady `1.5`-beat (`0.72s`) and `1.25`-beat (`0.60s`) shrink–smash–shrink–smash call-and-response | Faster alternation (`0.60s` windows); gap clearance breathes gently (`44±6px`) | Internalize steady rhythmic alternation without panic-holding after smashing a barrier |
| **S04 · Split Decision**<br>`s4-split-decision` | **W1 · Neon Circuit**<br>125 BPM (`0.48s`/beat) | `255 → 280` | **Gold Dares** between **Sliding Gates** (`gap → gold → sliding gap`) + off-center shifts (`±60px`) | Syncopated 1-beat (`0.48s`) tap-release-tap phrase (` shrink → pop big for Gold → re-shrink `) | Shorter `0.45–0.48s` switch windows; lateral visual shifts test focus on center lane | Execute a brief release between two consecutive gates to snatch Gold without clipping the second gate |
| **S05 · Charged Energy**<br>`s5-charged-energy` | **W2 · Chromatic Overdrive**<br>133 BPM (`0.451s`/beat) | `270 → 290` | **Charged Cyan Barriers** (`charged: true`, `0.30s` charge ring) + **Pulsating Energy Barriers** (intro) | 2-beat (`0.90s`) sustained full-size charge window; `ind_beat_telegraph_ring` counts down 4 beats | Requires `0.62s+` total recovery (grow + `0.30s` charge ring lock) before barrier impact | Release immediately after a gate and hold composure at full size until the octagonal Charge Ring locks |
| **S06 · The Long Hold**<br>`s6-the-long-hold` | **W2 · Chromatic Overdrive**<br>133 BPM (`0.451s`/beat) | `280 → 305` | **Sustained Tunnels** (`length: 200–320px`) + **Moving Gap Wave Corridors** (`wave` undulating ribs) | Multi-beat sustained hold (`1–2` bars) followed by an immediate release beat for Gold & Barriers | Long hold duration suppresses natural urge to tap; wave ribs add visual motion during hold | Maintain continuous touch pressure through undulating wave tunnels, then release cleanly at exit |
| **S07 · Double Trouble**<br>`s7-double-trouble` | **W2 · Chromatic Overdrive**<br>133 BPM (`0.451s`/beat) | `290 → 315` | **Double/Triple Squeezes** with **Opposite-Phase Sliding Gates** (`+60 / -60` alternating slides) | Eighth-note (`0.225s`) double-gate hold-throughs contrasted with quarter-note (`0.45s`) smashes | Narrower `40–42px` clearances; opposite-sliding consecutive gates create kinetic cross-motion | Recognize when two moving gates are too close to release between (`t < 0.32s`) and hold through both |
| **S08 · Greed Is Optional**<br>`s8-greed-is-optional` | **W2 · Chromatic Overdrive**<br>133 BPM (`0.451s`/beat) | `300 → 325` | **Rotating Gates & Rings** (`rotor`) + **Optional Mint Hexagon Dares** (`mint` at `t = 0.24–0.34s`) | Rotating ring notch aligns with `orbX=270` on the beat; Mint sits in the syncopated off-beat pocket | Mint windows (`0.24–0.28s`) push close to physical grow/shrink limits (`0.22s` min) | Evaluate risk vs. reward in real time: pop out for the Mint bonus or hold safely through the rotating ring |
| **S09 · Overload**<br>`s9-overload` | **W3 · Pulse Collapse**<br>140 BPM (`0.429s`/beat) | `320 → 360` | **Pulsating Energy Barriers** + **Oscillating Double-Gates** + **Wave Tunnels** at 140 BPM | Driving 140 BPM four-on-the-floor pulse (`0.429s`/beat); obstacles lock on every single beat | World 3 speed jump (`320→360 px/s`) with known mechanics before tightening gap sizes | Adapt muscle memory to World 3's 140 BPM tempo and read beat-synced pulsating barriers at speed |
| **S10 · Precision**<br>`s10-precision` | **W3 · Pulse Collapse**<br>140 BPM (`0.429s`/beat) | `335 → 365` | **Hybrid Obstacles** (Static Gate + Sliding Inner Lock; Rotating Ring + Charged Barrier) | Tight 1-beat (`0.36–0.38s`) transitions with high-precision `34–38px` oscillating/sliding apertures | Narrowest campaign clearances (`34px`, leaving `14px` margin around `r=20` shrunk core) | Delay shrinking until the last fair beat and release at the exact exit edge of each aperture |
| **S11 · Final Circuit**<br>`s11-final-circuit` | **W3 · Pulse Collapse**<br>140 BPM (`0.429s`/beat) | `345 → 385` | **Full Moving Repertoire** (Slide + Rotor + Wave Tunnel + Charged Pulse + Mint Dare + Breather) | Two high-intensity 8-bar phrases separated by a 2-bar `wide(0.5)` + Gold harmonic recovery | High density (`t = 0.38–0.42s` switches) combining Charged Barriers with Mint dares | Manage stamina and mental reset during the mid-stage breather before tackling the second phrase |
| **S12 · The Final Pulse**<br>`s12-the-final-pulse` | **W3 · Pulse Collapse**<br>140 BPM (`0.429s`/beat) | `355 → 410` | **Mastery Finale Gauntlet:** All 7 moving & hybrid archetypes in a 3-act musical arrangement | Act 1 Build-up (`8` bars) → Harmonic Recovery (`2` bars) → Act 3 Climax Gauntlet (`12` bars) | Peak campaign speed (`410 px/s`), `34px` wave/sliding gaps, back-to-back Charged smashes | Synthesize every rhythm, telegraph, and size-control skill into a triumphant finale run |

---

## Deliverable 3: Orb Animation System & Moving Obstacle Specification



### 3.1 Orb Animation System (9-State Specification & Hitbox Preservation)

#### Hitbox Integrity Guarantee
In `level.js`, collision detection (`hitsWall`, `touchesBarrier`, `touchesPickup`) reads `this.orbState.radius` exclusively. In `sprite-view.js`, the orb is rendered using four layered sprites in track space (`depth = 5`):
- `this.ring` (`player_orb_ring` / `skin_*_ring`, `128×128`, solid radius `46px` in sprite px)
- `this.body` (`player_orb_normal` / `*_morph_01` / `*_morph_02`, `128×128`, solid radius `46px` in sprite px)
- `this.core` (`player_orb_shrunk` / `skin_*_shrunk`, `76×76`, solid radius `22px` in sprite px)
- `this.arcs` (`player_tension_arcs_01..04`, `96×96`, animated at `24 fps`)

**Hard Rule:** Whenever the orb is shrunk or near a wall, `this.core` (`scale = radius / 22`) and `this.ring` (`scale = radius / 46`) remain **strictly circular (`scaleX === scaleY`)** at the exact physics `radius`. All squash-and-stretch and beat-pulse offsets apply only to `this.body` and additive outer FX (`this.beatEcho`, `this.releaseRipple`), ensuring the player's true collision boundary is never obscured or distorted by even 1 pixel.

#### Detailed Specification of the 9 Orb Animation States

| # | Animation State | Trigger Condition | Visual Layers & Atlas Frames Used | Mathematical Motion / Easing Formula | Hitbox & Readability Safeguard |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Idle & Run Beat Pulse** | Continuous during `ready` and `playing` when `isCharged(radius)` (`r > 48px`) | `this.body`, `this.ring`, plus new additive `this.beatEcho` (`fx_orb_beat_echo`) | Let `p = Pulse.BeatClock.beatPhase()` (`0..1`).<br>`beatBump = Math.exp(-6.5 * p) * Math.sin(p * Math.PI)` (`0..+0.035`).<br>`body` scales by `bodyScale * (1 + beatBump)`. On beat trigger (`p < 0.08`), `beatEcho` pulses from `scale = bodyScale * 0.95` to `bodyScale * 1.45` (`alpha: 0.55 → 0` over `280ms`, `Cubic.easeOut`). | `orbState.radius` remains `56px`. `this.ring` stays locked at `56 / 46 = 1.2174` scale with `alpha = 0.92` so the `56px` boundary is crisp. |
| **2** | **Smooth Shrinking (Hold)** | `isHeld() === true` (`radius` contracting at `190 px/s` from `56 → 20px`) | Progressive frame swap on `this.body` using existing atlas frames:<br>• `t < 0.20`: `*_normal`<br>• `0.20 ≤ t ≤ 0.55`: `*_morph_01`<br>• `0.55 < t ≤ 0.85`: `*_morph_02`<br>• `t > 0.85`: `*_shrunk` (`this.core`) + `this.arcs` | Normalization `t = (56 - radius) / 36` (`0..1`).<br>`this.body` alpha fades `1 - 0.85 * t`; `this.core` alpha rises `t`; `this.arcs` alpha rises `0.95 * t` (`24 fps` electric crackle). | `this.core` scales linearly as `radius / 22`. At `minRadius = 20px`, `coreScale = 20 / 22 = 0.9091`, matching the exact `20px` circle. |
| **3** | **Satisfying Release Expansion** | Pointer release (`wasHeld === true && !held`) or `radius` growing at `260 px/s` (`20 → 56px`) | `this.body` (`*_morph_02 → *_morph_01 → *_normal`), `this.ring`, plus new `this.releaseRipple` (`fx_orb_release_ripple`, `ADD` blend) | On release edge, fire `this.pulse(this.releaseRipple, coreScale * 0.8, 1.35, 240)`. When `radius` reaches `56px`, apply a `140ms` damped micro-rebound `rebound = Math.sin(u * Math.PI) * 0.06` (`u ∈ [0,1]`) to `this.body` only. | `this.ring` clamps strictly to `radius / 46` without overshoot, preventing false impressions of early barrier-smash readiness. |
| **4** | **Squash-and-Stretch** | Active size transition (`dr/dt = -190 px/s` shrinking or `+260 px/s` growing) | `this.body` only (in track space, `x` is across lane, `y` is along travel direction) | Let `vNorm = (radius - prevRadius) / (dt * 260)` (`-0.73` when shrinking, `+1.0` when growing).<br>• **Shrinking (`vNorm < 0`):** Aerodynamic streamline along travel axis (`scaleY = bodyScale * 1.08`, `scaleX = bodyScale * 0.93`).<br>• **Growing (`vNorm > 0`):** Radial expansion (`scaleX = bodyScale * 1.07`, `scaleY = bodyScale * 0.94`). | Maximum deformation is capped at `±8%` on `this.body` and decays to `0%` within `60ms` of reaching `r=20` or `r=56`. `this.core` and `this.ring` never deform (`scaleX === scaleY`). |
| **5** | **Neon Trails & Controlled Particles** | Continuous during `state === 'playing'` (`scroll` active) | Pre-allocated 10-node ring buffer of `fx_orb_trail_node` (`64×64`, `ADD` blend, skin-tinted) at `depth = 4.5` | Every `28ms` (`~36 Hz`), recycle oldest trail node at `(orbX, orbY + radius * 0.35)`. Each active node drifts backward along track (`node.y += speed * dt * 0.85`), shrinking `scale: (radius/56)*0.55 → 0.08` and `alpha: 0.65 → 0` over `260ms`. | Trail spawns strictly behind the orb (`y > orbY`, screen left of orb) so the forward read-ahead zone (`y < orbY`, screen right of orb) is 100% particle-free. Total active particles capped `≤ 18`. |
| **6** | **Collectible Pickup Reactions** | `event === 'collect'` (`energy` Gold or `bonus` Mint) | `fx_collect_gold_burst` / `fx_collect_mint_burst`, `sparksGold` / `sparksMint` (6 sparks/side), plus magnetic pull on approach | **Approach Pull:** When `isCharged(r)` and `0 < orbY - seg.y < 36`, pickup sprites lerp `35%` toward `(orbX, orbY)`.<br>**Impact:** Dual bursts (`scale: 0.2 → 0.45`, `260ms`), orb rim flashes `#FFB800` (Gold) or `#00FF9D` (Mint) for `90ms`, and `sfx_accent_chord_w1/w2/w3` plays if collected within `±75ms` of a beat. | Pickups never pull when `!isCharged(r)` (`dimmed === true`), preserving the visual truth that shrunk orbs cannot collect energy. |
| **7** | **Barrier-Shattering Reactions** | `event === 'break'` on Standard (`charged: false`) or Charged (`charged: true`) Cyan Barrier | `fx_smash_ordinary_burst` (`192×192`) or `fx_smash_charged_nova` (`256×256`), `sparksCyan`, directional `shards` | • **Standard Smash:** 6-column cyan spark burst across lane (`x = 40..500`), `smashBurst` expands `0.2 → 0.5` (`260ms`), camera micro-punch `shake(85, 0.005)`.<br>• **Charged Smash:** 8-column cyan+white spark burst + 8 directional `shards` (`speedY: 180..360`), `smashNova` expands `0.22 → 0.65` (`340ms`), camera punch `shake(140, 0.009)`. | Burst sprites use `ADD` blend and fade below `30%` alpha within `110ms` so an immediately following gate (`0.35s` behind) remains completely legible. |
| **8** | **Damage, Collision & Failure Feedback** | `event === 'crash'` (Gate wall clip, Shrunk barrier hit, or Uncharged barrier hit) | `fx_shockwave_ring` (crimson), `shards` (14 pieces), `fx_fail_charged_deflect` (`220×220`), plus new `fx_fail_size_clip` (`96×96`) | • **Gate Wall Clip:** Compute exact contact point `cx = clamp(orbX, wallX, wallX + wallW)`, `cy = clamp(orbY, seg.y, seg.y + seg.h)`. Pulse `fx_fail_size_clip` at `(cx, cy)` (`scale: 0.3 → 0.75`, `380ms`) so the player sees the exact edge they clipped.<br>• **Barrier Fail:** Pulse `fx_fail_charged_deflect` at `(orbX, seg.y + seg.h/2)`. | Orb tints `#FF2A54` (`T.danger`) and holds its exact crash radius (`this.radius`) on the frozen playfield behind the `0.55` alpha overlay so the player can visually verify their size vs. the gap. |
| **9** | **Stage Completion & Combo Celebrations** | `completeStage()`, `bumpMultiplier()`, and `milestone()` (`×5` max multiplier) | `fx_stage_clear_burst` (`256×256`), `fx_mult_up_chevron` (`96×96`), `fx_mult_x5_starburst` (`256×256`), `fx_orb_beat_echo` | • **Combo Up (`x2..x4`):** `fx_mult_up_chevron` rises `30px` above orb in screen space (`420ms`, `Quad.easeOut`).<br>• **Max `×5` Milestone:** Golden `fx_mult_x5_starburst` (`0.35 → 0.70`, `480ms`); while at `×5`, `beatEcho` tints `#FFB800` (Gold).<br>• **Stage Clear:** `fx_stage_clear_burst` (`0.3 → 1.1`, `700ms`) + star pop-ins at `350ms, 610ms, 870ms`. | Celebrations occur in screen space above the orb or after finish-line crossing, never blocking incoming obstacles. |

---

### 3.2 Moving Obstacle Design Specification (7 Visually Distinct Archetypes)



#### Core Fairness & Determinism Architecture
Because the player orb travels along the center line `orbX = 270` (`width = 540`) and the player controls **size (`r ∈ [20, 56]`) and timing**, moving obstacles in PULSE operate via **deterministic time-to-impact parameterization (`tau`)**:
- For any active segment `s` at track position `s.y` scrolling at `speed`, the time remaining until its leading edge reaches the orb center (`orbY`) is:
  $$\tau(s) = \frac{\text{orbY} - (s.y + s.h)}{\text{speed}} \quad (\text{in seconds})$$
- At the exact moment of arrival at the orb ($\tau = 0$), every moving obstacle resolves to its authored **design clearance `s.targetNeed`** and **design shift `s.targetShift`**!
- Why is $\tau$-parameterization a game-design superpower for PULSE?
  1. **100% Deterministic Fairness (`Pulse.Track.validateItems`):** Because the obstacle's state at $\tau = 0$ (`s.y + s.h = orbY`) equals its authored `need` and `shift`, `Pulse.Track.validateItems` and `Pulse.autopilot` validate moving obstacles with mathematical certainty across all screen aspect ratios (`860..1240px`)!
  2. **Early Lock Window (`lockLead = 0.18s`):** For sliding and rotating obstacles, motion finishes and locks into its final aperture at $\tau = 0.18\text{s}$ (`~50–70px` before reaching the orb), accompanied by the `sfx_obs_slide_lock` click and a bright flash on `ind_rail_stop_bracket`. The obstacle never shifts unpredictably during the final `180ms` while the player is inside the gap!
  3. **Absolute Minimum Clearance Clamp:** At every frame of animation ($\forall \tau$), any shrinking gate's instantaneous clearance is clamped to $\ge \text{minRadius} + \text{fairMargin} = 28\text{px}$. Even if a player shrinks early, they can never be crushed by a moving wall while shrunk (`r = 20px`).

#### Summary Matrix of the 7 Moving Obstacle Archetypes

| # | Archetype Name & Helper | Atlas Frames (`pulse_gameplay`) | Movement Pattern (`tau = (orbY - (s.y + s.h)) / speed`) | Visual Cues & Telegraph (`1.5–2.0` Beats Ahead) | Collision Rules (`level.js`) | Musical Synchronization | Difficulty Scaling (Stages 1→12) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Sliding Barriers / Gates**<br>`slide(need, t, fromShift, toShift)` | `obs_rail_track_tile`, `ind_rail_stop_bracket`, `ind_telegraph_arrow_in/out`, `wall_body_tile`, `wall_cap_left/right` | Gap slides laterally across lane from `fromShift` (`±90..140px`) to `toShift` (`0` or `±60px`), locking smoothly at $\tau = 0.18\text{s}$ via `Cubic.easeOut` | Full-width laser rail `obs_rail_track_tile` under gate; amber ghost brackets `ind_rail_stop_bracket` fixed at final `[targetGapL, targetGapR]`; directional chevrons pulse on approach | Standard `hitsWall(seg, orbX, orbY, r)` against live `[s.gapL, s.gapR]`; at $\tau \le 0.18\text{s}$, `[s.gapL, s.gapR]` is locked at target | Slide initiates `2.0` beats before impact and locks on the half-beat/beat ($\tau = 0.18\text{s}$) with `sfx_obs_slide_lock` | **S1–S2:** Slow slide (`fromShift = ±70`, `need = 48`).<br>**S4–S7:** Opposite-direction paired slides (`±110px`, `need = 42`).<br>**S10–S12:** Fast `1.2`-beat slides (`need = 34–36`). |
| **2** | **Rotating Gates & Rings**<br>`rotor(need, t, dir, blades)` | `obs_rotor_hub`, `obs_rotor_blade`, `obs_rotor_ring_segment`, `ind_beat_telegraph_ring` | Dual-notched aperture ring (`obs_rotor_ring_segment`) & twin outer blades (`obs_rotor_blade`) rotate at angular velocity $\omega = \frac{\pi \cdot \text{BPM}}{60}\text{ rad/s}$, aligning the pass notch with `orbX=270` at $\tau \le 0.15\text{s}$ | Rotating crimson/amber ring + outer blades visibly spin as they scroll in from right; `ind_beat_telegraph_ring` at `(orbX, s.y)` shows alignment notch at horizontal lane center | Effective clearance `s.need = targetNeed + (1 - alignFactor) * (-12)` where `alignFactor = 1` for $|\tau| \le 0.16\text{s}$; player must be shrunk (`r <= targetNeed`) as core passes `orbY` | Quarter-turn ($90^\circ$) per beat; pass notch snaps into horizontal lane alignment on the beat with `sfx_obs_rotor_whoosh` | **S8:** Single rotor (`dir = +1`, `need = 44`).<br>**S10:** Counter-rotating pair (`+1` then `-1`, `need = 36`).<br>**S12:** Rotor into immediate Charged Barrier. |
| **3** | **Oscillating Pinch Obstacles**<br>`oscillate(need, t, amp, cycles)` | `obs_piston_strut_tile`, `wall_cap_left/right`, `ind_telegraph_arrow_in`, `ind_telegraph_arrow_out`, `ind_rail_stop_bracket` | Left and right jaws breathe symmetrically in and out around `orbX = 270`:<br>$\text{need}(\tau) = \text{targetNeed} + A \cdot (1 - \cos(\omega_{\text{beat}} \tau))$<br>reaching exact minimum pinch `targetNeed` at $\tau = 0$ | Hydraulic lattice struts `obs_piston_strut_tile` connect caps to lane edges; chevrons swap between `ind_telegraph_arrow_in` (pinching) and `ind_telegraph_arrow_out` (opening); ghost brackets mark minimum pinch | Live `s.gapL = orbX - currentNeed`, `s.gapR = orbX + currentNeed`; always clamped $\ge 28\text{px}$ so a shrunk orb (`r=20`) always clears safely | Oscillates at 1 cycle per `2` beats (`half-note` breathing synced to world BPM) | **S3:** Gentle `amp = 8px` (`need = 46..54`).<br>**S6–S7:** Medium `amp = 16px` (`need = 42..58`).<br>**S9–S12:** High-contrast `amp = 22px` (`need = 34..56`). |
| **4** | **Pulsating Energy Barriers**<br>`pulseBar(t, charged)` | `obs_barrier_pulse_ready_tile`, `obs_barrier_pulse_warn_tile`, `ind_beat_telegraph_ring`, `barrier_charged_emblem_ready/danger` | Full-width energy barrier whose harmonic waveform & band thickness pulse with the beat (`h` oscillates `22..30px` or `30..38px`) and whose longitudinal position surges $\pm 10\text{px}$ (`s.yOffset`) on beat off-phases, settling to `0` at $\tau = 0$ | Uses `obs_barrier_pulse_ready_tile` (cyan waveform when `canSmash` is true) and `obs_barrier_pulse_warn_tile` (crimson/amber waveform when orb is too small/uncharged), plus central `ind_beat_telegraph_ring` | Follows exact barrier smash rules (`canSmash(seg, r, charge)`): smashes if `isCharged(r)` (and `charge >= 1` if `s.charged`); fatal if shrunk | Pulses on every quarter-note beat with `sfx_obs_pulse_beat`; central `ind_beat_telegraph_ring` rotates $90^\circ$ per beat | **S5:** Standard & Charged Pulse Barriers with `1.0s` lead.<br>**S9:** Rapid `0.42s` gate-to-pulse-barrier switches.<br>**S11–S12:** Back-to-back Charged Pulse Barriers. |
| **5** | **Moving Gap Wave Patterns**<br>`waveTunnel(need, length, t, amp)` | `obs_wave_rib_tile`, `ind_long_hold_guide_tile`, `wall_cap_left/right` | Multi-ribbed sustained tunnel (`length = 200..340px`) divided into `32px` articulated slices whose center-line offset undulates laterally (`waveShift(slice, time) = amp * sin(k*slice - ω*time)`) while preserving inner clearance `>= need` around `orbX=270` | Articulated neon ribs `obs_wave_rib_tile` ripple smoothly along the tunnel walls; center `ind_long_hold_guide_tile` pulses cyan/amber chevrons telling the player to keep holding | Continuous `hitsWall` check across the tunnel's active span `[s.y, s.y + s.h]`; guaranteed passable at `orbX = 270` whenever `r <= s.need` | Wave phase propagates down the tunnel at 2 cycles per bar (eighth-note visual ripple) | **S6:** Gentle wave tunnel (`length = 240`, `need = 44`, `amp = 10px`).<br>**S9:** Faster wave (`length = 280`, `need = 40`, `amp = 14px`).<br>**S11–S12:** Tight wave (`length = 320`, `need = 34`, `amp = 16px`). |
| **6** | **Static + Moving Hybrid Hazards**<br>`hybridGate(need, t, rotorOrSlide)` | Combines static `wall_body_tile` / `obs_barrier_pulse_*` frame with `obs_rotor_hub` or `ind_rail_stop_bracket` | A static outer gate frame (`gapL/gapR` fixed at wide `84px`) housing an inner moving hazard (either a sliding inner pinch jaw or a rotating inner ring) that narrows clearance to `need` at $\tau = 0$ | Outer crimson/slate static bulkhead establishes spatial anchor early; inner amber/crimson moving mechanism telegraphs its lock inside the frame via `ind_rail_stop_bracket` | Outer static frame kills full-size orb if off-center; inner moving element enforces `r <= s.need` at `orbY` | Outer frame lands on beat 1; inner mechanism locks on beat 2 (`sfx_obs_slide_lock` / `sfx_obs_rotor_whoosh`) | **S10:** Hybrid Static Frame + Sliding Lock (`need = 36`).<br>**S11–S12:** Hybrid Static Frame + Rotor Core (`need = 34`) followed by Charged Barrier. |
| **7** | **Later-Stage Mastery Combinations**<br>(Compound Multi-Item Phrases) | All v4.0 + v5.0 gameplay & telegraph frames in coordinated sequences | Compound 3-to-5 item rhythmic phrases: e.g., **Slide-Pinch → Mint Dare → Rotor Gate → Early Release → Charged Pulse Barrier** | Sequential telegraphs staggered by beat (`ind_upcoming_charged_warn` at right screen edge + `ind_rail_stop_bracket` in lane + `ind_beat_telegraph_ring` on barrier) | Each item resolved independently by `Pulse.Level.resolve`; full sequence verified by `Pulse.Track.validateItems` | Authored so each touch press and release lands on musical beats/half-beats (with generous `±120ms` physical tolerance) | **S7–S9:** 3-item motion combos.<br>**S10–S12:** 5-item mastery phrases followed by `ind_recovery_chevron` breathers. |

---

## Deliverable 4: Electronic/Synthwave Audio Direction & Sound-Effect Inventory

### 4.1 Soundtrack Concept & Musical Timing Grid
PULSE's soundtrack follows a three-act **Progressive Synthwave / Cyber-Electro Arc** that mirrors the visual evolution across Worlds 1–3 while keeping gameplay SFX 100% intelligible:

| Track Key (`assets/audio/music/`) | World / Context | Tempo (BPM) | Beat Duration (`60 / BPM`) | Bar Duration (`4/4` Time) | Eighth-Note Subdivision | Musical Key & Harmonic Palette |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `MENU_THEME.ogg` | Main Menu, Stage Select, Skin Picker | **112 BPM** | `0.5357 s` (`535.7 ms`) | `2.1429 s` | `0.2679 s` | **A Minor** — Warm analog Juno pads, arpeggiated glass plucks, deep sub pulse |
| `WORLD_1_GAMEPLAY.ogg` | **World 1: Neon Circuit** (Stages 1–4; Endless `0–30s`) | **125 BPM** | `0.4800 s` (`480.0 ms`) | `1.9200 s` | `0.2400 s` | **F Minor** (`F - Db - Ab - Eb`) — Crisp four-on-the-floor kick, tight saw bassline, cyan bell arps |
| `WORLD_2_GAMEPLAY.ogg` | **World 2: Chromatic Overdrive** (Stages 5–8; Endless `30–60s`) | **133 BPM** | `0.4511 s` (`451.1 ms`) | `1.8045 s` | `0.2256 s` | **C Dorian** (`Cm7 - F9 - Abmaj7 - G7`) — Driving syncopated synthwave, FM brass stabs, energetic snare |
| `WORLD_3_GAMEPLAY.ogg` | **World 3: Pulse Collapse** (Stages 9–12; Endless `60s+`) | **140 BPM** | `0.4286 s` (`428.6 ms`) | `1.7143 s` | `0.2143 s` | **D Harmonic Minor** (`Dm - Bb - Gm - A7`) — High-urgency darksynth lead, aggressive octave bass, laser percussion |

#### Aligning Campaign Patterns to the Musical Grid (Without Requiring Strict Rhythm Input)
- In `stages.js`, each item's `t` parameter specifies the clear time (in seconds) before the obstacle.
- By authoring `t` as multiples of the world's beat duration (e.g., in World 1 at `125 BPM`: `1 beat = 0.48s`, `1.25 beats = 0.60s`, `1.5 beats = 0.72s`, `2 beats = 0.96s`; in World 2 at `133 BPM`: `1 beat = 0.45s`, `1.5 beats = 0.68s`, `2 beats = 0.90s`; in World 3 at `140 BPM`: `0.85 beats = 0.36s`, `1 beat = 0.42s`, `1.5 beats = 0.64s`), **obstacles naturally arrive at `orbY` in rhythm with the music**!
- **No Rhythm-Game Punishment:** Collision depends *only* on the orb's physical radius `r` and `charge` when intersecting an obstacle (`level.js`). Because `shrinkRate = 190 px/s` (`0.19s`) and `growRate = 260 px/s` (`0.14s`) are faster than the minimum `t` (`0.35s` to shrink, `0.32s` to grow), players have a generous **`130–250ms` timing buffer** on every obstacle—so the game *feels* effortlessly musical without ever punishing a player for being `50ms` off the beat.

### 4.2 Layered Musical Accents for Successful Actions
When the player collects energy (`pickup` / `bonusPickup`), smashes a barrier (`smash` / `chargedSmash`), or completes a 4-obstacle rhythm phrase, `Pulse.Sfx` can trigger an optional **harmonic world chord accent** (`sfx_accent_chord_w1`, `sfx_accent_chord_w2`, `sfx_accent_chord_w3`, or `sfx_combo_cadence_hit`) tuned to the exact musical key of the active world (`F Minor 9th` for W1, `C Dorian` for W2, `D Harmonic Minor` for W3) at `gain = 0.42`. This makes every successful smash and pickup sound like a live synth solo played atop the backing track.

### 4.3 Complete Sound-Effect & Music Inventory (39 SFX + 8 Music/Stings)

#### A. Music Loops & Musical Stings (`assets/audio/music/` — Existing in `run19`, Preserved)
| Filename | Duration | Size | Usage & Trigger |
| :--- | :--- | :--- | :--- |
| `MENU_THEME.ogg` | `77.1 s` (loop) | `1.3 MB` | Main Menu (`MenuScene`) & Stage Select (`StageSelectScene`) loop at 112 BPM |
| `WORLD_1_GAMEPLAY.ogg` | `76.8 s` (loop) | `1.4 MB` | World 1 Stages 1–4 & Endless `0–30s` loop at 125 BPM (40 bars) |
| `WORLD_2_GAMEPLAY.ogg` | `72.2 s` (loop) | `1.4 MB` | World 2 Stages 5–8 & Endless `30–60s` loop at 133 BPM (40 bars) |
| `WORLD_3_GAMEPLAY.ogg` | `68.6 s` (loop) | `1.5 MB` | World 3 Stages 9–12 & Endless `60s+` loop at 140 BPM (40 bars) |
| `WORLD_TRANSITION.ogg` | `3.8 s` (sting) | `74 KB` | Played on Ready screen of the first stage of each World (`worldIntro`) |
| `STAGE_CLEAR.ogg` | `4.1 s` (sting) | `77 KB` | Triumphant synth fanfare on campaign stage completion (`stageClear`) |
| `GAME_OVER.ogg` | `2.9 s` (sting) | `56 KB` | Descending synth power-down on crash (`gameOver`) |
| `MAX_MULTIPLIER_STING.ogg` | `2.4 s` (sting) | `47 KB` | High-energy harmonic flourish when reaching `×5` multiplier (`milestone`) |

#### B. Core Gameplay & UI SFX (`assets/audio/sfx/` — 31 Existing in `run19` + 8 New v5.0 Files)
| SFX Key in `sfx.js` | Filename (`assets/audio/sfx/`) | Status | Gain | Trigger & Acoustic Role |
| :--- | :--- | :--- | :--- | :--- |
| `shrinkStart` | `sfx_player_shrink_start.ogg` | Existing (`run19`) | `0.50` | Downward filter pluck (`640→240 Hz`) on touch-down |
| `shrinkLoop` | `sfx_player_shrink_loop.ogg` | Existing (`run19`) | `0.25` | Soft low-pass sub hum while holding touch (`startHold`/`stopHold`) |
| `expand` | `sfx_player_expand.ogg` | Existing (`run19`) | `0.50` | Crisp upward synth snap (`260→720 Hz`) on touch release |
| `pickup` | `sfx_pickup_gold.ogg` | Existing (`run19`) | `1.00` | Bright dual-tone crystal chime (`880→1320 Hz`) on Gold pickup |
| `bonusPickup` | `sfx_pickup_mint_bonus.ogg` | Existing (`run19`) | `1.00` | Shimmering FM harmonic triad (`990→1480 Hz`) on Mint bonus pickup |
| `pass` | `sfx_obstacle_gate_pass.ogg` | Existing (`run19`) | `0.60` | Clean air-whoosh transient when clearing a gate/tunnel |
| `smash` | `sfx_barrier_smash_ordinary.ogg` | Existing (`run19`) | `1.00` | Punchy glass-synth cleave + sub thump on standard barrier shatter |
| `chargedSmash` | `sfx_barrier_smash_charged.ogg` | Existing (`run19`) | `1.00` | Heavy sub-drop + wide harmonic shatter nova on charged barrier break |
| `chargeStart` | `sfx_charge_start_fill.ogg` | Existing (`run19`) | `0.70` | Rising pitch-capacitor whine when Charge Ring begins filling |
| `chargeReady` | `sfx_charge_complete.ogg` | Existing (`run19`) | `1.00` | Octagonal lock chime when `orbState.charge` reaches `1.0` |
| `barrierReady` | `sfx_barrier_charged_ready.ogg` | **In APK (Wire in v5)** | `0.75` | Harmonic lock cue when an on-screen Charged Barrier turns Cyan/Ready |
| `approachCue` | `sfx_obstacle_approach_cue.ogg` | **In APK (Wire in v5)** | `0.65` | Read-ahead warning pulse when `ind_upcoming_charged_warn` appears |
| `chargeCancel` | `sfx_charge_cancelled.ogg` | Existing (`run19`) | `0.70` | Low dissipation sigh when shrinking cancels an incomplete charge |
| `multUp` | `sfx_multiplier_increase.ogg` | Existing (`run19`) | `0.70` | Rising synth interval on Endless multiplier increase (`×2..×4`) |
| `maxMultSfx` | `sfx_multiplier_max_x5.ogg` | **In APK (Wire in v5)** | `0.90` | Layered punch transient accompanying `MAX_MULTIPLIER_STING` |
| `streak` | `sfx_multiplier_x5_streak.ogg` | Existing (`run19`) | `0.80` | High-register arpeggio every 10 obstacles cleared at `×5` |
| `nearMiss` | `sfx_near_miss_graze.ogg` | Existing (`run19`) | `0.70` | Electric static graze spark when clearing a wall within `≤ 8px` |
| `crash` | `sfx_player_death_collision.ogg` | Existing (`run19`) | `1.00` | Heavy sub-impact + metallic shatter on standard wall/barrier crash |
| `chargedFail` | `sfx_barrier_charged_fail.ogg` | Existing (`run19`) | `1.00` | Metallic shield deflection + overload buzz on uncharged barrier crash |
| `finish` | `sfx_stage_finish_line.ogg` | Existing (`run19`) | `1.00` | High-velocity tape-ribbon cross when passing campaign finish line |
| `star` | `sfx_stage_star_earned.ogg` | Existing (`run19`) | `1.00` | Pitched bell chime per earned star (`1..3`) on Stage Clear panel |
| `clearPanel` | `sfx_ui_stage_clear_panel.ogg` | Existing (`run19`) | `0.80` | Smooth glass slide-in when Stage Clear summary appears |
| `overPanel` | `sfx_ui_game_over_panel.ogg` | Existing (`run19`) | `0.70` | Muted low panel thud on Game Over screen |
| `unlocked` | `sfx_ui_stage_unlocked.ogg` | Existing (`run19`) | `1.00` | Positive synth unlock chord when a new stage or skin unlocks |
| `select` / `nav` / `skin` / `toggle` / `pause` / `resume` / `start` | `sfx_ui_button_tap.ogg`, `menu_nav`, `skin_selected`, `settings_toggle`, `pause`, `resume`, `retry` | Existing (`run19`, 7 files) | `0.80–1.0` | Complete UI interaction suite across Menu, Settings, Skin Picker, and Pause |
| **`slideLock`** | **`sfx_obs_slide_lock.ogg`** | **NEW v5.0 (`6.1 KB`)** | `0.65` | Pneumatic synth slide + magnetic latch click when a Sliding Gate locks at $\tau = 0.18\text{s}$ |
| **`rotorWhoosh`** | **`sfx_obs_rotor_whoosh.ogg`** | **NEW v5.0 (`6.5 KB`)** | `0.60` | Phase-filtered synth blade sweep as a Rotating Gate/Ring aligns at `orbY` |
| **`pulseBeat`** | **`sfx_obs_pulse_beat.ogg`** | **NEW v5.0 (`5.9 KB`)** | `0.55` | Harmonic sub-pulse tick when an on-screen Pulsating Barrier cycles on the beat |
| **`telegraphPing`** | **`sfx_beat_telegraph_ping.ogg`** | **NEW v5.0 (`5.7 KB`)** | `0.60` | Crisp `1760→880 Hz` sonar ping 2 beats before a moving/hybrid hazard locks |
| **`accentW1`** | **`sfx_accent_chord_w1.ogg`** | **NEW v5.0 (`7.9 KB`)** | `0.42` | **F Minor 9th** (`F5-Ab5-C6-G6`) layered musical accent on W1 on-beat smashes/pickups |
| **`accentW2`** | **`sfx_accent_chord_w2.ogg`** | **NEW v5.0 (`8.0 KB`)** | `0.42` | **C Dorian** (`C5-Eb5-G5-A5-D6`) layered FM bell accent on W2 on-beat smashes/pickups |
| **`accentW3`** | **`sfx_accent_chord_w3.ogg`** | **NEW v5.0 (`8.1 KB`)** | `0.42` | **D Harmonic Minor** (`D5-F5-A5-C#6-D6`) cyber-lead accent on W3 on-beat smashes/pickups |
| **`comboCadence`** | **`sfx_combo_cadence_hit.ogg`** | **NEW v5.0 (`7.1 KB`)** | `0.55` | Rising `C5-G5-C6-G6` crystalline phrase-completion chime |

### 4.4 Audio Mixing Guidance & Music-Loop Transition Strategy
1. **Gain Structure & Headroom (`sfx.js`):**
   - Master Music Bus: `MUSIC_LEVEL = 0.55` (`-5.2 dBFS`), leaving generous headroom in the `1–4 kHz` presence band where gameplay transients sit.
   - Master SFX Bus: `SFX_LEVEL = 0.85` (`-1.4 dBFS`), polyphony capped at `MAX_VOICES = 6` with `RETRIGGER_MS = 35ms` anti-flam protection.
   - Continuous Hold Hum: `HOLD_LEVEL = 0.25` (`-12 dBFS`) so holding through long tunnels never masks incoming obstacle cues.
   - Layered Musical Accents (`accentW1/W2/W3`): `gain = 0.42` (`-7.5 dBFS`), triggered at most once per beat (`minInterval = 380ms`) so rapid gold runs never muddy the mix.
2. **Dynamic Ducking (`Music.duck` & Transient Micro-Duck):**
   - **Pause Screen Duck:** `Music.duck(true)` reduces `Music.level` to `0.40` (`-8 dB`) over `200ms`.
   - **Impact Micro-Duck (`Music.pulseDuck()`):** On `chargedSmash` or `milestone`, briefly dip `Music.level` to `0.72` for `160ms` before recovering to `1.0` over `220ms`, making Charged Barrier explosions feel massive on phone speakers.
3. **Music-Loop Transition Strategy:**
   - **Single HTMLAudioElement Streaming (Preserved):** Streaming `.ogg` tracks via `Music.el` uses `< 1 MB` RAM (avoiding `~28 MB` per decoded stereo buffer on Android WebView).
   - **Beat-Aware Endless Escalation:** In Endless mode (`game-scene.js`), track transitions (`WORLD_1_GAMEPLAY` at `0s` → `WORLD_2_GAMEPLAY` at `30s` → `WORLD_3_GAMEPLAY` at `60s`) wait until the next bar boundary (`Pulse.BeatClock.barPhase() < 0.12`) before crossfading (`300ms` fade-out, `400ms` fade-in) and triggering `fx_world_transition_wave` across the screen.

---

## Deliverable 5: Complete Asset Inventory (Existing, Unwired-in-APK, and New v5.0)

### 5.1 Summary of Asset Categories
Inspecting `pulse-debug-apk-run19.zip` revealed that **all v4.0 atlases, backgrounds, stage cards, music loops, and core SFX are present and working**, AND that **several v4.0 frames and SFX files already packed inside `run19` are not yet wired in JS**. Furthermore, `pulse_gameplay_atlas.png` (`1024×2048`) had `y = 1200..2048` completely empty—allowing us to pack all **16 new v5.0 Rhythm & Motion frames** directly into the existing `1024×2048` atlas with **zero increase in GPU texture memory (`0 MB` extra VRAM)**!

| Asset Group | Existing in `run19` APK | Already in `run19` APK but Unwired in JS | New in v5.0 Pack | Replacement / Action Required |
| :--- | :--- | :--- | :--- | :--- |
| **`pulse_gameplay_atlas`** (`1024×2048`) | 56 frames (`y = 4..1196`) | 5 frames (`player_orb_morph_01/02`, `ind_recovery_chevron`, `wall_joint_divider`, `fx_world_transition_wave`) | **+16 new v5.0 frames** packed at `y = 1210..1566` (total 72 frames) | Replace `pulse_gameplay_atlas.png` & `.json` (100% backward-compatible; all 56 old frames untouched) OR load standalone `pulse_motion_v5_atlas` (`1024×512`) |
| **`pulse_skins_atlas`** (`1024×1024`) | 45 frames (5 unlockable skins × 9 frames) | 10 frames (`skin_*_morph_01` and `skin_*_morph_02` for all 5 skins) | 0 new files needed | **No file change!** Wire `skin_*_morph_01/02` in `assets.js` & `sprite-view.js` |
| **`pulse_ui_atlas`** (`2048×2048`) | 61 frames | 18 optional states (`*_down` buttons, `ui_tutorial_hand_hold/release`, `ui_world_card_*`) | 0 new files needed | **No file change!** Keep `pulse_ui_atlas` untouched |
| **Backgrounds & Stage Cards** | 15 backgrounds + 12 stage cards (`ui_stage_card_s01_w1..s12_w3`) | 0 | 0 new files needed | **No file change!** Keep all 27 PNGs untouched |
| **Audio: Music (`assets/audio/music/`)** | 8 `.ogg` files (`5.6 MB` total) | 0 | 0 new files needed | **No file change!** Add `BPM` metadata table to `sfx.js` |
| **Audio: SFX (`assets/audio/sfx/`)** | 31 `.ogg` files (`194 KB` total) | 3 files (`sfx_obstacle_approach_cue.ogg`, `sfx_barrier_charged_ready.ogg`, `sfx_multiplier_max_x5.ogg`) | **+8 new v5.0 `.ogg` (and `.wav`) files** (`55 KB` total `.ogg`) | Copy 8 new `.ogg` files into `assets/audio/sfx/` and register in `sfx.js` |

### 5.2 Frame-by-Frame Table of the 16 New v5.0 Gameplay & Motion Sprites
All 16 new sprites are provided both inside the updated `atlases/pulse_gameplay_atlas.png` (`+ .json`), inside the optional standalone `atlases/pulse_motion_v5_atlas.png` (`+ .json`), and as individual transparent PNGs in `sprites/gameplay_v5/`:

| Frame Name | Source Size (`w × h`) | Coordinates in `pulse_gameplay_atlas.json` | Coordinates in `pulse_motion_v5_atlas.json` | Visual Purpose & Layer Depth |
| :--- | :--- | :--- | :--- | :--- |
| `fx_fail_size_clip` | `96 × 96` | `x: 4, y: 1210, w: 96, h: 96` | `x: 4, y: 4, w: 96, h: 96` | Contact-point impact star & crimson bracket when orb clips a gate wall (`depth = 6`) |
| `fx_orb_beat_echo` | `128 × 128` | `x: 104, y: 1210, w: 128, h: 128` | `x: 104, y: 4, w: 128, h: 128` | Beat-synced octagonal resonance ring around orb (`ADD` blend, `depth = 4.8`) |
| `fx_orb_release_ripple` | `160 × 160` | `x: 236, y: 1210, w: 160, h: 160` | `x: 236, y: 4, w: 160, h: 160` | Outward radial expansion wave when releasing touch (`ADD` blend, `depth = 4.9`) |
| `fx_orb_trail_node` | `64 × 64` | `x: 400, y: 1210, w: 64, h: 64` | `x: 400, y: 4, w: 64, h: 64` | Streaming neon wake diamond-circle particle behind orb (`ADD` blend, `depth = 4.5`) |
| `ind_beat_telegraph_ring` | `128 × 128` | `x: 468, y: 1210, w: 128, h: 128` | `x: 468, y: 4, w: 128, h: 128` | 4-beat segmented countdown ring on Pulsating Barriers & Rotors (`depth = 3.6`) |
| `ind_rail_stop_bracket` | `64 × 96` | `x: 600, y: 1210, w: 64, h: 96` | `x: 600, y: 4, w: 64, h: 96` | Amber ghost lock-bracket marking final `[targetGapL, targetGapR]` (`depth = 1.9`) |
| `ind_telegraph_arrow_in` | `64 × 64` | `x: 668, y: 1210, w: 64, h: 64` | `x: 668, y: 4, w: 64, h: 64` | Double crimson/amber chevron (`>>`) telegraphing inward pinch (`depth = 2.4`) |
| `ind_telegraph_arrow_out` | `64 × 64` | `x: 736, y: 1210, w: 64, h: 64` | `x: 736, y: 4, w: 64, h: 64` | Double mint/ice chevron (`<<`) telegraphing outward opening (`depth = 2.4`) |
| `obs_barrier_pulse_ready_tile` | `64 × 72` | `x: 804, y: 1210, w: 64, h: 72` | `x: 804, y: 4, w: 64, h: 72` | Harmonic cyan waveform tile for smashable Pulsating Energy Barrier (`depth = 3.0`) |
| `obs_barrier_pulse_warn_tile` | `64 × 72` | `x: 872, y: 1210, w: 64, h: 72` | `x: 872, y: 4, w: 64, h: 72` | Harmonic crimson/amber waveform tile for unready Pulsating Barrier (`depth = 3.0`) |
| `obs_piston_strut_tile` | `64 × 64` | `x: 940, y: 1210, w: 64, h: 64` | `x: 940, y: 4, w: 64, h: 64` | Hydraulic lattice cross-strut for Oscillating Pinch Jaws (`depth = 1.9`) |
| `obs_rail_track_tile` | `64 × 32` | `x: 4, y: 1374, w: 64, h: 32` | `x: 4, y: 168, w: 64, h: 32` | Laser guide track across lane under Sliding/Oscillating obstacles (`depth = 1.8`) |
| `obs_rotor_blade` | `160 × 48` | `x: 72, y: 1374, w: 160, h: 48` | `x: 72, y: 168, w: 160, h: 48` | Rotating laser-rimmed barrier arm for Rotating Gates (`depth = 2.5`) |
| `obs_rotor_hub` | `96 × 96` | `x: 236, y: 1374, w: 96, h: 96` | `x: 236, y: 168, w: 96, h: 96` | Central octagonal pivot hub for Rotating Gates & Rings (`depth = 2.6`) |
| `obs_rotor_ring_segment` | `192 × 192` | `x: 336, y: 1374, w: 192, h: 192` | `x: 336, y: 168, w: 192, h: 192` | Segmented rotating aperture ring with dual pass notches (`depth = 2.5`) |
| `obs_wave_rib_tile` | `64 × 64` | `x: 532, y: 1374, w: 64, h: 64` | `x: 532, y: 168, w: 64, h: 64` | Articulated neon wave-tunnel rib segment (`depth = 2.1`) |

---

## Deliverable 6: Production-Ready Asset & Audio Package (`PULSE_v5_Rhythm_Motion_Asset_and_Audio_Pack.zip`)

All new production-ready transparent PNG sprites, updated Phaser 3 JSON Hash atlases, synthesized `.ogg`/`.wav` audio files, and modular Markdown guides are packaged in **`PULSE_v5_Rhythm_Motion_Asset_and_Audio_Pack.zip`**:
- `atlases/pulse_gameplay_atlas.png` + `atlases/pulse_gameplay_atlas.json` (`1024×2048` RGBA8888, 72 frames: all 56 original `run19` frames at identical coordinates + 16 new v5.0 frames).
- `atlases/pulse_motion_v5_atlas.png` + `atlases/pulse_motion_v5_atlas.json` (`1024×512` RGBA8888, 16 frames: optional standalone add-on atlas if Claude prefers not to touch `pulse_gameplay_atlas`).
- `sprites/gameplay_v5/*.png` (all 16 standalone transparent PNGs).
- `audio/sfx_v5/ogg/*.ogg` & `audio/sfx_v5/wav/*.wav` (all 8 new synthesized SFX & layered musical accents).
- `docs/*` (Complete set of modular specifications and visual inspection sheets).

---

## Deliverable 7: Step-by-Step Phaser 3.90.0 Integration Guide for Claude

This guide provides **drop-in, backward-compatible code specifications** for Claude across the existing files in `src/js/` (or `assets/public/js/`). Every change preserves the headless test suite (`window.PULSE_TEST`), `Pulse.Render` fallback shapes, and `Pulse.Track.validateItems` fairness rules.

### Step 1: Copy Assets into `src/assets/`
1. Copy `atlases/pulse_gameplay_atlas.png` and `atlases/pulse_gameplay_atlas.json` into `src/assets/atlases/` (replacing the 56-frame v4.0 files with the 100% backward-compatible 72-frame v5.0 files).
2. Copy the 8 `.ogg` files from `audio/sfx_v5/ogg/` into `src/assets/audio/sfx/`.

### Step 2: Update `src/js/config.js` (Add Motion & Rhythm Tuning Parameters)
Add `motion` and `rhythm` sub-objects to `Pulse.CONFIG`:

```javascript
// Append inside Pulse.CONFIG in src/js/config.js:
  motion: {
    lockLeadSeconds: 0.18, // sliding/rotating obstacles lock into final gap 180ms before orbY
    telegraphSeconds: 0.85, // show directional arrows & countdown rings within 0.85s of orbY
    maxSquashStretch: 0.08, // ±8% max visual deformation on orb body (0% on hitbox/ring/core)
    beatPulseScale: 0.035, // +3.5% visual breathing on quarter-note beats
    trailIntervalMs: 28, // spawn one wake trail node every 28ms
    trailCount: 10, // pre-allocated ring buffer size (zero GC allocations)
  },
```

### Step 3: Update `src/js/assets.js` (Register Morph & v5.0 Motion Frames)
In `Pulse.Assets.requiredFrames()`, add the morph frames (already in `pulse_gameplay` and `pulse_skins`) and the 16 new v5.0 frames in `pulse_gameplay`:

```javascript
// Inside Pulse.Assets.requiredFrames() in src/js/assets.js:
// 1. Append to frames.pulse_gameplay array:
        // v5.0 rhythm & motion frames
        'fx_orb_trail_node', 'fx_orb_beat_echo', 'fx_orb_release_ripple', 'fx_fail_size_clip',
        'obs_rail_track_tile', 'ind_rail_stop_bracket', 'ind_telegraph_arrow_in', 'ind_telegraph_arrow_out',
        'obs_piston_strut_tile', 'obs_rotor_hub', 'obs_rotor_blade', 'obs_rotor_ring_segment',
        'obs_barrier_pulse_ready_tile', 'obs_barrier_pulse_warn_tile', 'ind_beat_telegraph_ring', 'obs_wave_rib_tile',
        'ind_recovery_chevron', 'wall_joint_divider', 'fx_world_transition_wave',

// 2. In the skin loop (lines 74-78), include morph_01 and morph_02:
    for (const skin of Pulse.SKINS) {
      const s = skin.sprite;
      frames[s.atlas].push(
        `${s.prefix}normal`, `${s.prefix}ring`, `${s.prefix}shrunk`,
        `${s.prefix}morph_01`, `${s.prefix}morph_02`
      );
      for (let i = 1; i <= 4; i++) frames[s.atlas].push(`${s.arcPrefix}0${i}`);
    }
```

### Step 4: Update `src/js/sfx.js` (Add `Pulse.BeatClock`, New SFX & Musical Accents)
Add the track BPM table, register the 3 previously unwired APK SFX + 8 new v5.0 SFX, and expose `Pulse.BeatClock`:

```javascript
// 1. Add inside SFX map in src/js/sfx.js:
    barrierReady: { file: 'sfx_barrier_charged_ready', gain: 0.75 },
    approachCue: { file: 'sfx_obstacle_approach_cue', gain: 0.65 },
    maxMultSfx: { file: 'sfx_multiplier_max_x5', gain: 0.9 },
    slideLock: { file: 'sfx_obs_slide_lock', gain: 0.65 },
    rotorWhoosh: { file: 'sfx_obs_rotor_whoosh', gain: 0.6 },
    pulseBeat: { file: 'sfx_obs_pulse_beat', gain: 0.55 },
    telegraphPing: { file: 'sfx_beat_telegraph_ping', gain: 0.6 },
    accentW1: { file: 'sfx_accent_chord_w1', gain: 0.42 },
    accentW2: { file: 'sfx_accent_chord_w2', gain: 0.42 },
    accentW3: { file: 'sfx_accent_chord_w3', gain: 0.42 },
    comboCadence: { file: 'sfx_combo_cadence_hit', gain: 0.55 },

// 2. Add Pulse.BeatClock before exporting Pulse.Audio / Pulse.Sfx / Pulse.Music:
  const TRACK_BPM = {
    MENU_THEME: 112,
    WORLD_1_GAMEPLAY: 125,
    WORLD_2_GAMEPLAY: 133,
    WORLD_3_GAMEPLAY: 140,
  };

  const BeatClock = {
    lastAccentAt: 0,
    bpm() {
      return TRACK_BPM[Music.track || Music.wanted] || 125;
    },
    beatSeconds() {
      return 60 / this.bpm();
    },
    currentTime() {
      const el = Music.el;
      if (el && !el.paused && el.currentTime > 0) return el.currentTime;
      return performance.now() / 1000;
    },
    // Returns 0..1 position within the current quarter-note beat.
    beatPhase() {
      const bs = this.beatSeconds();
      return (this.currentTime() % bs) / bs;
    },
    // Returns 0..1 position within the current 4-beat bar.
    barPhase() {
      const bar = this.beatSeconds() * 4;
      return (this.currentTime() % bar) / bar;
    },
    // Plays the world's harmonic chord accent if near a beat (throttled to once per beat).
    playWorldAccent(worldIndex) {
      const now = performance.now();
      if (now - this.lastAccentAt < 380) return;
      this.lastAccentAt = now;
      const key = worldIndex === 3 ? 'accentW3' : worldIndex === 2 ? 'accentW2' : 'accentW1';
      Sfx.play(key);
    },
  };

  Pulse.BeatClock = BeatClock;
```

### Step 5: Update `src/js/level.js` (Deterministic Moving Obstacle Evaluation)
In `src/js/level.js`, preserve `placeItem`, `spawnItem`, and `update` while adding `stepMotion(seg, speed, orbY)` so moving obstacles update their live `[gapL, gapR]` or `pulse` state deterministically based on $\tau = (\text{orbY} - (s.y + s.h)) / \text{speed}$:

```javascript
// 1. In placeItem(src, prevTop, width) in src/js/level.js, copy src.motion if present:
  function placeItem(src, prevTop, width) {
    const h = itemHeight(src);
    const item = { type: src.type, at: prevTop + src.space, h, space: src.space };
    if (src.type === 'gate') Pulse.setGap(item, src.need, src.shift || 0, width);
    if (src.type === 'barrier' && src.charged) item.charged = true;
    if (src.motion) item.motion = Object.assign({}, src.motion);
    if (src.pattern) item.pattern = src.pattern;
    return item;
  }

// 2. In Level.prototype.spawnItem(it), initialize motion state on the pooled segment:
    seg.motion = it.motion || null;
    seg.lockPlayed = false;
    if (it.type === 'gate') {
      seg.kind = 'gate';
      seg.targetNeed = it.need;
      seg.targetShift = it.shift || 0;
      seg.targetGapL = it.gapL;
      seg.targetGapR = it.gapR;
      seg.gapL = it.gapL;
      seg.gapR = it.gapR;
      seg.need = it.need;
      seg.angle = 0;
    }

// 3. Add Level.prototype.stepSegmentMotion(s, speed, orbY) and call it inside moveSegments(dy, speed, orbY):
    stepSegmentMotion(s, speed, orbY) {
      const m = s.motion;
      if (!m || !s.active) return;
      const minNeed = C.orb.minRadius + C.fairMargin;
      const lockLead = (C.motion && C.motion.lockLeadSeconds) || 0.18;
      // tau = seconds until segment's bottom edge reaches orbY (0 at arrival, negative after passing)
      const tau = (orbY - (s.y + s.h)) / Math.max(120, speed || C.speed.start);
      const effTau = Math.max(0, tau - lockLead);

      if (s.kind === 'gate') {
        let need = s.targetNeed;
        let shift = s.targetShift;
        if (m.kind === 'slide') {
          const span = m.duration || 0.75;
          const u = clamp(effTau / span, 0, 1);
          // Smooth cubic ease-out into targetShift at effTau = 0
          const ease = u * u * (3 - 2 * u);
          shift = s.targetShift + ((m.fromShift || 0) - s.targetShift) * ease;
          if ( m.fromNeed ) need = Math.max(minNeed, s.targetNeed + (m.fromNeed - s.targetNeed) * ease);
          s.locked = effTau <= 0.001;
        } else if (m.kind === 'oscillate') {
          const freq = m.freq || 4.2; // rad/s (~half-note breathing)
          const amp = m.amp || 10;
          // At effTau = 0, 1 - cos(0) = 0 -> exact targetNeed at impact!
          need = Math.max(minNeed, s.targetNeed + amp * (1 - Math.cos(freq * effTau)) * 0.5);
        } else if (m.kind === 'rotor') {
          const dir = m.dir || 1;
          s.angle = dir * effTau * Math.PI * 1.5;
          // Blades narrow aperture slightly when rotated away from horizontal lock, opening to targetNeed at effTau=0
          const pinch = Math.abs(Math.sin(s.angle)) * (m.pinch || 8);
          need = Math.max(minNeed, s.targetNeed - pinch * clamp(effTau / 0.5, 0, 1));
          s.locked = effTau <= 0.001;
        } else if (m.kind === 'wave') {
          s.wavePhase = (this.travelled / 90);
          s.waveAmp = m.amp || 12;
        } else if (m.kind === 'hybrid') {
          const u = clamp(effTau / 0.65, 0, 1);
          need = Math.max(minNeed, s.targetNeed + 20 * u);
          s.angle = (m.dir || 1) * effTau * Math.PI;
          s.locked = effTau <= 0.001;
        }
        Pulse.setGap(s, need, shift, this.width);
      } else if (s.kind === 'barrier' && m.kind === 'pulse') {
        s.pulsePhase = Math.sin(effTau * Math.PI * 4);
      }
    }
```

> **Why this is 100% test-safe:** When `orbY` is omitted (or at $\tau \le \text{lockLead}$), `effTau === 0`, which sets `need === s.targetNeed` and `shift === s.targetShift`. Thus `Pulse.Track.validateItems` and `Pulse.autopilot` work with zero modifications!

### Step 6: Update `src/js/stages.js` (Add Motion Helpers to the 12 Campaign Stages)
In `src/js/stages.js`, keep all 12 stage IDs (`s1-first-pulse` … `s12-the-final-pulse`) and add optional motion helpers that attach `motion` metadata to gates, tunnels, and barriers:

```javascript
// Motion helpers in src/js/stages.js (all compile to standard 'gate' or 'barrier' items):
  const slide = (need, t, fromShift, toShift) => ({
    type: 'gate', need, t, shift: toShift || 0,
    motion: { kind: 'slide', fromShift: fromShift === undefined ? 90 : fromShift, duration: 0.72 },
  });
  const oscillate = (need, t, amp, shift) => ({
    type: 'gate', need, t, shift: shift || 0,
    motion: { kind: 'oscillate', amp: amp || 12, freq: 4.4 },
  });
  const rotor = (need, t, dir, shift) => ({
    type: 'gate', need, t, shift: shift || 0,
    motion: { kind: 'rotor', dir: dir || 1, pinch: 6 },
  });
  const waveTunnel = (need, length, t, amp) => ({
    type: 'gate', need, length, t,
    motion: { kind: 'wave', amp: amp || 12 },
  });
  const pulseBar = (t, isCharged) => ({
    type: 'barrier', charged: !!isCharged, t,
    motion: { kind: 'pulse' },
  });
  const hybrid = (need, t, shift, dir) => ({
    type: 'gate', need, t, shift: shift || 0,
    motion: { kind: 'hybrid', dir: dir || 1 },
  });
```

### Step 7: Update `src/js/sprite-view.js` (Orb Morph/Squash/Trail & Moving Obstacle Rendering)
In `src/js/sprite-view.js`:
1. **Orb Morph, Squash-and-Stretch & Neon Wake Trail (`renderOrb`):**
   - Select `normal` (`t < 0.20`), `morph_01` (`0.20 <= t <= 0.55`), `morph_02` (`0.55 < t <= 0.85`) on `this.body`.
   - Apply velocity-driven squash/stretch (`±8%` max) to `this.body` only, while keeping `this.ring` and `this.core` strictly circular (`scaleX === scaleY`).
   - Update the 10-node `fx_orb_trail_node` ring buffer and pulse `this.beatEcho` (`fx_orb_beat_echo`) on quarter-note beats from `Pulse.BeatClock.beatPhase()`.
2. **Moving Obstacle Telegraphs (`placeGate`, `placeTunnel`, `placeBarrier`):**
   - When `s.motion` is present on a gate (`slide`, `oscillate`, `rotor`, `hybrid`), show the laser rail `obs_rail_track_tile` across the lane (`depth = 1.8`), place the two amber ghost brackets `ind_rail_stop_bracket` at fixed `[s.targetGapL, s.targetGapR]` (`depth = 1.9`), and display `ind_telegraph_arrow_in` / `ind_telegraph_arrow_out` or `obs_rotor_hub` + `obs_rotor_ring_segment`.
   - When `s.motion && s.motion.kind === 'pulse'` on a barrier, use `obs_barrier_pulse_ready_tile` / `obs_barrier_pulse_warn_tile` and rotate `ind_beat_telegraph_ring` at `(orbX, s.y + s.h / 2)`.
   - On `crash(seg)`, if `seg.kind === 'gate'`, compute the exact wall contact point `(cx, cy)` and pulse `fx_fail_size_clip` at `(cx, cy)`.
