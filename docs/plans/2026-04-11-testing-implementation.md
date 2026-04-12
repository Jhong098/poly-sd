# Testing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Vitest unit tests for core sim logic + Playwright E2E smoke tests for the game loop.

**Architecture:** Vitest (with `@/` path alias matching tsconfig) for pure-TS unit tests in `tests/unit/`; Playwright running against `http://localhost:3000` for E2E tests in `tests/e2e/`. No auth bypass needed — `/sandbox` and `/play/T-*` are unprotected by Clerk middleware.

**Tech Stack:** Vitest, @vitest/coverage-v8, @playwright/test, Next.js dev server

---

### Task 1: Install Vitest and configure it

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

**Step 1: Install packages**

```bash
pnpm add -D vitest @vitest/coverage-v8
```

Expected: vitest and coverage plugin added to devDependencies in pnpm-lock.yaml.

**Step 2: Create vitest.config.ts**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/unit/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

**Step 3: Add scripts to package.json**

In the `"scripts"` block, add:
```json
"test:unit": "vitest",
"test:unit:run": "vitest run",
"test:unit:coverage": "vitest run --coverage"
```

**Step 4: Verify the config works**

Create a minimal smoke test at `tests/unit/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { sampleWaypoints } from '@/sim/traffic'

describe('smoke', () => {
  it('resolves @/ alias correctly', () => {
    expect(sampleWaypoints([], 0)).toBe(0)
  })
})
```

Run: `pnpm test:unit:run`
Expected: `1 test passed`

**Step 5: Delete the smoke test file** (tests/unit/smoke.test.ts)

**Step 6: Commit**

```bash
git add vitest.config.ts package.json pnpm-lock.yaml
git commit -m "chore: add Vitest for unit tests"
```

---

### Task 2: Install Playwright and configure it

**Files:**
- Create: `playwright.config.ts`
- Modify: `package.json`

**Step 1: Install Playwright**

```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

Expected: @playwright/test in devDependencies, chromium browser downloaded.

**Step 2: Create playwright.config.ts**

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
```

**Step 3: Add scripts to package.json**

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

**Step 4: Commit**

```bash
git add playwright.config.ts package.json pnpm-lock.yaml
git commit -m "chore: add Playwright for E2E tests"
```

---

### Task 3: Add data-testid attributes for E2E tests

**Files:**
- Modify: `components/canvas/Palette.tsx`
- Modify: `components/canvas/TopBar.tsx`
- Modify: `components/nodes/BaseNode.tsx`
- Modify: `components/overlays/ResultsModal.tsx`
- Modify: `components/panels/MetricsPanel.tsx`

**Step 1: Palette.tsx — add testid to PaletteCard**

In the `<div draggable ...>` element inside `PaletteCard`, add `data-testid={`palette-item-${item.type}`}`:

```tsx
<div
  draggable
  onDragStart={onDragStart}
  data-testid={`palette-item-${item.type}`}
  className="flex items-center gap-3 px-3 py-2.5 ..."
  ...
>
```

**Step 2: TopBar.tsx — add testid to Run button**

Find the Run `<button>` (the `!isActive` branch, ~line 330-337). Add `data-testid="run-button"`:

```tsx
<button
  onClick={startSimulation}
  disabled={!canRun}
  data-testid="run-button"
  className="..."
>
```

Also add `data-testid="sim-status"` to the running indicator span (~line 396):
```tsx
<span className="text-[10px] text-ink-3 uppercase tracking-wider" data-testid="sim-status">
  {isRunning ? 'Running' : isPaused ? 'Paused' : 'Complete'}
</span>
```

**Step 3: BaseNode.tsx — add testid to the outer div**

The outer `<div>` at line 87. Add `data-testid={`node-${data.componentType}`}`:

```tsx
<div
  data-testid={`node-${data.componentType}`}
  className={`
    relative w-52 border border-edge bg-surface
    ...
  `}
  style={{ borderLeftWidth: 2, borderLeftColor: leftBorderColor }}
>
```

**Step 4: ResultsModal.tsx — add testid to the modal root**

Find the outermost container div of the modal return. Add `data-testid="results-modal"` and `data-testid="result-status"` to the pass/fail heading. The modal renders inside a full-screen overlay. Look for the heading that shows "Challenge Passed" or "Challenge Failed" — add `data-testid="result-status"` to it.

Read the full ResultsModal.tsx first to find the exact location (~line 130+). The heading is likely an `<h2>` or `<p>` containing the pass/fail text. Add `data-testid="result-status"` to that element.

**Step 5: MetricsPanel.tsx — add testid to the panel container**

Read MetricsPanel.tsx, find the outermost `<aside>` or `<div>` wrapper, add `data-testid="metrics-panel"`.

Also find the ingress RPS value display and add `data-testid="metric-ingress-rps"` to it.

**Step 6: Commit**

```bash
git add components/canvas/Palette.tsx components/canvas/TopBar.tsx components/nodes/BaseNode.tsx components/overlays/ResultsModal.tsx components/panels/MetricsPanel.tsx
git commit -m "test: add data-testid attributes for E2E tests"
```

---

### Task 4: Unit tests — traffic.ts

**Files:**
- Create: `tests/unit/sim/traffic.test.ts`

**Step 1: Create the test file**

