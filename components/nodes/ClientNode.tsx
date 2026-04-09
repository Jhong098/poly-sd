'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Trash2, Users } from 'lucide-react'
import { useArchitectureStore, type ComponentNodeData } from '@/lib/store/architectureStore'
import { useSimStore } from '@/lib/store/simStore'
import type { ClientConfig } from '@/lib/components/definitions'
import type { NodeStatus } from '@/sim/types'

const PRESET_LABEL: Record<string, string> = { steady: 'Steady', spike: 'Spike', ramp: 'Ramp' }

export function ClientNode({ id, data, selected }: NodeProps & { data: ComponentNodeData }) {
  const { removeNode } = useArchitectureStore()
  const simSnap = useSimStore((s) => s.nodeSnapshots[id])
  const simStatus = useSimStore((s) => s.status)

  const cfg = data.config as ClientConfig
  const isSimulating = simStatus === 'running' || simStatus === 'paused' || simStatus === 'complete'
  const currentRps = simSnap?.outputRps ?? cfg.rps
  const status: NodeStatus = simSnap?.status ?? 'idle'

  return (
    <div className={`
      relative w-48 rounded-xl border bg-gray-900/95 backdrop-blur-sm shadow-xl shadow-black/40
      transition-all duration-200 border-amber-500/40 hover:border-amber-400/70
      ${selected ? 'ring-2 ring-white/20 shadow-2xl' : ''}
      ${isSimulating && status === 'healthy' ? 'ring-1 ring-amber-400/30' : ''}
    `}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-t-xl bg-amber-500/10 border-b border-amber-500/20">
        <Users size={14} className="text-amber-400" />
        <span className="text-xs font-semibold text-gray-200 truncate flex-1">{data.label}</span>
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
          Client
        </span>
      </div>

      {/* Stats */}
      <div className="px-3 py-2 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-500">Pattern</span>
          <span className="text-[11px] font-mono text-gray-300">{PRESET_LABEL[cfg.preset]}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-500">Base RPS</span>
          <span className="text-[11px] font-mono text-gray-300">{cfg.rps.toLocaleString()}</span>
        </div>
        {cfg.preset !== 'steady' && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-500">Peak</span>
            <span className="text-[11px] font-mono text-gray-300">{(cfg.rps * cfg.peakMultiplier).toLocaleString()} RPS</span>
          </div>
        )}

        {/* Live RPS during simulation */}
        {isSimulating && (
          <>
            <div className="h-px bg-gray-800 my-1" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-600">Now</span>
              <span className="text-[11px] font-mono text-amber-400 font-semibold">
                {Math.round(currentRps).toLocaleString()} RPS
              </span>
            </div>
          </>
        )}
      </div>

      {/* Delete */}
      {selected && (
        <button
          onClick={(e) => { e.stopPropagation(); removeNode(id) }}
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center shadow-lg transition-colors"
        >
          <Trash2 size={10} className="text-white" />
        </button>
      )}

      {/* Output only — no input handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !border-2 !bg-amber-500 !border-amber-300"
      />
    </div>
  )
}
