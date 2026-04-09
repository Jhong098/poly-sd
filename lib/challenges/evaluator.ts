import type { SimSnapshot } from '@/sim/types'
import type { Challenge, EvalResult, ScoreBreakdown } from './types'

/**
 * Evaluate a completed simulation against a challenge's win conditions.
 *
 * We use the latter 80% of snapshots to ignore ramp-up noise.
 * All three conditions (latency, errors, budget) must pass to win.
 */
export function evaluateChallenge(
  challenge: Challenge,
  history: SimSnapshot[],
  componentCount: number,
): EvalResult {
  // Use the latter 80% of history to skip warm-up
  const window = history.length < 3
    ? history
    : history.slice(Math.floor(history.length * 0.2))

  if (window.length === 0) {
    return failing(challenge, componentCount)
  }

  // ── Aggregate metrics ──────────────────────────────────────────────────────

  const p99Values = window.map((s) => s.systemP99LatencyMs)
  const errorValues = window.map((s) => s.systemErrorRate)
  const costValues = window.map((s) => s.systemCostPerHour)

  // p99 latency: use 95th percentile of the windowed p99 values
  p99Values.sort((a, b) => a - b)
  const p99LatencyMs = p99Values[Math.floor(p99Values.length * 0.95)] ?? p99Values[p99Values.length - 1]

  // Error rate: mean over window
  const errorRate = errorValues.reduce((s, v) => s + v, 0) / errorValues.length

  // Cost: mean over window (reflects actual hourly spend)
  const costPerHour = costValues.reduce((s, v) => s + v, 0) / costValues.length

  // ── Pass / fail ────────────────────────────────────────────────────────────

  const passedLatency = p99LatencyMs <= challenge.slaTargets.p99LatencyMs
  const passedErrors  = errorRate    <= challenge.slaTargets.errorRate
  const passedBudget  = costPerHour  <= challenge.budgetPerHour
  const passed = passedLatency && passedErrors && passedBudget

  // ── Scoring ────────────────────────────────────────────────────────────────

  // Performance score: how much headroom vs. SLA (0 = at limit, 100 = free)
  const latencyHeadroom = Math.max(0, 1 - p99LatencyMs / challenge.slaTargets.p99LatencyMs)
  const errorHeadroom   = Math.max(0, 1 - errorRate / Math.max(challenge.slaTargets.errorRate, 0.0001))
  const performance = Math.round(((latencyHeadroom + errorHeadroom) / 2) * 100)

  // Cost score: how far under budget (0 = at budget, 100 = essentially free)
  const costFraction = costPerHour / Math.max(challenge.budgetPerHour, 0.001)
  const cost = Math.round(Math.max(0, 1 - costFraction) * 100)

  // Simplicity score: penalise excess components (sweet spot is fewest that pass)
  const simplicity = Math.round(Math.max(0, 1 - (componentCount - 2) / 10) * 100)

  // Weighted total: performance matters most
  const total = Math.round(performance * 0.5 + cost * 0.3 + simplicity * 0.2)

  const scores: ScoreBreakdown = { performance, cost, simplicity, total }

  return {
    passed,
    passedLatency,
    passedErrors,
    passedBudget,
    scores,
    metrics: { p99LatencyMs, errorRate, costPerHour, componentCount },
  }
}

function failing(challenge: Challenge, componentCount: number): EvalResult {
  return {
    passed: false,
    passedLatency: false,
    passedErrors: false,
    passedBudget: false,
    scores: { performance: 0, cost: 0, simplicity: 0, total: 0 },
    metrics: {
      p99LatencyMs: Infinity,
      errorRate: 1,
      costPerHour: 0,
      componentCount,
    },
  }
}