```ts
import { describe, it, expect } from 'vitest'
import { sampleWaypoints, sampleClientPreset } from '@/sim/traffic'

// ── sampleWaypoints ──────────────────────────────────────────────────────────

describe('sampleWaypoints', () => {
  it('returns 0 for empty waypoints', () => {
    expect(sampleWaypoints([], 0)).toBe(0)
    expect(sampleWaypoints([], 30_000)).toBe(0)
  })

  it('returns single waypoint rps regardless of time', () => {
    const wps = [{ timeMs: 5_000, rps: 100 }]
    expect(sampleWaypoints(wps, 0)).toBe(100)
    expect(sampleWaypoints(wps, 50_000)).toBe(100)
  })

  it('clamps to first waypoint when before start', () => {
    const wps = [{ timeMs: 5_000, rps: 100 }, { timeMs: 60_000, rps: 200 }]
    expect(sampleWaypoints(wps, 0)).toBe(100)
    expect(sampleWaypoints(wps, 1_000)).toBe(100)
  })

  it('clamps to last waypoint when after end', () => {
    const wps = [{ timeMs: 0, rps: 100 }, { timeMs: 60_000, rps: 200 }]
    expect(sampleWaypoints(wps, 90_000)).toBe(200)
  })

  it('linearly interpolates at the exact midpoint', () => {
    const wps = [{ timeMs: 0, rps: 100 }, { timeMs: 60_000, rps: 200 }]
    expect(sampleWaypoints(wps, 30_000)).toBeCloseTo(150, 5)
  })

  it('linearly interpolates at 25% through a segment', () => {
    const wps = [{ timeMs: 0, rps: 0 }, { timeMs: 40_000, rps: 400 }]
    expect(sampleWaypoints(wps, 10_000)).toBeCloseTo(100, 5)
  })

  it('handles unsorted waypoints (sorts before interpolating)', () => {
    const wps = [{ timeMs: 60_000, rps: 200 }, { timeMs: 0, rps: 100 }]
    expect(sampleWaypoints(wps, 30_000)).toBeCloseTo(150, 5)
  })

  it('picks the correct segment with three waypoints', () => {
    const wps = [
      { timeMs: 0,      rps: 0 },
      { timeMs: 30_000, rps: 300 },
      { timeMs: 60_000, rps: 0 },
    ]
    expect(sampleWaypoints(wps, 15_000)).toBeCloseTo(150, 5)  // first segment
    expect(sampleWaypoints(wps, 45_000)).toBeCloseTo(150, 5)  // second segment
  })
})

// ── sampleClientPreset ────────────────────────────────────────────────────────

describe('sampleClientPreset', () => {
  const BASE = 100
  const MULT = 5
  const DUR  = 60_000
  const PEAK = BASE * MULT  // 500

  describe('steady', () => {
    it('always returns baseRps at any time', () => {
      expect(sampleClientPreset('steady', BASE, MULT, DUR, 0)).toBe(BASE)
      expect(sampleClientPreset('steady', BASE, MULT, DUR, 30_000)).toBe(BASE)
      expect(sampleClientPreset('steady', BASE, MULT, DUR, DUR)).toBe(BASE)
    })
  })

  describe('spike', () => {
    it('returns baseRps before the spike window (t < 0.38)', () => {
      expect(sampleClientPreset('spike', BASE, MULT, DUR, 0)).toBe(BASE)
      expect(sampleClientPreset('spike', BASE, MULT, DUR, 20_000)).toBe(BASE)
    })

    it('returns baseRps after the spike window (t > 0.62)', () => {
      expect(sampleClientPreset('spike', BASE, MULT, DUR, 59_000)).toBe(BASE)
      expect(sampleClientPreset('spike', BASE, MULT, DUR, DUR)).toBe(BASE)
    })

    it('peaks near baseRps × peakMultiplier at t=0.5 (sin peak)', () => {
      // At t=0.5: spikeT = (0.5 - 0.38) / 0.24 = 0.5, sin(0.5π) = 1
      const val = sampleClientPreset('spike', BASE, MULT, DUR, 30_000)
      expect(val).toBeCloseTo(PEAK, 0)
    })
  })

  describe('ramp', () => {
    it('returns baseRps at t=0', () => {
      expect(sampleClientPreset('ramp', BASE, MULT, DUR, 0)).toBe(BASE)
    })

    it('returns peak at t=1 (full duration)', () => {
      expect(sampleClientPreset('ramp', BASE, MULT, DUR, DUR)).toBe(PEAK)
    })

    it('linearly scales at t=0.5', () => {
      // 100 + (500 - 100) * 0.5 = 300
      expect(sampleClientPreset('ramp', BASE, MULT, DUR, 30_000)).toBeCloseTo(300, 5)
    })
  })
})
```

**Step 2: Run the tests**

```bash
pnpm test:unit:run tests/unit/sim/traffic.test.ts
```

Expected: All tests pass (green).

**Step 3: Commit**

```bash
git add tests/unit/sim/traffic.test.ts
git commit -m "test: unit tests for sim/traffic sampleWaypoints + sampleClientPreset"
```

---

### Task 5: Unit tests — components.ts

**Files:**
- Create: `tests/unit/sim/components.test.ts`

**Step 1: Create the test file**

