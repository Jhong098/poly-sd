import type { SimSnapshot, SimDelta, NodeSnapshot, EdgeSnapshot } from './types'

function shallowEqual<T extends Record<string, unknown>>(a: T, b: T): boolean {
  const keysA = Object.keys(a) as (keyof T)[]
  if (keysA.length !== Object.keys(b).length) return false
  for (const key of keysA) {
    if (a[key] !== b[key]) return false
  }
  return true
}

export function computeDelta(prev: SimSnapshot, next: SimSnapshot): SimDelta {
  const prevNodeMap = new Map<string, NodeSnapshot>(prev.nodes.map(n => [n.id, n]))
  const prevEdgeMap = new Map<string, EdgeSnapshot>(prev.edges.map(e => [e.id, e]))

  const changedNodes = next.nodes.filter(n => {
    const p = prevNodeMap.get(n.id)
    return p === undefined || !shallowEqual(p as Record<string, unknown>, n as Record<string, unknown>)
  })

  const changedEdges = next.edges.filter(e => {
    const p = prevEdgeMap.get(e.id)
    return p === undefined || !shallowEqual(p as Record<string, unknown>, e as Record<string, unknown>)
  })

  return {
    simTimeMs: next.simTimeMs,
    ingressRps: next.ingressRps,
    systemP99LatencyMs: next.systemP99LatencyMs,
    systemErrorRate: next.systemErrorRate,
    systemCostPerHour: next.systemCostPerHour,
    changedNodes,
    changedEdges,
  }
}

export function applyDelta(prev: SimSnapshot, delta: SimDelta): SimSnapshot {
  const changedNodeMap = new Map<string, NodeSnapshot>(delta.changedNodes.map(n => [n.id, n]))
  const changedEdgeMap = new Map<string, EdgeSnapshot>(delta.changedEdges.map(e => [e.id, e]))

  return {
    simTimeMs: delta.simTimeMs,
    ingressRps: delta.ingressRps,
    systemP99LatencyMs: delta.systemP99LatencyMs,
    systemErrorRate: delta.systemErrorRate,
    systemCostPerHour: delta.systemCostPerHour,
    nodes: prev.nodes.map(n => changedNodeMap.get(n.id) ?? n),
    edges: prev.edges.map(e => changedEdgeMap.get(e.id) ?? e),
  }
}
