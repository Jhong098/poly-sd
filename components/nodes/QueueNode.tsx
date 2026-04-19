'use client'

import { memo } from 'react'
import { type NodeProps } from '@xyflow/react'
import { List } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { type ComponentNodeData } from '@/lib/store/architectureStore'
import { type QueueConfig, QUEUE_COST_PER_HOUR } from '@/lib/components/definitions'

export const QueueNode = memo(function QueueNode(props: NodeProps & { data: ComponentNodeData }) {
  const config = props.data.config as QueueConfig

  return (
    <BaseNode
      {...props}
      icon={<List size={14} />}
      stats={[
        { label: 'Drain rate', value: `${config.processingRatePerSec.toLocaleString()} RPS` },
        { label: 'Max depth',  value: config.maxDepth.toLocaleString() },
        { label: 'Cost',       value: `$${QUEUE_COST_PER_HOUR.toFixed(3)}/hr` },
      ]}
    />
  )
})
