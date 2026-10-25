# Current AI Handoff

> This is the current status snapshot. Claude must update it at every review-ready coding checkpoint. Historical handoffs belong in [`docs/ai-handoffs/`](ai-handoffs/) and must not be overwritten. The required structure is in [AI_HANDOFF_PROTOCOL.md](AI_HANDOFF_PROTOCOL.md). The dated note for this snapshot is [`2026-10-26-pulse-status-audit.md`](ai-handoffs/2026-10-26-pulse-status-audit.md).


- Updated: 2026-10-25 19:09 UTC
- Project: PULSE
- Status: NEEDS PRODUCER DECISION
- Branch: audit notes on `docs/pulse-handoff-audit-2026-10-26` (docs only). Audited code branch: `feature/pulse-rhythm-motion`
- PR: audit notes in DOCS_PR_PLACEHOLDER. Audited code: [PR #11](https://github.com/egaamnd-bot/casual-game-studio/pull/11) (stacked on [PR #9](https://github.com/egaamnd-bot/casual-game-studio/pull/9))
- Head commit SHA: audited PR #11 head = `4e8ba1ac88f4673cd6adf47007ef3362512263f8`. The docs branch head SHA is in the docs PR (a commit cannot contain its own SHA).
- Base branch and base SHA: docs branch is based on `main` @ `897ae86c61a9f9cd4434a70c65ad0f62aa8b0c11`. PR #11 base = `feature/pulse-12-stage-campaign` @ `deb067096822c77f31c0b459b26b437be0844bc8`. PR #9 base = `main` (recorded base SHA `9ff64de8a2dde80f8e5df39ac46922fd9ab47a7a`, which is older than current main).
- Depends on PRs/issues: PR #11 depends on PR #9. Merge order: **#9 first, then #11.** See "Merge order" below.
- Is it safe to merge now? **NO** for PR #9 (GitHub reports conflicts with `main`) and PR #11 (depends on #9, and not phone-approved). The docs-only audit PR changes no code but still needs Producer approval to merge.
- Producer decision needed: **PHONE TEST** (APK from run #23, built from PR #11 head `4e8ba1ac88`)

## Executive summary

No code was changed. This was a read-only audit of the live GitHub state, done by reading the GitHub REST API and the PR #11 branch. **No tests or builds were run by this audit**; every test and build result below is read from existing records and labelled with its source.

- `main` is still the Android pipeline smoke test. **None of the PULSE game is on `main`.** The whole game lives in unmerged, stacked PRs.
- PR #11 (rhythm motion / game feel / rotating ring) is open, clean against its base (the campaign branch), and its head has a successful Android debug APK build. The APK artifact is live until 2026-11-08.
- PR #9 (12-stage campaign) is open and **now conflicts with `main`** (GitHub: `mergeable=false`, state `dirty`). PR #10 has the same head as PR #11 but targets `main`, so it conflicts too.
- The current head of PR #11 is **NOT DEVICE-TESTED**. The Producer playtested an earlier build and reported it "still feels stiff" (PR #11 comment, 2026-10-25 17:08 UTC); the head commit was pushed after that (17:26 UTC) as the response.

## Changed files

Docs only (this audit):
- `docs/AI_HANDOFF.md` — replaced the old snapshot (which said head SHA, APK and base were UNKNOWN) with verified live status.
- `docs/ai-handoffs/2026-10-26-pulse-status-audit.md` — this note. The earlier `2026-10-26-handoff-protocol-setup.md` is untouched.

Gameplay code: **none changed.** No PR was merged or edited; nothing was released.

## Live PR status (verified from GitHub, 2026-10-25 ~19:10 UTC)

| PR | Branch → base | State | Head SHA | Mergeable (GitHub) | Notes |
|---|---|---|---|---|---|
| [#9](https://github.com/egaamnd-bot/casual-game-studio/pull/9) 12-stage campaign | `feature/pulse-12-stage-campaign` → `main` | open, not draft, not merged | `deb067096822c77f31c0b459b26b437be0844bc8` | **false / dirty** | 22 commits, 134 files |
| [#11](https://github.com/egaamnd-bot/casual-game-studio/pull/11) rhythm, comet, moving gaps, ring | `feature/pulse-rhythm-motion` → `feature/pulse-12-stage-campaign` | open, not draft, not merged | `4e8ba1ac88f4673cd6adf47007ef3362512263f8` | true / clean (against the campaign branch only) | 5 commits, 37 files; 5 ahead / 0 behind the campaign branch |
| [#10](https://github.com/egaamnd-bot/casual-game-studio/pull/10) (duplicate) | `feature/pulse-rhythm-motion` → `main` | open | `4e8ba1ac88f4673cd6adf47007ef3362512263f8` | **false / dirty** | Same branch as #11 but targets `main`. Do not merge. |
| #4–#8 older stack PRs | each → `main` | open | various | not checked | Branches `prototype`, `campaign-system`, `art-v2`, `gameplay-variety`, `landscape` are all fully contained in the PR #11 head (0 behind). They are stale, redundant PRs; `feature/pulse-gameplay-evolution` (no PR) is also contained. |

**Why PR #9 conflicts:** `main` gained commits after the campaign branch diverged (the Android pipeline PR and the handoff-protocol PR #12). Six files changed on both sides: `.github/workflows/android-debug-apk.yml`, `.gitignore`, `capacitor.config.json`, `docs/ANDROID_PIPELINE_TEST.md`, `package.json`, `scripts/build.mjs`. (The file list is from comparing changed-file lists; GitHub's `dirty` flag is the authoritative signal.)

## Merge order

1. **PR #9 → `main` first**, but only after its conflicts with `main` are resolved (needs Producer authorisation; not done here).
2. **PR #11 second.** Its base is the campaign branch, so it must be retargeted to `main` (or merged only after #9 lands). Merging #11 before #9 cannot put PULSE on `main`.
3. **Do not merge PR #10** (duplicate of #11 aimed at `main`, skipping the stack) and do not merge #4–#8 separately (their commits are already inside #9/#11).
4. Nothing is merged until the Producer gives explicit approval after phone testing.

## Behaviour and design impact (what is actually implemented at PR #11 head)

Read from `docs/RHYTHM.md` and spot-checked in the code at `4e8ba1ac88`; **not run** by this audit.

- **From PR #9 (campaign base):** 12 stages across 3 worlds (`s1-first-pulse` … `s12-the-final-pulse` in `src/js/stages.js`; worlds Neon Circuit 125 BPM, Chromatic Overdrive 133 BPM, Pulse Collapse 140 BPM).
- **From PR #11:**
  - Beat clock and beat-aligned stage items (`src/js/rhythm.js`).
  - Music alignment with drift-only re-seek; pause holds the music.
  - Sound timing: input sounds undelayed; reward sounds wait at most 40 ms for the 16th note. Verified in `src/js/config.js`: `groove: { enabled: true, inputDelay: 0, eventDelay: 0.04, maxSeeks: 4 }`. `groove.enabled: false` is the fallback toggle.
  - Pickup melodies, accent chords, 8 new sound effects.
  - Procedural comet orb and trailer look; fluid spring-driven orb and tail (drawn only; collision radius unchanged).
  - Moving gaps (`slide`, `breathe`) with telegraphing and ghost brackets.
  - Rotating ring gate: `Ring.hits` is wired into collision in `src/js/level.js` and drawn by `Render.ring` in `src/js/render.js`; `ring(` appears on 10 lines of `src/js/stages.js`. Per RHYTHM.md it first appears in stage 4 and is reused to stage 12.
- Controls/gameplay/scoring/save compatibility: documented as unchanged (gold counts, star thresholds, speeds, stage ids, save file). **Not independently verified.**
- Approved decision changed? NONE found.
- Not implemented (per RHYTHM.md): pulsating barriers, wave tunnels, hybrids, menu-side beat effects.

## Validation evidence

| Check | Exact command or workflow | Result | Evidence / commit |
|---|---|---|---|
| Browser test pages (`tests/rhythm.html`, `campaign.html`, `logic.html`, `assets.html`, `scene.html`, `landscape.html`, `gameplay.html`) | Opened in a browser by the author (command not recorded) | **NOT RUN by this audit.** Author reports: rhythm 4,870 checks pass; campaign 647/647 (12 stages, 3 widths); logic, assets (112 frames, 43 sounds), scene, landscape pass at a 960x540 window | `docs/RHYTHM.md` and PR #11 description. Self-reported, UNVERIFIED independently. `gameplay.html` is not mentioned in either record. |
| Environment caveat | — | Author says some timing/layout checks fail in hidden or zero-size panes, and failed identically on the base commit. | Self-reported; no failing-base evidence is in the repo. Treat as UNVERIFIED. |
| Tests in CI | `.github/workflows/android-debug-apk.yml` | **No.** The workflow only builds the APK; it runs none of the test pages. | Workflow file at PR #11 head |
| Build | Workflow "Android debug APK", run #23 | **PASS** (read, not re-run) | [Run 40216523121](https://github.com/egaamnd-bot/casual-game-studio/actions/runs/40216523121), `head_sha` = `4e8ba1ac88f4673cd6adf47007ef3362512263f8`, conclusion success, job `build` success |
| CI on PR #9 head | same workflow, run #19 | **PASS** (read, not re-run) | [Run 40146987320](https://github.com/egaamnd-bot/casual-game-studio/actions/runs/40146987320), `head_sha` = `deb067096822c77f31c0b459b26b437be0844bc8`. Artifact `pulse-debug-apk-run19` (id 12580983327) not expired. |
| Device test | — | **NOT DEVICE-TESTED** for head `4e8ba1ac88`. | Producer's earlier playtest ("still feels stiff") was on an earlier build; that build's SHA is UNKNOWN. |
| Regression checks | — | **NOT RUN** by this audit | — |

## Android artifact

- APK URL (artifact page, GitHub login required): https://github.com/egaamnd-bot/casual-game-studio/actions/runs/40216523121/artifacts/12608335871
- Workflow/run URL: https://github.com/egaamnd-bot/casual-game-studio/actions/runs/40216523121
- Artifact name: `pulse-debug-apk-run23` (id 12608335871, 11,159,716 bytes, sha256 `726e4d1d662829d3a096e11c23189125905f10ab729e92852804e3b177b045b3` as reported by GitHub). It is a zip containing `app-debug.apk`. A second artifact, `package-lock-run23`, is not an APK.
- Exact commit SHA the APK was built from: `4e8ba1ac88f4673cd6adf47007ef3362512263f8` (the run's `head_sha`; this equals the current PR #11 head).
- Expires: 2026-11-08 17:29 UTC (14-day retention). Debug-signed; not a release build.
- Install/launch verification: **UNKNOWN.** The artifact download was blocked from the audit environment, so the commit stamp inside the APK (`build-info.js`, first 7 SHA characters) was not read. The game code never displays that stamp (no `BUILD_INFO` use in `src/`), so the phone cannot confirm the commit visually either. The link between APK and commit rests on the run's `head_sha`.
- Not attached to PR: the PR #11 description says the APK run "is linked in a comment below", but the only comment on PR #11 is the Producer's brief. **No APK link was posted on the PR before this audit.**

## Known limitations and risks

1. **PR #9 conflicts with `main`.** It cannot be merged as is; resolving needs a Producer-authorised change to the PR branch, and the APK would then need rebuilding and re-testing.
2. **Head not phone-tested.** Audio latency, orb fluidity, ring readability and Android performance are all unverified on a device.
3. **Test results are self-reported**, not in CI, and not re-run here.
4. **Doc inconsistency:** `docs/RHYTHM.md` says the work was "not yet played on a phone", but the Producer playtested an earlier build. The SHA of that build is UNKNOWN.
5. **Quantization wording:** the Producer brief mentions a "<=70 ms" quantization; the head config and RHYTHM.md say 40 ms. Which value the Producer's earlier build used is UNKNOWN.
6. **Redundant open PRs** (#4–#8, #10) invite a wrong-PR merge.
7. **APK commit is not visible in the app**, so APK-to-commit matching depends on GitHub run metadata.
8. **Artifact expires** 2026-11-08; a rebuild is needed after that.
9. PR #9 and #10 `mergeable` values flipped from `null` to `false` during this audit (GitHub computed them); a later recheck may differ if branches change.

## Remaining work

1. Producer phone-tests the APK from run #23.
2. Based on feedback: tune game feel or approve.
3. Before any merge: resolve PR #9 vs `main` conflicts (needs authorisation), rebuild the APK, re-test, retarget or sequence PR #11, close or retarget #10, and close #4–#8 as superseded (Producer's call).
4. Add a visible build stamp or CI test run if the Producer wants easier verification (optional, not started).

## What the producer should check on phone

Install: download the artifact zip from the link above (GitHub login needed), unzip, and install `app-debug.apk` on the Android phone (allow installs from unknown sources if prompted).

1. Does the game start in landscape, and does it stay landscape after pause/resume?
2. Orb response: does it react instantly to touch and release? Does the springy shrink/grow feel fluid, not floaty or delayed?
3. Sound: do shrink/release sounds feel instant? Do pickup/pass/smash sounds feel musical or late? Does the music stay in step after pause and retry?
4. Moving gaps (stages 3+): do the swing and the ghost brackets read clearly at phone size?
5. Rotating ring (stage 4 onward): is the opening readable, and do collisions feel fair?
6. Frame rate and any stutter on your phone; note the phone model.
7. Gameplay unchanged: hold-to-shrink / release-to-grow, scoring, stars, stage selection, save progress.

## Explicit decision requested

Please install the APK from run #23 (commit `4e8ba1ac88`) and tell me: **approve the game feel, request adjustments, or block?** Do not merge anything; PR #9 and PR #11 stay unmerged until you explicitly approve a merge plan.

## Next recommended task

After your phone feedback, either tune game feel on a small commit series, or (if approved) a separate Producer-authorised task to resolve PR #9's conflicts with `main`. Neither has been started.
