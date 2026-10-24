# casual-game-studio

Shared development workspace for an AI-assisted casual mobile game.

> TODO: One-sentence pitch for the game once the concept is approved.

## Mission

Build an original, enjoyable casual game for a broad age range, with a realistic path to mobile release and monetization.

## Status

🚧 **Concept stage.** Arcade-first, Android-first strategy approved. Game concept and art direction are not yet approved; the technology stack is provisional. See [docs/DECISIONS.md](docs/DECISIONS.md) and [docs/ROADMAP.md](docs/ROADMAP.md).

## Team

A human producer leads a team of AI assistants. Full responsibilities and working rules are in [AI_TEAM.md](AI_TEAM.md).

| Member | Role |
|--------|------|
| Human Producer | Final decisions, approvals, and merges into `main` |
| Claude | Lead Developer: implementation and codebase |
| Gemini | Creative Director: visual identity, assets, animation, audio |
| ChatGPT | Producer Support and QA: research, specs, reviews, testing |

## Tech Stack

Provisional, pending Android pipeline validation:

- **Framework:** Phaser 3
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
