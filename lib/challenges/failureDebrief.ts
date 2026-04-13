import type { EvalResult, Challenge, FailureCondition } from './types'
import type { SimSnapshot } from '@/sim/types'
import type { ComponentType } from '@/lib/components/definitions'

export type DiagnosisResult = {
  bottleneck: string   // e.g. "Your database saturated and became the bottleneck."
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

/** Find the most-saturated node across the last 10 snapshots. */
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

/** Map the primary failure to a FailureCondition for authored hint lookup. */
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

  // What to try — authored for Tutorial, algorithmic for Tier 1+
  let whatToTry: string
  const condition = primaryCondition(result, bottleneckType)

  if (challenge.tier === 0 && challenge.failureHints?.[condition]) {
    // Use authored hint for Tutorial levels
    whatToTry = challenge.failureHints[condition]!
  } else if (attemptCount >= 3 && bottleneckType) {
    // Escalate on 3rd+ attempt for Tier 1+
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
