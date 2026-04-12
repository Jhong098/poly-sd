# Roadmap

## Phases

### Phase 0 — Scaffold (1 week) ✅ Complete

Goal: A working canvas where you can drag components and connect them. No simulation. Proves the core UX is viable.

**Deliverables**
- Next.js 14 + TypeScript project initialized
- React Flow canvas with pan/zoom/minimap
- Component palette (sidebar) with 3 component types: Server, Database, Cache
- Drag from palette → drop on canvas
- Draw connections between components
- Click component → config panel opens with property sliders
- Zustand `architectureStore` wired to React Flow state
- Tailwind styling, basic component icons (placeholder SVGs)
- Deploy to Vercel (preview URL working)

**Not in scope**: Simulation, auth, DB, scoring, challenges.

---

### Phase 1 — Simulation Core (3–4 weeks) ✅ Complete

Goal: The sim engine works. You can design an architecture, click Run, and see realistic metrics.

**Deliverables**
- Web Worker simulation engine
  - Flow-based model (topological resolution)
  - M/M/1 queue math for saturation
  - Per-component behavior: Server, DB, Cache, Load Balancer, Queue
  - Traffic curve: steady + spike presets
  - Tick loop at 100ms real-time intervals
  - `postMessage` snapshot protocol
- Simulation state: `simStore` in Zustand
- Metrics dashboard (bottom panel): p99 latency, error rate, RPS, cost/hr — live uPlot charts
- Component visual state: color heat based on ρ (utilization)
- Packet animation: SVG `animateMotion` on edges
- Run / Pause / Speed controls
- Chaos injection: NODE_FAILURE via right-click during simulation

**Definition of done**: A Server → Database architecture, when overloaded, shows increasing latency, queue depth badges, red components, and error rate climbing. Adding a Cache drops DB utilization. The simulation matches intuition.

---

### Phase 2 — First Levels (1–2 weeks) ✅ Complete

Goal: The Tutorial and Tier 1 levels are playable. Win conditions work. Players can "complete" a level.

**Deliverables**
- Challenge definition schema (`Challenge` TypeScript type)
- Challenge brief panel (top or right): shows SLA targets, budget, traffic shape, current metrics vs targets
- Win condition evaluator (runs at sim completion)
- Score computation (performance, cost, simplicity — resilience deferred)
- Level complete / fail screen with score breakdown
- Tutorial levels T-0 through T-3 implemented
- Tier 1 levels 1-1 through 1-4 implemented
- Level selection screen (Campaign map)
- Component unlock gating (palette shows only unlocked components)

**Not in scope**: Auth, persistence, replays. Players can't save progress yet.

---

### Phase 3 — Auth & Persistence (1 week) ✅ Complete

Goal: Players can sign in, save architectures, and resume progress across sessions.

**Deliverables**
- Clerk auth integration (Google + GitHub OAuth)
- Supabase Postgres: `profiles`, `architectures`, `challenge_completions` tables
- Save architecture (auto-save on sim complete, manual save button in sandbox)
- Load saved architectures
- Challenge completion tracking (best score per level persisted)
- Campaign progress locked behind auth (guest can play tutorial)
- XP + Architect Level computed from completions

---

### Phase 4 — Polish & Chaos (2 weeks) ✅ Complete

Goal: The game feels good. Chaos events are implemented. Tier 2 levels complete.

**Deliverables**
- Chaos events: TRAFFIC_SPIKE, CACHE_FLUSH, NETWORK_PARTITION, LATENCY_INJECTION
- Chaos schedule in challenge definitions
- Chaos event visualizations (animated partition line, flash on spike)
- Traffic shape editor (draw custom curve)
- Tier 2 levels 2-1 through 2-5 implemented
- Resilience scoring dimension (requires chaos events)
- Additional components: API Gateway, K8s Fleet with HPA, Kafka, CDN
- Component config panel polish (help tooltips, property explanations)
- Onboarding improvements: guided callouts for tutorial levels
- Sound effects (optional — queue pop, overload alarm, level complete)

---

### Phase 5 — Social (2 weeks) ✅ Complete