```ts
import { describe, it, expect } from 'vitest'
import { computeNode } from '@/sim/components'
import type { SimNode } from '@/sim/types'
import type {
  ServerConfig, DatabaseConfig, CacheConfig, LoadBalancerConfig,
  QueueConfig, ApiGatewayConfig, K8sFleetConfig, KafkaConfig,
  CdnConfig, NoSqlConfig, ObjectStorageConfig, ClientConfig,
} from '@/lib/components/definitions'

// ── Factories ────────────────────────────────────────────────────────────────

function node<T>(id: string, componentType: SimNode['componentType'], config: T): SimNode {
  return { id, componentType, config: config as SimNode['config'] }
}

const FAILURE = { id: 'c1', nodeId: 'server-1', type: 'node-failure' as const, startSimMs: 0, durationMs: 10_000, magnitude: 1 }
const LATENCY_SPIKE = { id: 'c2', nodeId: 'server-1', type: 'latency-spike' as const, startSimMs: 0, durationMs: 10_000, magnitude: 3 }
const STATE = { queuedRequests: 0 }

// ── Shared chaos behavior ─────────────────────────────────────────────────────

describe('computeNode — node-failure chaos', () => {
  it('returns errorRate=1 and outputRps=0 for a regular server', () => {
    const n = node<ServerConfig>('server-1', 'server', {
      instanceType: 't3.medium', instanceCount: 1, baseLatencyMs: 20,
    })
    const snap = computeNode(n, 100, STATE, undefined, FAILURE)
    expect(snap.errorRate).toBe(1)
    expect(snap.outputRps).toBe(0)
    expect(snap.status).toBe('failed')
  })

  it('multi-AZ database under node-failure: 2× latency, no errors', () => {
    const n = node<DatabaseConfig>('db-1', 'database', {
      instanceType: 'db.t3.medium', readReplicas: 0, maxConnections: 300, multiAz: true,
    })
    const chaos = { ...FAILURE, nodeId: 'db-1' }
    const normal = computeNode(n, 100, STATE)
    const failSnap = computeNode(n, 100, STATE, undefined, chaos)
    expect(failSnap.latencyMs).toBeGreaterThan(normal.latencyMs)  // ~2× base
    expect(failSnap.errorRate).toBeLessThan(0.01)
    expect(failSnap.status).not.toBe('failed')
  })
})

// ── Server ────────────────────────────────────────────────────────────────────

describe('computeServer', () => {
  // t3.medium: maxRps=200 per instance
  const serverNode = node<ServerConfig>('s1', 'server', {
    instanceType: 't3.medium', instanceCount: 1, baseLatencyMs: 20,
  })

  it('returns idle snapshot at 0 RPS', () => {
    const snap = computeNode(serverNode, 0, STATE)
    expect(snap.status).toBe('idle')
    expect(snap.outputRps).toBe(0)
    expect(snap.latencyMs).toBe(0)
  })

  it('is healthy at low load (rho < 0.5)', () => {
    const snap = computeNode(serverNode, 50, STATE)  // rho = 0.25
    expect(snap.status).toBe('healthy')
    expect(snap.errorRate).toBeLessThan(0.002)
    expect(snap.outputRps).toBeCloseTo(50, 0)
  })

  it('is hot when rho approaches 0.9', () => {
    const snap = computeNode(serverNode, 180, STATE)  // rho = 0.9
    expect(['hot', 'saturated']).toContain(snap.status)
    expect(snap.errorRate).toBeGreaterThan(0.001)
  })

  it('caps outputRps at maxRps when overloaded (rho > 1)', () => {
    const snap = computeNode(serverNode, 300, STATE)  // rho = 1.5
    expect(snap.outputRps).toBeCloseTo(200 * 0.999, 0)
    expect(snap.errorRate).toBeGreaterThan(0.3)  // ~(300-200)/300 + 0.001
  })

  it('instanceCount multiplies capacity', () => {
    const twoInstances = node<ServerConfig>('s2', 'server', {
      instanceType: 't3.medium', instanceCount: 2, baseLatencyMs: 20,
    })
    const snap = computeNode(twoInstances, 300, STATE)  // rho = 0.75 with 2×
    expect(snap.status).toBe('warm')
    expect(snap.errorRate).toBeLessThan(0.005)
  })

  it('latency-spike chaos multiplies latency', () => {
    const normal = computeNode(serverNode, 100, STATE)
    const spiked = computeNode(serverNode, 100, STATE, undefined, LATENCY_SPIKE)
    expect(spiked.latencyMs).toBeGreaterThan(normal.latencyMs * 2)
  })
})

// ── Database ──────────────────────────────────────────────────────────────────

describe('computeDatabase', () => {
  // db.t3.medium: maxConnections=300, maxRps = 300*5 = 1500 (no replicas)
  const dbNode = node<DatabaseConfig>('db1', 'database', {
    instanceType: 'db.t3.medium', readReplicas: 0, maxConnections: 300, multiAz: false,
  })

  it('returns idle snapshot at 0 RPS', () => {
    const snap = computeNode(dbNode, 0, STATE)
    expect(snap.status).toBe('idle')
  })

  it('read replicas scale effective capacity', () => {
    const withReplicas = node<DatabaseConfig>('db2', 'database', {
      instanceType: 'db.t3.medium', readReplicas: 2, maxConnections: 300, multiAz: false,
    })
    // maxRps = 300*5*(1+2) = 4500 vs 1500 without replicas
    const noRepSnap  = computeNode(dbNode, 1200, STATE)
    const repSnap    = computeNode(withReplicas, 1200, STATE)
    expect(repSnap.utilization).toBeLessThan(noRepSnap.utilization)
  })

  it('multiAz doubles costPerHour', () => {
    const multiAz = node<DatabaseConfig>('db3', 'database', {
      instanceType: 'db.t3.medium', readReplicas: 0, maxConnections: 300, multiAz: true,
    })
    const normal = computeNode(dbNode, 0, STATE)
    const az     = computeNode(multiAz, 0, STATE)
    expect(az.costPerHour).toBeCloseTo(normal.costPerHour * 2, 4)
  })
})

// ── Cache ─────────────────────────────────────────────────────────────────────

describe('computeCache', () => {
  it('outputRps = inputRps × (1 − hitRate)', () => {
    const cacheNode = node<CacheConfig>('c1', 'cache', {
      instanceType: 'cache.t3.micro', hitRate: 0.8, ttlSeconds: 300,
    })
    const snap = computeNode(cacheNode, 1000, STATE)
    expect(snap.outputRps).toBeCloseTo(200, 1)  // 1000 * 0.2
  })

  it('passes all traffic when hitRate=0', () => {
    const cacheNode = node<CacheConfig>('c2', 'cache', {
      instanceType: 'cache.t3.micro', hitRate: 0, ttlSeconds: 300,
    })
    const snap = computeNode(cacheNode, 500, STATE)
    expect(snap.outputRps).toBeCloseTo(500, 1)
  })

  it('passes nothing when hitRate=1', () => {
    const cacheNode = node<CacheConfig>('c3', 'cache', {
      instanceType: 'cache.t3.micro', hitRate: 1, ttlSeconds: 300,
    })
    const snap = computeNode(cacheNode, 500, STATE)
    expect(snap.outputRps).toBeCloseTo(0, 1)
  })
})

// ── Queue ─────────────────────────────────────────────────────────────────────

describe('computeQueue', () => {
  const queueNode = node<QueueConfig>('q1', 'queue', {
    processingRatePerSec: 100, maxDepth: 1000,
  })

  it('returns idle snapshot at 0 RPS', () => {
    const snap = computeNode(queueNode, 0, STATE)
    expect(snap.status).toBe('idle')
  })

  it('under capacity: low latency, outputRps ≈ inputRps, errorRate ≈ 0', () => {
    const snap = computeNode(queueNode, 50, STATE)  // rho = 0.5
    expect(snap.errorRate).toBe(0)
    expect(snap.outputRps).toBeCloseTo(50 * 0.9999, 1)
    expect(snap.latencyMs).toBeGreaterThan(0)
  })

  it('over capacity: outputRps caps at processingRate, errorRate > 0', () => {
    const snap = computeNode(queueNode, 200, STATE)  // rho = 2
    expect(snap.outputRps).toBeCloseTo(100 * 0.9999, 1)
    expect(snap.errorRate).toBeGreaterThan(0.3)  // ~(200-100)/200 = 0.5
  })
})

// ── Load Balancer ─────────────────────────────────────────────────────────────

describe('computeLoadBalancer', () => {
  const lbNode = node<LoadBalancerConfig>('lb1', 'load-balancer', {
    algorithm: 'round-robin',
  })

  it('passes traffic through with near-zero overhead', () => {
    const snap = computeNode(lbNode, 500, STATE)
    expect(snap.outputRps).toBeCloseTo(500 * 0.9999, 1)
    expect(snap.latencyMs).toBe(1)
    expect(snap.errorRate).toBe(0.0001)
  })

  it('returns idle at 0 RPS', () => {
    expect(computeNode(lbNode, 0, STATE).status).toBe('idle')
  })
})

// ── API Gateway ───────────────────────────────────────────────────────────────

describe('computeApiGateway', () => {
  const gwNode = node<ApiGatewayConfig>('gw1', 'api-gateway', {
    maxRps: 200, timeoutMs: 5000, circuitBreakerEnabled: false,
  })

  it('rate limits requests above maxRps', () => {
    const snap = computeNode(gwNode, 400, STATE)  // 2× the maxRps
    expect(snap.errorRate).toBeGreaterThan(0.4)   // ~(400-200)/400 = 0.5
    expect(snap.outputRps).toBeCloseTo(200 * 0.9999, 1)
  })

  it('passes traffic at maxRps with minimal errors', () => {
    const snap = computeNode(gwNode, 200, STATE)
    expect(snap.errorRate).toBeCloseTo(0.0001, 4)
  })

  it('circuit breaker open under latency-spike: fast-fail, no downstream forwarding', () => {
    const cbNode = node<ApiGatewayConfig>('gw2', 'api-gateway', {
      maxRps: 200, timeoutMs: 5000, circuitBreakerEnabled: true,
    })
    const chaos = { id: 'ls', nodeId: 'gw2', type: 'latency-spike' as const, startSimMs: 0, durationMs: 10_000, magnitude: 5 }
    const snap = computeNode(cbNode, 100, STATE, undefined, chaos)
    expect(snap.outputRps).toBe(0)        // absorbs requests
    expect(snap.latencyMs).toBe(5)        // fast-fail
    expect(snap.errorRate).toBe(0.02)
  })

  it('circuit breaker disabled under latency-spike: timeout propagation', () => {
    const chaos = { id: 'ls', nodeId: 'gw1', type: 'latency-spike' as const, startSimMs: 0, durationMs: 10_000, magnitude: 5 }
    const snap = computeNode(gwNode, 100, STATE, undefined, chaos)
    expect(snap.latencyMs).toBe(5000)  // == cfg.timeoutMs
    expect(snap.outputRps).toBeGreaterThan(0)  // traffic still forwarded
  })
})

// ── K8s Fleet ─────────────────────────────────────────────────────────────────

describe('computeK8sFleet', () => {
  // t3.medium: maxRps=200/replica
  const k8sNode = node<K8sFleetConfig>('k1', 'k8s-fleet', {
    instanceType: 't3.medium', minReplicas: 1, maxReplicas: 10, targetUtilization: 0.7,
  })

  it('idles at minReplicas when load is 0', () => {
    const snap = computeNode(k8sNode, 0, STATE)
    expect(snap.status).toBe('idle')
    // cost = costPerHour(t3.medium) * minReplicas = 0.0416 * 1
    expect(snap.costPerHour).toBeCloseTo(0.0416, 4)
  })

  it('scales up replicas to handle load', () => {
    // 700 RPS, targetUtil=0.7, perReplica=200 → desired = ceil(700/(200*0.7)) = ceil(5) = 5
    const snap = computeNode(k8sNode, 700, STATE)
    expect(snap.replicaCount).toBe(5)
    expect(snap.costPerHour).toBeCloseTo(0.0416 * 5, 4)
  })

  it('clamps to maxReplicas', () => {
    // 100000 RPS → desired >> maxReplicas=10
    const snap = computeNode(k8sNode, 100_000, STATE)
    expect(snap.replicaCount).toBe(10)
  })

  it('clamps to minReplicas', () => {
    const snap = computeNode(k8sNode, 1, STATE)  // tiny load
    expect(snap.replicaCount).toBeGreaterThanOrEqual(1)
  })
})

// ── Kafka ─────────────────────────────────────────────────────────────────────

describe('computeKafka', () => {
  // 2 partitions, 2 consumer groups → maxRps = 2*10000 = 20000
  const kafkaNode = node<KafkaConfig>('kf1', 'kafka', {
    partitions: 2, consumerGroups: 2, retentionMs: 86_400_000,
  })

  it('fan-out: outputRps = inputRps × consumerGroups when under capacity', () => {
    const snap = computeNode(kafkaNode, 1000, STATE)
    expect(snap.outputRps).toBeCloseTo(1000 * 2 * 0.9999, 1)
  })

  it('errorRate > 0 when over capacity', () => {
    const snap = computeNode(kafkaNode, 25_000, STATE)  // > 20000 maxRps
    expect(snap.errorRate).toBeGreaterThan(0.1)
  })

  it('costPerHour = partitions × KAFKA_COST_PER_PARTITION_HOUR', () => {
    const snap = computeNode(kafkaNode, 1000, STATE)
    expect(snap.costPerHour).toBeCloseTo(2 * 0.010, 4)
  })
})

// ── CDN ───────────────────────────────────────────────────────────────────────

describe('computeCdn', () => {
  const cdnNode = node<CdnConfig>('cdn1', 'cdn', {
    hitRate: 0.9, regions: 3, ttlSeconds: 3600,
  })

  it('outputRps = missRps only (hits absorbed at edge)', () => {
    const snap = computeNode(cdnNode, 1000, STATE)
    expect(snap.outputRps).toBeCloseTo(1000 * 0.1, 1)  // 10% miss
  })

  it('costPerHour = regions × CDN_COST_PER_REGION_HOUR', () => {
    const snap = computeNode(cdnNode, 1000, STATE)
    expect(snap.costPerHour).toBeCloseTo(3 * 0.008, 4)
  })
})

// ── NoSQL ─────────────────────────────────────────────────────────────────────

describe('computeNoSql', () => {
  it('provisioned mode: cost = (rcu + wcu) × globalTables × unit rates', () => {
    const nosqlNode = node<NoSqlConfig>('ns1', 'nosql', {
      capacityMode: 'provisioned', rcuCapacity: 1000, wcuCapacity: 500, globalTables: 1,
    })
    const snap = computeNode(nosqlNode, 0, STATE)
    const expectedCost = (1000 * 0.00013 + 500 * 0.00065) * 1
    expect(snap.costPerHour).toBeCloseTo(expectedCost, 5)
  })

  it('on-demand mode: cost scales with inputRps', () => {
    const nosqlNode = node<NoSqlConfig>('ns2', 'nosql', {
      capacityMode: 'on-demand', rcuCapacity: 0, wcuCapacity: 0, globalTables: 1,
    })
    const snap = computeNode(nosqlNode, 1000, STATE)
    // cost = max(1000 * 0.001, 0.10) = 1.0
    expect(snap.costPerHour).toBeCloseTo(1.0, 2)
  })

  it('throttles when over provisioned capacity', () => {
    const nosqlNode = node<NoSqlConfig>('ns3', 'nosql', {
      capacityMode: 'provisioned', rcuCapacity: 100, wcuCapacity: 50, globalTables: 1,
    })
    // maxRps = 100 + 50 = 150; send 300
    const snap = computeNode(nosqlNode, 300, STATE)
    expect(snap.errorRate).toBeGreaterThan(0.3)
    expect(snap.outputRps).toBeCloseTo(150 * 0.999, 0)
  })
})

// ── Object Storage ────────────────────────────────────────────────────────────

describe('computeObjectStorage', () => {
  it('never saturates — passes all traffic', () => {
    const osNode = node<ObjectStorageConfig>('os1', 'object-storage', {
      storageClass: 'standard', replication: 'none',
    })
    const snap = computeNode(osNode, 50_000, STATE)
    expect(snap.utilization).toBe(0.01)
    expect(snap.status).toBe('healthy')
    expect(snap.outputRps).toBeCloseTo(50_000 * 0.9999, 0)
  })

  it('cross-region replication doubles costPerHour', () => {
    const single = node<ObjectStorageConfig>('os2', 'object-storage', {
      storageClass: 'standard', replication: 'none',
    })
    const crossRegion = node<ObjectStorageConfig>('os3', 'object-storage', {
      storageClass: 'standard', replication: 'cross-region',
    })
    const s1 = computeNode(single, 0, STATE)
    const s2 = computeNode(crossRegion, 0, STATE)
    expect(s2.costPerHour).toBeCloseTo(s1.costPerHour * 2, 4)
  })
})

// ── Client ────────────────────────────────────────────────────────────────────

describe('computeClient', () => {
  const clientNode = node<ClientConfig>('cl1', 'client', {
    rps: 100, preset: 'steady', peakMultiplier: 1,
  })

  it('outputRps = clientRps parameter, not inputRps', () => {
    const snap = computeNode(clientNode, 0, STATE, 250)
    expect(snap.outputRps).toBe(250)
    expect(snap.inputRps).toBe(0)
  })

  it('status is healthy when rps > 0', () => {
    const snap = computeNode(clientNode, 0, STATE, 100)
    expect(snap.status).toBe('healthy')
  })

  it('status is idle when rps = 0', () => {
    const snap = computeNode(clientNode, 0, STATE, 0)
    expect(snap.status).toBe('idle')
  })
})
```

