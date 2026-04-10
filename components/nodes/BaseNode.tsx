'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Trash2, XCircle, Zap, TrendingUp } from 'lucide-react'
import { useArchitectureStore, type ComponentNodeData } from '@/lib/store/architectureStore'
import { useSimStore } from '@/lib/store/simStore'
import { COMPONENT_META } from '@/lib/components/definitions'
import type { NodeStatus } from '@/sim/types'

// Maps COMPONENT_META accentColor → design system CSS variable
const TYPE_COLOR: Record<string, string> = {
  sky:     'var(--color-node-client)',
  emerald: 'var(--color-node-server)',
  violet:  'var(--color-node-db)',
  amber:   'var(--color-node-cache)',
  blue:    'var(--color-node-lb)',
  orange:  'var(--color-node-queue)',
  pink:    'var(--color-node-gateway)',
  indigo:  'var(--color-node-k8s)',
  teal:    'var(--color-node-kafka)',
  lime:    'var(--color-node-cdn)',
}

// Status overrides type color when node is under stress
const STATUS_COLOR: Partial<Record<NodeStatus, string>> = {
  hot:       'var(--color-hot)',
  saturated: 'var(--color-err)',
  failed:    'var(--color-down)',
}

const STATUS_TEXT: Partial<Record<NodeStatus, string>> = {
  hot:       'text-hot',
  saturated: 'text-err',
  failed:    'text-down',
}

const UTIL_COLOR: Record<NodeStatus, string> = {
  idle:      'var(--color-edge)',
  healthy:   'var(--color-ok)',
  warm:      'var(--color-warn)',
  hot:       'var(--color-hot)',
  saturated: 'var(--color-err)',
  failed:    'var(--color-down)',
}

type BaseNodeProps = NodeProps & {
  data: ComponentNodeData
  icon: React.ReactNode
  stats: { label: string; value: string }[]
  hideLiveMetrics?: boolean  // suppress built-in RPS IN / P99 section
}

