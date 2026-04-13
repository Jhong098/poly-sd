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
