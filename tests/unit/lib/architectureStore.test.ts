import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@xyflow/react', () => ({
  addEdge: (edge: any, edges: any[]) => [...edges, edge],
  applyNodeChanges: (_changes: any, nodes: any[]) => nodes,
  applyEdgeChanges: (_changes: any, edges: any[]) => edges,
}))

import { useArchitectureStore } from '@/lib/store/architectureStore'

function makeEdge(id: string, source: string, target: string) {
  return { id, source, target, data: { splitWeight: 1 } }
}

describe('architectureStore.removeEdge', () => {
  beforeEach(() => {
    useArchitectureStore.setState({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      _nodeCounter: 0,
    })
  })

  it('removes the specified edge', () => {
    useArchitectureStore.setState({
      edges: [makeEdge('e1', 'a', 'b'), makeEdge('e2', 'a', 'c')],
    })
    useArchitectureStore.getState().removeEdge('e1')
    const { edges } = useArchitectureStore.getState()
    expect(edges).toHaveLength(1)
    expect(edges[0].id).toBe('e2')
  })

  it('clears selectedEdgeId when the selected edge is removed', () => {
    useArchitectureStore.setState({
      edges: [makeEdge('e1', 'a', 'b')],
      selectedEdgeId: 'e1',
    })
    useArchitectureStore.getState().removeEdge('e1')
    expect(useArchitectureStore.getState().selectedEdgeId).toBeNull()
  })

  it('preserves selectedEdgeId when a different edge is removed', () => {
    useArchitectureStore.setState({
      edges: [makeEdge('e1', 'a', 'b'), makeEdge('e2', 'a', 'c')],
      selectedEdgeId: 'e2',
    })
    useArchitectureStore.getState().removeEdge('e1')
    expect(useArchitectureStore.getState().selectedEdgeId).toBe('e2')
  })

  it('is a no-op for a non-existent edge id', () => {
    useArchitectureStore.setState({
      edges: [makeEdge('e1', 'a', 'b')],
    })
    useArchitectureStore.getState().removeEdge('nonexistent')
    expect(useArchitectureStore.getState().edges).toHaveLength(1)
  })
})
