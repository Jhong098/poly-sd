'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Trash2, XCircle } from 'lucide-react'
import { useArchitectureStore, type ComponentNodeData } from '@/lib/store/architectureStore'
import { useSimStore } from '@/lib/store/simStore'
import { COMPONENT_META } from '@/lib/components/definitions'
import type { NodeStatus } from '@/sim/types'

// ── Color maps (design-time) ─────────────────────────────────────────────────

const ACCENT: Record<string, { border: string; header: string; handle: string; icon: string; badge: string }> = {
  blue: {
    border:  'border-blue-500/40 hover:border-blue-400/70',
    header:  'bg-blue-500/10 border-b border-blue-500/20',
    handle:  '!bg-blue-500 !border-blue-300',
    icon:    'text-blue-400',
    badge:   'bg-blue-500/20 text-blue-300',
  },
  violet: {
    border:  'border-violet-500/40 hover:border-violet-400/70',
    header:  'bg-violet-500/10 border-b border-violet-500/20',
    handle:  '!bg-violet-500 !border-violet-300',
    icon:    'text-violet-400',
    badge:   'bg-violet-500/20 text-violet-300',
  },
  emerald: {
    border:  'border-emerald-500/40 hover:border-emerald-400/70',
    header:  'bg-emerald-500/10 border-b border-emerald-500/20',
    handle:  '!bg-emerald-500 !border-emerald-300',
    icon:    'text-emerald-400',
    badge:   'bg-emerald-500/20 text-emerald-300',
  },
  sky: {
    border:  'border-sky-500/40 hover:border-sky-400/70',
    header:  'bg-sky-500/10 border-b border-sky-500/20',
    handle:  '!bg-sky-500 !border-sky-300',
    icon:    'text-sky-400',
    badge:   'bg-sky-500/20 text-sky-300',
  },
  orange: {
    border:  'border-orange-500/40 hover:border-orange-400/70',
    header:  'bg-orange-500/10 border-b border-orange-500/20',
    handle:  '!bg-orange-500 !border-orange-300',
    icon:    'text-orange-400',
    badge:   'bg-orange-500/20 text-orange-300',
  },
}

// ── Simulation heat overlay ──────────────────────────────────────────────────

const HEAT: Record<NodeStatus, string> = {
  idle:      '',
  healthy:   '',
  warm:      'ring-1 ring-yellow-400/40',
  hot:       'ring-2 ring-orange-400/60 shadow-orange-500/20',
  saturated: 'ring-2 ring-red-500/80 shadow-red-500/30 animate-pulse',
  failed:    'ring-2 ring-red-600/90 shadow-red-600/40 opacity-60',
}

const UTIL_BAR: Record<NodeStatus, string> = {
  idle:      'bg-gray-700',
  healthy:   'bg-emerald-500',
  warm:      'bg-yellow-400',
  hot:       'bg-orange-400',
  saturated: 'bg-red-500',
  failed:    'bg-red-700',
}

// ── Props ────────────────────────────────────────────────────────────────────

type BaseNodeProps = NodeProps & {
  data: ComponentNodeData
  icon: React.ReactNode
  stats: { label: string; value: string }[]
}

export function BaseNode({ id, data, selected, icon, stats }: BaseNodeProps) {
  const { removeNode } = useArchitectureStore()
  const simSnap = useSimStore((s) => s.nodeSnapshots[id])
  const simStatus = useSimStore((s) => s.status)

  const meta = COMPONENT_META[data.componentType]
  const accent = ACCENT[meta.accentColor] ?? ACCENT.blue

  const status: NodeStatus = simSnap?.status ?? 'idle'
  const utilization = simSnap?.utilization ?? 0
  const isSimulating = simStatus === 'running' || simStatus === 'paused' || simStatus === 'complete'

  return (
    <div
      className={`
        relative w-52 rounded-xl border bg-gray-900/95 backdrop-blur-sm
        shadow-xl shadow-black/40 transition-all duration-200
        ${accent.border}
        ${selected ? 'ring-2 ring-white/20 shadow-2xl' : ''}
        ${isSimulating ? HEAT[status] : ''}
      `}
    >
      {/* Input handle */}
      <Handle type="target" position={Position.Left} className={`!w-3 !h-3 !border-2 ${accent.handle}`} />

      {/* Header */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-t-xl ${accent.header}`}>
        <span className={accent.icon}>{icon}</span>
        <span className="text-xs font-semibold text-gray-200 truncate flex-1">{data.label}</span>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${accent.badge}`}>
          {meta.label}
        </span>
      </div>

      {/* Utilization bar (visible during sim) */}
      {isSimulating && (
        <div className="h-0.5 bg-gray-800 mx-0">
          <div
            className={`h-full transition-all duration-300 ${UTIL_BAR[status]}`}
            style={{ width: `${Math.min(utilization * 100, 100).toFixed(1)}%` }}
          />
        </div>
      )}

      {/* Stats */}
      <div className="px-3 py-2 space-y-1">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center justify-between">
            <span className="text-[11px] text-gray-500">{stat.label}</span>
            <span className="text-[11px] font-mono text-gray-300">{stat.value}</span>
          </div>
        ))}

        {/* Live sim metrics */}
        {isSimulating && simSnap && (
          <>
            <div className="h-px bg-gray-800 my-1" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-600">RPS in</span>
              <span className="text-[11px] font-mono text-gray-400">{Math.round(simSnap.inputRps)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-600">Latency</span>
              <span className={`text-[11px] font-mono ${simSnap.latencyMs > 500 ? 'text-red-400' : simSnap.latencyMs > 100 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                {simSnap.latencyMs < 1 ? '<1' : Math.round(simSnap.latencyMs)}ms
              </span>
            </div>
            {simSnap.errorRate > 0.001 && (
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-600">Errors</span>
                <span className="text-[11px] font-mono text-red-400">{(simSnap.errorRate * 100).toFixed(1)}%</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Failed overlay */}
      {status === 'failed' && (
        <div className="absolute inset-0 rounded-xl bg-red-950/60 flex items-center justify-center pointer-events-none z-10">
          <div className="flex flex-col items-center gap-1">
            <XCircle size={22} className="text-red-400 animate-pulse" />
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Node Failed</span>
          </div>
        </div>
      )}

      {/* Delete button — visible when selected */}
      {selected && (
        <button
          onClick={(e) => { e.stopPropagation(); removeNode(id) }}
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center shadow-lg transition-colors"
          title="Delete"
        >
          <Trash2 size={10} className="text-white" />
        </button>
      )}

      {/* Output handle */}
      <Handle type="source" position={Position.Right} className={`!w-3 !h-3 !border-2 ${accent.handle}`} />
    </div>
  )
}