**Step 2: Run the tests**

```bash
pnpm test:unit:run tests/unit/sim/components.test.ts
```

Expected: All tests pass.

**Step 3: Commit**

```bash
git add tests/unit/sim/components.test.ts
git commit -m "test: unit tests for all sim component computations"
```

---

### Task 6: Unit tests — graph.ts

**Files:**
- Create: `tests/unit/sim/graph.test.ts`

**Step 1: Create the test file**

```ts
import { describe, it, expect } from 'vitest'
import { resolveGraph, topologicalSort } from '@/sim/graph'
import type { SimGraph } from '@/sim/types'
import type { ServerConfig, DatabaseConfig, LoadBalancerConfig, ClientConfig } from '@/lib/components/definitions'

// ── Helpers ───────────────────────────────────────────────────────────────────

function edge(id: string, source: string, target: string, splitWeight = 1) {
  return { id, source, target, splitWeight }
}

function serverNode(id: string, maxRps = 200): { id: string; componentType: 'server'; config: ServerConfig } {
  return {
    id,
    componentType: 'server',
    config: { instanceType: 't3.medium', instanceCount: 1, baseLatencyMs: 20 },
  }
}

function clientNode(id: string, rps = 100) {
  return {
    id,
    componentType: 'client' as const,
    config: { rps, preset: 'steady' as const, peakMultiplier: 1 } as ClientConfig,
  }
}

function lbNode(id: string) {
  return {
    id,
    componentType: 'load-balancer' as const,
    config: { algorithm: 'round-robin' as const } as LoadBalancerConfig,
  }
}

const STATE: Record<string, { queuedRequests: number }> = {}
const emptyState = (graph: SimGraph) =>
  Object.fromEntries(graph.nodes.map((n) => [n.id, { queuedRequests: 0 }]))

// ── topologicalSort ───────────────────────────────────────────────────────────

describe('topologicalSort', () => {
  it('orders a linear chain correctly', () => {
    const graph: SimGraph = {
      nodes: [serverNode('C'), serverNode('B'), serverNode('A')],
      edges: [edge('e1', 'A', 'B'), edge('e2', 'B', 'C')],
    }
    const order = topologicalSort(graph)
    expect(order.indexOf('A')).toBeLessThan(order.indexOf('B'))
    expect(order.indexOf('B')).toBeLessThan(order.indexOf('C'))
  })

  it('handles a graph with no edges', () => {
    const graph: SimGraph = {
      nodes: [serverNode('A'), serverNode('B')],
      edges: [],
    }
    const order = topologicalSort(graph)
    expect(order).toHaveLength(2)
    expect(order).toContain('A')
    expect(order).toContain('B')
  })

  it('does not panic on a cycle (appends remaining nodes)', () => {
    // A→B, B→A is a cycle
    const graph: SimGraph = {
      nodes: [serverNode('A'), serverNode('B')],
      edges: [edge('e1', 'A', 'B'), edge('e2', 'B', 'A')],
    }
    const order = topologicalSort(graph)
    expect(order).toHaveLength(2)
  })
})

// ── resolveGraph — basic flow ────────────────────────────────────────────────

describe('resolveGraph — linear chain', () => {
  it('propagates RPS through a chain: server → database', () => {
    const graph: SimGraph = {
      nodes: [serverNode('srv'), serverNode('db')],
      edges: [edge('e1', 'srv', 'db')],
    }
    // 100 RPS global ingress → srv (ingress node, no incoming edges) → db
    const snap = resolveGraph(graph, emptyState(graph), 100, 0)
    const srvSnap = snap.nodes.find((n) => n.id === 'srv')
    const dbSnap  = snap.nodes.find((n) => n.id === 'db')
    expect(srvSnap!.inputRps).toBeCloseTo(100, 0)
    expect(dbSnap!.inputRps).toBeGreaterThan(0)
  })

  it('critical path sums latencies of all nodes', () => {
    const graph: SimGraph = {
      nodes: [serverNode('a'), serverNode('b'), serverNode('c')],
      edges: [edge('e1', 'a', 'b'), edge('e2', 'b', 'c')],
    }
    const snap = resolveGraph(graph, emptyState(graph), 100, 0)
    // Each server adds latency; critical path > single node latency
    expect(snap.systemP99LatencyMs).toBeGreaterThan(0)
    const singleSnap = resolveGraph(
      { nodes: [serverNode('x')], edges: [] },
      { x: { queuedRequests: 0 } },
      100,
      0,
    )
    expect(snap.systemP99LatencyMs).toBeGreaterThan(singleSnap.systemP99LatencyMs)
  })
})

describe('resolveGraph — fan-out with split weights', () => {
  it('distributes RPS equally with equal weights', () => {
    const lb = lbNode('lb')
    const s1 = serverNode('s1')
    const s2 = serverNode('s2')
    const graph: SimGraph = {
      nodes: [lb, s1, s2],
      edges: [edge('e1', 'lb', 's1', 1), edge('e2', 'lb', 's2', 1)],
    }
    const snap = resolveGraph(graph, emptyState(graph), 200, 0)
    const s1Snap = snap.nodes.find((n) => n.id === 's1')
    const s2Snap = snap.nodes.find((n) => n.id === 's2')
    // Each should receive roughly half of LB output
    expect(s1Snap!.inputRps).toBeCloseTo(s2Snap!.inputRps, 0)
  })

  it('distributes proportionally with unequal weights (3:1)', () => {
    const lb = lbNode('lb')
    const s1 = serverNode('s1')
    const s2 = serverNode('s2')
    const graph: SimGraph = {
      nodes: [lb, s1, s2],
      edges: [edge('e1', 'lb', 's1', 3), edge('e2', 'lb', 's2', 1)],
    }
    const snap = resolveGraph(graph, emptyState(graph), 400, 0)
    const s1Snap = snap.nodes.find((n) => n.id === 's1')
    const s2Snap = snap.nodes.find((n) => n.id === 's2')
    expect(s1Snap!.inputRps / s2Snap!.inputRps).toBeCloseTo(3, 0)
  })
})

describe('resolveGraph — health-check rerouting', () => {
  it('LB routes 100% to healthy server when other has node-failure', () => {
    const lb = lbNode('lb')
    const s1 = serverNode('s1')
    const s2 = serverNode('s2')
    const graph: SimGraph = {
      nodes: [lb, s1, s2],
      edges: [edge('e1', 'lb', 's1', 1), edge('e2', 'lb', 's2', 1)],
    }
    const chaosMap = {
      s2: { id: 'c1', nodeId: 's2', type: 'node-failure' as const, startSimMs: 0, durationMs: 10_000, magnitude: 1 },
    }
    const snap = resolveGraph(graph, emptyState(graph), 200, 0, {}, chaosMap)
    const s1Snap = snap.nodes.find((n) => n.id === 's1')
    const s2Snap = snap.nodes.find((n) => n.id === 's2')
    // s2 is failed, all traffic goes to s1
    expect(s2Snap!.inputRps).toBe(0)
    expect(s1Snap!.inputRps).toBeGreaterThan(0)
  })

  it('multi-AZ DB under node-failure still receives traffic', () => {
    const srv = serverNode('srv')
    const db: SimGraph['nodes'][0] = {
      id: 'db',
      componentType: 'database',
      config: { instanceType: 'db.t3.medium', readReplicas: 0, maxConnections: 300, multiAz: true } as DatabaseConfig,
    }
    const graph: SimGraph = {
      nodes: [srv, db],
      edges: [edge('e1', 'srv', 'db')],
    }
    const chaosMap = {
      db: { id: 'c1', nodeId: 'db', type: 'node-failure' as const, startSimMs: 0, durationMs: 10_000, magnitude: 1 },
    }
    const snap = resolveGraph(graph, emptyState(graph), 100, 0, {}, chaosMap)
    const dbSnap = snap.nodes.find((n) => n.id === 'db')
    expect(dbSnap!.inputRps).toBeGreaterThan(0)  // traffic still reaches multi-AZ db
  })
})

describe('resolveGraph — client nodes', () => {
  it('uses client node RPS instead of globalIngressRps', () => {
    const client = clientNode('cl', 500)
    const srv    = serverNode('srv')
    const graph: SimGraph = {
      nodes: [client, srv],
      edges: [edge('e1', 'cl', 'srv')],
    }
    const clientRpsMap = { cl: 500 }
    const snap = resolveGraph(graph, emptyState(graph), 0, 0, clientRpsMap)
    expect(snap.ingressRps).toBe(500)
    const srvSnap = snap.nodes.find((n) => n.id === 'srv')
    expect(srvSnap!.inputRps).toBeGreaterThan(0)
  })
})

describe('resolveGraph — empty graph', () => {
  it('returns empty snapshot without errors', () => {
    const snap = resolveGraph({ nodes: [], edges: [] }, {}, 100, 0)
    expect(snap.nodes).toHaveLength(0)
    expect(snap.edges).toHaveLength(0)
    expect(snap.systemCostPerHour).toBe(0)
  })
})

describe('resolveGraph — system aggregates', () => {
  it('systemCostPerHour sums all node costs', () => {
    const graph: SimGraph = {
      nodes: [serverNode('s1'), serverNode('s2')],
      edges: [],
    }
    const snap = resolveGraph(graph, emptyState(graph), 0, 0)
    // Both are idle: costPerHour = 0.0416 each (t3.medium)
    expect(snap.systemCostPerHour).toBeCloseTo(0.0416 * 2, 4)
  })
})
```

