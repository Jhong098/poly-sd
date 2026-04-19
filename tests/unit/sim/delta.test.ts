import { computeDelta, applyDelta } from '@/sim/delta'
import type { SimSnapshot, NodeSnapshot, EdgeSnapshot } from '@/sim/types'

function makeNode(id: string, inputRps = 100, status: NodeSnapshot['status'] = 'healthy'): NodeSnapshot {
  return { id, inputRps, outputRps: 95, utilization: 0.5, latencyMs: 10, errorRate: 0, costPerHour: 1, status }
}

function makeEdge(id: string, throughputRps = 100): EdgeSnapshot {
  return { id, throughputRps, latencyMs: 5, dropRate: 0 }
}

function makeSnapshot(overrides: Partial<SimSnapshot> = {}): SimSnapshot {
  return {
    simTimeMs: 1000,
    ingressRps: 200,
    systemP99LatencyMs: 50,
    systemErrorRate: 0,
    systemCostPerHour: 5,
    nodes: [makeNode('n1'), makeNode('n2')],
    edges: [makeEdge('e1'), makeEdge('e2')],
    ...overrides,
  }
}

describe('computeDelta', () => {
  it('returns empty changedNodes when all nodes are identical', () => {
    const prev = makeSnapshot()
    const next = makeSnapshot({ simTimeMs: 1200 })
    const delta = computeDelta(prev, next)
    expect(delta.changedNodes).toHaveLength(0)
  })

  it('returns empty changedEdges when all edges are identical', () => {
    const prev = makeSnapshot()
    const next = makeSnapshot({ simTimeMs: 1200 })
    const delta = computeDelta(prev, next)
    expect(delta.changedEdges).toHaveLength(0)
  })

  it('includes only changed nodes', () => {
    const prev = makeSnapshot()
    const next = makeSnapshot({
      simTimeMs: 1200,
      nodes: [makeNode('n1', 150), makeNode('n2')], // n1 changed, n2 unchanged
    })
    const delta = computeDelta(prev, next)
    expect(delta.changedNodes).toHaveLength(1)
    expect(delta.changedNodes[0].id).toBe('n1')
    expect(delta.changedNodes[0].inputRps).toBe(150)
  })

  it('includes only changed edges', () => {
    const prev = makeSnapshot()
    const next = makeSnapshot({
      simTimeMs: 1200,
      edges: [makeEdge('e1', 200), makeEdge('e2')], // e1 changed, e2 unchanged
    })
    const delta = computeDelta(prev, next)
    expect(delta.changedEdges).toHaveLength(1)
    expect(delta.changedEdges[0].id).toBe('e1')
    expect(delta.changedEdges[0].throughputRps).toBe(200)
  })

  it('includes all nodes when all nodes changed', () => {
    const prev = makeSnapshot()
    const next = makeSnapshot({
      simTimeMs: 1200,
      nodes: [makeNode('n1', 150), makeNode('n2', 75)],
    })
    const delta = computeDelta(prev, next)
    expect(delta.changedNodes).toHaveLength(2)
  })

  it('always includes system-level scalar fields', () => {
    const prev = makeSnapshot()
    const next = makeSnapshot({ simTimeMs: 1200, ingressRps: 300, systemP99LatencyMs: 80 })
    const delta = computeDelta(prev, next)
    expect(delta.simTimeMs).toBe(1200)
    expect(delta.ingressRps).toBe(300)
    expect(delta.systemP99LatencyMs).toBe(80)
    expect(delta.systemErrorRate).toBe(next.systemErrorRate)
    expect(delta.systemCostPerHour).toBe(next.systemCostPerHour)
  })

  it('includes new nodes not present in prev', () => {
    const prev = makeSnapshot({ nodes: [makeNode('n1')] })
    const next = makeSnapshot({ nodes: [makeNode('n1'), makeNode('n2')] })
    const delta = computeDelta(prev, next)
    expect(delta.changedNodes.some(n => n.id === 'n2')).toBe(true)
  })

  it('includes node when optional field changes from absent to present', () => {
    const prev = makeSnapshot({ nodes: [{ ...makeNode('n1'), replicaCount: undefined }] })
    const next = makeSnapshot({ nodes: [{ ...makeNode('n1'), replicaCount: 3 }] })
    const delta = computeDelta(prev, next)
    expect(delta.changedNodes).toHaveLength(1)
    expect(delta.changedNodes[0].replicaCount).toBe(3)
  })
})

describe('applyDelta', () => {
  it('updates system-level fields from delta', () => {
    const prev = makeSnapshot()
    const next = makeSnapshot({ simTimeMs: 1200, ingressRps: 300, systemP99LatencyMs: 80 })
    const delta = computeDelta(prev, next)
    const result = applyDelta(prev, delta)
    expect(result.simTimeMs).toBe(1200)
    expect(result.ingressRps).toBe(300)
    expect(result.systemP99LatencyMs).toBe(80)
  })

  it('preserves unchanged nodes by reference', () => {
    const prev = makeSnapshot()
    const next = makeSnapshot({
      simTimeMs: 1200,
      nodes: [makeNode('n1', 150), makeNode('n2')], // n2 unchanged
    })
    const delta = computeDelta(prev, next)
    const result = applyDelta(prev, delta)
    expect(result.nodes.find(n => n.id === 'n2')).toBe(prev.nodes.find(n => n.id === 'n2'))
  })

  it('applies changed nodes', () => {
    const prev = makeSnapshot()
    const next = makeSnapshot({
      simTimeMs: 1200,
      nodes: [makeNode('n1', 150), makeNode('n2')],
    })
    const delta = computeDelta(prev, next)
    const result = applyDelta(prev, delta)
    const n1 = result.nodes.find(n => n.id === 'n1')
    expect(n1?.inputRps).toBe(150)
  })

  it('preserves unchanged edges by reference', () => {
    const prev = makeSnapshot()
    const next = makeSnapshot({
      simTimeMs: 1200,
      edges: [makeEdge('e1', 200), makeEdge('e2')], // e2 unchanged
    })
    const delta = computeDelta(prev, next)
    const result = applyDelta(prev, delta)
    expect(result.edges.find(e => e.id === 'e2')).toBe(prev.edges.find(e => e.id === 'e2'))
  })

  it('applies changed edges', () => {
    const prev = makeSnapshot()
    const next = makeSnapshot({
      simTimeMs: 1200,
      edges: [makeEdge('e1', 200), makeEdge('e2')],
    })
    const delta = computeDelta(prev, next)
    const result = applyDelta(prev, delta)
    const e1 = result.edges.find(e => e.id === 'e1')
    expect(e1?.throughputRps).toBe(200)
  })

  it('round-trip: applyDelta(prev, computeDelta(prev, next)) deeply equals next', () => {
    const prev = makeSnapshot()
    const next = makeSnapshot({
      simTimeMs: 1200,
      ingressRps: 300,
      systemP99LatencyMs: 80,
      systemErrorRate: 0.01,
      systemCostPerHour: 7,
      nodes: [makeNode('n1', 150, 'hot'), makeNode('n2', 60)],
      edges: [makeEdge('e1', 200), makeEdge('e2', 50)],
    })
    const result = applyDelta(prev, computeDelta(prev, next))
    expect(result).toEqual(next)
  })

  it('round-trip when nothing changed: result deeply equals next', () => {
    const prev = makeSnapshot()
    const next = makeSnapshot({ simTimeMs: 1200 })
    const result = applyDelta(prev, computeDelta(prev, next))
    expect(result).toEqual(next)
  })
})
