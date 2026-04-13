# Beginner Accessibility Design

**Date**: 2026-04-12
**Scope**: Tutorial (T-0 to T-3) and Tier 1 (1-1 to 1-4) levels only. Tier 2+ unchanged.
**Target player**: Junior developer or CS student with no production systems exposure — can code, but has no intuition for scale, latency, or failure modes.

---

## Problem

Beginners face three distinct knowledge gaps:

1. **Before play**: They don't know what components do, so they can't form a mental model to start designing.
2. **During play**: They can place components but can't interpret what the sim metrics are telling them or why their design is failing.
3. **After failure**: They see red metrics but have no idea what to try next.

---

## Solution: Three Additive Layers

### Layer 1 — Concept Primer (before play)

A modal shown once before each Tutorial and Tier 1 level loads for the first time.

**Structure:**
- **Concept name** — e.g., "Caching"
- **Diagram** — a static before/after SVG showing the problem state (component goes red) vs the solved state (component stays green). Two-column layout.
- **Explanation** — 2–3 sentences in plain English. No unexplained jargon. Example: *"A cache stores the results of recent database lookups. When the same data is requested again, the cache answers instantly — the database never sees the request. This cuts DB load dramatically if the same data is read often."*
- **"Got it, let's play"** button — dismisses and starts the level.

**Re-access:** Shown only on first visit. On subsequent visits, a compact "Concept: Caching (?)" chip appears in the top bar and re-opens the modal.

**Tutorial palette pulsing (T-1 to T-3 only):** After the primer modal closes, the key component for that level pulses with a soft glow in the palette until the player places it once. T-0 has no pulse (observational only). Pulse stops once placed — it's a nudge, not a guide rail.

| Level | Pulsed component |
|-------|-----------------|
| T-1   | Server (additional) |
| T-2   | Cache |
| T-3   | Load Balancer |

---

### Layer 2 — Live Metric Coach (during play)

Applied system-wide to Tutorial and Tier 1. No per-level scripting required.

**Metric annotations (bottom dashboard):**
Hovering any metric card shows a two-part tooltip:
- *What it means*: definition of the metric.
- *What yours means right now*: plain-English comparison of the live value to the SLA target. Dynamic — generated from sim snapshot.

Example: *"p99 latency — 99% of requests completed faster than this. Your target is 100ms. Yours is 847ms — 8× over target. Something in your architecture is backed up."*

**Component callouts (canvas):**
When a component is orange or red during simulation, hovering it shows a callout bubble above the node (not a tooltip — more prominent):
- *What's happening*: describes the saturation using actual live numbers. Example: *"This database is receiving 1,000 requests/sec but can only handle 120/sec. Requests are queuing up."*

Yellow components show a lighter version: *"Busy (67% capacity) but handling load. Watch it during the traffic spike."*

Green components show nothing — no noise on healthy state.

---

### Layer 3 — Failure Debrief (after failure)

A "What went wrong" panel added to the existing fail screen, above the score breakdown.

**Structure:**
1. **Primary diagnosis** — one sentence naming the bottleneck. Example: *"Your database saturated and became the bottleneck."*
2. **Why it happened** — two sentences connecting the architecture decisions to the failure. Example: *"With 1,000 RPS hitting your servers and no cache, every request queried the database directly. Your DB's max throughput is ~120 RPS, so requests queued and errors spiked."*
3. **What to try** — one concrete, non-prescriptive suggestion. Example: *"Consider adding a layer between your servers and the database that can answer repeat reads without hitting the DB."* Deliberately oblique on first/second attempt — players should reason to "cache" themselves.

**Hint tiers:**
- **Tutorial levels (T-0 to T-3)**: authored `failureHints` per level, keyed by failure condition (e.g., `db_saturated`, `latency_exceeded`, `no_redundancy`). The worst-failing metric determines which hint surfaces.
- **Tier 1 levels (1-1 to 1-4)**: algorithmically generated from the most-saturated component + worst-failing SLA dimension, filled into a template.

**Escalating directness:** On the 3rd+ failed attempt at the same level, "What to try" names the component category explicitly (e.g., "a cache") rather than describing it obliquely. Prevents frustration spirals while preserving the learning moment on attempts 1 and 2.

---

## Data Model Changes

Each Tutorial and Tier 1 `Challenge` definition gains optional fields:

```typescript
interface BeginnerMetadata {
  conceptPrimer?: {
    title: string;           // e.g., "Caching"
    explanation: string;     // 2–3 sentence plain-English explanation
    diagramType: DiagramType; // enum — maps to a static SVG asset
  };
  failureHints?: Record<FailureCondition, string>; // Tutorial: authored per level
  guidedPulseComponent?: ComponentType;            // Tutorial only: which palette item to pulse
}
```

`FailureCondition` covers: `db_saturated`, `server_saturated`, `cache_miss_rate_high`, `latency_exceeded`, `error_rate_exceeded`, `no_redundancy`, `queue_overflow`.

`DiagramType` maps to pre-built SVG assets (one per concept): `caching`, `load_balancing`, `redundancy`, `async_queue`, `circuit_breaker`, `sharding`.

---

## Scope Boundaries

**In scope:**
- Tutorial levels T-0 to T-3: Concept Primer + Palette Pulsing + Metric Coach + Failure Debrief (authored hints)
- Tier 1 levels 1-1 to 1-4: Concept Primer + Metric Coach + Failure Debrief (algorithmic hints)

**Out of scope:**
- Tier 2+ levels (untouched)
- Voiced narration or animation
- Adaptive difficulty or level skipping
- Any changes to the scoring system or SLA targets
