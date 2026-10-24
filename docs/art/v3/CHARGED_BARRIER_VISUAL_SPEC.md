# PULSE v3.0 — Charged-Barrier & Charge-Ring Visual Specification

**Reference Diagram:** `PULSE_v3_Charged_Barrier_State_Sheet.png`

## 1. Solving the Player Confusion Problem

In earlier builds, players could not immediately tell:
1. Whether a cyan barrier ahead was an **Ordinary Smash Barrier** (only requires being full size) or a **Charged Smash Barrier** (requires staying at full size for `0.30s` until the charge ring locks at `100%`).
2. Whether hitting a Charged Barrier *right now* (while full-sized, but with the charge ring only at `40%` or `70%`) would smash it or kill them.

Our v3.0 visual system eliminates all ambiguity before impact using **three synchronized visual cues**:
1. **Shared Diamond-Lock Key Motif:** The **Charged Barrier** features a central `96×96` **Octagon-Diamond Target Emblem** (`barrier_charged_emblem_*`) and recurring **Diamond Capacitor Studs** (`barrier_charged_ready_tile`). When the player's Charge Ring reaches `100%` (**State C**: `charge_ring_state_c_full`), **4 matching outward-pointing Diamond Lock Studs** snap onto the orb's ring—visually teaching the player *"My diamond-studded ring unlocks the diamond-studded barrier"*.
2. **Strict Predictive Danger State When Charge < 100%:** Even if the player orb is at full size (`isCharged(radius) === true`), a Charged Barrier **MUST remain in its Crimson/Amber Lockout State (`barrier_charged_danger_tile` + `barrier_charged_emblem_danger` with an unmistakable `×` over the diamond core)** whenever `orbState.charge < 1.0`. The instant `orbState.charge >= 1.0`, the barrier snaps to its **Armed White-Cyan State (`barrier_charged_ready_tile` + `barrier_charged_emblem_ready`)** and triggers `fx_charge_complete_burst` on the orb.
3. **Unmistakable Silhouette Separation Across All States:**

| Visual Element | State A: Not Charged (`charge == 0`) | State B: Charging (`0 < charge < 1` over `0.3s`) | State C: Fully Charged (`charge >= 1.0`) |
| :--- | :--- | :--- | :--- |
| **Orb Charge Ring Frame** | `charge_ring_state_a_empty` (`168×168`) | `charge_ring_state_b_step_01..04` (`168×168`) + radial arc | `charge_ring_state_c_full` (`168×168`) + `fx_charge_complete_burst` (`192×192`) |
| **Ring Silhouette** | 8 hollow, disconnected dark-slate slots with wide gaps (`10°` breaks) | Clockwise illumination of octagonal segments (`25%`, `50%`, `75%`, `90%`) with a white-hot leading diamond spark | All 8 segments fuse into a continuous thick `#E0FFFF` octagon with **4 large outward cardinal Diamond Studs** |
| **Ordinary Barrier Appearance** | **Danger (`barrier_smash_danger_tile`):** Dashed crimson rails + `×` seams (if orb is shrunk) | **Ready (`barrier_smash_ready_tile`):** Single solid cyan bar + `> <` inward fracture chevrons (since orb is full size!) | **Ready (`barrier_smash_ready_tile`):** Single solid cyan bar + `> <` inward fracture chevrons |
| **Charged Barrier Appearance** | **Locked/Danger (`barrier_charged_danger_tile` + `barrier_charged_emblem_danger`):** Notched crimson outer rails, amber lockout inner rails, hollow diamond studs barred with `×` | **Locked/Danger (`barrier_charged_danger_tile` + `barrier_charged_emblem_danger`):** Stays in Crimson/Amber `×` lockout until `charge` hits `1.0`! | **Armed/Safe (`barrier_charged_ready_tile` + `barrier_charged_emblem_ready`):** Double solid white-cyan rails (`#F8FAFC` + `#00F0FF`) + glowing white-cyan diamond studs |
