'use client'

import { memo } from 'react'
import { type NodeProps } from '@xyflow/react'
import { Server } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { type ComponentNodeData } from '@/lib/store/architectureStore'
import { type ServerConfig, SERVER_INSTANCES } from '@/lib/components/definitions'

export const ServerNode = memo(function ServerNode(props: NodeProps & { data: ComponentNodeData }) {
  const config = props.data.config as ServerConfig
  const instance = SERVER_INSTANCES[config.instanceType]
  const totalMaxRps = instance.maxRps * config.instanceCount
  const costPerHour = instance.costPerHour * config.instanceCount

  return (
    <BaseNode
      {...props}
      icon={<Server size={14} />}
      stats={[
        { label: 'Instance', value: config.instanceType },
        { label: 'Count', value: `× ${config.instanceCount}` },
        { label: 'Max RPS', value: totalMaxRps.toLocaleString() },
        { label: 'Cost', value: `$${costPerHour.toFixed(3)}/hr` },
      ]}
    />
  )
})
