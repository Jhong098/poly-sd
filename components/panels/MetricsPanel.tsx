'use client'

import { useSimStore } from '@/lib/store/simStore'

// ── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ values, stroke }: { values: number[]; stroke: string }) {
  if (values.length < 2) return <div className="w-16 h-5 bg-gray-800/50 rounded" />
  const max = Math.max(...values, 0.001)
  const W = 64, H = 20
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * W},${H - (v / max) * H}`)
    .join(' ')
  return (
    <svg width={W} height={H} className="overflow-visible flex-shrink-0">
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

// ── Metric card ──────────────────────────────────────────────────────────────

function Metric({
  label,
  value,
  unit,
  textColor,
  sparkValues,
  sparkColor,
}: {
  label: string
  value: string
  unit?: string
  textColor: string
  sparkValues?: number[]
  sparkColor: string
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-[80px]">
      <p className="text-[10px] text-gray-600 uppercase tracking-wider">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className={`text-[18px] font-mono font-bold leading-none ${textColor}`}>{value}</span>
        {unit && <span className="text-[10px] text-gray-600">{unit}</span>}
      </div>
      {sparkValues && sparkValues.length > 1 && (
        <Sparkline values={sparkValues} stroke={sparkColor} />
      )}
    </div>
  )
}

// ── Main panel ───────────────────────────────────────────────────────────────

export function MetricsPanel() {
  const status = useSimStore((s) => s.status)
  const snap = useSimStore((s) => s.currentSnapshot)
  const history = useSimStore((s) => s.history)

  if (status === 'idle') return null

  const rpsVals    = history.map((s) => s.ingressRps)
  const p99Vals    = history.map((s) => s.systemP99LatencyMs)
  const errorVals  = history.map((s) => s.systemErrorRate * 100)
  const costVals   = history.map((s) => s.systemCostPerHour)

  const p99   = snap?.systemP99LatencyMs ?? 0
  const err   = snap?.systemErrorRate ?? 0
  const cost  = snap?.systemCostPerHour ?? 0
  const rps   = snap?.ingressRps ?? 0

  const latencyColor =
    p99 < 200 ? 'text-emerald-400' : p99 < 500 ? 'text-yellow-400' : 'text-red-400'
  const errorColor =
    err < 0.001 ? 'text-emerald-400' : err < 0.01 ? 'text-yellow-400' : 'text-red-400'

  const simTimeSec = snap ? (snap.simTimeMs / 1000).toFixed(0) : '0'

  return (
    <div className="h-[88px] flex-shrink-0 border-t border-gray-800/60 bg-gray-900/95 backdrop-blur-sm px-6 flex items-center gap-8">
      {/* Status dot + sim time */}
      <div className="flex flex-col items-center gap-1 mr-2">
        <div className={`w-2 h-2 rounded-full ${
          status === 'running'  ? 'bg-emerald-400 animate-pulse' :
          status === 'paused'   ? 'bg-yellow-400' :
          status === 'complete' ? 'bg-blue-400' : 'bg-gray-600'
        }`} />
        <span className="text-[10px] font-mono text-gray-600">{simTimeSec}s</span>
      </div>

      <div className="h-10 w-px bg-gray-800" />

      <Metric
        label="Throughput"
        value={snap ? Math.round(rps).toLocaleString() : '—'}
        unit="RPS"
        textColor="text-blue-400"
        sparkValues={rpsVals}
        sparkColor="#60a5fa"
      />
      <Metric
        label="p99 Latency"
        value={snap ? (p99 < 1 ? '<1' : Math.round(p99).toLocaleString()) : '—'}
        unit="ms"
        textColor={snap ? latencyColor : 'text-gray-500'}
        sparkValues={p99Vals}
        sparkColor={p99 < 200 ? '#34d399' : p99 < 500 ? '#fbbf24' : '#f87171'}
      />
      <Metric
        label="Error Rate"
        value={snap ? `${(err * 100).toFixed(2)}` : '—'}
        unit="%"
        textColor={snap ? errorColor : 'text-gray-500'}
        sparkValues={errorVals}
        sparkColor={err < 0.001 ? '#34d399' : err < 0.01 ? '#fbbf24' : '#f87171'}
      />
      <Metric
        label="Cost"
        value={snap ? `$${cost.toFixed(3)}` : '—'}
        unit="/hr"
        textColor="text-gray-300"
        sparkValues={costVals}
        sparkColor="#94a3b8"
      />

      {/* Node breakdown */}
      {snap && snap.nodes.length > 0 && (
        <>
          <div className="h-10 w-px bg-gray-800 ml-auto" />
          <div className="flex items-center gap-3">
            {snap.nodes.map((n) => {
              const dot =
                n.status === 'saturated' ? 'bg-red-500 animate-pulse' :
                n.status === 'hot'       ? 'bg-orange-400' :
                n.status === 'warm'      ? 'bg-yellow-400' :
                n.status === 'healthy'   ? 'bg-emerald-400' : 'bg-gray-600'
              return (
                <div key={n.id} className="flex items-center gap-1" title={`${n.id}: ρ=${(n.utilization * 100).toFixed(0)}%`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                  <span className="text-[10px] font-mono text-gray-600">{(n.utilization * 100).toFixed(0)}%</span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
