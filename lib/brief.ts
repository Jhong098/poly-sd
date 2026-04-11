import type { ComponentNode, ComponentEdge } from '@/lib/store/architectureStore'
import type {
  ClientConfig, ServerConfig, DatabaseConfig, CacheConfig,
  LoadBalancerConfig, QueueConfig, ApiGatewayConfig, K8sFleetConfig,
  KafkaConfig, CdnConfig,
} from '@/lib/components/definitions'
import type { Challenge } from '@/lib/challenges/types'

/** Build an adjacency list from node id → downstream node ids. */
function buildAdjacency(
  nodes: ComponentNode[],
  edges: ComponentEdge[],
): Map<string, string[]> {
  const adj = new Map<string, string[]>(nodes.map((n) => [n.id, []]))
  for (const e of edges) {
    adj.get(e.source)?.push(e.target)
  }
  return adj
}

/** Topological sort; returns node ids root-first. */
function topoSort(nodes: ComponentNode[], edges: ComponentEdge[]): string[] {
  const indegree = new Map<string, number>(nodes.map((n) => [n.id, 0]))
  for (const e of edges) {
    indegree.set(e.target, (indegree.get(e.target) ?? 0) + 1)
  }
  const queue = nodes.filter((n) => indegree.get(n.id) === 0).map((n) => n.id)
  const adj = buildAdjacency(nodes, edges)
  const order: string[] = []
  while (queue.length) {
    const id = queue.shift()!
    order.push(id)
    for (const next of adj.get(id) ?? []) {
      const deg = (indegree.get(next) ?? 1) - 1
      indegree.set(next, deg)
      if (deg === 0) queue.push(next)
    }
  }
  return order
}

/** One-line summary for a node's config. */
function describeNode(node: ComponentNode): string {
  const { componentType: t, label, config } = node.data
  switch (t) {
    case 'client': {
      const c = config as ClientConfig
      return `${label} (Client) — ${c.rps} RPS${c.preset !== 'steady' ? `, ${c.preset} ×${c.peakMultiplier}` : ''}`
    }
    case 'server': {
      const c = config as ServerConfig
      return `${label} (Server) — ${c.instanceCount}× ${c.instanceType}, ${c.baseLatencyMs}ms base latency`
    }
    case 'database': {
      const c = config as DatabaseConfig
      const extras = [
        c.readReplicas > 0 ? `${c.readReplicas} read replica${c.readReplicas > 1 ? 's' : ''}` : null,
        c.multiAz ? 'Multi-AZ' : null,
      ].filter(Boolean).join(', ')
      return `${label} (Database) — ${c.instanceType}${extras ? `, ${extras}` : ''}`
    }
    case 'cache': {
      const c = config as CacheConfig
      return `${label} (Cache) — ${c.instanceType}, ${Math.round(c.hitRate * 100)}% hit rate, TTL ${c.ttlSeconds}s`
    }
    case 'load-balancer': {
      const c = config as LoadBalancerConfig
      return `${label} (Load Balancer) — ${c.algorithm}`
    }
    case 'queue': {
      const c = config as QueueConfig
      return `${label} (Queue) — ${c.processingRatePerSec} RPS drain, depth ${c.maxDepth}`
    }
    case 'api-gateway': {
      const c = config as ApiGatewayConfig
      return `${label} (API Gateway) — max ${c.maxRps} RPS, timeout ${c.timeoutMs}ms, circuit breaker ${c.circuitBreakerEnabled ? 'ON' : 'OFF'}`
    }
    case 'k8s-fleet': {
      const c = config as K8sFleetConfig
      return `${label} (K8s Fleet) — ${c.instanceType}, ${c.minReplicas}–${c.maxReplicas} replicas, ${Math.round(c.targetUtilization * 100)}% target utilization`
    }
    case 'kafka': {
      const c = config as KafkaConfig
      return `${label} (Kafka) — ${c.partitions} partitions, ${c.consumerGroups} consumer group${c.consumerGroups > 1 ? 's' : ''}`
    }
    case 'cdn': {
      const c = config as CdnConfig
      return `${label} (CDN) — ${Math.round(c.hitRate * 100)}% hit rate, ${c.regions} region${c.regions > 1 ? 's' : ''}, TTL ${c.ttlSeconds}s`
    }
    default:
      return `${label} (${t})`
  }
}

/** Returns a plain-text system design brief for the given architecture. */
export function generateBrief(
  nodes: ComponentNode[],
  edges: ComponentEdge[],
  challenge?: Challenge | null,
): string {
  const lines: string[] = []

  if (challenge) {
    lines.push(`# ${challenge.title}`)
    lines.push('')
    lines.push(challenge.objective)
    lines.push('')
    lines.push('## SLA Targets')
    lines.push(`- p99 latency ≤ ${challenge.slaTargets.p99LatencyMs}ms`)
    lines.push(`- Error rate ≤ ${(challenge.slaTargets.errorRate * 100).toFixed(1)}%`)
    lines.push(`- Budget ≤ $${challenge.budgetPerHour.toFixed(2)}/hr`)
    lines.push('')
  }

  lines.push('## Architecture')
  lines.push(`${nodes.length} component${nodes.length !== 1 ? 's' : ''}, ${edges.length} connection${edges.length !== 1 ? 's' : ''}`)
  lines.push('')

  // List components in topo order so the description reads top-to-bottom
  const order = topoSort(nodes, edges)
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const adj = buildAdjacency(nodes, edges)

  lines.push('## Components')
  for (const id of order) {
    const node = nodeMap.get(id)
    if (!node) continue
    lines.push(`- ${describeNode(node)}`)
  }
  lines.push('')

  // Describe connections
  if (edges.length > 0) {
    lines.push('## Connections')
    for (const id of order) {
      const targets = adj.get(id) ?? []
      if (targets.length === 0) continue
      const srcLabel = nodeMap.get(id)?.data.label ?? id
      const targetLabels = targets.map((t) => nodeMap.get(t)?.data.label ?? t)
      if (targets.length === 1) {
        lines.push(`- ${srcLabel} → ${targetLabels[0]}`)
      } else {
        // Check if there are custom split weights
        const outEdges = edges.filter((e) => e.source === id)
        const hasWeights = outEdges.some((e) => (e.data?.splitWeight ?? 1) !== 1)
        if (hasWeights) {
          const total = outEdges.reduce((s, e) => s + (e.data?.splitWeight ?? 1), 0)
          const parts = outEdges.map((e) => {
            const pct = Math.round(((e.data?.splitWeight ?? 1) / total) * 100)
            const label = nodeMap.get(e.target)?.data.label ?? e.target
            return `${label} (${pct}%)`
          })
          lines.push(`- ${srcLabel} → ${parts.join(', ')}`)
        } else {
          lines.push(`- ${srcLabel} → ${targetLabels.join(', ')} (equal split)`)
        }
      }
    }
    lines.push('')
  }

  return lines.join('\n')
}
