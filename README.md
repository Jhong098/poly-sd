# Poly-SD

[![CI](https://github.com/Jhong098/poly-sd/actions/workflows/ci.yml/badge.svg)](https://github.com/Jhong098/poly-sd/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/Jhong098/poly-sd/graph/badge.svg)](https://codecov.io/gh/Jhong098/poly-sd)

> A visual sandbox game for learning distributed systems design — inspired by Poly Bridge.

You're given a system design challenge: handle 50K RPS, hit p99 < 200ms, stay under $800/mo, survive an AZ outage. You have a palette of cloud components — load balancers, caches, databases, queues — to drag, drop, connect, and configure. Hit simulate. Watch traffic flow. Watch things break. Iterate.

---

## Design Documents

| Document | Description |
|----------|-------------|
| [Game Design](docs/game-design.md) | Core game loop, mechanics, modes, scoring |
| [Tech Architecture](docs/tech-architecture.md) | Stack choices, system design, key decisions |
| [Simulation Design](docs/simulation-design.md) | How the sim engine models distributed system behavior |
| [Components Catalog](docs/components-catalog.md) | Every building block, its properties, and behavior |
| [Level Design](docs/level-design.md) | Campaign levels, win conditions, concepts taught |
| [Roadmap](docs/roadmap.md) | Phased delivery plan with estimates |

---

## Vision in One Paragraph

Poly Bridge works because the physics simulation is honest — your bridge fails in physically plausible ways, teaching structural intuition through failure. Poly-SD applies this to distributed systems: traffic flows honestly through your architecture. Queues back up. Databases saturate. Caches go cold. Cascades happen. The simulation can't be fooled — you either hit SLA or you don't. Every level has a single honest judge and multiple valid solutions, just like Poly Bridge.

---

## Status

Live — Phases 0–6 complete. Full campaign playable (25 levels across Tutorial + Tiers 1–5), simulation engine running in a Web Worker, auth + persistence via Clerk + Supabase, replay sharing, and per-level leaderboards. See [Roadmap](docs/roadmap.md) for phase-by-phase details.
