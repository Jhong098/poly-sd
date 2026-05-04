import { describe, it, expect } from 'vitest'
import { resolveGraph, topologicalSort } from '@/sim/graph'
import type { SimGraph } from '@/sim/types'
import type { ServerConfig, DatabaseConfig, LoadBalancerConfig, ClientConfig } from '@/lib/components/definitions'

// ── Helpers ───────────────────────────────────────────────────────────────────

function edge(id: string, source: string, target: string, splitWeight = 1) {
  return { id, source, target, splitWeight }
}

function serverNode(id: string): { id: string; componentType: 'server'; config: ServerConfig } {
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

const emptyState = (graph: SimGraph) =>
  Object.fromEntries(graph.nodes.map((n) => [n.id, { queuedRequests: 0 }]))

// ── topologicalSort ───────────────────────────────────────────────────────────

describe('topologicalSort', () => {
  it('orders a linear chain correctly (A→B→C)', () => {
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
    const graph: SimGraph = {
      nodes: [serverNode('A'), serverNode('B')],
      edges: [edge('e1', 'A', 'B'), edge('e2', 'B', 'A')],
    }
    const order = topologicalSort(graph)
    expect(order).toHaveLength(2)
  })
})

// ── resolveGraph — basic flow ─────────────────────────────────────────────────

describe('resolveGraph — linear chain', () => {
  it('propagates RPS through a chain: server → database', () => {
    const graph: SimGraph = {
      nodes: [serverNode('srv'), serverNode('db')],
      edges: [edge('e1', 'srv', 'db')],
    }
    const snap = resolveGraph(graph, emptyState(graph), 100, 0)
    const srvSnap = snap.nodes.find((n) => n.id === 'srv')
    const dbSnap  = snap.nodes.find((n) => n.id === 'db')
    expect(srvSnap!.inputRps).toBeCloseTo(100, 0)
    expect(dbSnap!.inputRps).toBeGreaterThan(0)
  })

  it('critical path sums latencies across nodes', () => {
    const graph: SimGraph = {
      nodes: [serverNode('a'), serverNode('b'), serverNode('c')],
      edges: [edge('e1', 'a', 'b'), edge('e2', 'b', 'c')],
    }
    const multiSnap = resolveGraph(graph, emptyState(graph), 100, 0)
    const singleSnap = resolveGraph(
      { nodes: [serverNode('x')], edges: [] },
      { x: { queuedRequests: 0 } },
      100, 0,
    )
    expect(multiSnap.systemP99LatencyMs).toBeGreaterThan(singleSnap.systemP99LatencyMs)
  })
})

describe('resolveGraph — fan-out with split weights', () => {
  it('distributes RPS equally with equal weights', () => {
    const graph: SimGraph = {
      nodes: [lbNode('lb'), serverNode('s1'), serverNode('s2')],
      edges: [edge('e1', 'lb', 's1', 1), edge('e2', 'lb', 's2', 1)],
    }
    const snap = resolveGraph(graph, emptyState(graph), 200, 0)
    const s1 = snap.nodes.find((n) => n.id === 's1')
    const s2 = snap.nodes.find((n) => n.id === 's2')
    expect(s1!.inputRps).toBeCloseTo(s2!.inputRps, 0)
  })

  it('distributes proportionally with unequal weights (3:1)', () => {
    const graph: SimGraph = {
      nodes: [lbNode('lb'), serverNode('s1'), serverNode('s2')],
      edges: [edge('e1', 'lb', 's1', 3), edge('e2', 'lb', 's2', 1)],
    }
    const snap = resolveGraph(graph, emptyState(graph), 400, 0)
    const s1 = snap.nodes.find((n) => n.id === 's1')
    const s2 = snap.nodes.find((n) => n.id === 's2')
    expect(s1!.inputRps / s2!.inputRps).toBeCloseTo(3, 0)
  })
})

describe('resolveGraph — health-check rerouting', () => {
  it('LB routes 100% to healthy server when other has node-failure', () => {
    const graph: SimGraph = {
      nodes: [lbNode('lb'), serverNode('s1'), serverNode('s2')],
      edges: [edge('e1', 'lb', 's1', 1), edge('e2', 'lb', 's2', 1)],
    }
    const chaosMap = {
      s2: { id: 'c1', nodeId: 's2', type: 'node-failure' as const, startSimMs: 0, durationMs: 10_000, magnitude: 1 },
    }
    const snap = resolveGraph(graph, emptyState(graph), 200, 0, {}, chaosMap)
    const s1 = snap.nodes.find((n) => n.id === 's1')
    const s2 = snap.nodes.find((n) => n.id === 's2')
    expect(s2!.inputRps).toBe(0)
    expect(s1!.inputRps).toBeGreaterThan(0)
  })

  it('multi-AZ DB under node-failure still receives traffic', () => {
    const db: SimGraph['nodes'][0] = {
      id: 'db',
      componentType: 'database',
      config: { instanceType: 'db.t3.medium', readReplicas: 0, maxConnections: 300, multiAz: true } as DatabaseConfig,
    }
    const graph: SimGraph = {
      nodes: [serverNode('srv'), db],
      edges: [edge('e1', 'srv', 'db')],
    }
    const chaosMap = {
      db: { id: 'c1', nodeId: 'db', type: 'node-failure' as const, startSimMs: 0, durationMs: 10_000, magnitude: 1 },
    }
    const snap = resolveGraph(graph, emptyState(graph), 100, 0, {}, chaosMap)
    const dbSnap = snap.nodes.find((n) => n.id === 'db')
    expect(dbSnap!.inputRps).toBeGreaterThan(0)
  })
})

describe('resolveGraph — client nodes', () => {
  it('uses client node RPS instead of globalIngressRps', () => {
    const graph: SimGraph = {
      nodes: [clientNode('cl', 500), serverNode('srv')],
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
    // Both idle: t3.medium costPerHour = 0.0416 each
    expect(snap.systemCostPerHour).toBeCloseTo(0.0416 * 2, 4)
  })
})

describe('resolveGraph — unrouted client nodes', () => {
  it('blends dropped client traffic into systemErrorRate', () => {
    // A client with no outgoing edges: all its output RPS is dropped.
    const graph: SimGraph = {
      nodes: [clientNode('cl1', 100)],
      edges: [],
    }
    const clientRpsMap = { cl1: 100 }
    const snap = resolveGraph(graph, emptyState(graph), 0, 0, clientRpsMap)
    // All ingress is unrouted → systemErrorRate should be 1 (100%)
    expect(snap.systemErrorRate).toBe(1)
  })

  it('partial unrouted traffic blends proportionally into systemErrorRate', () => {
    // cl1 → srv (routed), cl2 has no edges (unrouted)
    const graph: SimGraph = {
      nodes: [clientNode('cl1', 100), clientNode('cl2', 100), serverNode('srv')],
      edges: [edge('e1', 'cl1', 'srv')],
    }
    const clientRpsMap = { cl1: 100, cl2: 100 }
    const snap = resolveGraph(graph, emptyState(graph), 0, 0, clientRpsMap)
    // 100 / 200 ingress is unrouted → systemErrorRate ≥ 0.5
    expect(snap.systemErrorRate).toBeGreaterThanOrEqual(0.5)
  })
})
