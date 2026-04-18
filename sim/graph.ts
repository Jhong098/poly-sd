import type { SimGraph, SimSnapshot, NodeSnapshot, EdgeSnapshot, ChaosEvent, SimNode, SimEdge } from './types'
import { computeNode, type ComponentState } from './components'
import type { DatabaseConfig } from '@/lib/components/definitions'

/**
 * Pre-computed graph topology for reuse across ticks.
 * Build once via `prepareGraph()`, pass into every `resolveGraph()` call.
 */
export type PreparedGraph = {
  order: string[]
  nodeMap: Map<string, SimNode>
  incomingEdges: Map<string, SimEdge[]>
  outgoingEdges: Map<string, SimEdge[]>
  hasClients: boolean
  fallbackIngressIds: string[]
  egressIds: string[]
}

/** Build topology caches that are stable for the lifetime of a simulation run. */
export function prepareGraph(graph: SimGraph): PreparedGraph {
  const order = topologicalSort(graph)
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]))

  const incomingEdges = new Map<string, SimEdge[]>()
  const outgoingEdges = new Map<string, SimEdge[]>()
  for (const n of graph.nodes) { incomingEdges.set(n.id, []); outgoingEdges.set(n.id, []) }
  for (const e of graph.edges) {
    incomingEdges.get(e.target)?.push(e)
    outgoingEdges.get(e.source)?.push(e)
  }

  const hasClients = graph.nodes.some((n) => n.componentType === 'client')
  const targetIds = new Set(graph.edges.map((e) => e.target))
  const fallbackIngressIds = hasClients
    ? []
    : graph.nodes.map((n) => n.id).filter((id) => !targetIds.has(id))

  const sourceIds = new Set(graph.edges.map((e) => e.source))
  const egressIds = graph.nodes.map((n) => n.id).filter((id) => !sourceIds.has(id))

  return { order, nodeMap, incomingEdges, outgoingEdges, hasClients, fallbackIngressIds, egressIds }
}

/**
 * Resolve one tick.
 *
 * clientRpsMap: pre-computed RPS for each client node at this simTimeMs.
 * globalIngressRps: used only when there are no client nodes (backward compat).
 * prepared: optional pre-computed topology (from `prepareGraph`). When omitted
 *           the topology is built on-the-fly (convenient for tests, slower for hot loops).
 */
