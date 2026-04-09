'use client'

import { useCallback, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react'

import { ClientNode }       from '@/components/nodes/ClientNode'
import { ServerNode }       from '@/components/nodes/ServerNode'
import { DatabaseNode }     from '@/components/nodes/DatabaseNode'
import { CacheNode }        from '@/components/nodes/CacheNode'
import { LoadBalancerNode } from '@/components/nodes/LoadBalancerNode'
import { AnimatedEdge } from '@/components/canvas/edges/AnimatedEdge'
import { useArchitectureStore, type ComponentNode } from '@/lib/store/architectureStore'
import type { ComponentType } from '@/lib/components/definitions'

const NODE_TYPES: NodeTypes = {
  client:          ClientNode,
  server:          ServerNode,
  database:        DatabaseNode,
  cache:           CacheNode,
  'load-balancer': LoadBalancerNode,
}

const EDGE_TYPES: EdgeTypes = {
  default: AnimatedEdge,
}

function nodeColor(node: ComponentNode): string {
  const map: Record<string, string> = {
    client:          '#f59e0b',
    server:          '#3b82f6',
    database:        '#8b5cf6',
    cache:           '#10b981',
    'load-balancer': '#0ea5e9',
  }
  return map[node.data.componentType] ?? '#64748b'
}

export function GameCanvas() {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()
  const {
    nodes, edges,
    onNodesChange, onEdgesChange, onConnect,
    addNode, setSelectedNodeId, setSelectedEdgeId,
  } = useArchitectureStore()

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
        onPaneClick={() => { setSelectedNodeId(null); setSelectedEdgeId(null) }}
        onDragOver={onDragOver}
        onDrop={onDrop}
        deleteKeyCode="Delete"
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1e293b" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={nodeColor}
          maskColor="rgba(3,7,18,0.7)"
          style={{ width: 160, height: 100 }}
        />
      </ReactFlow>
    </div>
  )
}
