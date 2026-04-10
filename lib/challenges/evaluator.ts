import type { SimSnapshot, ChaosEvent } from '@/sim/types'
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

  // ── Resilience score ───────────────────────────────────────────────────────

  // Only computed when the challenge has scheduled chaos events.
  // Measures how well the architecture maintained SLAs *during* chaos windows
  // vs. a hypothetical full-failure baseline (errorRate=1).
  const chaosSchedule = challenge.chaosSchedule ?? []
  const resilience = computeResilience(history, chaosSchedule, challenge.slaTargets.errorRate)

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

  // Weighted total: when chaos is present, resilience replaces some simplicity weight
  const hasChaos = chaosSchedule.length > 0
  const total = hasChaos
    ? Math.round(performance * 0.4 + cost * 0.25 + simplicity * 0.15 + resilience * 0.2)
    : Math.round(performance * 0.5 + cost * 0.3 + simplicity * 0.2)

  const scores: ScoreBreakdown = { performance, cost, simplicity, resilience, total }

  return {
    passed,
    passedLatency,
    passedErrors,
    passedBudget,
    scores,
    metrics: { p99LatencyMs, errorRate, costPerHour, componentCount },
  }
}

// ── Resilience computation ────────────────────────────────────────────────────

function computeResilience(
  history: SimSnapshot[],
  chaosSchedule: ChaosEvent[],
  slaErrorRate: number,
): number {
  if (chaosSchedule.length === 0 || history.length === 0) return 0

  // Identify snapshots that fall inside any chaos window (+ 5s buffer after)
  const chaosSnaps = history.filter((s) =>
    chaosSchedule.some((e) =>
      s.simTimeMs >= e.startSimMs &&
      s.simTimeMs < e.startSimMs + e.durationMs + 5_000,
    ),
  )

  if (chaosSnaps.length === 0) return 0

  // Mean error rate during chaos windows
  const chaosErrorRate =
    chaosSnaps.reduce((sum, s) => sum + s.systemErrorRate, 0) / chaosSnaps.length

  // Score: 100 = no degradation (chaosErrorRate ≤ sla), 0 = total failure (rate=1)
  const degradation = Math.max(0, chaosErrorRate - slaErrorRate)
  const maxDegradation = Math.max(1 - slaErrorRate, 0.01)
  return Math.round(Math.max(0, 1 - degradation / maxDegradation) * 100)
}

function failing(challenge: Challenge, componentCount: number): EvalResult {
  return {
    passed: false,
    passedLatency: false,
    passedErrors: false,
    passedBudget: false,
    scores: { performance: 0, cost: 0, simplicity: 0, resilience: 0, total: 0 },
    metrics: {
      p99LatencyMs: Infinity,
      errorRate: 1,
      costPerHour: 0,
      componentCount,
    },
  }
}
