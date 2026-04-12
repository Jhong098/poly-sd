# Poly-SD — Claude Context

## What this project is

A browser-based visual sandbox game that teaches distributed systems design through simulation. Players drag-and-drop cloud components (load balancers, databases, caches, queues, etc.) onto a canvas, connect them, configure properties, then run a simulation that models traffic flow, latency, queue saturation, and failures. Challenges have explicit win conditions (TPS, p99 latency, error rate, cost budget). Inspired by the Poly Bridge game.

## Stack decisions (locked)

- **Frontend**: Next.js + TypeScript + Tailwind
- **Canvas/graph**: React Flow (xyflow) — handles drag-drop, connections, custom node rendering
- **Packet animation**: SVG animateMotion to start, Pixi.js if performance requires it
- **Simulation engine**: TypeScript running in a Web Worker — fully client-side, no server compute
- **State**: Zustand
- **Auth**: Clerk
- **Database**: Supabase (Postgres)
- **Deployment**: Vercel

## Simulation model (important)

The sim uses a **flow-based model**, not discrete event simulation. Each component computes (inputRPS → outputRPS, queueDepth, latency, errorRate, cost) using M/M/1 queue approximations. This is simpler than tracking individual packets but captures all the important distributed system behaviors. The sim runs in a Web Worker and posts state snapshots to the UI at ~10fps.

## Design philosophy

- Multiple valid solutions (like Poly Bridge — ugly bridge and elegant bridge both cross the gap)
- Simulation is the honest judge — can't be argued with
- Chaos injection is a first-class mechanic, not an afterthought
- Cost is always a constraint alongside performance
- Unlock component complexity progressively — don't overwhelm new players

## Current phase

Implementation — Phases 0–6 complete. The app is fully playable: canvas, simulation engine, full campaign (25 levels across Tutorial through Tier 5), auth (Clerk), persistence (Supabase), chaos events, replay sharing, and leaderboards are all live. See [Roadmap](docs/roadmap.md) for phase-by-phase completion status.

## Key design docs

- Game mechanics: `docs/game-design.md`
- Simulation math: `docs/simulation-design.md`
- All components: `docs/components-catalog.md`
- Level progression: `docs/level-design.md`
