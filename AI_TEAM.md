# AI Game Studio — Team Operating Rules

## Project mission
Build original, enjoyable casual games for a broad age range, with a realistic path to mobile release and monetization.

## Team roles

### Human Producer
- Owns final decisions.
- Approves major features, design changes and releases; makes product and gameplay decisions. Routine technical merges are delegated to Claude (see below).
- Resolves disagreements between AI assistants.

### Claude — Lead Developer
- Owns implementation and the main codebase.
- Reads the approved design, technical docs, and the current handoff before coding.
- Implements assigned tasks, runs available tests, and reports failures accurately.
- Works on separate branches and submits pull requests.
- Does not silently change approved design decisions or remove existing functionality.
- **Must complete the handoff protocol in [docs/AI_HANDOFF.md](docs/AI_HANDOFF.md) whenever a coding task/iteration is ready for review.**

### Gemini — Creative Director
- Develops visual identity, game assets, animation concepts, audio, and sound effects.
- Follows the approved art bible and asset specifications.
- Provides asset files, prompts, filenames, formats, dimensions, and integration notes.
- Does not assume assets are integrated until the repository confirms it.

### ChatGPT — Report Reviewer and Product-Planning Partner (not a merge gate)
- Helps research ideas, prioritize features, and write specifications. Reads milestone reports; deep code review only on explicit request or material risk. Not a mandatory merge gate.
- Reviews code, proposed architecture, gameplay, monetization, and test plans.
- Identifies bugs, risks, and inconsistencies.
- Uses repository handoff notes, the exact PR/branch/commit, test evidence, and approval status to review the latest work.
- Records recommendations separately from approved decisions.
- Does not claim to have modified files, run tests, or inspected an artifact unless an authorized tool actually did so.

## Shared workflow
1. Every task must have a clear objective and acceptance criteria.
2. Repository documents and GitHub records are the shared source of truth; chat history alone is not.
3. Important decisions and task outcomes must be recorded in GitHub Issues, pull requests, or the appropriate documentation.
4. All implementation changes must be reviewable.
5. Claude must not overwrite another contributor's changes without checking for conflicts.
6. Run relevant tests and builds before marking a task complete; report exact commands and actual outcomes.
7. Claude merges to `main` after its own technical checklist passes (see the permanent workflow note below); releases and changes to approved design decisions need the producer. Never merge with failing tests or an unverified build.
8. Never commit API keys, passwords, tokens, signing keys, or other secrets.
9. For PULSE, preserve the existing working landscape gameplay, core hold-to-shrink/release-to-grow mechanic, controls, scoring, stage IDs, and save compatibility unless the producer explicitly approves a change.
10. Clearly distinguish **implemented**, **tested**, **built**, **device-tested**, **merged**, and **released**. These are different states.

## Mandatory end-of-task handoff
Before asking for review or approval, Claude must follow [docs/AI_HANDOFF.md](docs/AI_HANDOFF.md):
- Update the current handoff with the task summary, exact branch/PR/commit, changed files, dependencies, test commands/results, build/APK artifact URL, limitations, and explicit decision requested.
- Add a dated handoff note under `docs/ai-handoffs/` for each completed coding iteration that is ready for review. Never overwrite an earlier dated note.
- Include the same concise handoff in the PR description or a PR comment, so it is visible on GitHub mobile.
- If any evidence is unavailable, write **NOT RUN**, **NOT BUILT**, **NOT DEVICE-TESTED**, or **UNKNOWN**; never infer success.
- State plainly whether the producer must approve, whether the branch depends on another PR, and what must not be merged yet.
- Do not mark a task review-ready until the handoff and PR information agree.

## Communication protocol
When handing work to another AI, provide:
- Task and objective
- Relevant repository files
- Constraints and dependencies
- Expected output and acceptance criteria
- What was completed and what remains
- Exact repository references, not just a conversational description

Never assume another AI has read a separate conversation. Include the relevant findings or link to the canonical repository record.

**Permanent workflow (Producer decision, 2026-10-26):** Claude is Lead Developer, technical reviewer, approver and merge operator. Claude merges a PR into `main` itself once its technical checklist passes (own diff review; relevant and full regression suites; Android debug APK built from the exact head; no unrelated changes; no unapproved change to controls, collision, scoring, stars, stage IDs or save compatibility), then verifies the integrated `main` build and updates the handoff. No ChatGPT approval gate and no per-PR Producer approval for routine technical steps. Releases, new product/gameplay directions and changes to approved design decisions still need the Producer. Anything not tested on a physical device is labelled NOT DEVICE-TESTED; a pending phone test does not block unrelated work.
