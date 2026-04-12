# Testing Design — Poly-SD

**Date:** 2026-04-11
**Scope:** Unit tests (Vitest) for core sim logic + E2E smoke tests (Playwright) for the game loop

## Goals

Cover the genuinely complex logic (M/M/1 math, graph resolution, scoring) and validate the full game loop in a real browser. Not aiming for 100% coverage — focusing on the highest-risk areas.

## Setup

### Unit tests — Vitest

Add to `devDependencies`: `vitest`, `@vitest/coverage-v8`.

Config in `vite.config.ts` (or `vitest.config.ts`): enable TypeScript path alias resolution for `@/` imports (mirrors `tsconfig.json`). Test files live in `tests/unit/`.

Run: `pnpm test:unit` (watch), `pnpm test:unit --run` (CI).

### E2E tests — Playwright

Add to `devDependencies`: `@playwright/test`.

Config in `playwright.config.ts`: baseURL = `http://localhost:3000`, webServer block spins up `next dev` automatically before tests run.

Auth bypass: inject Clerk's `__clerk_testing_token` cookie in a global `beforeEach` (or `storageState`) so tests land directly on the canvas without signing in.

Test files live in `tests/e2e/`.

Run: `pnpm test:e2e` (requires dev server or uses webServer config).

---

## Unit Tests

### `tests/unit/sim/components.test.ts`

Tests `computeNode` for all 12 component types.

**Shared cases (all types):**
- Zero input → idle snapshot (outputRps=0, status='idle')
- `node-failure` chaos → errorRate=1, outputRps=0, status='failed'
- Multi-AZ database under `node-failure` → 2× latency, no errors (standby promotion)
- `latency-spike` chaos → latency scaled by magnitude

**Per-component cases:**

| Component | Key cases |
|-----------|-----------|
| Server | rho<0.5 healthy, rho~0.8 error boundary, rho>1 caps outputRps at maxRps |
| Database | read replicas scale capacity, multiAz doubles cost, rho>1 throttle |
| Cache | outputRps = inputRps × (1 − hitRate) |
| LoadBalancer | near-zero overhead pass-through, rho→utilization |
| Queue | rho<1 Little's law wait, rho>1 overflow → dropRate, outputRps caps at processingRate |
| ApiGateway | rate limit enforced (429 drop), CB open on latency-spike → fast-fail 5ms, CB off → timeout propagation |
| K8sFleet | HPA: desiredReplicas clamped to [min,max], cost = actualReplicas × unitCost |
| Kafka | outputRps = inputRps × consumerGroups (fan-out), rho>1 drops |
| CDN | outputRps = missRps only (hits absorbed), cost = regions × rate |
| NoSQL | on-demand vs provisioned modes, globalTables multiplies cost |
| ObjectStorage | never saturates, replication=cross-region → 2× cost |
| Client | outputRps = currentRps, no inputRps |

### `tests/unit/sim/graph.test.ts`

Tests `resolveGraph`, `topologicalSort`, and `computeCriticalPath` (via `resolveGraph`).

| Test | Assertion |
|------|-----------|
| Linear chain A→B→C at 100 RPS | RPS flows through, critical path = sum of latencies |
| Fan-out: LB→[S1,S2] equal weight | each server receives ~50 RPS |
| Fan-out: LB→[S1,S2] weight 3:1 | S1 gets 75%, S2 gets 25% |
| Health-check rerouting: node-failure on S2 | LB routes 100% to S1 |
| Multi-AZ DB under node-failure | traffic still routes through (no rerouting) |
| Empty graph | returns empty snapshot without error |
| Global ingress distribution (no client nodes) | RPS split evenly among ingress nodes |
| Client node mode | client outputRps drives the graph, globalRps ignored |
| Topological sort: linear | returns nodes in dependency order |
| Topological sort: cycle | Kahn's fallback appends remaining nodes, no panic |

### `tests/unit/sim/traffic.test.ts`

Tests `sampleWaypoints` and `sampleClientPreset`.

| Test | Assertion |
|------|-----------|
| Empty waypoints | returns 0 |
| Single waypoint | always returns that RPS regardless of time |
| Before first waypoint | clamped to first value |
| After last waypoint | clamped to last value |
| Midpoint between two waypoints | exact linear interpolation value |
| `steady` preset at any t | always returns baseRps |
| `spike` preset at t=0 | returns baseRps (outside spike window) |
| `spike` preset at t=0.5 | approaches baseRps × peakMultiplier (sin peak) |
| `ramp` preset at t=1.0 | equals baseRps × peakMultiplier |
| `ramp` preset at t=0 | equals baseRps |

### `tests/unit/lib/evaluator.test.ts`

Tests `evaluateChallenge` and `computeResilience`.

| Test | Assertion |
|------|-----------|
| All three SLAs pass | `passed: true` |
| Latency over SLA | `passed: false`, `passedLatency: false` |
| Error rate over SLA | `passed: false`, `passedErrors: false` |
| Budget over limit | `passed: false`, `passedBudget: false` |
| Warm-up excluded | first 20% of history is ignored in aggregates |
| p99 uses 95th percentile | outlier spikes don't fail a mostly-passing run |
| Performance score at SLA limit | score near 0 |
| Performance score with 50% headroom | score near 50 |
| Cost score at budget | score near 0 |
| Cost score at 0 spend | score = 100 |
| Simplicity: 2 components | score = 100 |
| Simplicity: 12 components | score near 0 |
| Resilience: no chaos schedule | returns 0 |
| Resilience: chaos window with full errors | score near 0 |
| Resilience: chaos window with no degradation | score near 100 |
| Empty history | returns failing result |

---

## E2E Tests

All specs live in `tests/e2e/`. Auth is bypassed globally via Clerk test cookie.

### `canvas-smoke.spec.ts`

Core game loop:

1. Navigate to `/sandbox`
2. Drag a Server component from Palette onto canvas → node appears (assert `data-testid` present)
3. Drag a Database node → connect the two with an edge
4. Click Run → assert metrics panel shows non-zero ingressRps
5. Wait for simulation to complete → assert no crash, results are visible

### `challenge-flow.spec.ts`

Win/fail conditions:

1. Navigate to a Tutorial challenge (e.g., `/challenge/hello-world`)
2. Place minimal valid solution (Server + Database) → run sim → assert "Challenge Passed" state
3. Place clearly under-resourced setup (Server only, 1 instance against high RPS) → run sim → assert fail state shown

### `config-panel.spec.ts`

Node configuration wiring:

1. Drop a Server node onto the canvas
2. Click node → ConfigPanel opens
3. Change `instanceCount` to 3
4. Assert node label/subtitle updates
5. Click away and back → assert value persisted

---

## File Structure

```
tests/
  unit/
    sim/
      components.test.ts
      graph.test.ts
      traffic.test.ts
    lib/
      evaluator.test.ts
  e2e/
    canvas-smoke.spec.ts
    challenge-flow.spec.ts
    config-panel.spec.ts
vitest.config.ts
playwright.config.ts
```

## Package.json Scripts

```json
"test:unit": "vitest",
"test:unit:run": "vitest run",
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```
