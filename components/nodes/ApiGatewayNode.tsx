'use client'

import { type NodeProps } from '@xyflow/react'
import { Shield } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { type ComponentNodeData } from '@/lib/store/architectureStore'
import { type ApiGatewayConfig, GATEWAY_COST_PER_HOUR } from '@/lib/components/definitions'

export function ApiGatewayNode(props: NodeProps & { data: ComponentNodeData }) {
  const config = props.data.config as ApiGatewayConfig

  return (
    <BaseNode
      {...props}
      icon={<Shield size={14} />}
      stats={[
        { label: 'Rate Limit', value: `${config.maxRps.toLocaleString()} RPS` },
        { label: 'Timeout',    value: `${config.timeoutMs}ms` },
        { label: 'Circuit Br.', value: config.circuitBreakerEnabled ? 'On' : 'Off' },
        { label: 'Cost',       value: `$${GATEWAY_COST_PER_HOUR.toFixed(3)}/hr` },
      ]}
    />
  )
}
