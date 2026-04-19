'use client'

import { memo } from 'react'
import { type NodeProps } from '@xyflow/react'
import { Layers } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { type ComponentNodeData } from '@/lib/store/architectureStore'
import { type NoSqlConfig, NOSQL_RCU_COST_PER_HOUR, NOSQL_WCU_COST_PER_HOUR, NOSQL_ON_DEMAND_COST_PER_RPS_HOUR } from '@/lib/components/definitions'

export const NoSqlNode = memo(function NoSqlNode(props: NodeProps & { data: ComponentNodeData }) {
  const config = props.data.config as NoSqlConfig
  const isOnDemand = config.capacityMode === 'on-demand'
  const costPerHour = isOnDemand
    ? NOSQL_ON_DEMAND_COST_PER_RPS_HOUR * 100   // base estimate at 100 RPS
    : (config.rcuCapacity * NOSQL_RCU_COST_PER_HOUR + config.wcuCapacity * NOSQL_WCU_COST_PER_HOUR) * config.globalTables

  return (
    <BaseNode
      {...props}
      icon={<Layers size={14} />}
      stats={[
        { label: 'Mode',    value: isOnDemand ? 'On-Demand' : 'Provisioned' },
        { label: 'Read',    value: isOnDemand ? 'auto' : `${config.rcuCapacity} RCU` },
        { label: 'Write',   value: isOnDemand ? 'auto' : `${config.wcuCapacity} WCU` },
        { label: 'Cost',    value: `$${costPerHour.toFixed(3)}/hr` },
      ]}
    />
  )
})
