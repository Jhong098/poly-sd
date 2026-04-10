'use client'

import { type NodeProps } from '@xyflow/react'
import { Globe } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { type ComponentNodeData } from '@/lib/store/architectureStore'
import { type CdnConfig, CDN_COST_PER_REGION_HOUR } from '@/lib/components/definitions'

export function CdnNode(props: NodeProps & { data: ComponentNodeData }) {
  const config = props.data.config as CdnConfig
  const costPerHour = config.regions * CDN_COST_PER_REGION_HOUR

  return (
    <BaseNode
      {...props}
      icon={<Globe size={14} />}
      stats={[
        { label: 'Hit Rate', value: `${(config.hitRate * 100).toFixed(0)}%` },
        { label: 'Regions',  value: `${config.regions} PoPs` },
        { label: 'TTL',      value: `${config.ttlSeconds}s` },
        { label: 'Cost',     value: `$${costPerHour.toFixed(3)}/hr` },
      ]}
    />
  )
}
