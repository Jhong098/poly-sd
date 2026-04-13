# Beginner Accessibility Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add concept primers, live metric annotations, and failure debriefs to Tutorial (T-0 to T-3) and Tier 1 (1-1 to 1-4) levels so players new to distributed systems can understand what's happening before, during, and after a failed sim run.

**Architecture:** Three additive layers on top of the existing game: (1) a ConceptPrimerModal that fires once per level before play, (2) hover tooltips on MetricsPanel cards and saturated canvas nodes during sim, (3) a FailureDebrief panel inside the existing ResultsModal when a sim fails. Palette pulsing is added to Tutorial levels only. All new content is driven by optional fields on the existing `Challenge` type — Tier 2+ challenges stay unchanged.

**Tech Stack:** Next.js 14, TypeScript, Tailwind, Zustand (challengeStore, simStore, architectureStore), Vitest for unit tests in `tests/unit/`.

---

### Task 1: Extend Challenge type and add attempt tracking to challengeStore

**Files:**
- Modify: `lib/challenges/types.ts`
- Modify: `lib/store/challengeStore.ts`

**Step 1: Add BeginnerMetadata fields to the Challenge type**

In `lib/challenges/types.ts`, add after the existing `Challenge` type definition:

```typescript
export type DiagramType = 'scaling' | 'caching' | 'load-balancing' | 'async-queue' | 'redundancy' | 'budget'

export type FailureCondition =
  | 'db_saturated'
  | 'server_saturated'
  | 'cache_miss_rate_high'
  | 'latency_exceeded'
  | 'error_rate_exceeded'
  | 'budget_exceeded'
  | 'no_redundancy'
  | 'queue_overflow'
```

Then add these optional fields inside the `Challenge` type:

```typescript
  conceptPrimer?: {
    title: string
    explanation: string   // 2–3 plain-English sentences
    diagramType: DiagramType
  }
  failureHints?: Partial<Record<FailureCondition, string>>  // authored per level (Tutorial only)
  guidedPulseComponent?: ComponentType                       // Tutorial only — which palette item to pulse
```

**Step 2: Add failedAttempts tracking to challengeStore**

In `lib/store/challengeStore.ts`, add to the state type and implementation:

```typescript
type ChallengeState = {
  activeChallenge: Challenge | null
  evalResult: EvalResult | null
  failedAttempts: Record<string, number>   // keyed by challenge id

  setActiveChallenge: (challenge: Challenge | null) => void
  setEvalResult: (result: EvalResult | null) => void
  clearChallenge: () => void
  recordFailedAttempt: (challengeId: string) => void
  resetFailedAttempts: (challengeId: string) => void
}
```

Implementation additions:

```typescript
  failedAttempts: {},

  recordFailedAttempt: (challengeId) =>
    set((s) => ({
      failedAttempts: {
        ...s.failedAttempts,
        [challengeId]: (s.failedAttempts[challengeId] ?? 0) + 1,
      },
    })),

  resetFailedAttempts: (challengeId) =>
    set((s) => ({
      failedAttempts: { ...s.failedAttempts, [challengeId]: 0 },
    })),
```

**Step 3: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: no errors

**Step 4: Commit**

```bash
git add lib/challenges/types.ts lib/store/challengeStore.ts
git commit -m "feat: extend Challenge type with beginner metadata and add attempt tracking"
```

---

### Task 2: Build generateFailureDiagnosis pure function with tests

**Files:**
- Create: `lib/challenges/failureDebrief.ts`
- Create: `tests/unit/failureDebrief.test.ts`

**Step 1: Write the failing tests**

Create `tests/unit/failureDebrief.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { generateFailureDiagnosis } from '@/lib/challenges/failureDebrief'
import type { EvalResult } from '@/lib/challenges/types'
import type { SimSnapshot } from '@/sim/types'

const baseResult: EvalResult = {
  passed: false,
  passedLatency: false,
  passedErrors: true,
  passedBudget: true,
  scores: { performance: 10, cost: 80, simplicity: 90, resilience: 0, total: 40 },
  metrics: { p99LatencyMs: 850, errorRate: 0.001, costPerHour: 0.1, componentCount: 2 },
}

const dbSaturatedSnapshot: SimSnapshot = {
  simTimeMs: 30000,
  ingressRps: 1000,
  nodes: [
    { id: 'server-1', inputRps: 1000, outputRps: 800, utilization: 0.6, latencyMs: 20, errorRate: 0, costPerHour: 0.05, status: 'warm' },
    { id: 'db-1',     inputRps: 1000, outputRps: 120, utilization: 0.98, latencyMs: 400, errorRate: 0.2, costPerHour: 0.05, status: 'saturated' },
  ],
  edges: [],
  systemP99LatencyMs: 850,
  systemErrorRate: 0.18,
  systemCostPerHour: 0.1,
}

const nodes = [
  { id: 'server-1', componentType: 'server' as const, label: 'App Server' },
  { id: 'db-1',     componentType: 'database' as const, label: 'Database' },
]

const challenge = {
  id: '1-1',
  tier: 1 as const,
  order: 1,
  title: 'Read-Heavy Blog',
  narrative: '',
  objective: '',
  trafficConfig: { durationMs: 60000, waypoints: [] },
  slaTargets: { p99LatencyMs: 100, errorRate: 0.001 },
  budgetPerHour: 0.5,
  allowedComponents: 'all' as const,
  conceptsTaught: [],
  hints: [],
}

describe('generateFailureDiagnosis', () => {
  it('identifies saturated database as bottleneck', () => {
    const diag = generateFailureDiagnosis(baseResult, [dbSaturatedSnapshot], challenge, nodes, 1)
    expect(diag.bottleneck).toContain('database')
    expect(diag.why).toContain('1,000')
    expect(diag.whatToTry).toBeTruthy()
  })

  it('escalates hint on 3rd+ attempt', () => {
    const first  = generateFailureDiagnosis(baseResult, [dbSaturatedSnapshot], challenge, nodes, 1)
    const third  = generateFailureDiagnosis(baseResult, [dbSaturatedSnapshot], challenge, nodes, 3)
    // third attempt should name the component category explicitly
    expect(third.whatToTry.toLowerCase()).toMatch(/cache|replac/)
    // first attempt should be oblique
    expect(first.whatToTry).not.toEqual(third.whatToTry)
  })

  it('uses authored failureHints for Tutorial levels', () => {
    const tutorialChallenge = {
      ...challenge,
      id: 'T-1',
      tier: 0 as const,
      failureHints: { db_saturated: 'Your server is at capacity. Try upgrading the instance type.' },
    }
    const diag = generateFailureDiagnosis(baseResult, [dbSaturatedSnapshot], tutorialChallenge, nodes, 1)
    expect(diag.whatToTry).toBe('Your server is at capacity. Try upgrading the instance type.')
  })

  it('returns a diagnosis even with empty history', () => {
    const diag = generateFailureDiagnosis(baseResult, [], challenge, nodes, 1)
    expect(diag.bottleneck).toBeTruthy()
    expect(diag.why).toBeTruthy()
    expect(diag.whatToTry).toBeTruthy()
  })
})
```