**Step 2: Run the tests**

```bash
pnpm test:unit:run tests/unit/sim/graph.test.ts
```

Expected: All tests pass.

**Step 3: Commit**

```bash
git add tests/unit/sim/graph.test.ts
git commit -m "test: unit tests for resolveGraph, topologicalSort, health-check rerouting"
```

---

### Task 7: Unit tests — evaluator.ts

**Files:**
- Create: `tests/unit/lib/evaluator.test.ts`

**Step 1: Create the test file**

```ts
import { describe, it, expect } from 'vitest'
import { evaluateChallenge } from '@/lib/challenges/evaluator'
import type { SimSnapshot } from '@/sim/types'
import type { Challenge } from '@/lib/challenges/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function snap(
  p99: number,
  errorRate: number,
  costPerHour: number,
  simTimeMs = 0,
): SimSnapshot {
  return {
    simTimeMs,
    ingressRps: 100,
    nodes: [],
    edges: [],
    systemP99LatencyMs: p99,
    systemErrorRate: errorRate,
    systemCostPerHour: costPerHour,
  }
}

const CHALLENGE: Challenge = {
  id: 'test',
  tier: 1,
  order: 0,
  title: 'Test',
  narrative: '',
  objective: '',
  trafficConfig: { durationMs: 60_000, waypoints: [] },
  slaTargets: { p99LatencyMs: 200, errorRate: 0.01 },
  budgetPerHour: 1.0,
  allowedComponents: 'all',
  conceptsTaught: [],
  hints: [],
}

// Create N snapshots all passing SLA
function passingHistory(n: number): SimSnapshot[] {
  return Array.from({ length: n }, (_, i) =>
    snap(100, 0.001, 0.50, i * 200),
  )
}

// Create N snapshots all failing latency SLA
function failingLatencyHistory(n: number): SimSnapshot[] {
  return Array.from({ length: n }, (_, i) =>
    snap(999, 0.001, 0.50, i * 200),
  )
}

// ── Pass / fail ────────────────────────────────────────────────────────────────

describe('evaluateChallenge — pass/fail conditions', () => {
  it('passes when all three SLAs are met', () => {
    const result = evaluateChallenge(CHALLENGE, passingHistory(20), 3)
    expect(result.passed).toBe(true)
    expect(result.passedLatency).toBe(true)
    expect(result.passedErrors).toBe(true)
    expect(result.passedBudget).toBe(true)
  })

  it('fails when p99 latency exceeds SLA', () => {
    const result = evaluateChallenge(CHALLENGE, failingLatencyHistory(20), 3)
    expect(result.passed).toBe(false)
    expect(result.passedLatency).toBe(false)
  })

  it('fails when error rate exceeds SLA', () => {
    const history = Array.from({ length: 20 }, (_, i) => snap(100, 0.05, 0.5, i * 200))
    const result = evaluateChallenge(CHALLENGE, history, 3)
    expect(result.passed).toBe(false)
    expect(result.passedErrors).toBe(false)
  })

  it('fails when cost exceeds budget', () => {
    const history = Array.from({ length: 20 }, (_, i) => snap(100, 0.001, 5.0, i * 200))
    const result = evaluateChallenge(CHALLENGE, history, 3)
    expect(result.passed).toBe(false)
    expect(result.passedBudget).toBe(false)
  })

  it('returns failing result for empty history', () => {
    const result = evaluateChallenge(CHALLENGE, [], 3)
    expect(result.passed).toBe(false)
    expect(result.metrics.errorRate).toBe(1)
  })
})

// ── Warm-up window ────────────────────────────────────────────────────────────

describe('evaluateChallenge — warm-up window', () => {
  it('ignores the first 20% of history (warm-up)', () => {
    // First 20% of history has terrible latency; rest is fine
    const history: SimSnapshot[] = []
    for (let i = 0; i < 10; i++) history.push(snap(9999, 0.001, 0.5, i * 200))  // warm-up failures
    for (let i = 10; i < 50; i++) history.push(snap(100, 0.001, 0.5, i * 200))  // passing

    const result = evaluateChallenge(CHALLENGE, history, 3)
    // 10 bad / 50 total = 20%, so they should be excluded
    expect(result.passed).toBe(true)
  })

  it('uses the full history when fewer than 3 snapshots', () => {
    const history = [snap(9999, 0.001, 0.5, 0)]
    const result = evaluateChallenge(CHALLENGE, history, 3)
    expect(result.passedLatency).toBe(false)
  })
})

// ── Scoring ────────────────────────────────────────────────────────────────────

describe('evaluateChallenge — score breakdown', () => {
  it('performance is near 0 when metrics are at the SLA limit', () => {
    // p99 exactly at limit, errorRate exactly at limit
    const history = Array.from({ length: 20 }, (_, i) =>
      snap(200, 0.01, 0.5, i * 200),
    )
    const result = evaluateChallenge(CHALLENGE, history, 3)
    expect(result.scores.performance).toBeLessThan(10)
  })

  it('performance is high when metrics are well under SLA', () => {
    // p99 = 20 (90% headroom), errorRate = 0.001 (90% headroom)
    const history = Array.from({ length: 20 }, (_, i) =>
      snap(20, 0.001, 0.5, i * 200),
    )
    const result = evaluateChallenge(CHALLENGE, history, 3)
    expect(result.scores.performance).toBeGreaterThan(80)
  })

  it('cost score is near 0 when at budget', () => {
    const history = Array.from({ length: 20 }, (_, i) =>
      snap(100, 0.001, 1.0, i * 200),
    )
    const result = evaluateChallenge(CHALLENGE, history, 3)
    expect(result.scores.cost).toBeLessThan(5)
  })

  it('cost score is 100 when cost is near zero', () => {
    const history = Array.from({ length: 20 }, (_, i) =>
      snap(100, 0.001, 0.0, i * 200),
    )
    const result = evaluateChallenge(CHALLENGE, history, 3)
    expect(result.scores.cost).toBe(100)
  })

  it('simplicity score is 100 with 2 components (minimum useful)', () => {
    const result = evaluateChallenge(CHALLENGE, passingHistory(20), 2)
    expect(result.scores.simplicity).toBe(100)
  })

  it('simplicity score decreases as component count increases', () => {
    const r2  = evaluateChallenge(CHALLENGE, passingHistory(20), 2)
    const r10 = evaluateChallenge(CHALLENGE, passingHistory(20), 10)
    expect(r10.scores.simplicity).toBeLessThan(r2.scores.simplicity)
  })

  it('total score is weighted sum of components (no chaos)', () => {
    const result = evaluateChallenge(CHALLENGE, passingHistory(20), 2)
    // total = performance*0.5 + cost*0.3 + simplicity*0.2 (no chaos)
    const expected = Math.round(
      result.scores.performance * 0.5 +
      result.scores.cost * 0.3 +
      result.scores.simplicity * 0.2,
    )
    expect(result.scores.total).toBe(expected)
  })
})

// ── Resilience ────────────────────────────────────────────────────────────────

describe('evaluateChallenge — resilience score', () => {
  const chaosChallenge: Challenge = {
    ...CHALLENGE,
    chaosSchedule: [
      { id: 'c1', nodeId: 'db', type: 'node-failure', startSimMs: 10_000, durationMs: 5_000, magnitude: 1 },
    ],
  }

  it('resilience is 0 when there is no chaos schedule', () => {
    const result = evaluateChallenge(CHALLENGE, passingHistory(20), 3)
    expect(result.scores.resilience).toBe(0)
  })

  it('resilience is near 100 when errors stay at SLA during chaos window', () => {
    // All snapshots (including chaos window) have errors well within SLA
    const history = Array.from({ length: 50 }, (_, i) =>
      snap(100, 0.001, 0.5, i * 400),
    )
    const result = evaluateChallenge(chaosChallenge, history, 3)
    expect(result.scores.resilience).toBeGreaterThan(80)
  })

  it('resilience is near 0 when errors spike to 1 during chaos window', () => {
    // Snapshots in chaos window have errorRate=1
    const history = Array.from({ length: 50 }, (_, i) => {
      const t = i * 400
      const inChaos = t >= 10_000 && t < 15_000
      return snap(100, inChaos ? 1 : 0.001, 0.5, t)
    })
    const result = evaluateChallenge(chaosChallenge, history, 3)
    expect(result.scores.resilience).toBeLessThan(20)
  })
})
```

