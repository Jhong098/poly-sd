'use client'

import { create } from 'zustand'
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type XYPosition,
} from '@xyflow/react'
import {
  type ComponentType,
  type ComponentConfig,
  DEFAULT_CONFIGS,
} from '@/lib/components/definitions'
import type { StarterNode, StarterEdge } from '@/lib/challenges/types'

// ── Node data shape ──────────────────────────────────────────────────────────

export type ComponentNodeData = {
  componentType: ComponentType
  label: string
  config: ComponentConfig
  [key: string]: unknown
}

export type ComponentNode = Node<ComponentNodeData>

// ── Edge data shape ──────────────────────────────────────────────────────────

export type EdgeData = {
  splitWeight: number    // relative weight for traffic distribution (default 1)
  [key: string]: unknown
}

export type ComponentEdge = Edge<EdgeData>

// ── Store ────────────────────────────────────────────────────────────────────

type ArchitectureState = {
  nodes: ComponentNode[]
  edges: ComponentEdge[]
  selectedNodeId: string | null
  selectedEdgeId: string | null
  _nodeCounter: number

  onNodesChange: OnNodesChange<ComponentNode>
  onEdgesChange: OnEdgesChange
  onConnect: OnConnect
  addNode: (componentType: ComponentType, position: XYPosition) => void
  removeNode: (nodeId: string) => void
  setSelectedNodeId: (id: string | null) => void
  setSelectedEdgeId: (id: string | null) => void
  updateNodeConfig: (nodeId: string, patch: Partial<ComponentConfig>) => void
  updateNodeLabel: (nodeId: string, label: string) => void
  updateEdgeSplitWeight: (edgeId: string, weight: number) => void
  initFromStarterGraph: (nodes: StarterNode[], edges: StarterEdge[]) => void
  loadDraft: (nodes: ComponentNode[], edges: ComponentEdge[]) => void
  clearCanvas: () => void
}

export const useArchitectureStore = create<ArchitectureState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  _nodeCounter: 0,

  onNodesChange: (changes: NodeChange<ComponentNode>[]) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) })
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    set({ edges: applyEdgeChanges(changes, get().edges) as ComponentEdge[] })
  },

  onConnect: (connection: Connection) => {
    const newEdge: ComponentEdge = {
      ...connection,
      id: `e-${connection.source}-${connection.target}-${Date.now()}`,
      data: { splitWeight: 1 },
      type: 'default',
    }
    set({ edges: addEdge(newEdge, get().edges) as ComponentEdge[] })
  },

  addNode: (componentType, position) => {
    const counter = get()._nodeCounter + 1
    const id = `${componentType}-${counter}`
    const label = `${componentType.charAt(0).toUpperCase() + componentType.slice(1)} ${counter}`
    const newNode: ComponentNode = {
      id,
      type: componentType,
      position,
      data: { componentType, label, config: { ...DEFAULT_CONFIGS[componentType] } },
    }
    set({ nodes: [...get().nodes, newNode], _nodeCounter: counter })
  },

  removeNode: (nodeId) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNodeId: get().selectedNodeId === nodeId ? null : get().selectedNodeId,
    })
  },

  setSelectedNodeId: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  setSelectedEdgeId: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),

  updateNodeConfig: (nodeId, patch) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, config: { ...n.data.config, ...patch } as ComponentConfig } }
          : n,
      ),
    })
  },

  updateNodeLabel: (nodeId, label) => {
    set({ nodes: get().nodes.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, label } } : n) })
  },

  updateEdgeSplitWeight: (edgeId, weight) => {
    set({
      edges: get().edges.map((e) =>
        e.id === edgeId ? { ...e, data: { ...e.data, splitWeight: Math.max(0.1, weight) } } : e,
      ),
    })
  },

  clearCanvas: () => {
    set({ nodes: [], edges: [], selectedNodeId: null, selectedEdgeId: null, _nodeCounter: 0 })
  },

  initFromStarterGraph: (starterNodes, starterEdges) => {
    const nodes: ComponentNode[] = starterNodes.map((sn) => ({
      id: sn.id,
      type: sn.type,
      position: sn.position,
      data: {
        componentType: sn.type,
        label: sn.label ?? `${sn.type.charAt(0).toUpperCase() + sn.type.slice(1)}`,
        config: { ...DEFAULT_CONFIGS[sn.type], ...(sn.config ?? {}) } as ComponentConfig,
      },
    }))

    const edges: ComponentEdge[] = starterEdges.map((se, i) => ({
      id: `starter-e-${i}`,
      source: se.source,
      target: se.target,
      data: { splitWeight: 1 },
      type: 'default',
    }))

    set({ nodes, edges, selectedNodeId: null, selectedEdgeId: null, _nodeCounter: starterNodes.length })
  },

  loadDraft: (nodes, edges) => {
    // Derive _nodeCounter from max numeric suffix in existing node IDs
    const maxCounter = nodes.reduce((max, n) => {
      const parts = n.id.split('-')
      const num = parseInt(parts[parts.length - 1], 10)
      return isNaN(num) ? max : Math.max(max, num)
    }, 0)
    set({ nodes, edges, selectedNodeId: null, selectedEdgeId: null, _nodeCounter: maxCounter })
  },
}))
