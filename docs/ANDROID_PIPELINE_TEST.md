# Android Pipeline Smoke Test

> Throwaway test, not the game. Goal: prove that GitHub Actions can turn a Phaser 3 web app into an Android APK that installs and runs on the producer's phone. The technology stack becomes final (see [DECISIONS.md](DECISIONS.md) #3) only if this passes.
>
> **Result (2026-10-25): passed on the producer's Android phone** (matching touch counts, about 61 FPS). See DECISIONS.md #5.
>
> **Superseded:** the Pulse prototype replaced the test screen, and the APK artifact is now named `pulse-debug-apk-run<N>`. The original test screen is in commit `aa8a2b1`. The build and install steps below still apply.

## What It Is

One screen with a ball. Hold anywhere and the ball shrinks; release and it grows back (the core input Pulse depends on). The screen shows:

- Phaser version and platform (`android` inside the app, `web` in a browser)
- Build commit and GitHub Actions run number, so you can match the APK to the code
- `down` / `up` touch counts: they must match after every release
- Audio state: a short beep plays on each touch
- Frames per second

## Files

| File | Purpose |
|------|---------|
| `src/index.html`, `src/main.js` | The test screen |
| `scripts/build.mjs` | Copies `src/` to `dist/` and bundles Phaser so the app works offline |
| `package.json` | Pinned versions: Phaser 3.90.0, Capacitor 8.5.3 |
| `capacitor.config.json` | App id `com.casualgamestudio.pipelinetest`, name "Pipeline Test" |
| `.github/workflows/android-debug-apk.yml` | Builds the debug APK on GitHub's servers |
| `.gitignore` | Keeps generated folders and signing keys out of the repo |

The Android project (`android/`) is generated during each build rather than committed, so nothing needs to be installed locally.

## Step 1: Run the Build (GitHub)

1. In GitHub Desktop, publish the branch `chore/android-pipeline`. The push starts the workflow.
2. On GitHub, open **Actions → Android debug APK** and wait for the run to finish (green check).
3. If it fails (red cross), open the failed step and copy its log to Claude.

## Step 2: Install on the Phone

1. On the run's summary page, under **Artifacts**, download `pipeline-test-debug-apk-run<N>`. GitHub delivers it as a `.zip`.
2. Get the zip onto the phone: download it directly in the phone's browser while signed in to GitHub, or copy it over USB.
3. Extract the zip with the phone's Files app to get `app-debug.apk`.
4. Tap the APK. When Android asks, allow installs from that app (browser or Files). Play Protect may warn about an unknown app; that is expected for a test build.

## Step 3: Test Checklist

Record results in the PR.

- [ ] App installs and opens to the test screen
- [ ] Screen says `android` and shows a commit and run number that match the Actions run
- [ ] Holding shrinks the ball immediately; releasing grows it back
- [ ] After 20 quick taps and 5 long holds, `down` and `up` match and the status reads `OK`
- [ ] Sliding a finger off the screen edge while holding still counts as a release
- [ ] Beep is audible on touch (media volume up); audio state reads `running`
- [ ] FPS stays near 60 (write down the lowest value seen)
- [ ] Switching to another app and back resumes without a crash or black screen
- [ ] Rotating the phone does not crash (layout may letterbox; portrait lock comes later)
- [ ] Turning on airplane mode and reopening the app still works (Phaser is bundled)

Phone model and Android version: ______

## Verified vs. Untested

**Verified by Claude:**
- The test screen runs in a desktop browser (headless Microsoft Edge): Phaser 3.90.0 starts with WebGL and Web Audio and there are no console errors.
- Package versions exist on npm and Capacitor 8.5.3 targets Android SDK 36 with Java 21, which the workflow sets up.

**Not yet verified:**
- Touch input and audio on a real phone (only the browser was checked, and without simulated input)
- That the workflow runs at all: Actions enabled on the private repo, Android SDK present on the runner, Gradle build succeeding
- Build time and free Actions minutes used per run
- Install and behavior on the producer's phone

## Not Covered Here

Release (Play Store) builds, signing keys, app icons, portrait lock, and haptics come after this test passes.
