'use client'

import { useSimStore } from '@/lib/store/simStore'

// ── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ values, stroke }: { values: number[]; stroke: string }) {
  if (values.length < 2) return <div className="w-16 h-5 bg-surface" />
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
  valueColor,
  sparkValues,
  sparkColor,
}: {
  label: string
  value: string
  unit?: string
  valueColor: string
  sparkValues?: number[]
  sparkColor: string
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-[80px]">
      <p className="text-[9px] text-ink-3 uppercase tracking-widest">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-[18px] font-bold leading-none" style={{ color: valueColor }}>{value}</span>
        {unit && <span className="text-[10px] text-ink-3">{unit}</span>}
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

  const rpsVals   = history.map((s) => s.ingressRps)
  const p99Vals   = history.map((s) => s.systemP99LatencyMs)
  const errorVals = history.map((s) => s.systemErrorRate * 100)
  const costVals  = history.map((s) => s.systemCostPerHour)

  const p99  = snap?.systemP99LatencyMs ?? 0
  const err  = snap?.systemErrorRate ?? 0
  const cost = snap?.systemCostPerHour ?? 0
  const rps  = snap?.ingressRps ?? 0

  const latencyColor = p99 < 200 ? 'var(--color-ok)' : p99 < 500 ? 'var(--color-warn)' : 'var(--color-err)'
  const errorColor   = err < 0.001 ? 'var(--color-ok)' : err < 0.01 ? 'var(--color-warn)' : 'var(--color-err)'

  const simTimeSec = snap ? (snap.simTimeMs / 1000).toFixed(0) : '0'

  const statusDotColor =
    status === 'running'  ? 'var(--color-ok)' :
    status === 'paused'   ? 'var(--color-warn)' :
    status === 'complete' ? 'var(--color-cyan)' :
    'var(--color-edge-strong)'

  return (
    <div data-testid="metrics-panel" className="h-[88px] flex-shrink-0 border-t border-edge bg-raised px-6 flex items-center gap-8">
      {/* Status dot + sim time */}
      <div className="flex flex-col items-center gap-1 mr-2">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: statusDotColor }} />
        <span className="text-[10px] text-ink-3 tracking-widest">{simTimeSec}s</span>
      </div>

      <div className="h-10 w-px bg-edge-dim" />

      <Metric
        label="Throughput"
        value={snap ? Math.round(rps).toLocaleString() : '—'}
        unit="RPS"
        valueColor="var(--color-cyan)"
        sparkValues={rpsVals}
        sparkColor="var(--color-cyan)"
      />
      <Metric
        label="P99 Latency"
        value={snap ? (p99 < 1 ? '<1' : Math.round(p99).toLocaleString()) : '—'}
        unit="ms"
        valueColor={snap ? latencyColor : 'var(--color-ink-3)'}
        sparkValues={p99Vals}
        sparkColor={p99 < 200 ? 'var(--color-ok)' : p99 < 500 ? 'var(--color-warn)' : 'var(--color-err)'}
      />
      <Metric
        label="Error Rate"
        value={snap ? `${(err * 100).toFixed(2)}` : '—'}
        unit="%"
        valueColor={snap ? errorColor : 'var(--color-ink-3)'}
        sparkValues={errorVals}
        sparkColor={err < 0.001 ? 'var(--color-ok)' : err < 0.01 ? 'var(--color-warn)' : 'var(--color-err)'}
      />
      <Metric
        label="Cost"
        value={snap ? `$${cost.toFixed(3)}` : '—'}
        unit="/hr"
        valueColor="var(--color-ink-2)"
        sparkValues={costVals}
        sparkColor="var(--color-ink-3)"
      />

      {/* Node utilization breakdown */}
      {snap && snap.nodes.length > 0 && (
        <>
          <div className="h-10 w-px bg-edge-dim ml-auto" />
          <div className="flex items-center gap-3">
            {snap.nodes.map((n) => {
              const dotColor =
                n.status === 'saturated' ? 'var(--color-err)' :
                n.status === 'hot'       ? 'var(--color-hot)' :
                n.status === 'warm'      ? 'var(--color-warn)' :
                n.status === 'healthy'   ? 'var(--color-ok)' :
                'var(--color-edge-strong)'
              return (
                <div key={n.id} className="flex items-center gap-1" title={`${n.id}: ρ=${(n.utilization * 100).toFixed(0)}%`}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor }} />
                  <span className="text-[10px] text-ink-3">{(n.utilization * 100).toFixed(0)}%</span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
