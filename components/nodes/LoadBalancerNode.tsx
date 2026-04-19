'use client'

import { memo } from 'react'
import { type NodeProps } from '@xyflow/react'
import { Shuffle } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { type ComponentNodeData } from '@/lib/store/architectureStore'
import { type LoadBalancerConfig, LB_COST_PER_HOUR } from '@/lib/components/definitions'

export const LoadBalancerNode = memo(function LoadBalancerNode(props: NodeProps & { data: ComponentNodeData }) {
  const config = props.data.config as LoadBalancerConfig

  return (
    <BaseNode
      {...props}
      icon={<Shuffle size={14} />}
      stats={[
        { label: 'Algorithm', value: config.algorithm },
        { label: 'Max RPS',   value: '100,000' },
        { label: 'Cost',      value: `$${LB_COST_PER_HOUR.toFixed(3)}/hr` },
      ]}
    />
  )
})
