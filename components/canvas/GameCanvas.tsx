'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
  type NodeMouseHandler,
} from '@xyflow/react'

import { ChaosMenu }        from '@/components/canvas/ChaosMenu'
import { useShallow } from 'zustand/shallow'
import { useArchitectureStore, type ComponentNode } from '@/lib/store/architectureStore'
import { useSimStore } from '@/lib/store/simStore'
import type { ComponentType } from '@/lib/components/definitions'
import { NODE_TYPES, EDGE_TYPES, nodeColor } from '@/lib/nodeTypes'

type ChaosMenuState = { nodeId: string; nodeLabel: string; x: number; y: number } | null

export function GameCanvas() {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()
  const {
    nodes, edges,
    onNodesChange, onEdgesChange, onConnect,
    addNode, setSelectedNodeId, setSelectedEdgeId,
  } = useArchitectureStore(
    useShallow((s) => ({
      nodes: s.nodes,
      edges: s.edges,
      onNodesChange: s.onNodesChange,
      onEdgesChange: s.onEdgesChange,
      onConnect: s.onConnect,
      addNode: s.addNode,
      setSelectedNodeId: s.setSelectedNodeId,
      setSelectedEdgeId: s.setSelectedEdgeId,
    }))
  )

  const simStatus = useSimStore((s) => s.status)
  const isRunning = simStatus === 'running' || simStatus === 'paused'
  const [chaosMenu, setChaosMenu] = useState<ChaosMenuState>(null)

  // Expose helpers for e2e tests (dev only)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      ;(window as any).__polySDOnConnect = onConnect
      ;(window as any).__polySDSelectEdge = (edgeId: string) => {
        const state = useArchitectureStore.getState()
        useArchitectureStore.setState({
          edges: state.edges.map((e) => ({ ...e, selected: e.id === edgeId })),
          selectedEdgeId: edgeId,
        })
      }
    }
  }, [onConnect])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const componentType = e.dataTransfer.getData('componentType') as ComponentType
      if (!componentType) return
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      addNode(componentType, position)
    },
    [screenToFlowPosition, addNode],
  )

  const onNodeContextMenu: NodeMouseHandler = useCallback(
    (e, node) => {
      if (!isRunning) return
      e.preventDefault()
      setChaosMenu({
        nodeId: node.id,
        nodeLabel: (node.data as ComponentNode['data']).label,
        x: e.clientX,
        y: e.clientY,
      })
    },
    [isRunning],
  )

  return (
    <div ref={wrapperRef} className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => setSelectedNodeId(node.id)}
        onEdgeClick={(_, edge) => setSelectedEdgeId(edge.id)}
        onPaneClick={() => { setSelectedNodeId(null); setSelectedEdgeId(null); setChaosMenu(null) }}
        onNodeContextMenu={onNodeContextMenu}
        onDragOver={onDragOver}
        onDrop={onDrop}
        deleteKeyCode={['Delete', 'Backspace']}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#0a2d3a" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={nodeColor}
          maskColor="rgba(2,11,15,0.8)"
          style={{ width: 160, height: 100 }}
        />
      </ReactFlow>

      {chaosMenu && isRunning && (
        <ChaosMenu
          nodeId={chaosMenu.nodeId}
          nodeLabel={chaosMenu.nodeLabel}
          x={chaosMenu.x}
          y={chaosMenu.y}
          onClose={() => setChaosMenu(null)}
        />
      )}
    </div>
  )
}