**Step 2: Run the tests**

```bash
pnpm test:unit:run tests/unit/lib/evaluator.test.ts
```

Expected: All tests pass.

**Step 3: Commit**

```bash
git add tests/unit/lib/evaluator.test.ts
git commit -m "test: unit tests for evaluateChallenge pass/fail, scoring, and resilience"
```

---

### Task 8: E2E — canvas smoke test

**Files:**
- Create: `tests/e2e/canvas-smoke.spec.ts`

**Context:**
- `/sandbox` is unprotected by Clerk (no auth needed)
- Drag-and-drop works via HTML5 `dataTransfer` events; use `page.evaluate` to dispatch them directly since Playwright can't customize `DataTransfer` natively
- React Flow renders inside `.react-flow__renderer`
- The Run button has `data-testid="run-button"` (added in Task 3)
- Nodes have `data-testid="node-{componentType}"` (added in Task 3)

**Step 1: Create the test file**

```ts
import { test, expect, type Page } from '@playwright/test'

// Dispatches HTML5 drag events directly since PW can't set DataTransfer.setData
async function dropOntoCanvas(page: Page, componentType: string) {
  await page.evaluate((type) => {
    const renderer = document.querySelector('.react-flow__renderer')
    if (!renderer) throw new Error('.react-flow__renderer not found')
    const rect = renderer.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2

    const dt = new DataTransfer()
    dt.setData('componentType', type)

    renderer.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt, clientX: x, clientY: y }))
    renderer.dispatchEvent(new DragEvent('drop',     { bubbles: true, cancelable: true, dataTransfer: dt, clientX: x, clientY: y }))
  }, componentType)
}

test.describe('Canvas smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sandbox')
    // Wait for React Flow to initialise
    await page.waitForSelector('.react-flow__renderer', { timeout: 10_000 })
  })

  test('can drop a Server node onto the canvas', async ({ page }) => {
    await dropOntoCanvas(page, 'server')
    await expect(page.locator('[data-testid="node-server"]')).toBeVisible({ timeout: 5_000 })
  })

  test('run button is enabled after adding a node', async ({ page }) => {
    await dropOntoCanvas(page, 'server')
    await page.waitForSelector('[data-testid="node-server"]')
    const runBtn = page.locator('[data-testid="run-button"]')
    await expect(runBtn).toBeEnabled({ timeout: 3_000 })
  })

  test('simulation runs and completes', async ({ page }) => {
    // Drop a Client then a Server — Client node drives traffic
    await dropOntoCanvas(page, 'server')
    await page.waitForSelector('[data-testid="node-server"]')

    await page.locator('[data-testid="run-button"]').click()

    // Status indicator should show 'Running'
    await expect(page.locator('[data-testid="sim-status"]')).toContainText('Running', { timeout: 5_000 })

    // Wait for completion (default sim is 60s, but 10× speed is available; use a generous timeout)
    await expect(page.locator('[data-testid="sim-status"]')).toContainText('Complete', { timeout: 90_000 })
  })
})
```