**Step 2: Run tests to confirm they fail**

Run: `pnpm test:unit:run`
Expected: FAIL — cannot find module `@/lib/challenges/failureDebrief`

**Step 3: Implement generateFailureDiagnosis**

Create `lib/challenges/failureDebrief.ts`:

```typescript
import type { EvalResult, Challenge, FailureCondition } from './types'
import type { SimSnapshot } from '@/sim/types'
import type { ComponentType } from '@/lib/components/definitions'

export type DiagnosisResult = {
  bottleneck: string   // "Your database saturated and became the bottleneck."
  why: string          // 2 sentences connecting architecture to failure
  whatToTry: string    // actionable suggestion, oblique on early attempts
}

type NodeInfo = { id: string; componentType: ComponentType; label: string }

const COMPONENT_NAMES: Partial<Record<ComponentType, string>> = {
  server:         'server',
  database:       'database',
  cache:          'cache',
  'load-balancer':'load balancer',
  queue:          'queue',
  'api-gateway':  'API gateway',
  'k8s-fleet':    'auto-scaling fleet',
  kafka:          'Kafka cluster',
  cdn:            'CDN',
  nosql:          'NoSQL database',
}

const OBLIQUE_SUGGESTIONS: Partial<Record<ComponentType, string>> = {
  database: 'Consider adding a layer between your servers and the database that can answer repeat reads without querying it every time.',
  server:   'Consider increasing the capacity available to handle incoming requests — either by upgrading the existing instance or spreading load across multiple instances.',
  cache:    'Your cache is not absorbing enough reads. Consider tuning the hit rate or reviewing what data you are caching.',
  queue:    'The queue depth is growing faster than consumers can drain it. Consider adding more consumer capacity.',
}

const DIRECT_SUGGESTIONS: Partial<Record<ComponentType, string>> = {
  database: 'Add a cache (like Redis) between your servers and the database. A high cache hit rate will dramatically reduce database load.',
  server:   'Upgrade the server instance type (e.g., t3.small → t3.medium) or add a second server and balance traffic between them.',
  cache:    'Add more cache nodes, or check that your cache hit rate configuration is set above 70%.',
  queue:    'Add more consumer workers downstream of the queue to drain it faster.',
}

/** Find the most-saturated node across all snapshots in the window. */
function findBottleneckNodeId(history: SimSnapshot[]): string | null {
  if (history.length === 0) return null
  const recent = history.slice(-10)
  const utilByNode: Record<string, number> = {}
  for (const snap of recent) {
    for (const n of snap.nodes) {
      utilByNode[n.id] = Math.max(utilByNode[n.id] ?? 0, n.utilization)
    }
  }
  let maxId: string | null = null
  let maxUtil = 0
  for (const [id, util] of Object.entries(utilByNode)) {
    if (util > maxUtil) { maxUtil = util; maxId = id }
  }
  return maxId
}

/** Primary failure condition for Tutorial authored hint lookup. */
function primaryCondition(result: EvalResult, bottleneckType: ComponentType | null): FailureCondition {
  if (!result.passedBudget) return 'budget_exceeded'
  if (bottleneckType === 'database') return 'db_saturated'
  if (bottleneckType === 'server')   return 'server_saturated'
  if (bottleneckType === 'cache')    return 'cache_miss_rate_high'
  if (bottleneckType === 'queue')    return 'queue_overflow'
  if (!result.passedErrors)          return 'error_rate_exceeded'
  return 'latency_exceeded'
}

export function generateFailureDiagnosis(
  result: EvalResult,
  history: SimSnapshot[],
  challenge: Challenge,
  nodes: NodeInfo[],
  attemptCount: number,  // 1 = first fail, 3+ = escalate
): DiagnosisResult {
  const bottleneckId = findBottleneckNodeId(history)
  const bottleneckNode = bottleneckId ? nodes.find((n) => n.id === bottleneckId) : null
  const bottleneckType = bottleneckNode?.componentType ?? null
  const componentName = bottleneckType ? (COMPONENT_NAMES[bottleneckType] ?? bottleneckType) : 'component'

  const recentSnap = history[history.length - 1]
  const bottleneckSnap = recentSnap?.nodes.find((n) => n.id === bottleneckId)
  const inputRps  = bottleneckSnap ? Math.round(bottleneckSnap.inputRps) : null
  const outputRps = bottleneckSnap ? Math.round(bottleneckSnap.outputRps) : null

  // Bottleneck sentence
  const bottleneck = bottleneckType
    ? `Your ${componentName} saturated and became the bottleneck.`
    : `Your architecture could not meet the SLA targets.`

  // Why it happened
  let why: string
  if (!result.passedBudget) {
    why = `Your architecture costs $${result.metrics.costPerHour.toFixed(3)}/hr, which exceeds the $${challenge.budgetPerHour.toFixed(2)}/hr budget. Over-provisioned instances or too many components are the likely cause.`
  } else if (bottleneckType && inputRps !== null && outputRps !== null) {
    why = `Your ${componentName} was receiving ${inputRps.toLocaleString()} RPS but could only process ${outputRps.toLocaleString()} RPS. Excess requests queued up, driving p99 latency to ${Math.round(result.metrics.p99LatencyMs)}ms against a ${challenge.slaTargets.p99LatencyMs}ms target.`
  } else {
    why = `The system p99 latency reached ${Math.round(result.metrics.p99LatencyMs)}ms, ${Math.round(result.metrics.p99LatencyMs / challenge.slaTargets.p99LatencyMs)}× over the ${challenge.slaTargets.p99LatencyMs}ms target.`
  }

  // What to try — authored for Tutorial, algorithmic for Tier 1
  let whatToTry: string
  const condition = primaryCondition(result, bottleneckType)

  if (challenge.tier === 0 && challenge.failureHints?.[condition]) {
    // Use authored hint for Tutorial levels
    whatToTry = challenge.failureHints[condition]!
  } else if (attemptCount >= 3 && bottleneckType) {
    // Escalate on 3rd+ attempt for Tier 1
    whatToTry = DIRECT_SUGGESTIONS[bottleneckType]
      ?? `Add more capacity for your ${componentName}.`
  } else if (bottleneckType) {
    whatToTry = OBLIQUE_SUGGESTIONS[bottleneckType]
      ?? `Look at the component with the highest utilization and consider how to reduce the load it receives or increase its throughput.`
  } else {
    whatToTry = `Check which metric is failing furthest from target. That metric points to the bottleneck. Address it first.`
  }

  return { bottleneck, why, whatToTry }
}
```

