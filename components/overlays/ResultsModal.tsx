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
        <span className="text-[11px] text-ink-3">{label}</span>
        <span className="text-[12px] font-semibold text-ink">{value}</span>
      </div>
      <div className="h-1.5 bg-surface overflow-hidden">
        <div
          className="h-full transition-all duration-700"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  )
}

function MetricRow({ label, value, passed }: { label: string; value: string; passed: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-1.5">
        {passed
          ? <CheckCircle2 size={13} className="text-ok" />
          : <XCircle size={13} className="text-err" />
        }
        <span className="text-[12px] text-ink-2">{label}</span>
      </div>
      <span className={`text-[12px] font-semibold ${passed ? 'text-ok' : 'text-err'}`}>{value}</span>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/80">
      <div
        className="w-96 bg-raised border border-edge overflow-hidden"
        style={{ borderTopWidth: 2, borderTopColor: result.passed ? 'var(--color-ok)' : 'var(--color-err)' }}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-edge-dim">
          <div className="flex items-center gap-3">
            {result.passed
              ? <Trophy size={24} className="text-ok" />
              : <XCircle size={24} className="text-err" />
            }
            <div>
              <p className={`text-[16px] font-bold ${result.passed ? 'text-ok' : 'text-err'}`}>
                {result.passed ? 'Challenge Passed' : 'Not Quite'}
              </p>
              <p className="text-[11px] text-ink-3">{challenge.title}</p>
            </div>
            {result.passed && (
              <div className="ml-auto text-right">
                <p className="text-[28px] font-bold text-ink">{result.scores.total}</p>
                <p className="text-[10px] text-ink-3 uppercase tracking-widest">Score</p>
              </div>
            )}
          </div>
        </div>

        {/* Metrics */}
        <div className="px-6 py-4 border-b border-edge-dim">
          <p className="text-[10px] font-bold text-cyan uppercase tracking-widest mb-2">// Results</p>
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

        {/* Score breakdown */}
        {result.passed && (
          <div className="px-6 py-4 border-b border-edge-dim space-y-3">
            <p className="text-[10px] font-bold text-cyan uppercase tracking-widest">// Score Breakdown</p>
            <ScoreBar label="Performance" value={result.scores.performance} color="var(--color-cyan)" />
            <ScoreBar label="Cost"        value={result.scores.cost}        color="var(--color-ok)" />
            <ScoreBar label="Simplicity"  value={result.scores.simplicity}  color="var(--color-node-db)" />
          </div>
        )}

        {/* Actions */}
        <div className="px-6 py-4 flex gap-2">
          <button
            onClick={handleRetry}
            className="flex items-center gap-1.5 px-3 py-2 border border-edge bg-surface hover:bg-overlay text-ink-2 text-[11px] font-bold uppercase tracking-wider transition-colors"
          >
            <RotateCcw size={13} /> Retry
          </button>
          <button
            onClick={handleClose}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-edge bg-surface hover:bg-overlay text-ink-2 text-[11px] font-bold uppercase tracking-wider transition-colors"
          >
            Close
          </button>
          {result.passed && (
            <a
              href="/campaign"
              className="flex items-center gap-1.5 px-4 py-2 bg-ok hover:bg-ok/90 text-base text-[11px] font-bold uppercase tracking-wider transition-colors"
            >
              Next <ChevronRight size={13} />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