export function BaseNode({ id, data, selected, icon, stats, hideLiveMetrics }: BaseNodeProps) {
  const { removeNode } = useArchitectureStore()
  const simSnap = useSimStore((s) => s.nodeSnapshots[id])
  const simStatus = useSimStore((s) => s.status)

  const meta = COMPONENT_META[data.componentType]
  const status: NodeStatus = simSnap?.status ?? 'idle'
  const utilization = simSnap?.utilization ?? 0
  const isSimulating = simStatus === 'running' || simStatus === 'paused' || simStatus === 'complete'

  const accentColor = TYPE_COLOR[meta.accentColor] ?? 'var(--color-edge)'
  const leftBorderColor = STATUS_COLOR[status] ?? accentColor
  const activeChaos = simSnap?.activeChaosType

  const typeLabelClass = STATUS_TEXT[status] ?? ({
    sky:     'text-node-client',
    emerald: 'text-node-server',
    violet:  'text-node-db',
    amber:   'text-node-cache',
    blue:    'text-node-lb',
    orange:  'text-node-queue',
    pink:    'text-[var(--color-node-gateway)]',
    indigo:  'text-[var(--color-node-k8s)]',
    teal:    'text-[var(--color-node-kafka)]',
    lime:    'text-[var(--color-node-cdn)]',
  }[meta.accentColor] ?? 'text-ink-3')

  const latencyVal = simSnap?.latencyMs ?? 0

  return (
    <div
      className={`
        relative w-52 border border-edge bg-surface
        transition-all duration-200
        ${selected ? 'border-edge-strong' : ''}
        ${status === 'failed' ? 'opacity-60' : ''}
      `}
      style={{ borderLeftWidth: 2, borderLeftColor: leftBorderColor }}
    >
      {/* Input handle — hidden for source-only nodes (clients) */}
      {!meta.sourceOnly && (
        <Handle
          type="target"
          position={Position.Left}
          style={{ background: accentColor, borderColor: accentColor }}
          className="!w-3 !h-3 !border-2"
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-raised border-b border-edge-dim">
        <span className={`${typeLabelClass} flex-shrink-0`}>{icon}</span>
        <span className="text-[10px] font-bold tracking-widest uppercase flex-1 truncate" style={{ color: leftBorderColor }}>
          {meta.label}
        </span>
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: UTIL_COLOR[status] }}
        />
      </div>

      {/* Utilization bar */}
      <div className="h-px bg-edge-dim">
        {isSimulating && (
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${Math.min(utilization * 100, 100).toFixed(1)}%`,
              background: UTIL_COLOR[status],
            }}
          />
        )}
      </div>

      {/* Stats */}
      <div className="px-3 py-2 space-y-1">
        <p className="text-[11px] font-medium text-ink truncate mb-1">{data.label}</p>

        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center justify-between">
            <span className="text-[10px] text-ink-3 tracking-wider">{stat.label}</span>
            <span className="text-[10px] font-semibold text-ink-2">{stat.value}</span>
          </div>
        ))}

        {/* Live sim metrics */}
        {isSimulating && simSnap && !hideLiveMetrics && (
          <>
            <div className="h-px bg-edge-dim my-1" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-ink-3 tracking-wider">RPS IN</span>
              <span className="text-[10px] font-semibold text-ink-2">{Math.round(simSnap.inputRps)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-ink-3 tracking-wider">P99</span>
              <span
                className="text-[10px] font-semibold"
                style={{
                  color: latencyVal > 500 ? 'var(--color-err)'
                       : latencyVal > 100 ? 'var(--color-warn)'
                       : 'var(--color-ok)',
                }}
              >
                {latencyVal < 1 ? '<1' : Math.round(latencyVal)}ms
              </span>
            </div>
            {simSnap.errorRate > 0.001 && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-ink-3 tracking-wider">ERR</span>
                <span className="text-[10px] font-semibold text-err">
                  {(simSnap.errorRate * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Failed overlay */}
      {status === 'failed' && (
        <div className="absolute inset-0 bg-down/20 flex items-center justify-center pointer-events-none z-10">
          <div className="flex flex-col items-center gap-1">
            <XCircle size={20} className="text-err" />
            <span className="text-[9px] font-bold text-err uppercase tracking-widest">// NODE DOWN</span>
          </div>
        </div>
      )}

      {/* Latency spike chaos badge */}
      {activeChaos === 'latency-spike' && status !== 'failed' && (
        <div className="absolute inset-0 border-2 border-warn/60 pointer-events-none z-10 animate-pulse">
          <div className="absolute top-1 right-1 flex items-center gap-1 bg-warn/20 border border-warn/40 px-1.5 py-0.5">
            <Zap size={9} className="text-warn" />
            <span className="text-[8px] font-bold text-warn uppercase tracking-widest">SLOW</span>
          </div>
        </div>
      )}

      {/* Traffic surge chaos badge */}
      {activeChaos === 'traffic-surge' && status !== 'failed' && (
        <div className="absolute inset-0 border-2 border-hot/60 pointer-events-none z-10 animate-pulse">
          <div className="absolute top-1 right-1 flex items-center gap-1 bg-hot/20 border border-hot/40 px-1.5 py-0.5">
            <TrendingUp size={9} className="text-hot" />
            <span className="text-[8px] font-bold text-hot uppercase tracking-widest">SURGE</span>
          </div>
        </div>
      )}

      {/* Delete button */}
      {selected && (
        <button
          onClick={(e) => { e.stopPropagation(); removeNode(id) }}
          className="absolute -top-2 -right-2 w-5 h-5 bg-err hover:bg-err/80 flex items-center justify-center shadow-lg transition-colors"
          title="Delete"
        >
          <Trash2 size={10} className="text-white" />
        </button>
      )}

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: accentColor, borderColor: accentColor }}
        className="!w-3 !h-3 !border-2"
      />
    </div>
  )
}