**Step 2: Start the dev server and run the test**

In one terminal: `pnpm dev`
In another: `pnpm exec playwright test tests/e2e/canvas-smoke.spec.ts`

Expected: 3 tests pass. (If the sim takes too long on the default 60s duration, note it — the test timeout may need to be raised for the completion test.)

**Step 3: Commit**

```bash
git add tests/e2e/canvas-smoke.spec.ts
git commit -m "test: E2E smoke test for canvas drag-drop and sim run"
```

---

### Task 9: E2E — challenge flow test

**Files:**
- Create: `tests/e2e/challenge-flow.spec.ts`

**Context:**
- `/play/T-0` is the "Hello, Traffic" tutorial challenge (unprotected)
- T-0 has a starter Client node pre-placed, `allowedComponents: ['client', 'server']`
- SLA: p99 < 500ms, errorRate < 5%, budget $1/hr
- Pass solution: a Server node (t3.small, 100 maxRps at 50 RPS = rho 0.5 → ~40ms latency, near-zero errors)
- Fail solution: don't add a server at all (simulation will show error rate = 1 since traffic has nowhere to go)
- ResultsModal has `data-testid="results-modal"` and `data-testid="result-status"`

**Step 1: Create the test file**

```ts
import { test, expect, type Page } from '@playwright/test'

async function dropOntoCanvas(page: Page, componentType: string, offsetX = 0) {
  await page.evaluate(({ type, offsetX }) => {
    const renderer = document.querySelector('.react-flow__renderer')
    if (!renderer) throw new Error('.react-flow__renderer not found')
    const rect = renderer.getBoundingClientRect()
    const x = rect.left + rect.width / 2 + offsetX
    const y = rect.top + rect.height / 2

    const dt = new DataTransfer()
    dt.setData('componentType', type)
    renderer.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt, clientX: x, clientY: y }))
    renderer.dispatchEvent(new DragEvent('drop',     { bubbles: true, cancelable: true, dataTransfer: dt, clientX: x, clientY: y }))
  }, { type: componentType, offsetX })
}

async function runSimAndWaitForResult(page: Page) {
  await page.locator('[data-testid="run-button"]').click()
  await expect(page.locator('[data-testid="results-modal"]')).toBeVisible({ timeout: 90_000 })
}

test.describe('Challenge flow', () => {
  test('passes T-0 with a Server node', async ({ page }) => {
    await page.goto('/play/T-0')
    await page.waitForSelector('.react-flow__renderer', { timeout: 10_000 })

    // T-0 has a starter Client pre-placed; add a Server
    await dropOntoCanvas(page, 'server', 200)
    await page.waitForSelector('[data-testid="node-server"]')

    // Draw connection: this requires clicking the Client handle and dragging to the Server.
    // Simpler: just run — the starter Client is already connected if starterEdges is set,
    // otherwise connect via simulate. Check if starterEdges exist in T-0.
    // T-0 has no starterEdges, so we need to connect manually.
    // Use Playwright to drag from source handle to target handle.
    // React Flow handles have class .react-flow__handle-source / .react-flow__handle-target
    const sourceHandle = page.locator('.react-flow__handle-source').first()
    const targetHandle = page.locator('.react-flow__handle-target').first()
    await sourceHandle.dragTo(targetHandle)

    await runSimAndWaitForResult(page)

    const status = page.locator('[data-testid="result-status"]')
    await expect(status).toContainText('Passed', { timeout: 5_000 })
  })

  test('fails T-0 when no Server is added (traffic goes nowhere)', async ({ page }) => {
    await page.goto('/play/T-0')
    await page.waitForSelector('.react-flow__renderer', { timeout: 10_000 })

    // Only the starter Client is present — no server, no connections
    // The run button needs at least one node. Client is pre-placed so it should be enabled.
    await runSimAndWaitForResult(page)

    const status = page.locator('[data-testid="result-status"]')
    await expect(status).toContainText('Failed', { timeout: 5_000 })
  })
})
```