Goal: Players can share solutions and compare with others.

**Deliverables**
- Replay sharing: generate shareable link that encodes architecture + sim result
- Public replay viewer (read-only canvas + metric playback)
- "Compare solutions" view after level completion
- Leaderboard per level (top 10 by each scoring dimension)
- ~~Architecture PNG export~~ (descoped)
- ~~"System design brief" auto-generation~~ (descoped)

---

### Phase 6 — Content Completion (2–3 weeks) ✅ Complete

Goal: All 28 levels implemented. Full campaign is playable.

**Deliverables**
- Tier 3 levels: 3-1 through 3-6 (resilience) ✅
- Tier 4 levels: 4-1 through 4-5 (distributed data) ✅
- Tier 5 levels: 5-1 through 5-4 (global systems) ✅
- All remaining components: NoSQL, Object Storage ✅; ~~Serverless, Service Mesh, GeoDNS, Distributed Cache~~ (descoped)
- Sandbox mode (all components unlocked, no win condition) ✅
- Architect level display on profile ✅

---

### Phase 7 — Challenge Mode & Growth 🔄 In Progress

- Community challenge submissions
- Competitive events (time-limited leaderboards)
- Incident replay levels (historical outages)
- Enterprise/education tier (instructor dashboard, student assignment)
- Mobile-responsive canvas (tablet support)
- Certification alignment (AWS SAA, GCP ACE question mapping)

---

## Timeline Summary

| Phase | Scope | Duration | Status |
|-------|-------|----------|--------|
| 0 | Canvas scaffold | 1 week | ✅ Complete |
| 1 | Simulation engine | 3–4 weeks | ✅ Complete |
| 2 | Tutorial + Tier 1 levels | 1–2 weeks | ✅ Complete |
| 3 | Auth + persistence | 1 week | ✅ Complete |
| 4 | Polish + chaos + Tier 2 | 2 weeks | ✅ Complete |
| 5 | Social features | 2 weeks | ✅ Complete |
| 6 | Full content (Tiers 3–5) | 2–3 weeks | ✅ Complete |
| 7 | Challenge mode & growth | ongoing | 🔄 In Progress |
| **Total MVP** | **Playable + shareable + 28 levels** | **12–15 weeks solo** | |

With 2 engineers: 7–8 weeks. Split: one owns canvas + levels, one owns sim engine + backend.

---

## Infrastructure Cost Progression

| Stage | MAU | Monthly Cost |
|-------|-----|-------------|
| Development | < 100 | $0 (free tiers) |
| Beta | < 5,000 | $0–$20 (Vercel hobby) |
| Launch | < 50,000 | $45–$70 (Vercel Pro + Supabase Pro) |
| Growth | < 500,000 | $200–$500 |
| Scale | > 500,000 | Re-evaluate DB, add read replicas, CDN for assets |

Simulation is client-side — no compute cost per simulation run at any scale.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Simulation feel wrong / unintuitive | High | Critical | Build Phase 1 first, playtest before building levels. Spend time tuning M/M/1 constants. |
| React Flow performance on large graphs | Medium | Medium | Benchmark at 30+ nodes early. Have Pixi.js migration ready. |
| Level design not educational | Medium | High | Playtest with people unfamiliar with distributed systems. Watch where they get stuck. |
| Scope creep | High | Medium | Phases 0–3 are the minimal viable game. Ship after Phase 3. |
| Web Worker sim too slow | Low | Medium | Profile early. WASM migration path exists if needed. |

---

## Decision Log

| Decision | Rationale | Date |
|----------|-----------|------|
| React Flow over Phaser | React ecosystem, built for node graphs, saves 3 weeks | Design phase |
| Client-side simulation | No server compute cost, instant feedback, works offline | Design phase |
| Flow-based model over discrete event | Simpler to implement and reason about, sufficient fidelity for educational purposes | Design phase |
| Clerk over NextAuth | Better DX, managed OAuth, less setup time | Design phase |
| Supabase over PlanetScale | Single service for DB + auth + storage, generous free tier | Design phase |