**Step 4: Run tests and verify they pass**

Run: `pnpm test:unit:run`
Expected: PASS — 4 tests passing

**Step 5: Commit**

```bash
git add lib/challenges/failureDebrief.ts tests/unit/failureDebrief.test.ts
git commit -m "feat: add generateFailureDiagnosis with unit tests"
```

---

### Task 3: Build ConceptPrimerModal component

**Files:**
- Create: `components/overlays/ConceptPrimerModal.tsx`

The modal shows once per challenge (tracked via `localStorage`). If the challenge has no `conceptPrimer`, it renders nothing. Inline SVG diagrams are embedded directly — no asset files needed.

**Step 1: Create the component**

Create `components/overlays/ConceptPrimerModal.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { X, BookOpen } from 'lucide-react'
import type { Challenge, DiagramType } from '@/lib/challenges/types'

// ── Inline diagrams ───────────────────────────────────────────────────────────

function DiagramScaling() {
  return (
    <svg viewBox="0 0 220 80" className="w-full h-auto" aria-hidden="true">
      {/* Before: one server, red */}
      <rect x="10" y="20" width="50" height="40" rx="3" fill="none" stroke="var(--color-err)" strokeWidth="1.5" />
      <text x="35" y="44" textAnchor="middle" fontSize="9" fill="var(--color-err)">SERVER</text>
      <text x="35" y="55" textAnchor="middle" fontSize="7" fill="var(--color-ink-3)">SATURATED</text>
      <text x="35" y="14" textAnchor="middle" fontSize="7" fill="var(--color-ink-3)">BEFORE</text>
      {/* Arrow */}
      <line x1="80" y1="40" x2="110" y2="40" stroke="var(--color-edge-strong)" strokeWidth="1" markerEnd="url(#arrow)" />
      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="var(--color-edge-strong)" />
        </marker>
      </defs>
      {/* After: two servers, green */}
      <rect x="120" y="10" width="45" height="28" rx="3" fill="none" stroke="var(--color-ok)" strokeWidth="1.5" />
      <text x="142" y="28" textAnchor="middle" fontSize="8" fill="var(--color-ok)">SERVER</text>
      <rect x="120" y="46" width="45" height="28" rx="3" fill="none" stroke="var(--color-ok)" strokeWidth="1.5" />
      <text x="142" y="64" textAnchor="middle" fontSize="8" fill="var(--color-ok)">SERVER</text>
      <text x="142" y="7" textAnchor="middle" fontSize="7" fill="var(--color-ink-3)">AFTER</text>
    </svg>
  )
}

function DiagramCaching() {
  return (
    <svg viewBox="0 0 240 80" className="w-full h-auto" aria-hidden="true">
      {/* Before */}
      <text x="55" y="8" textAnchor="middle" fontSize="7" fill="var(--color-ink-3)">WITHOUT CACHE</text>
      <rect x="10" y="14" width="40" height="24" rx="2" fill="none" stroke="var(--color-cyan)" strokeWidth="1.5" />
      <text x="30" y="30" textAnchor="middle" fontSize="7" fill="var(--color-cyan)">SERVER</text>
      <line x1="50" y1="26" x2="68" y2="26" stroke="var(--color-edge-strong)" strokeWidth="1" />
      <rect x="68" y="14" width="40" height="24" rx="2" fill="none" stroke="var(--color-err)" strokeWidth="1.5" />
      <text x="88" y="27" textAnchor="middle" fontSize="7" fill="var(--color-err)">DATABASE</text>
      <text x="88" y="36" textAnchor="middle" fontSize="6" fill="var(--color-err)">100% load</text>
      {/* Divider */}
      <line x1="120" y1="4" x2="120" y2="76" stroke="var(--color-edge)" strokeWidth="0.5" strokeDasharray="3,3" />
      {/* After */}
      <text x="180" y="8" textAnchor="middle" fontSize="7" fill="var(--color-ink-3)">WITH CACHE</text>
      <rect x="130" y="14" width="40" height="24" rx="2" fill="none" stroke="var(--color-cyan)" strokeWidth="1.5" />
      <text x="150" y="30" textAnchor="middle" fontSize="7" fill="var(--color-cyan)">SERVER</text>
      <line x1="170" y1="26" x2="188" y2="26" stroke="var(--color-edge-strong)" strokeWidth="1" />
      <rect x="188" y="14" width="40" height="24" rx="2" fill="none" stroke="var(--color-node-cache)" strokeWidth="1.5" />
      <text x="208" y="27" textAnchor="middle" fontSize="7" fill="var(--color-node-cache)">CACHE</text>
      <text x="208" y="36" textAnchor="middle" fontSize="6" fill="var(--color-ok)">80% hits</text>
      <line x1="208" y1="38" x2="208" y2="54" stroke="var(--color-edge-strong)" strokeWidth="1" strokeDasharray="2,2" />
      <rect x="188" y="54" width="40" height="20" rx="2" fill="none" stroke="var(--color-ok)" strokeWidth="1.5" />
      <text x="208" y="67" textAnchor="middle" fontSize="7" fill="var(--color-ok)">DB: 20%</text>
    </svg>
  )
}

function DiagramLoadBalancing() {
  return (
    <svg viewBox="0 0 220 80" className="w-full h-auto" aria-hidden="true">
      <text x="110" y="8" textAnchor="middle" fontSize="7" fill="var(--color-ink-3)">LOAD BALANCER DISTRIBUTES TRAFFIC</text>
      <rect x="10" y="20" width="35" height="22" rx="2" fill="none" stroke="var(--color-cyan)" strokeWidth="1.5" />
      <text x="27" y="34" textAnchor="middle" fontSize="7" fill="var(--color-cyan)">CLIENT</text>
      <line x1="45" y1="31" x2="65" y2="31" stroke="var(--color-edge-strong)" strokeWidth="1" />
      <rect x="65" y="20" width="35" height="22" rx="2" fill="none" stroke="var(--color-node-lb)" strokeWidth="1.5" />
      <text x="82" y="34" textAnchor="middle" fontSize="7" fill="var(--color-node-lb)">LB</text>
      <line x1="100" y1="31" x2="120" y2="20" stroke="var(--color-edge-strong)" strokeWidth="1" />
      <line x1="100" y1="31" x2="120" y2="42" stroke="var(--color-edge-strong)" strokeWidth="1" />
      <rect x="120" y="10" width="40" height="20" rx="2" fill="none" stroke="var(--color-ok)" strokeWidth="1.5" />
      <text x="140" y="23" textAnchor="middle" fontSize="7" fill="var(--color-ok)">SERVER A</text>
      <rect x="120" y="38" width="40" height="20" rx="2" fill="none" stroke="var(--color-ok)" strokeWidth="1.5" />
      <text x="140" y="51" textAnchor="middle" fontSize="7" fill="var(--color-ok)">SERVER B</text>
    </svg>
  )
}

function DiagramRedundancy() {
  return (
    <svg viewBox="0 0 240 80" className="w-full h-auto" aria-hidden="true">
      <text x="55" y="8" textAnchor="middle" fontSize="7" fill="var(--color-ink-3)">SINGLE POINT</text>
      <rect x="30" y="14" width="50" height="22" rx="2" fill="none" stroke="var(--color-err)" strokeWidth="1.5" />
      <text x="55" y="28" textAnchor="middle" fontSize="7" fill="var(--color-err)">SERVER</text>
      <text x="55" y="50" textAnchor="middle" fontSize="7" fill="var(--color-err)">⚠ DOWN = OUTAGE</text>
      <line x1="120" y1="4" x2="120" y2="76" stroke="var(--color-edge)" strokeWidth="0.5" strokeDasharray="3,3" />
      <text x="180" y="8" textAnchor="middle" fontSize="7" fill="var(--color-ink-3)">REDUNDANT</text>
      <rect x="155" y="12" width="50" height="20" rx="2" fill="none" stroke="var(--color-ok)" strokeWidth="1.5" />
      <text x="180" y="25" textAnchor="middle" fontSize="7" fill="var(--color-ok)">SERVER A ✓</text>
      <rect x="155" y="42" width="50" height="20" rx="2" fill="none" stroke="var(--color-err)" strokeWidth="1.5" />
      <text x="180" y="55" textAnchor="middle" fontSize="7" fill="var(--color-err)">SERVER B ✗</text>
      <text x="180" y="72" textAnchor="middle" fontSize="7" fill="var(--color-ok)">A handles all traffic</text>
    </svg>
  )
}

function DiagramAsyncQueue() {
  return (
    <svg viewBox="0 0 240 80" className="w-full h-auto" aria-hidden="true">
      <rect x="10" y="26" width="40" height="22" rx="2" fill="none" stroke="var(--color-cyan)" strokeWidth="1.5" />
      <text x="30" y="40" textAnchor="middle" fontSize="7" fill="var(--color-cyan)">API</text>
      <line x1="50" y1="37" x2="70" y2="37" stroke="var(--color-edge-strong)" strokeWidth="1" />
      <text x="60" y="32" textAnchor="middle" fontSize="6" fill="var(--color-ok)">ack</text>
      <rect x="70" y="24" width="50" height="26" rx="2" fill="none" stroke="var(--color-node-queue)" strokeWidth="1.5" />
      <text x="95" y="40" textAnchor="middle" fontSize="7" fill="var(--color-node-queue)">QUEUE</text>
      <line x1="120" y1="37" x2="140" y2="37" stroke="var(--color-edge-strong)" strokeWidth="1" />
      <text x="130" y="32" textAnchor="middle" fontSize="6" fill="var(--color-ink-3)">async</text>
      <rect x="140" y="26" width="50" height="22" rx="2" fill="none" stroke="var(--color-ok)" strokeWidth="1.5" />
      <text x="165" y="40" textAnchor="middle" fontSize="7" fill="var(--color-ok)">WORKER</text>
      <text x="120" y="70" textAnchor="middle" fontSize="7" fill="var(--color-ink-3)">API responds fast. Worker processes at own rate.</text>
    </svg>
  )
}

function DiagramBudget() {
  return (
    <svg viewBox="0 0 220 80" className="w-full h-auto" aria-hidden="true">
      <text x="110" y="10" textAnchor="middle" fontSize="7" fill="var(--color-ink-3)">COST VS PERFORMANCE TRADEOFF</text>
      {/* bars */}
      <rect x="30" y="20" width="30" height="40" fill="var(--color-err)" opacity="0.7" />
      <text x="45" y="68" textAnchor="middle" fontSize="7" fill="var(--color-ink-3)">Over-</text>
      <text x="45" y="76" textAnchor="middle" fontSize="7" fill="var(--color-ink-3)">provisioned</text>
      <rect x="90" y="34" width="30" height="26" fill="var(--color-ok)" opacity="0.7" />
      <text x="105" y="68" textAnchor="middle" fontSize="7" fill="var(--color-ok)">Just</text>
      <text x="105" y="76" textAnchor="middle" fontSize="7" fill="var(--color-ok)">right</text>
      <rect x="150" y="48" width="30" height="12" fill="var(--color-err)" opacity="0.7" />
      <text x="165" y="68" textAnchor="middle" fontSize="7" fill="var(--color-ink-3)">Under-</text>
      <text x="165" y="76" textAnchor="middle" fontSize="7" fill="var(--color-ink-3)">provisioned</text>
      <line x1="20" y1="60" x2="200" y2="60" stroke="var(--color-edge-strong)" strokeWidth="0.5" />
    </svg>
  )
}

const DIAGRAMS: Record<DiagramType, React.ReactNode> = {
  'scaling':        <DiagramScaling />,
  'caching':        <DiagramCaching />,
  'load-balancing': <DiagramLoadBalancing />,
  'redundancy':     <DiagramRedundancy />,
  'async-queue':    <DiagramAsyncQueue />,
  'budget':         <DiagramBudget />,
}

// ── Storage helpers ───────────────────────────────────────────────────────────

function seenKey(challengeId: string) { return `primer-seen-${challengeId}` }
function markSeen(challengeId: string) {
  try { localStorage.setItem(seenKey(challengeId), '1') } catch { /* SSR */ }
}
function hasSeen(challengeId: string): boolean {
  try { return localStorage.getItem(seenKey(challengeId)) === '1' } catch { return false }
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = { challenge: Challenge; onDismiss: () => void }

export function ConceptPrimerModal({ challenge, onDismiss }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!challenge.conceptPrimer) return
    if (hasSeen(challenge.id)) return
    setVisible(true)
  }, [challenge.id, challenge.conceptPrimer])

  if (!visible || !challenge.conceptPrimer) return null

  const { title, explanation, diagramType } = challenge.conceptPrimer

  function handleDismiss() {
    markSeen(challenge.id)
    setVisible(false)
    onDismiss()
  }

  return (
    <div
      data-testid="concept-primer-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-base/80"
    >
      <div
        className="w-[440px] bg-raised border border-edge overflow-hidden"
        style={{ borderTopWidth: 2, borderTopColor: 'var(--color-cyan)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-edge-dim bg-surface">
          <BookOpen size={13} className="text-cyan flex-shrink-0" />
          <span className="text-[10px] font-bold text-cyan uppercase tracking-widest flex-1">
            // Concept: {title}
          </span>
          <button
            onClick={handleDismiss}
            className="text-ink-3 hover:text-ink-2 transition-colors"
            aria-label="Close"
          >
            <X size={13} />
          </button>
        </div>

        {/* Diagram */}
        <div className="px-5 pt-4 pb-2 bg-surface/50 border-b border-edge-dim">
          {DIAGRAMS[diagramType]}
        </div>

        {/* Explanation */}
        <div className="px-5 py-4">
          <p className="text-[13px] text-ink leading-relaxed">{explanation}</p>
        </div>

        {/* Action */}
        <div className="px-5 pb-4">
          <button
            onClick={handleDismiss}
            className="w-full py-2 bg-cyan hover:bg-cyan/90 text-base text-[11px] font-bold uppercase tracking-widest transition-colors"
          >
            Got it, let&apos;s play
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: no errors

**Step 3: Commit**

```bash
git add components/overlays/ConceptPrimerModal.tsx
git commit -m "feat: add ConceptPrimerModal component with inline SVG diagrams"
```

---

### Task 4: Wire ConceptPrimerModal into ChallengeLayout + add palette pulsing

**Files:**
- Modify: `components/canvas/ChallengeLayout.tsx`
- Modify: `components/canvas/Palette.tsx`

**Step 1: Update Palette to accept a pulseType prop**

In `components/canvas/Palette.tsx`, update `PaletteCard` and `Palette`:

```tsx
// Add pulseType to PaletteCard props
function PaletteCard({ item, pulse }: { item: PaletteItem; pulse?: boolean }) {
  // ... existing code ...
  return (
    <div
      draggable
      onDragStart={onDragStart}
      data-testid={`palette-item-${item.type}`}
      className={`flex items-center gap-3 px-3 py-2.5 border bg-surface hover:bg-overlay cursor-grab active:cursor-grabbing transition-colors duration-150 select-none
        ${pulse
          ? 'border-cyan animate-pulse shadow-[0_0_8px_var(--color-cyan)] border-l-[2px]'
          : 'border-edge'
        }`}
      style={{ borderLeftWidth: 2, borderLeftColor: pulse ? 'var(--color-cyan)' : color }}
    >
      {/* ... existing content unchanged ... */}
    </div>
  )
}

