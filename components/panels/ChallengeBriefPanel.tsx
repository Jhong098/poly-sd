'use client'

import { CheckCircle2, XCircle, Clock, AlertTriangle, DollarSign } from 'lucide-react'
import { useChallengeStore } from '@/lib/store/challengeStore'
import { useSimStore } from '@/lib/store/simStore'
import type { Challenge } from '@/lib/challenges/types'
import type { ChaosType } from '@/sim/types'

function SlaRow({
  icon: Icon,
  label,
  target,
  current,
  passed,
  isActive,
}: {
  icon: React.ElementType
  label: string
  target: string
  current?: string
  passed?: boolean
  isActive: boolean
}) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <Icon size={13} className="text-ink-3 flex-shrink-0" />
      <span className="text-[11px] text-ink-3 flex-1">{label}</span>
      <span className="text-[11px] text-ink-2">{target}</span>
      {isActive && current !== undefined && (
        <span className={`text-[11px] font-semibold ml-1 ${passed ? 'text-ok' : 'text-err'}`}>
          {passed ? <CheckCircle2 size={12} className="inline" /> : <XCircle size={12} className="inline" />}
          {' '}{current}
        </span>
      )}
    </div>
  )
}

const CHAOS_COLOR: Record<ChaosType, string> = {
  'node-failure':  'var(--color-err)',
  'latency-spike': 'var(--color-warn)',
  'traffic-surge': 'var(--color-hot)',
}

const CHAOS_LABEL: Record<ChaosType, string> = {
  'node-failure':  'FAIL',
  'latency-spike': 'SLOW',
  'traffic-surge': 'SURGE',
}

