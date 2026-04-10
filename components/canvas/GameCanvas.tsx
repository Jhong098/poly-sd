'use client'

import { useCallback, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
  type NodeTypes,
  type EdgeTypes,
  type NodeMouseHandler,
} from '@xyflow/react'

import { ClientNode }       from '@/components/nodes/ClientNode'
import { ServerNode }       from '@/components/nodes/ServerNode'
import { DatabaseNode }     from '@/components/nodes/DatabaseNode'
import { CacheNode }        from '@/components/nodes/CacheNode'
import { LoadBalancerNode } from '@/components/nodes/LoadBalancerNode'
import { QueueNode }        from '@/components/nodes/QueueNode'
import { ApiGatewayNode }   from '@/components/nodes/ApiGatewayNode'
import { K8sFleetNode }     from '@/components/nodes/K8sFleetNode'
import { KafkaNode }        from '@/components/nodes/KafkaNode'
import { CdnNode }          from '@/components/nodes/CdnNode'
import { AnimatedEdge }     from '@/components/canvas/edges/AnimatedEdge'
import { ChaosMenu }        from '@/components/canvas/ChaosMenu'
import { useArchitectureStore, type ComponentNode } from '@/lib/store/architectureStore'
import { useSimStore } from '@/lib/store/simStore'
import type { ComponentType } from '@/lib/components/definitions'

const NODE_TYPES: NodeTypes = {
  client:          ClientNode,
  server:          ServerNode,
  database:        DatabaseNode,
  cache:           CacheNode,
  'load-balancer': LoadBalancerNode,
  queue:           QueueNode,
  'api-gateway':   ApiGatewayNode,
  'k8s-fleet':     K8sFleetNode,
  kafka:           KafkaNode,
  cdn:             CdnNode,
}

const EDGE_TYPES: EdgeTypes = {
  default: AnimatedEdge,
}

function nodeColor(node: ComponentNode): string {
  const map: Record<string, string> = {
    client:          '#00e5ff',
    server:          '#00bfa5',
    database:        '#a78bfa',
    cache:           '#fbbf24',
    'load-balancer': '#38bdf8',
    queue:           '#fb923c',
  }
  return map[node.data.componentType] ?? '#0d3d4e'
}

type ChaosMenuState = { nodeId: string; nodeLabel: string; x: number; y: number } | null

export function GameCanvas() {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()
  const {
    nodes, edges,
    onNodesChange, onEdgesChange, onConnect,
    addNode, setSelectedNodeId, setSelectedEdgeId,
  } = useArchitectureStore()

  const simStatus = useSimStore((s) => s.status)
  const isRunning = simStatus === 'running' || simStatus === 'paused'
  const [chaosMenu, setChaosMenu] = useState<ChaosMenuState>(null)

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
        deleteKeyCode="Delete"
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
