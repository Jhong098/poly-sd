'use client'

import { CheckCircle2, XCircle, RotateCcw, ChevronRight, Trophy } from 'lucide-react'
import { useChallengeStore } from '@/lib/store/challengeStore'
import { useSimStore } from '@/lib/store/simStore'
import { useArchitectureStore } from '@/lib/store/architectureStore'
import type { EvalResult } from '@/lib/challenges/types'

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-[11px] text-gray-500">{label}</span>
        <span className="text-[12px] font-mono font-semibold text-gray-200">{value}</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

function MetricRow({ label, value, passed }: { label: string; value: string; passed: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-1.5">
        {passed
          ? <CheckCircle2 size={13} className="text-emerald-400" />
          : <XCircle size={13} className="text-red-400" />
        }
        <span className="text-[12px] text-gray-400">{label}</span>
      </div>
      <span className={`text-[12px] font-mono ${passed ? 'text-emerald-300' : 'text-red-300'}`}>{value}</span>
    </div>
  )
}

export function ResultsModal() {
  const { activeChallenge, evalResult, setEvalResult } = useChallengeStore()
  const { stopSimulation } = useSimStore()
  const simStatus = useSimStore((s) => s.status)
  const { initFromStarterGraph } = useArchitectureStore()

  if (!evalResult || simStatus !== 'complete' || !activeChallenge) return null

  const result: EvalResult = evalResult
  const challenge = activeChallenge

  function handleRetry() {
    stopSimulation()
    setEvalResult(null)
    if (challenge.starterNodes || challenge.starterEdges) {
      initFromStarterGraph(challenge.starterNodes ?? [], challenge.starterEdges ?? [])
    }
  }

  function handleClose() {
    stopSimulation()
    setEvalResult(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-96 bg-gray-900 border border-gray-700/60 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-5 ${result.passed ? 'bg-emerald-500/10 border-b border-emerald-500/20' : 'bg-red-500/10 border-b border-red-500/20'}`}>
          <div className="flex items-center gap-3">
            {result.passed
              ? <Trophy size={28} className="text-emerald-400" />
              : <XCircle size={28} className="text-red-400" />
            }
            <div>
              <p className={`text-[18px] font-bold ${result.passed ? 'text-emerald-300' : 'text-red-300'}`}>
                {result.passed ? 'Challenge Passed!' : 'Not Quite'}
              </p>
              <p className="text-[12px] text-gray-500">{challenge.title}</p>
            </div>
            {result.passed && (
              <div className="ml-auto text-right">
                <p className="text-[28px] font-bold text-white">{result.scores.total}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Score</p>
              </div>
            )}
          </div>
        </div>

        {/* Metrics */}
        <div className="px-6 py-4 border-b border-gray-800/60">
          <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-2">Results</p>
          <MetricRow
            label="p99 Latency"
            value={`${Math.round(result.metrics.p99LatencyMs)}ms  ≤ ${challenge.slaTargets.p99LatencyMs}ms`}
            passed={result.passedLatency}
          />
          <MetricRow
            label="Error Rate"
            value={`${(result.metrics.errorRate * 100).toFixed(2)}%  ≤ ${(challenge.slaTargets.errorRate * 100).toFixed(1)}%`}
            passed={result.passedErrors}
          />
          <MetricRow
            label="Cost / hr"
            value={`$${result.metrics.costPerHour.toFixed(3)}  ≤ $${challenge.budgetPerHour.toFixed(2)}`}
            passed={result.passedBudget}
          />
        </div>

        {/* Score breakdown (only on pass) */}
        {result.passed && (
          <div className="px-6 py-4 border-b border-gray-800/60 space-y-3">
            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Score Breakdown</p>
            <ScoreBar label="Performance" value={result.scores.performance} color="bg-blue-500" />
            <ScoreBar label="Cost"        value={result.scores.cost}        color="bg-emerald-500" />
            <ScoreBar label="Simplicity"  value={result.scores.simplicity}  color="bg-violet-500" />
          </div>
        )}

        {/* Actions */}
        <div className="px-6 py-4 flex gap-2">
          <button
            onClick={handleRetry}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-[12px] font-medium transition-colors"
          >
            <RotateCcw size={13} /> Retry
          </button>
          <button
            onClick={handleClose}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-[12px] font-medium transition-colors"
          >
            Close
          </button>
          {result.passed && (
            <a
              href="/campaign"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[12px] font-medium transition-colors"
            >
              Next <ChevronRight size={13} />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
