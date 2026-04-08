# Game Design Document

## Core Concept

Poly-SD is a puzzle-sandbox game where players design distributed systems to meet explicit engineering requirements. The simulation is the judge. You either hit the SLA or you don't.

The game teaches through failure: over-engineer and you blow the budget. Under-provision and you miss latency targets. Put the cache in the wrong place and the database still gets hammered. The satisfaction comes from arriving at an architecture that is both correct and elegant.

---

## The Game Loop

```
Receive challenge → Design architecture → Run simulation → Review results → Iterate
```

1. **Challenge screen**: Shows the problem — traffic shape, required APIs, SLA targets, budget ceiling
2. **Design canvas**: Drag components from palette → drop on canvas → draw connections → configure properties
3. **Simulate**: Click Run. Traffic flows. Metrics update in real time. Components heat up or fail.
4. **Results**: Score breakdown across 4 dimensions. Pass = unlock next level. Fail = see exactly where and why.
5. **Iterate**: Adjust architecture. Re-run. Improve score.

---

## Modes

### Campaign (primary)

Guided sequence of 30+ levels across 5 tiers. Each level introduces one or two new concepts and unlocks new components. Levels must be completed in order within a tier, but tiers can be tackled in any order after unlocking.

### Sandbox

Free-form canvas with all components unlocked and no win condition. Design whatever you want. Useful for experimenting, practicing for interviews, or exploring "what if" scenarios.

### Challenge Mode (post-MVP)

Community-submitted challenges. Time-limited competitive events (e.g., "best cost score on this traffic pattern"). Leaderboard ranked by score.

### Incident Replay (post-MVP)

Recreate real historical outages (e.g., AWS us-east-1 2021, Fastly 2021). Understand what failed and design a system resilient to the same failure mode.

---

## The Canvas

The primary workspace. A zoomable, pannable infinite canvas (React Flow).

**Left panel**: Component palette, organized by category. Components unlock progressively.

**Canvas**: Nodes connected by directed edges. Edges represent request/data flow paths. Multiple edges from one node = traffic split (configurable ratio).

**Right panel**: Selected component's configuration. Properties vary by component type.

**Top bar**: Challenge requirements always visible. Simulation controls (Run, Pause, Speed 1x/5x/10x). Current sim time.

**Bottom panel**: Real-time metrics dashboard. Appears during and after simulation.

### Canvas interactions

- **Drag from palette** → drops component on canvas
- **Click node** → opens config panel
- **Drag node edge handle → another node** → creates directed connection
- **Click edge** → configure traffic split ratio, protocol, timeout
- **Right-click node** → inject fault (during simulation)
- **Middle-click drag** → pan
- **Scroll** → zoom

---

## Simulation Controls

| Control | Behavior |
|---------|----------|
| Run | Start simulation from t=0 |
| Pause | Freeze sim, keep metrics |
| Resume | Continue from pause |
| Speed: 1x/5x/10x | Compress real time (1 sim hour = 60s/12s/6s) |
| Chaos toggle | Enable/disable random fault injection |
| Traffic editor | Open traffic shape editor |

### Traffic Shape Editor

A curve editor where players define the RPS over simulation time. Presets:
- **Steady**: flat line
- **Day/Night**: sinusoidal 24h pattern
- **Flash Sale**: flat then spike then flat
- **Ramp**: linear growth to 10x
- **Custom**: free-draw

Each challenge comes with a fixed traffic shape. Sandbox mode lets you define your own.

---

## Scoring System

Four dimensions, each scored 0-100. Total score = weighted average.

| Dimension | Weight | What it measures |
|-----------|--------|-----------------|
| **Performance** | 35% | p99 latency vs target, error rate vs budget |
| **Resilience** | 30% | Behavior during chaos events. Does it degrade gracefully or fail catastrophically? |
| **Cost** | 20% | $/hr of your architecture vs minimum possible for the challenge |
| **Simplicity** | 15% | Component count penalty. Encourages elegant solutions. |

### Performance score detail

```
latency_score = clamp(1 - (actual_p99 / target_p99), 0, 1)
error_score   = clamp(1 - (actual_error_rate / target_error_rate), 0, 1)
performance   = 0.7 * latency_score + 0.3 * error_score
```

### Resilience score detail

Resilience is measured during chaos events that run automatically in the last 20% of the simulation. Events include:
- AZ failure (one node goes down)
- Sudden 5x traffic spike
- Cache flush (cold start)
- Network partition between two components

Score based on: did the system remain functional? How quickly did it recover? Did any data loss occur?

### Cost score detail

```
cost_score = min_possible_cost / your_cost
```
`min_possible_cost` is the lowest-cost passing solution (computed offline). If you match it, score = 100.

### Simplicity score detail

```
simplicity_score = 1 - clamp((your_components - min_components) / 10, 0, 1)
```
Penalizes over-engineering but only after the threshold.

---

## Architect Levels (meta-progression)

Players accumulate XP from completed challenges and score improvements.

| Level | XP Required | Unlocks |
|-------|-------------|---------|
| Junior Engineer | 0 | Campaign Tiers 1-2 |
| Senior Engineer | 500 | Campaign Tiers 3-4, Sandbox mode |
| Staff Engineer | 1500 | Campaign Tier 5, Challenge mode |
| Principal Engineer | 3500 | Incident Replays, all components |
| Distinguished | 7000 | Design sharing, custom challenge creation |

---

## Failure Modes & Visual Language

The simulation communicates state through visual language so players understand what's wrong without reading numbers.

| State | Visual |
|-------|--------|
| Component healthy | Neutral border, normal icon |
| Component warm (>50% capacity) | Yellow glow |
| Component hot (>80% capacity) | Orange glow, pulsing |
| Component saturated (>95%) | Red glow, queue depth badge |
| Component failed | Darkened, X overlay, stopped packet emission |
| Edge healthy | Blue animated packets |
| Edge slow | Yellow packets, slower animation |
| Edge dropping packets | Red packets, some disappear mid-edge |
| Edge at capacity | Thick red edge, backed-up queue indicator |

---

## Onboarding

### Tutorial sequence (forced, skippable after completion)

1. **"Hello, world"**: Single server. A client sends requests. Watch it work. Now watch it fail under load. Add a second server.
2. **"The cold database"**: Two servers, shared DB. DB saturates. Add a cache. Watch DB load drop.
3. **"Scaling out"**: Traffic doubles. Add a load balancer. Configure replica count. Hit the target.
4. **"Your first outage"**: Chaos event kills one node. Add health checks. Add redundancy. Graduate.

Tutorial uses guided callouts and locked palette (only relevant components available).

---

## Share & Community

### Replay sharing

After completing a challenge, generate a shareable link that encodes:
- Your architecture (component graph JSON)
- Simulation result snapshot
- Score breakdown

Shared replays are viewable (read-only canvas + replay of sim metrics) by anyone.

### Solution comparison

After passing a level: "See how others solved it." Shows an overlay of top solutions by dimension (fastest, cheapest, most resilient, simplest). Each solution is viewable as a replay.

### Architecture export

Export your architecture as:
- A PNG diagram (for presentations/interviews)
- A JSON definition (for import back into sandbox)
- A "system design brief" — auto-generated text description of your architecture
