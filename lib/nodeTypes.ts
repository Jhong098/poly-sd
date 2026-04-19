import type { NodeTypes, EdgeTypes } from '@xyflow/react'
import { ClientNode }        from '@/components/nodes/ClientNode'
import { ServerNode }        from '@/components/nodes/ServerNode'
import { DatabaseNode }      from '@/components/nodes/DatabaseNode'
import { CacheNode }         from '@/components/nodes/CacheNode'
import { LoadBalancerNode }  from '@/components/nodes/LoadBalancerNode'
import { QueueNode }         from '@/components/nodes/QueueNode'
import { ApiGatewayNode }    from '@/components/nodes/ApiGatewayNode'
import { K8sFleetNode }      from '@/components/nodes/K8sFleetNode'
import { KafkaNode }         from '@/components/nodes/KafkaNode'
import { CdnNode }           from '@/components/nodes/CdnNode'
import { NoSqlNode }         from '@/components/nodes/NoSqlNode'
import { ObjectStorageNode } from '@/components/nodes/ObjectStorageNode'
import { AnimatedEdge }      from '@/components/canvas/edges/AnimatedEdge'
import type { ComponentNode } from '@/lib/store/architectureStore'

export const NODE_TYPES: NodeTypes = {
  client:           ClientNode,
  server:           ServerNode,
  database:         DatabaseNode,
  cache:            CacheNode,
  'load-balancer':  LoadBalancerNode,
  queue:            QueueNode,
  'api-gateway':    ApiGatewayNode,
  'k8s-fleet':      K8sFleetNode,
  kafka:            KafkaNode,
  cdn:              CdnNode,
  nosql:            NoSqlNode,
  'object-storage': ObjectStorageNode,
}

export const EDGE_TYPES: EdgeTypes = {
  default: AnimatedEdge,
}

const NODE_COLOR_MAP: Record<string, string> = {
  client:           '#00e5ff',
  server:           '#00bfa5',
  database:         '#a78bfa',
  cache:            '#fbbf24',
  'load-balancer':  '#38bdf8',
  queue:            '#fb923c',
  nosql:            '#e879f9',
  'object-storage': '#93c5fd',
}

export function nodeColor(node: ComponentNode): string {
  return NODE_COLOR_MAP[node.data.componentType] ?? '#0d3d4e'
}