// Update Palette signature
export function Palette({
  allowedTypes,
  pulseType,
}: {
  allowedTypes?: ComponentType[] | 'all'
  pulseType?: ComponentType
}) {
  // ... existing filter logic unchanged ...
  // In the PaletteCard render, pass pulse prop:
  // <PaletteCard key={item.type} item={item} pulse={pulseType === item.type} />
}
```

**Step 2: Wire ConceptPrimerModal and palette pulsing into ChallengeLayout**

In `components/canvas/ChallengeLayout.tsx`:

1. Import `ConceptPrimerModal`
2. Add state: `const [primerDismissed, setPrimerDismissed] = useState(false)`
3. Reset state when challenge changes: add to existing effect or a new one
4. Compute `pulseType`: check if `guidedPulseComponent` is already placed:

```tsx
import { ConceptPrimerModal } from '@/components/overlays/ConceptPrimerModal'
import { useState } from 'react'

// Inside ChallengeLayout:
const [primerDismissed, setPrimerDismissed] = useState(false)

// Reset primerDismissed when challenge changes
useEffect(() => {
  setPrimerDismissed(false)
}, [activeChallenge?.id])

// Compute palette pulse: show pulse if the guidedPulseComponent hasn't been placed yet
const guidedType = activeChallenge?.guidedPulseComponent
const hasPlacedGuided = useArchitectureStore((s) =>
  guidedType ? s.nodes.some((n) => n.data.componentType === guidedType) : true
)
const pulseType = (!hasPlacedGuided && guidedType) ? guidedType : undefined

