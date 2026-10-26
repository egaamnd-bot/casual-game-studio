# casual-game-studio

Shared development workspace for an AI-assisted casual mobile game.

**Pulse** (working title): hold to shrink, release to grow. Squeeze your energy orb through gaps, and stay big to grab the energy that multiplies your score.

## Mission

Build an original, enjoyable casual game for a broad age range, with a realistic path to mobile release and monetization.

## Status

🚧 **In development.** A landscape, one-touch arcade game with a **12-stage campaign** across three worlds ([docs/CAMPAIGN.md](docs/CAMPAIGN.md)) and Endless mode, Gemini's v4 art, six cosmetic skins and an original synthwave soundtrack ([docs/AUDIO.md](docs/AUDIO.md)). Landscape layout: [docs/LANDSCAPE.md](docs/LANDSCAPE.md). Mechanics: [docs/GAMEPLAY_EVOLUTION.md](docs/GAMEPLAY_EVOLUTION.md). Rhythm and moving gaps: [docs/RHYTHM.md](docs/RHYTHM.md). See [docs/DECISIONS.md](docs/DECISIONS.md) and [docs/ROADMAP.md](docs/ROADMAP.md).

## Team

A human producer leads a team of AI assistants. Full responsibilities and working rules are in [AI_TEAM.md](AI_TEAM.md).

| Member | Role |
|--------|------|
| Human Producer | Final decisions, approvals, and merges into `main` |
| Claude | Lead Developer: implementation and codebase |
| Gemini | Creative Director: visual identity, assets, animation, audio |
| ChatGPT | Producer Support and QA: research, specs, reviews, testing |

## Tech Stack

Provisional; the Android pipeline was validated on a phone (see DECISIONS.md #5):

- **Framework:** Phaser 3.90.0
- **Language:** JavaScript
- **Mobile wrapper:** Capacitor
- **Builds:** GitHub Actions
- **Target platform:** Android first; iOS deferred
- **Backend / services:** TODO (none planned for now)

## Repository Layout

```
casual-game-studio/
├── .github/workflows/   # GitHub Actions: Android debug APK build
├── docs/
│   ├── GAME_DESIGN.md   # Game design document (GDD)
│   ├── PULSE_PROTOTYPE.md        # Prototype rules, structure, testing, limitations
│   ├── CAMPAIGN.md               # Campaign stages, stars, skins, save data
│   ├── ANDROID_PIPELINE_TEST.md  # How to build and install the APK
│   ├── ART_BIBLE.md     # Art bible and asset specifications
│   ├── DEVELOPMENT.md   # Setup, build, test, and release instructions
│   ├── DECISIONS.md     # Log of approved decisions
│   └── ROADMAP.md       # Milestones and current focus
├── scripts/build.mjs    # Copies src/ into dist/ for Capacitor (runs in CI)
├── src/                 # The game (index.html, js/, assets/ = Gemini's atlases and backgrounds)
├── tests/               # Browser test pages
├── capacitor.config.json
├── package.json
├── AI_TEAM.md           # Team roles and operating rules
├── CONTRIBUTING.md      # Branching, commits, pull requests, handoffs
└── README.md
```

## Getting Started

1. Read [AI_TEAM.md](AI_TEAM.md) and [CONTRIBUTING.md](CONTRIBUTING.md).
2. Check [docs/DECISIONS.md](docs/DECISIONS.md) for what has been approved.
3. Follow [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) to set up and run the project.

## License

TODO: Choose a license (for example, proprietary for a commercial release), add a `LICENSE` file, and link it here.
