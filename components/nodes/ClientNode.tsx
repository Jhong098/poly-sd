'use client'

import { type NodeProps } from '@xyflow/react'
import { Users } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { type ComponentNodeData } from '@/lib/store/architectureStore'
import { type ClientConfig } from '@/lib/components/definitions'
import { useSimStore } from '@/lib/store/simStore'

const PRESET_LABEL: Record<string, string> = { steady: 'Steady', spike: 'Spike', ramp: 'Ramp' }

export function ClientNode(props: NodeProps & { data: ComponentNodeData }) {
  const cfg = props.data.config as ClientConfig
  const simSnap = useSimStore((s) => s.nodeSnapshots[props.id])
  const currentRps = simSnap?.outputRps

  const stats = [
    { label: 'Pattern',  value: PRESET_LABEL[cfg.preset] ?? cfg.preset },
    { label: 'Base RPS', value: cfg.rps.toLocaleString() },
    ...(cfg.preset !== 'steady'
      ? [{ label: 'Peak RPS', value: (cfg.rps * cfg.peakMultiplier).toLocaleString() }]
      : []),
    ...(currentRps !== undefined
      ? [{ label: 'Now', value: `${Math.round(currentRps).toLocaleString()} RPS` }]
      : []),
  ]

  return (
    <BaseNode
      {...props}
      icon={<Users size={14} />}
      stats={stats}
      hideLiveMetrics
    />
  )
}
