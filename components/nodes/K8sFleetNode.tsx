'use client'

import { type NodeProps } from '@xyflow/react'
import { Layers } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { type ComponentNodeData } from '@/lib/store/architectureStore'
import { type K8sFleetConfig, K8S_INSTANCES } from '@/lib/components/definitions'
import { useSimStore } from '@/lib/store/simStore'

export function K8sFleetNode(props: NodeProps & { data: ComponentNodeData }) {
  const config = props.data.config as K8sFleetConfig
  const inst = K8S_INSTANCES[config.instanceType]
  const simSnap = useSimStore((s) => s.nodeSnapshots[props.id])

  const currentReplicas = simSnap?.replicaCount ?? config.minReplicas
  const maxRps = currentReplicas * inst.maxRps

  return (
    <BaseNode
      {...props}
      icon={<Layers size={14} />}
      stats={[
        { label: 'Pod Size',  value: config.instanceType },
        { label: 'Replicas',  value: `${currentReplicas} / ${config.maxReplicas}` },
        { label: 'Max RPS',   value: maxRps.toLocaleString() },
        { label: 'Cost',      value: `$${(currentReplicas * inst.costPerHour).toFixed(3)}/hr` },
      ]}
    />
  )
}