export function resolveGraph(
  graph: SimGraph,
  componentState: Record<string, ComponentState>,
  globalIngressRps: number,
  simTimeMs: number,
  clientRpsMap: Record<string, number> = {},
  chaosMap: Record<string, ChaosEvent> = {},
  prepared?: PreparedGraph,
): SimSnapshot {
  if (graph.nodes.length === 0) {
    return emptySnapshot(simTimeMs, globalIngressRps)
  }

  const p = prepared ?? prepareGraph(graph)
  const { order, nodeMap, incomingEdges, outgoingEdges, hasClients, fallbackIngressIds, egressIds } = p

  const rpsPerFallback =
    fallbackIngressIds.length > 0 ? globalIngressRps / fallbackIngressIds.length : 0

  const nodeInputRps: Record<string, number> = {}
  for (const id of fallbackIngressIds) nodeInputRps[id] = rpsPerFallback

  const edgeThroughput: Record<string, number> = {}
  const nodeSnaps: Record<string, NodeSnapshot> = {}
  const edgeSnaps: Record<string, EdgeSnapshot> = {}

  for (const nodeId of order) {
    const node = nodeMap.get(nodeId)
    if (!node) continue

    // Sum incoming edges (weighted split already applied at source)
    const incoming = incomingEdges.get(nodeId)!
    const fromEdges = incoming.reduce((sum, e) => sum + (edgeThroughput[e.id] ?? 0), 0)
    const inputRps = (nodeInputRps[nodeId] ?? 0) + fromEdges

    // Apply traffic-surge chaos before compute
    const surgeEvent = chaosMap[nodeId]?.type === 'traffic-surge' ? chaosMap[nodeId] : undefined
    const effectiveInputRps = surgeEvent ? inputRps * surgeEvent.magnitude : inputRps

    const snap = computeNode(
      node,
      effectiveInputRps,
      componentState[nodeId] ?? { queuedRequests: 0 },
      clientRpsMap[nodeId],
      chaosMap[nodeId],
    )
    nodeSnaps[nodeId] = snap

    // Distribute output to outgoing edges using split weights.
    // Health-check behaviour: skip edges to nodes with active node-failure chaos
    // so a load balancer naturally reroutes around failed backends.
    // Exception: multi-AZ databases survive node-failure (standby promotion).
    const outgoing = outgoingEdges.get(nodeId)!
    if (outgoing.length > 0) {
      const isNodeFailing = (targetId: string): boolean => {
        if (chaosMap[targetId]?.type !== 'node-failure') return false
        const targetNode = nodeMap.get(targetId)
        if (targetNode?.componentType === 'database') {
          if ((targetNode.config as DatabaseConfig).multiAz) return false
        }
        return true
      }

      const healthyEdges = outgoing.filter((e) => !isNodeFailing(e.target))
      const routingPool  = healthyEdges.length > 0 ? healthyEdges : outgoing
      const totalWeight  = routingPool.reduce((s, e) => s + (e.splitWeight ?? 1), 0)

      for (const edge of outgoing) {
        const failing    = isNodeFailing(edge.target)
        const fraction   = failing ? 0 : (edge.splitWeight ?? 1) / totalWeight
        const throughput = snap.outputRps * fraction
        edgeThroughput[edge.id] = throughput
        edgeSnaps[edge.id] = {
          id: edge.id,
          throughputRps: throughput,
          latencyMs: snap.latencyMs,
          dropRate: failing ? 1 : snap.errorRate,
        }
      }
    }
  }

  // ── System aggregates ─────────────────────────────────────────────────────

  const systemCostPerHour = Object.values(nodeSnaps).reduce((s, n) => s + n.costPerHour, 0)
  const criticalPathMs = computeCriticalPath(order, incomingEdges, nodeSnaps)
  const systemP99LatencyMs = criticalPathMs * 2.5

  // Only count egress nodes that actually received traffic. A failed node that
  // the load balancer health-checked out of rotation has inputRps=0 and should
  // not drag up the system error rate — from users' perspective those requests
  // never reached it.
  const activeEgressIds = egressIds.filter((id) => (nodeSnaps[id]?.inputRps ?? 0) > 0)
  const routedErrorRate =
    activeEgressIds.length > 0
      ? activeEgressIds.reduce((s, id) => s + (nodeSnaps[id]?.errorRate ?? 0), 0) / activeEgressIds.length
      : egressIds.length > 0
        ? egressIds.reduce((s, id) => s + (nodeSnaps[id]?.errorRate ?? 0), 0) / egressIds.length
        : 0

  // Total ingress = sum of all client outputs (or global if no clients)
  const totalIngress = hasClients
    ? Object.values(clientRpsMap).reduce((s, r) => s + r, 0)
    : globalIngressRps

  // Client nodes with no outgoing edges generate traffic that goes nowhere — treat
  // as 100% error (requests are dropped). Blend into systemErrorRate by RPS weight.
  const unroutedClientRps = hasClients
    ? graph.nodes
        .filter((n) => n.componentType === 'client' && !graph.edges.some((e) => e.source === n.id))
        .reduce((sum, n) => sum + (nodeSnaps[n.id]?.outputRps ?? 0), 0)
    : 0
  const systemErrorRate =
    totalIngress > 0 && unroutedClientRps > 0
      ? (unroutedClientRps / totalIngress) * 1.0 +
        ((totalIngress - unroutedClientRps) / totalIngress) * routedErrorRate
      : routedErrorRate

  return {
    simTimeMs,
    ingressRps: totalIngress,
    nodes: Object.values(nodeSnaps),
    edges: Object.values(edgeSnaps),
    systemP99LatencyMs,
    systemErrorRate,
    systemCostPerHour,
  }
}

// ── Topological sort (Kahn's) ─────────────────────────────────────────────────

export function topologicalSort(graph: SimGraph): string[] {
  const inDegree: Record<string, number> = {}
  const adj: Record<string, string[]> = {}

  for (const n of graph.nodes) { inDegree[n.id] = 0; adj[n.id] = [] }
  for (const e of graph.edges) {
    inDegree[e.target] = (inDegree[e.target] ?? 0) + 1
    adj[e.source].push(e.target)
  }

  const queue = Object.entries(inDegree).filter(([, d]) => d === 0).map(([id]) => id)
  const result: string[] = []

  while (queue.length > 0) {
    const id = queue.shift()!
    result.push(id)
    for (const nb of adj[id] ?? []) {
      if (--inDegree[nb] === 0) queue.push(nb)
    }
  }

  const visited = new Set(result)
  const remaining = graph.nodes.map((n) => n.id).filter((id) => !visited.has(id))
  return [...result, ...remaining]
}

// ── Critical path ─────────────────────────────────────────────────────────────

function computeCriticalPath(
  order: string[],
  incomingEdges: Map<string, SimEdge[]>,
  snaps: Record<string, NodeSnapshot>,
): number {
  const pathLat: Record<string, number> = {}
  for (const nodeId of order) {
    const own = snaps[nodeId]?.latencyMs ?? 0
    const incoming = incomingEdges.get(nodeId) ?? []
    const maxUp = incoming.reduce((m, e) => Math.max(m, pathLat[e.source] ?? 0), 0)
    pathLat[nodeId] = maxUp + own
  }
  return Math.max(0, ...Object.values(pathLat))
}

function emptySnapshot(simTimeMs: number, ingressRps: number): SimSnapshot {
  return { simTimeMs, ingressRps, nodes: [], edges: [], systemP99LatencyMs: 0, systemErrorRate: 0, systemCostPerHour: 0 }
}
