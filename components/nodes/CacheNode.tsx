'use client'

import { type NodeProps } from '@xyflow/react'
import { Zap } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { type ComponentNodeData } from '@/lib/store/architectureStore'
import { type CacheConfig, CACHE_INSTANCES } from '@/lib/components/definitions'

export function CacheNode(props: NodeProps & { data: ComponentNodeData }) {
  const config = props.data.config as CacheConfig
  const instance = CACHE_INSTANCES[config.instanceType]

  return (
    <BaseNode
      {...props}
      icon={<Zap size={14} />}
      stats={[
        { label: 'Instance', value: config.instanceType },
        { label: 'Hit rate', value: `${(config.hitRate * 100).toFixed(0)}%` },
        { label: 'TTL', value: `${config.ttlSeconds}s` },
        { label: 'Cost', value: `$${instance.costPerHour.toFixed(3)}/hr` },
      ]}
    />
  )
}
