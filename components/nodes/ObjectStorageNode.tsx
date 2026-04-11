'use client'

import { type NodeProps } from '@xyflow/react'
import { Archive } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { type ComponentNodeData } from '@/lib/store/architectureStore'
import { type ObjectStorageConfig, OBJECT_STORAGE_COST_PER_HOUR } from '@/lib/components/definitions'

export function ObjectStorageNode(props: NodeProps & { data: ComponentNodeData }) {
  const config = props.data.config as ObjectStorageConfig
  const costPerHour = config.replication === 'cross-region'
    ? OBJECT_STORAGE_COST_PER_HOUR * 2
    : OBJECT_STORAGE_COST_PER_HOUR

  return (
    <BaseNode
      {...props}
      icon={<Archive size={14} />}
      stats={[
        { label: 'Class',       value: config.storageClass === 'standard' ? 'Standard' : 'Infreq. Access' },
        { label: 'Replication', value: config.replication === 'cross-region' ? 'Cross-Region' : 'Single-Region' },
        { label: 'Latency',     value: '~50ms' },
        { label: 'Cost',        value: `$${costPerHour.toFixed(3)}/hr` },
      ]}
    />
  )
}