**Step 2: Run the test**

```bash
pnpm exec playwright test tests/e2e/challenge-flow.spec.ts
```

Expected: 2 tests pass. If the connection drag doesn't work reliably, inspect the source/target handle selectors and adjust — React Flow handle class names may need to be scoped to specific nodes.

**Step 3: Commit**

```bash
git add tests/e2e/challenge-flow.spec.ts
git commit -m "test: E2E challenge flow tests for T-0 pass/fail scenarios"
```

---

### Task 10: E2E — config panel test

**Files:**
- Create: `tests/e2e/config-panel.spec.ts`

**Context:**
- `/sandbox` is unprotected
- Clicking a node calls `setSelectedNodeId(node.id)` → ConfigPanel renders
- ConfigPanel is in the right sidebar (read ConfigPanel.tsx to find its data attributes)
- Server config has `instanceCount` as a `NumberInput` — add `data-testid="config-instanceCount"` to it as part of this task

**Step 1: Add data-testid to ConfigPanel's instanceCount input**

Read `components/panels/ConfigPanel.tsx` to find the Server config section. Find the `<NumberInput>` for `instanceCount` and add `data-testid="config-instanceCount"`:

```tsx
<NumberInput
  data-testid="config-instanceCount"
  value={cfg.instanceCount}
  onChange={(v) => update({ instanceCount: v })}
  min={1}
  max={20}
/>
```

Note: the `NumberInput` component renders an `<input>` element. The `data-testid` needs to be passed through to the `<input>`. Update `NumberInput` to accept and spread `data-testid`:

```tsx
function NumberInput({ value, onChange, min, max, step = 1, 'data-testid': testId }: {
  value: number; onChange: (v: number) => void; min: number; max: number; step?: number
  'data-testid'?: string
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      data-testid={testId}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full bg-surface border border-edge px-2.5 py-1.5 text-[12px] text-ink focus:outline-none focus:border-edge-strong"
    />
  )
}
```

**Step 2: Add data-testid to the ConfigPanel container**

Find the outermost div/aside of ConfigPanel and add `data-testid="config-panel"`.

**Step 3: Create the test file**

```ts
import { test, expect, type Page } from '@playwright/test'

async function dropOntoCanvas(page: Page, componentType: string) {
  await page.evaluate((type) => {
    const renderer = document.querySelector('.react-flow__renderer')
    if (!renderer) throw new Error('.react-flow__renderer not found')
    const rect = renderer.getBoundingClientRect()
    const dt = new DataTransfer()
    dt.setData('componentType', type)
    renderer.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt, clientX: rect.left + 300, clientY: rect.top + 200 }))
    renderer.dispatchEvent(new DragEvent('drop',     { bubbles: true, cancelable: true, dataTransfer: dt, clientX: rect.left + 300, clientY: rect.top + 200 }))
  }, componentType)
}

test.describe('Config panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sandbox')
    await page.waitForSelector('.react-flow__renderer', { timeout: 10_000 })
    await dropOntoCanvas(page, 'server')
    await page.waitForSelector('[data-testid="node-server"]')
  })

  test('config panel opens when a node is clicked', async ({ page }) => {
    await page.locator('[data-testid="node-server"]').click()
    await expect(page.locator('[data-testid="config-panel"]')).toBeVisible({ timeout: 3_000 })
  })

  test('changing instanceCount updates the config panel', async ({ page }) => {
    await page.locator('[data-testid="node-server"]').click()
    await page.waitForSelector('[data-testid="config-instanceCount"]')

    const input = page.locator('[data-testid="config-instanceCount"]')
    await input.fill('3')
    await input.press('Tab')  // blur to trigger onChange

    // Verify the input reflects the new value
    await expect(input).toHaveValue('3')
  })

  test('config persists after clicking away and back', async ({ page }) => {
    await page.locator('[data-testid="node-server"]').click()
    await page.waitForSelector('[data-testid="config-instanceCount"]')

    const input = page.locator('[data-testid="config-instanceCount"]')
    await input.fill('3')
    await input.press('Tab')

    // Click away to deselect
    await page.locator('.react-flow__pane').click()
    await expect(page.locator('[data-testid="config-panel"]')).not.toBeVisible()

    // Click the node again
    await page.locator('[data-testid="node-server"]').click()
    await page.waitForSelector('[data-testid="config-instanceCount"]')

    await expect(page.locator('[data-testid="config-instanceCount"]')).toHaveValue('3')
  })
})
```

**Step 4: Run the tests**

```bash
pnpm exec playwright test tests/e2e/config-panel.spec.ts
```

Expected: 3 tests pass.

**Step 5: Commit**

```bash
git add components/panels/ConfigPanel.tsx tests/e2e/config-panel.spec.ts
git commit -m "test: E2E config panel tests for node selection and config persistence"
```

---

## Final Verification

Run all unit tests:
```bash
pnpm test:unit:run
```
Expected: All tests pass with 0 failures.

Run all E2E tests (requires dev server running):
```bash
pnpm exec playwright test
```
Expected: All 8 E2E tests pass.

---

## File Structure After Implementation

```
tests/
  unit/
    sim/
      traffic.test.ts
      components.test.ts
      graph.test.ts
    lib/
      evaluator.test.ts
  e2e/
    canvas-smoke.spec.ts
    challenge-flow.spec.ts
    config-panel.spec.ts
vitest.config.ts
playwright.config.ts
```