function ChaosTimeline({ challenge, currentTimeMs }: { challenge: Challenge; currentTimeMs: number | null }) {
  const schedule = challenge.chaosSchedule
  if (!schedule?.length) return null

  const totalMs = challenge.trafficConfig.durationMs
  const nodeLabels = new Map(challenge.starterNodes?.map((n) => [n.id, n.label ?? n.id]) ?? [])
  const playheadPct = currentTimeMs !== null ? Math.min((currentTimeMs / totalMs) * 100, 100) : null

  return (
    <div className="px-4 py-3 border-b border-edge-dim">
      <p className="text-[10px] font-bold text-cyan uppercase tracking-widest mb-2">// Chaos Schedule</p>

      {/* Timeline bar */}
      <div className="relative h-4 bg-surface border border-edge-dim overflow-hidden">
        {schedule.map((event) => {
          const startPct = (event.startSimMs / totalMs) * 100
          const widthPct = (event.durationMs / totalMs) * 100
          const isActive = currentTimeMs !== null
            && currentTimeMs >= event.startSimMs
            && currentTimeMs < event.startSimMs + event.durationMs
          return (
            <div
              key={event.id}
              className="absolute top-0 h-full transition-opacity duration-200"
              style={{
                left: `${startPct}%`,
                width: `${Math.max(widthPct, 2)}%`,
                background: CHAOS_COLOR[event.type],
                opacity: isActive ? 1 : 0.45,
              }}
            />
          )
        })}

        {/* Playhead */}
        {playheadPct !== null && (
          <div
            className="absolute top-0 w-px h-full bg-ink z-10 pointer-events-none"
            style={{ left: `${playheadPct}%` }}
          />
        )}
      </div>

      {/* Time axis ticks */}
      <div className="flex justify-between mt-0.5 mb-2">
        <span className="text-[9px] text-ink-3">0s</span>
        <span className="text-[9px] text-ink-3">{(totalMs / 1000).toFixed(0)}s</span>
      </div>

      {/* Event legend */}
      <div className="space-y-1">
        {schedule.map((event) => {
          const startSec = (event.startSimMs / 1000).toFixed(0)
          const endSec   = ((event.startSimMs + event.durationMs) / 1000).toFixed(0)
          const isActive = currentTimeMs !== null
            && currentTimeMs >= event.startSimMs
            && currentTimeMs < event.startSimMs + event.durationMs
          return (
            <div key={event.id} className="flex items-center gap-1.5">
              <div
                className="w-1.5 h-1.5 flex-shrink-0 rounded-sm"
                style={{ background: CHAOS_COLOR[event.type] }}
              />
              <span className={`text-[10px] font-bold flex-shrink-0 ${isActive ? 'text-ink' : 'text-ink-3'}`}>
                {CHAOS_LABEL[event.type]}
              </span>
              <span className="text-[10px] text-ink-3 truncate flex-1">
                {nodeLabels.get(event.nodeId) ?? event.nodeId}
              </span>
              <span className="text-[9px] text-ink-3 flex-shrink-0">
                {startSec}s–{endSec}s
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ChallengeBriefPanel() {
  const { activeChallenge } = useChallengeStore()
  const currentSnapshot = useSimStore((s) => s.currentSnapshot)
  const simStatus = useSimStore((s) => s.status)

  if (!activeChallenge) return null

  const isActive = simStatus === 'running' || simStatus === 'paused' || simStatus === 'complete'
  const snap = currentSnapshot

  const p99 = snap?.systemP99LatencyMs
  const errorRate = snap?.systemErrorRate
  const costPerHour = snap?.systemCostPerHour

  const passedLatency = p99 !== undefined && p99 <= activeChallenge.slaTargets.p99LatencyMs
  const passedErrors  = errorRate !== undefined && errorRate <= activeChallenge.slaTargets.errorRate
  const passedBudget  = costPerHour !== undefined && costPerHour <= activeChallenge.budgetPerHour

  return (
    <aside className="w-64 flex-shrink-0 h-full bg-raised border-r border-edge flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-edge-dim">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[10px] font-bold text-cyan uppercase tracking-widest">
            {activeChallenge.tier === 0 ? 'Tutorial' : `Tier ${activeChallenge.tier}`}
          </span>
          <span className="text-[10px] text-ink-3">·</span>
          <span className="text-[10px] text-ink-3">{activeChallenge.id}</span>
        </div>
        <p className="text-[14px] font-bold text-ink">{activeChallenge.title}</p>
      </div>

      {/* Narrative */}
      <div className="px-4 py-3 border-b border-edge-dim">
        <p className="text-[11px] text-ink-3 leading-relaxed">{activeChallenge.narrative}</p>
      </div>

      {/* Objective */}
      <div className="px-4 py-3 border-b border-edge-dim">
        <p className="text-[10px] font-bold text-cyan uppercase tracking-widest mb-1.5">// Objective</p>
        <p className="text-[12px] text-ink-2 leading-relaxed">{activeChallenge.objective}</p>
      </div>

      {/* SLA Targets */}
      <div className="px-4 py-3 border-b border-edge-dim">
        <p className="text-[10px] font-bold text-cyan uppercase tracking-widest mb-1">// Win Conditions</p>
        <SlaRow
          icon={Clock}
          label="p99 Latency"
          target={`≤ ${activeChallenge.slaTargets.p99LatencyMs}ms`}
          current={p99 !== undefined ? `${Math.round(p99)}ms` : undefined}
          passed={passedLatency}
          isActive={isActive}
        />
        <SlaRow
          icon={AlertTriangle}
          label="Error Rate"
          target={`≤ ${(activeChallenge.slaTargets.errorRate * 100).toFixed(1)}%`}
          current={errorRate !== undefined ? `${(errorRate * 100).toFixed(2)}%` : undefined}
          passed={passedErrors}
          isActive={isActive}
        />
        <SlaRow
          icon={DollarSign}
          label="Budget"
          target={`≤ $${activeChallenge.budgetPerHour.toFixed(2)}/hr`}
          current={costPerHour !== undefined ? `$${costPerHour.toFixed(3)}/hr` : undefined}
          passed={passedBudget}
          isActive={isActive}
        />
      </div>

      {/* Chaos timeline */}
      <ChaosTimeline challenge={activeChallenge} currentTimeMs={snap?.simTimeMs ?? null} />

      {/* Concepts */}
      <div className="px-4 py-3 border-b border-edge-dim">
        <p className="text-[10px] font-bold text-cyan uppercase tracking-widest mb-2">// Concepts</p>
        <div className="flex flex-wrap gap-1">
          {activeChallenge.conceptsTaught.map((c) => (
            <span key={c} className="px-1.5 py-0.5 text-[10px] bg-surface text-ink-3 border border-edge">
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* Hints */}
      <div className="px-4 py-3 mt-auto">
        <p className="text-[10px] font-bold text-cyan uppercase tracking-widest mb-2">// Hints</p>
        <ol className="space-y-1.5">
          {activeChallenge.hints.map((h, i) => (
            <li key={i} className="flex gap-2 text-[11px] text-ink-3">
              <span className="text-ink-3 flex-shrink-0">{i + 1}.</span>
              <span>{h}</span>
            </li>
          ))}
        </ol>
      </div>
    </aside>
  )
}
