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

function passingHistory(n: number): SimSnapshot[] {
  return Array.from({ length: n }, (_, i) =>
    snap(100, 0.001, 0.50, i * 200),
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
    const history = Array.from({ length: 20 }, (_, i) => snap(999, 0.001, 0.5, i * 200))
    const result = evaluateChallenge(CHALLENGE, history, 3)
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
  it('ignores the first 20% of history', () => {
    // First 20% has terrible latency; rest is fine
    const history: SimSnapshot[] = []
    for (let i = 0; i < 10; i++) history.push(snap(9999, 0.001, 0.5, i * 200))
    for (let i = 10; i < 50; i++) history.push(snap(100, 0.001, 0.5, i * 200))
    const result = evaluateChallenge(CHALLENGE, history, 3)
    expect(result.passed).toBe(true)
  })

  it('uses full history when fewer than 3 snapshots', () => {
    const history = [snap(9999, 0.001, 0.5, 0)]
    const result = evaluateChallenge(CHALLENGE, history, 3)
    expect(result.passedLatency).toBe(false)
  })
})

// ── Scoring ───────────────────────────────────────────────────────────────────

describe('evaluateChallenge — score breakdown', () => {
  it('performance score is near 0 when metrics are at the SLA limit', () => {
    const history = Array.from({ length: 20 }, (_, i) => snap(200, 0.01, 0.5, i * 200))
    const result = evaluateChallenge(CHALLENGE, history, 3)
    expect(result.scores.performance).toBeLessThan(10)
  })

  it('performance score is high when metrics are well under SLA', () => {
    const history = Array.from({ length: 20 }, (_, i) => snap(20, 0.001, 0.5, i * 200))
    const result = evaluateChallenge(CHALLENGE, history, 3)
    expect(result.scores.performance).toBeGreaterThan(80)
  })

  it('cost score is near 0 when at budget', () => {
    const history = Array.from({ length: 20 }, (_, i) => snap(100, 0.001, 1.0, i * 200))
    const result = evaluateChallenge(CHALLENGE, history, 3)
    expect(result.scores.cost).toBeLessThan(5)
  })

  it('cost score is 100 when cost is zero', () => {
    const history = Array.from({ length: 20 }, (_, i) => snap(100, 0.001, 0.0, i * 200))
    const result = evaluateChallenge(CHALLENGE, history, 3)
    expect(result.scores.cost).toBe(100)
  })

  it('simplicity score is 100 with 2 components', () => {
    const result = evaluateChallenge(CHALLENGE, passingHistory(20), 2)
    expect(result.scores.simplicity).toBe(100)
  })

  it('simplicity score decreases as component count increases', () => {
    const r2  = evaluateChallenge(CHALLENGE, passingHistory(20), 2)
    const r10 = evaluateChallenge(CHALLENGE, passingHistory(20), 10)
    expect(r10.scores.simplicity).toBeLessThan(r2.scores.simplicity)
  })

  it('total score matches weighted formula (no chaos)', () => {
    const result = evaluateChallenge(CHALLENGE, passingHistory(20), 2)
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

  it('resilience is near 100 when errors stay within SLA during chaos', () => {
    const history = Array.from({ length: 50 }, (_, i) =>
      snap(100, 0.001, 0.5, i * 400),
    )
    const result = evaluateChallenge(chaosChallenge, history, 3)
    expect(result.scores.resilience).toBeGreaterThan(80)
  })

  it('resilience is near 0 when errors spike to 1 during chaos window', () => {
    // The evaluator includes a 5s buffer after the chaos event ends (15_000 + 5_000 = 20_000),
    // so the error spike must cover the full window [10_000, 20_000) to keep the mean near 1.
    const history = Array.from({ length: 50 }, (_, i) => {
      const t = i * 400
      const inChaos = t >= 10_000 && t < 20_000
      return snap(100, inChaos ? 1 : 0.001, 0.5, t)
    })
    const result = evaluateChallenge(chaosChallenge, history, 3)
    expect(result.scores.resilience).toBeLessThan(20)
  })
})
