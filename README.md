# casual-game-studio

Shared development workspace for an AI-assisted casual mobile game.

**Pulse** (working title): hold to shrink, release to grow. Squeeze your energy orb through gaps, and stay big to grab the energy that multiplies your score.

## Mission

Build an original, enjoyable casual game for a broad age range, with a realistic path to mobile release and monetization.

## Status

🚧 **Prototype.** Pulse is approved for prototyping, and the first playable prototype is built with placeholder art ([docs/PULSE_PROTOTYPE.md](docs/PULSE_PROTOTYPE.md)). The Android build pipeline is provisionally validated on a phone. Art direction is pending. See [docs/DECISIONS.md](docs/DECISIONS.md) and [docs/ROADMAP.md](docs/ROADMAP.md).

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
├── docs/
│   ├── GAME_DESIGN.md   # Game design document (GDD)
│   ├── ART_BIBLE.md     # Art bible and asset specifications
│   ├── DEVELOPMENT.md   # Setup, build, test, and release instructions
│   ├── DECISIONS.md     # Log of approved decisions
│   └── ROADMAP.md       # Milestones and current focus
├── AI_TEAM.md           # Team roles and operating rules
├── CONTRIBUTING.md      # Branching, commits, pull requests, handoffs
└── README.md
```

TODO: Add source, asset, and build folders once the engine is chosen.

## Getting Started

1. Read [AI_TEAM.md](AI_TEAM.md) and [CONTRIBUTING.md](CONTRIBUTING.md).
2. Check [docs/DECISIONS.md](docs/DECISIONS.md) for what has been approved.
3. Follow [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) to set up and run the project.

## License

TODO: Choose a license (for example, proprietary for a commercial release), add a `LICENSE` file, and link it here.
