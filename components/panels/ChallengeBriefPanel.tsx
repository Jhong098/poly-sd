'use client'

import { CheckCircle2, XCircle, Clock, AlertTriangle, DollarSign } from 'lucide-react'
import { useChallengeStore } from '@/lib/store/challengeStore'
import { useSimStore } from '@/lib/store/simStore'

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
      <Icon size={13} className="text-gray-600 flex-shrink-0" />
      <span className="text-[11px] text-gray-500 flex-1">{label}</span>
      <span className="text-[11px] font-mono text-gray-400">{target}</span>
      {isActive && current !== undefined && (
        <span className={`text-[11px] font-mono ml-1 ${
          passed ? 'text-emerald-400' : 'text-red-400'
        }`}>
          {passed ? <CheckCircle2 size={12} className="inline" /> : <XCircle size={12} className="inline" />}
          {' '}{current}
        </span>
      )}
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
    <aside className="w-64 flex-shrink-0 h-full bg-gray-900/80 border-r border-gray-800/60 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-800/60">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
            {activeChallenge.tier === 0 ? 'Tutorial' : `Tier ${activeChallenge.tier}`}
          </span>
          <span className="text-[10px] text-gray-700">·</span>
          <span className="text-[10px] text-gray-600">{activeChallenge.id}</span>
        </div>
        <p className="text-[14px] font-bold text-gray-100">{activeChallenge.title}</p>
      </div>

      {/* Narrative */}
      <div className="px-4 py-3 border-b border-gray-800/60">
        <p className="text-[11px] text-gray-500 leading-relaxed">{activeChallenge.narrative}</p>
      </div>

      {/* Objective */}
      <div className="px-4 py-3 border-b border-gray-800/60">
        <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Objective</p>
        <p className="text-[12px] text-gray-300 leading-relaxed">{activeChallenge.objective}</p>
      </div>

      {/* SLA Targets */}
      <div className="px-4 py-3 border-b border-gray-800/60">
        <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1">Win Conditions</p>
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

      {/* Concepts taught */}
      <div className="px-4 py-3 border-b border-gray-800/60">
        <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-2">Concepts</p>
        <div className="flex flex-wrap gap-1">
          {activeChallenge.conceptsTaught.map((c) => (
            <span key={c} className="px-1.5 py-0.5 rounded text-[10px] bg-gray-800 text-gray-500 border border-gray-700/50">
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* Hints */}
      <div className="px-4 py-3 mt-auto">
        <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-2">Hints</p>
        <ol className="space-y-1.5">
          {activeChallenge.hints.map((h, i) => (
            <li key={i} className="flex gap-2 text-[11px] text-gray-600">
              <span className="text-gray-700 flex-shrink-0">{i + 1}.</span>
              <span>{h}</span>
            </li>
          ))}
        </ol>
      </div>
    </aside>
  )
}
