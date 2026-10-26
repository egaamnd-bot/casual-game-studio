# Future Monetization: Requirements (Not Implemented)

> Status: **nothing is implemented.** No ad SDK, no analytics, no data collection, no purchases. This page records what a future, family-friendly implementation must satisfy, so it can be planned and approved separately. Policies change: **re-check every point against the current Google Play policy and an appropriate legal review before implementing.** This is a checklist, not legal advice.

## Audience and Why It Matters

The producer's target audience is **children and teens, with general-audience appeal**. On Google Play, a target audience that includes children puts the app under the **Families policies**. That shapes almost every monetization decision.

## Requirements to Verify Before Any Ads

1. **Families policy compliance.** Declare the target audience accurately in Play Console. A mixed audience (children and adults) has extra obligations, e.g. a neutral age screen if content or ads differ by age.
2. **Only Families-certified ad SDKs.** Apps whose audience includes children may use only ad SDKs certified under Google Play's Families Self-Certified Ads SDK program.
3. **Child-directed treatment.** For users who may be children, the SDK must be configured for child-directed treatment, e.g. Google Mobile Ads' `tagForChildDirectedTreatment` and, where applicable, `tagForUnderAgeOfConsent`. No personalized or interest-based ads or remarketing for them.
4. **Age-appropriate ad content.** Restrict ad content ratings (e.g. a maximum rating of G for child audiences) and block sensitive categories.
5. **Consent.** Obtain required consent where the law demands it (e.g. GDPR in the EEA/UK, including the rules for children's consent). COPPA applies in the US. Google's consent tooling can help but must be configured correctly for children.
6. **Privacy disclosures.** Publish a privacy policy (a hosted URL is required by Play), complete the Data safety form accurately, and disclose every SDK and what it collects.
7. **No deceptive ads.** Ads must be clearly ads, never disguised as gameplay, with no fake close buttons and no ads that interrupt mid-run.
8. **Testing.** Use test ad units only during development, test consent flows in each region, test the child-directed configuration, and verify that no device identifiers are sent for child users.

## Design Rules for Pulse (Proposed, Needs Approval)

- **Rewarded ads only, always optional,** started by the player (e.g. "watch to try again from 50%" or "watch for a cosmetic"). Never forced, and never during a run.
- **Cosmetic rewards only.** Skins already have no gameplay effect (enforced by a test). Rewards must never change difficulty, collision, speed or scoring.
- **No ads in the first sessions,** and none on the main menu.
- **No paid currency or loot boxes.** If purchases are ever added, prefer a single "support the developer / remove ads" purchase.

## Where It Would Plug In (Architecture)

- **One integration point:** a new `src/js/ads.js` module behind a small interface, `Pulse.Ads.isAvailable()` / `Pulse.Ads.showRewarded()` → a promise of `rewarded | skipped | unavailable`. A no-op version would ship until an implementation is approved.
- **Kept out of gameplay:** gameplay, campaign and scoring code never call the ad SDK. Only menu or result screens would call `Pulse.Ads`, and only after the player taps a clearly labelled button.
- **Native SDK:** a Capacitor plugin for the chosen certified SDK, added to `package.json` and the Android build, after approval.
- **Saves:** any reward state goes in the existing save file (`storage.js`), sanitized like other fields.