// In the return JSX, add ConceptPrimerModal before the main layout and pass pulseType to Palette:
// <ConceptPrimerModal challenge={activeChallenge} onDismiss={() => setPrimerDismissed(true)} />
// <Palette allowedTypes={...} pulseType={pulseType} />
```

The ConceptPrimerModal handles its own visibility via localStorage + internal state, so primerDismissed is only needed if other UI needs to react to dismissal (currently not needed — keep it for future use).

Full updated `ChallengeLayout` return:

```tsx
return (
  <ReactFlowProvider>
    {activeChallenge && (
      <ConceptPrimerModal
        challenge={activeChallenge}
        onDismiss={() => setPrimerDismissed(true)}
      />
    )}
    <div className="flex flex-col h-full w-full overflow-hidden">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <ChallengeBriefPanel />
        <Palette allowedTypes={allowedTypes as ComponentType[] | 'all'} pulseType={pulseType} />
        <main className="flex-1 relative overflow-hidden">
          <GameCanvas />
          <TutorialCallout />
        </main>
        <ConfigPanel />
      </div>
      <MetricsPanel />
    </div>
    <ResultsModal />
  </ReactFlowProvider>
)
```

**Step 3: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: no errors

**Step 4: Commit**

```bash
git add components/canvas/ChallengeLayout.tsx components/canvas/Palette.tsx
git commit -m "feat: wire ConceptPrimerModal and palette pulsing for Tutorial levels"
```

---

### Task 5: Add metric annotation tooltips to MetricsPanel

**Files:**
- Modify: `components/panels/MetricsPanel.tsx`

The `Metric` component gets a `tooltip` prop. The tooltip is a two-part string: the static definition + a dynamic comparison to the challenge SLA. `MetricsPanel` reads `activeChallenge` from `useChallengeStore` to form the dynamic part.

**Step 1: Add tooltip to the Metric component**

Update `Metric` in `MetricsPanel.tsx`:

```tsx
function Metric({
  label, value, unit, valueColor, sparkValues, sparkColor, tooltip,
}: {
  label: string
  value: string
  unit?: string
  valueColor: string
  sparkValues?: number[]
  sparkColor: string
  tooltip?: string   // NEW
}) {
  return (
    <div className="relative group flex flex-col gap-0.5 min-w-[80px]">
      <p className="text-[9px] text-ink-3 uppercase tracking-widest">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-[18px] font-bold leading-none" style={{ color: valueColor }}>{value}</span>
        {unit && <span className="text-[10px] text-ink-3">{unit}</span>}
      </div>
      {sparkValues && sparkValues.length > 1 && (
        <Sparkline values={sparkValues} stroke={sparkColor} />
      )}
      {/* Tooltip */}
      {tooltip && (
        <div className="absolute bottom-full left-0 mb-2 w-64 bg-raised border border-edge px-3 py-2 text-[11px] text-ink leading-relaxed z-30 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-xl">
          {tooltip}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Generate dynamic tooltip strings in MetricsPanel**

In the `MetricsPanel` function body, add after the existing computed values:

```tsx
const activeChallenge = useChallengeStore((s) => s.activeChallenge)
const isBeginnerLevel = activeChallenge && activeChallenge.tier <= 1

// Only show tooltips for Tutorial + Tier 1 levels
const p99Tooltip = isBeginnerLevel && snap ? [
  `p99 latency — 99% of requests completed faster than this. Your target is ${activeChallenge.slaTargets.p99LatencyMs}ms.`,
  p99 > activeChallenge.slaTargets.p99LatencyMs
    ? ` Yours is ${Math.round(p99)}ms — ${(p99 / activeChallenge.slaTargets.p99LatencyMs).toFixed(1)}× over target. Something in your architecture is backed up.`
    : ` Yours is ${Math.round(p99)}ms — within target.`,
].join('') : undefined

const errTooltip = isBeginnerLevel && snap ? [
  `Error rate — the fraction of requests that failed (returned an error or timed out). Target is under ${(activeChallenge.slaTargets.errorRate * 100).toFixed(1)}%.`,
  err > activeChallenge.slaTargets.errorRate
    ? ` Yours is ${(err * 100).toFixed(2)}% — over target. A saturated component is dropping requests.`
    : ` Yours is ${(err * 100).toFixed(2)}% — within target.`,
].join('') : undefined

const rpsTooltip = isBeginnerLevel
  ? 'Throughput — requests per second currently flowing through your system. Higher is better, as long as latency and error rate stay within target.'
  : undefined

const costTooltip = isBeginnerLevel && snap ? [
  `Cost — estimated hourly cost of all components in your architecture. Budget is $${activeChallenge.budgetPerHour.toFixed(2)}/hr.`,
  cost > activeChallenge.budgetPerHour
    ? ` You are currently over budget ($${cost.toFixed(3)}/hr). Remove or downgrade components.`
    : ` You are within budget.`,
].join('') : undefined
```

Then pass tooltip props to each `Metric` component call.

**Step 3: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: no errors

**Step 4: Commit**

```bash
git add components/panels/MetricsPanel.tsx
git commit -m "feat: add metric annotation tooltips for beginner levels"
```

---

### Task 6: Add saturation callout to BaseNode

**Files:**
- Modify: `components/nodes/BaseNode.tsx`

When a node is `hot` or `saturated` during simulation, hovering shows a plain-English callout above the node explaining what's happening with actual live numbers.

**Step 1: Add the callout inside BaseNode**

In `BaseNode`, add after the chaos badge blocks and before the delete button:

```tsx
{/* Saturation callout — shown on hover for hot/saturated nodes during sim */}
{isSimulating && (status === 'hot' || status === 'saturated') && simSnap && (
  <div className="absolute bottom-full left-0 mb-2 w-56 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
    <div
      className="bg-raised border border-edge px-3 py-2 text-[11px] text-ink leading-relaxed shadow-xl"
      style={{ borderTopWidth: 2, borderTopColor: status === 'saturated' ? 'var(--color-err)' : 'var(--color-hot)' }}
    >
      {status === 'saturated'
        ? `This ${COMPONENT_NAMES[data.componentType] ?? meta.label.toLowerCase()} is receiving ${Math.round(simSnap.inputRps).toLocaleString()} RPS but can only process ${Math.round(simSnap.outputRps).toLocaleString()} RPS. Requests are queuing up.`
        : `This ${COMPONENT_NAMES[data.componentType] ?? meta.label.toLowerCase()} is busy (${Math.round(simSnap.utilization * 100)}% capacity). Watch it — if traffic increases it will saturate.`
      }
    </div>
  </div>
)}
```

Also add the `group` class to the outer div of BaseNode:

```tsx
<div
  data-testid={`node-${data.componentType}`}
  className={`
    relative group w-52 border border-edge bg-surface   {/* added 'group' */}
    transition-all duration-200
    ${selected ? 'border-edge-strong' : ''}
    ${status === 'failed' ? 'opacity-60' : ''}
  `}
  ...
>
```

And add the `COMPONENT_NAMES` map at the top of the file (same as in failureDebrief.ts):

```typescript
const COMPONENT_NAMES: Partial<Record<ComponentType, string>> = {
  server:         'server',
  database:       'database',
  cache:          'cache',
  'load-balancer':'load balancer',
  queue:          'queue',
  'api-gateway':  'API gateway',
  'k8s-fleet':    'auto-scaling fleet',
}
```

**Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: no errors

**Step 3: Commit**

```bash
git add components/nodes/BaseNode.tsx
git commit -m "feat: add saturation callout on hot/saturated nodes during simulation"
```

---

### Task 7: Build FailureDebrief component and wire into ResultsModal

**Files:**
- Create: `components/challenge/FailureDebrief.tsx`
- Modify: `components/overlays/ResultsModal.tsx`

**Step 1: Create FailureDebrief component**

Create `components/challenge/FailureDebrief.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import { AlertTriangle, HelpCircle } from 'lucide-react'
import { useChallengeStore } from '@/lib/store/challengeStore'
import { useSimStore } from '@/lib/store/simStore'
import { useArchitectureStore } from '@/lib/store/architectureStore'
import { generateFailureDiagnosis } from '@/lib/challenges/failureDebrief'
import type { Challenge } from '@/lib/challenges/types'
import type { EvalResult } from '@/lib/challenges/types'

type Props = { challenge: Challenge; result: EvalResult }

export function FailureDebrief({ challenge, result }: Props) {
  const history = useSimStore((s) => s.history)
  const nodes = useArchitectureStore((s) => s.nodes)
  const failedAttempts = useChallengeStore((s) => s.failedAttempts[challenge.id] ?? 0)
  const recordFailedAttempt = useChallengeStore((s) => s.recordFailedAttempt)

  // Record the failed attempt once when this component mounts
  useEffect(() => {
    recordFailedAttempt(challenge.id)
  }, []) // intentional empty deps — fire once per modal open

  // Don't show debrief for Tutorial and Tier 1 only — higher tiers are more open-ended
  if (challenge.tier > 1) return null

  const nodeInfos = nodes.map((n) => ({
    id: n.id,
    componentType: n.data.componentType,
    label: n.data.label,
  }))

  const diagnosis = generateFailureDiagnosis(result, history, challenge, nodeInfos, failedAttempts)

  return (
    <div className="px-6 py-4 border-b border-edge-dim space-y-3">
      <p className="text-[10px] font-bold text-warn uppercase tracking-widest">// What went wrong</p>

      <div className="flex items-start gap-2">
        <AlertTriangle size={13} className="text-warn flex-shrink-0 mt-0.5" />
        <p className="text-[12px] font-semibold text-ink">{diagnosis.bottleneck}</p>
      </div>

      <p className="text-[12px] text-ink-2 leading-relaxed">{diagnosis.why}</p>

      <div className="flex items-start gap-2 border border-edge-dim bg-surface px-3 py-2">
        <HelpCircle size={12} className="text-cyan flex-shrink-0 mt-0.5" />
        <p className="text-[12px] text-ink-2 leading-relaxed">
          <span className="font-semibold text-ink">What to try: </span>
          {diagnosis.whatToTry}
        </p>
      </div>
    </div>
  )
}
```

**Step 2: Add FailureDebrief to ResultsModal**

In `components/overlays/ResultsModal.tsx`:

1. Import `FailureDebrief`
2. Add it in the JSX between the Metrics section and the Score Breakdown section, only when `!result.passed`:

```tsx
import { FailureDebrief } from '@/components/challenge/FailureDebrief'

// In the JSX, after the Metrics section:
{!result.passed && (
  <FailureDebrief challenge={challenge} result={result} />
)}
```

**Step 3: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: no errors

**Step 4: Commit**

```bash
git add components/challenge/FailureDebrief.tsx components/overlays/ResultsModal.tsx
git commit -m "feat: add FailureDebrief panel to ResultsModal for failed sim runs"
```

---

### Task 8: Add conceptPrimer and failureHints data to Tutorial definitions

**Files:**
- Modify: `lib/challenges/definitions.ts` (Tutorial section only)

**Step 1: Add beginner metadata to each Tutorial challenge**

For T-0 (`Hello, Traffic`):
```typescript
conceptPrimer: {
  title: 'Request Flow',
  diagramType: 'load-balancing',
  explanation: 'Every user action (clicking a button, loading a page) becomes a request that travels from a client to your servers. Latency is how long that round trip takes. Error rate is how often requests fail completely. These are the two numbers that determine whether your users are happy.',
},
```

For T-1 (`Growing Pains`):
```typescript
conceptPrimer: {
  title: 'Scaling',
  diagramType: 'scaling',
  explanation: 'Each server can only handle so many requests per second before it runs out of CPU and memory. When demand exceeds capacity, requests queue up and latency climbs. You can scale vertically (bigger server) or horizontally (more servers) — both work, but they have different cost profiles.',
},
guidedPulseComponent: 'server',
failureHints: {
  server_saturated: 'Your server is at maximum capacity. Try upgrading the instance type in the config panel (click the server node), or drag a second server from the palette and connect it to the client.',
  latency_exceeded: 'High latency usually means a component is handling more requests than it can process. Click each node to see its utilization. The one above 80% is your problem.',
},
```

For T-2 (`The Spike`):
```typescript
conceptPrimer: {
  title: 'Traffic Spikes',
  diagramType: 'scaling',
  explanation: 'Traffic is rarely steady. A flash sale, a viral post, or a morning rush can send 5–10× normal traffic in seconds. Systems designed for average load will saturate during spikes. You need headroom — extra capacity that sits idle most of the time but absorbs the peak.',
},
guidedPulseComponent: 'server',
failureHints: {
  server_saturated: 'Your server saturated during the spike. You need more capacity headroom. Try upgrading the server or adding a second one before running again.',
  latency_exceeded: 'The spike overwhelmed your architecture. Which component went red? That\'s your bottleneck. Increase its capacity so it can handle peak traffic.',
},
```

For T-3 (`Your First Outage` — check definitions.ts for actual title):
```typescript
conceptPrimer: {
  title: 'Redundancy',
  diagramType: 'redundancy',
  explanation: 'Any single component that, if it fails, takes down the whole system is called a "single point of failure." The fix is redundancy — having at least two of every critical component so that one failure does not equal an outage. A load balancer routes traffic away from the failed instance automatically.',
},
guidedPulseComponent: 'load-balancer',
failureHints: {
  no_redundancy: 'When the server failed, there was no backup to take over. Add a load balancer and a second server so traffic can be rerouted automatically when one node goes down.',
  error_rate_exceeded: 'Your error rate spiked when the node failed — that means the system had nowhere else to send requests. Add redundancy so a single failure does not cause an outage.',
},
```

**Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: no errors

**Step 3: Commit**

```bash
git add lib/challenges/definitions.ts
git commit -m "feat: add conceptPrimer and failureHints to Tutorial level definitions"
```

---

### Task 9: Add conceptPrimer data to Tier 1 definitions

**Files:**
- Modify: `lib/challenges/definitions.ts` (Tier 1 section only)

**Step 1: Add conceptPrimer to each Tier 1 challenge**

For 1-1 (`Read-Heavy Blog`):
```typescript
conceptPrimer: {
  title: 'Caching',
  diagramType: 'caching',
  explanation: 'A cache stores the results of recent database queries in fast memory. When the same data is requested again, the cache answers instantly — the database never sees the request. If 80% of reads hit the cache, your database only sees 20% of traffic. This is the single most effective way to reduce database load for read-heavy systems.',
},
```

For 1-2 (`The Thundering Herd`):
```typescript
conceptPrimer: {
  title: 'Cache Cold Starts',
  diagramType: 'caching',
  explanation: 'A cache that just started (or was just flushed) has no data stored yet. Every request misses and goes straight to the database. If a traffic spike coincides with a cache flush, you get the thundering herd: the database receives the full spike with no cache to protect it. Solutions include longer TTLs, staggered cache expiry, or an origin shield.',
},
```

For 1-3 (`Write-Heavy Workload`):
```typescript
conceptPrimer: {
  title: 'Async Queues',
  diagramType: 'async-queue',
  explanation: 'Caching only helps reads — writes always need to hit the database. For write-heavy workloads, a message queue lets your API acknowledge requests immediately while a worker processes them at the database\'s own rate. The queue absorbs bursts. The tradeoff: writes are not instantly visible (eventual consistency), so this only works when immediate confirmation is not required.',
},
```

For 1-4 (`The Budget Constraint`):
```typescript
conceptPrimer: {
  title: 'Cost vs Performance',
  diagramType: 'budget',
  explanation: 'Every component in your architecture costs money per hour. The goal is to meet the SLA using the minimum resources necessary — not the maximum. Over-provisioning is wasteful. Under-provisioning fails users. Finding the smallest architecture that just passes is a core engineering skill, and it is what the cost score measures.',
},
```

**Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: no errors

**Step 3: Commit**

```bash
git add lib/challenges/definitions.ts
git commit -m "feat: add conceptPrimer data to Tier 1 challenge definitions"
```

---

## Running all unit tests

After all tasks are complete:

```bash
pnpm test:unit:run
```

Expected: all tests pass (at minimum the 4 failureDebrief tests).

## Manual verification checklist

After the dev server is running (`pnpm dev`):

1. **Concept primer**: Navigate to `/play/T-1`. The ConceptPrimerModal should appear with the "Scaling" concept. Dismiss it. Navigate away and back — modal should not appear again (localStorage).
2. **Palette pulsing**: After dismissing the primer on T-1, the "Server" palette item should pulse with a cyan glow. Drag a server onto the canvas — the pulse should stop.
3. **Metric tooltips**: Start the simulation on any Tier 1 level. Hover each metric card in the bottom panel — tooltips should appear.
4. **Saturation callout**: Run the simulation with a saturated component. Hover the red/orange node — a callout bubble should appear above it with live RPS numbers.
5. **Failure debrief**: Intentionally fail a Tutorial or Tier 1 level. The ResultsModal should show a "What went wrong" section above the score breakdown. Retry and fail again 3 times — the "What to try" text should become more direct on the 3rd attempt.
