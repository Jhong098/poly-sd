'use client'

import { memo } from 'react'
import { type NodeProps } from '@xyflow/react'
import { Radio } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { type ComponentNodeData } from '@/lib/store/architectureStore'
import { type KafkaConfig, KAFKA_COST_PER_PARTITION_HOUR, KAFKA_MAX_RPS_PER_PARTITION } from '@/lib/components/definitions'

export const KafkaNode = memo(function KafkaNode(props: NodeProps & { data: ComponentNodeData }) {
  const config = props.data.config as KafkaConfig
  const maxRps = config.partitions * KAFKA_MAX_RPS_PER_PARTITION
  const costPerHour = config.partitions * KAFKA_COST_PER_PARTITION_HOUR

  return (
    <BaseNode
      {...props}
      icon={<Radio size={14} />}
      stats={[
        { label: 'Partitions',      value: String(config.partitions) },
        { label: 'Consumer Groups', value: String(config.consumerGroups) },
        { label: 'Max RPS',         value: maxRps.toLocaleString() },
        { label: 'Cost',            value: `$${costPerHour.toFixed(3)}/hr` },
      ]}
    />
  )
})
