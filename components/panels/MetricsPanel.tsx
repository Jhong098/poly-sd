'use client'

import { useSimStore } from '@/lib/store/simStore'
import { useChallengeStore } from '@/lib/store/challengeStore'

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
  tooltip,
}: {
  label: string
  value: string
  unit?: string
  valueColor: string
  sparkValues?: number[]
  sparkColor: string
  tooltip?: string
}) {
  return (
    <div className="relative group flex flex-col gap-0.5 min-w-[80px]">
      <p className="text-[9px] text-ink-3 uppercase tracking-widest">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-[18px] font-bold leading-none" style={{ color: valueColor }}>{value}</span>
        {unit && <span className="text-[10px] text-ink-3">{unit}</span>}
      </div>
      {sparkValues && sparkValues.length > 1 && (
        <Sparkline values={sparkValues} stroke={sparkColor} />
      )}
      {tooltip && (
        <div className="absolute bottom-full left-0 mb-2 w-64 bg-raised border border-edge px-3 py-2 text-[11px] text-ink leading-relaxed z-30 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-xl">
          {tooltip}
        </div>
      )}
    </div>
  )
}

// ── Main panel ───────────────────────────────────────────────────────────────

export function MetricsPanel() {
  const status = useSimStore((s) => s.status)
  const snap = useSimStore((s) => s.currentSnapshot)
  const history = useSimStore((s) => s.history)
  const activeChallenge = useChallengeStore((s) => s.activeChallenge)

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
  const isBeginnerLevel = activeChallenge != null && activeChallenge.tier <= 1

  const p99Tooltip = (isBeginnerLevel && snap) ? [
    `p99 latency — 99% of requests completed faster than this. Target: ${activeChallenge!.slaTargets.p99LatencyMs}ms.`,
    p99 > activeChallenge!.slaTargets.p99LatencyMs
      ? ` Yours is ${Math.round(p99)}ms — ${(p99 / activeChallenge!.slaTargets.p99LatencyMs).toFixed(1)}× over target. Something in your architecture is backed up.`
      : ` Yours is ${Math.round(p99)}ms — within target.`,
  ].join('') : undefined

  const errTooltip = (isBeginnerLevel && snap) ? [
    `Error rate — the fraction of requests that failed. Target: under ${(activeChallenge!.slaTargets.errorRate * 100).toFixed(1)}%.`,
    err > activeChallenge!.slaTargets.errorRate
      ? ` Yours is ${(err * 100).toFixed(2)}% — over target. A saturated component is dropping requests.`
      : ` Yours is ${(err * 100).toFixed(2)}% — within target.`,
  ].join('') : undefined

  const rpsTooltip = isBeginnerLevel
    ? 'Throughput — requests per second flowing through your system. Higher is better, as long as latency and error rate stay within target.'
    : undefined

  const costTooltip = (isBeginnerLevel && snap) ? [
    `Cost — estimated hourly cost of your architecture. Budget: $${activeChallenge!.budgetPerHour.toFixed(2)}/hr.`,
    cost > activeChallenge!.budgetPerHour
      ? ` Currently over budget ($${cost.toFixed(3)}/hr). Remove or downgrade components.`
      : ` Within budget.`,
  ].join('') : undefined

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
        tooltip={rpsTooltip}
      />
      <Metric
        label="P99 Latency"
        value={snap ? (p99 < 1 ? '<1' : Math.round(p99).toLocaleString()) : '—'}
        unit="ms"
        valueColor={snap ? latencyColor : 'var(--color-ink-3)'}
        sparkValues={p99Vals}
        sparkColor={p99 < 200 ? 'var(--color-ok)' : p99 < 500 ? 'var(--color-warn)' : 'var(--color-err)'}
        tooltip={p99Tooltip}
      />
      <Metric
        label="Error Rate"
        value={snap ? `${(err * 100).toFixed(2)}` : '—'}
        unit="%"
        valueColor={snap ? errorColor : 'var(--color-ink-3)'}
        sparkValues={errorVals}
        sparkColor={err < 0.001 ? 'var(--color-ok)' : err < 0.01 ? 'var(--color-warn)' : 'var(--color-err)'}
        tooltip={errTooltip}
      />
      <Metric
        label="Cost"
        value={snap ? `$${cost.toFixed(3)}` : '—'}
        unit="/hr"
        valueColor="var(--color-ink-2)"
        sparkValues={costVals}
        sparkColor="var(--color-ink-3)"
        tooltip={costTooltip}
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
