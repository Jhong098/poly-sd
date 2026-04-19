'use client'

import { memo } from 'react'
import { type NodeProps } from '@xyflow/react'
import { Database } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { type ComponentNodeData } from '@/lib/store/architectureStore'
import { type DatabaseConfig, DATABASE_INSTANCES } from '@/lib/components/definitions'

export const DatabaseNode = memo(function DatabaseNode(props: NodeProps & { data: ComponentNodeData }) {
  const config = props.data.config as DatabaseConfig
  const instance = DATABASE_INSTANCES[config.instanceType]
  const totalCost = instance.costPerHour * (1 + config.readReplicas) * (config.multiAz ? 2 : 1)

  return (
    <BaseNode
      {...props}
      icon={<Database size={14} />}
      stats={[
        { label: 'Instance', value: config.instanceType },
        { label: 'Replicas', value: config.readReplicas > 0 ? `+${config.readReplicas} read` : 'none' },
        { label: 'Max conn', value: config.maxConnections.toLocaleString() },
        { label: 'Multi-AZ', value: config.multiAz ? 'yes' : 'no' },
        { label: 'Cost', value: `$${totalCost.toFixed(3)}/hr` },
      ]}
    />
  )
})
