'use client'

import { useState, useEffect, useTransition } from 'react'
import { CheckCircle2, XCircle, RotateCcw, ChevronRight, Trophy, Share2, Check, ExternalLink } from 'lucide-react'
import { useChallengeStore } from '@/lib/store/challengeStore'
import { useSimStore } from '@/lib/store/simStore'
import { useArchitectureStore } from '@/lib/store/architectureStore'
import { CHALLENGES } from '@/lib/challenges/definitions'
import { createReplay, getLeaderboard, type LeaderboardEntry } from '@/lib/actions/replays'
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

function Leaderboard({ challengeId }: { challengeId: string }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLeaderboard(challengeId, 5).then((data) => {
      setEntries(data)
      setLoading(false)
    })
  }, [challengeId])

  if (loading) {
    return <p className="text-[11px] text-ink-3 py-2">Loading leaderboard…</p>
  }
  if (entries.length === 0) {
    return <p className="text-[11px] text-ink-3 py-2">No scores yet — be the first!</p>
  }

  return (
    <div className="space-y-1">
      {entries.map((e, i) => (
        <a
          key={e.id}
          href={`/replay/${e.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 py-1.5 px-2 hover:bg-overlay transition-colors group"
        >
          <span className="text-[10px] text-ink-3 w-4 flex-shrink-0">#{i + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="font-bold text-ink">{e.score}</span>
              <span className="text-ink-3">·</span>
              <span className="text-ink-3">{e.architecture.nodes.length} nodes</span>
              <span className="text-ink-3">·</span>
              <span className="text-ink-3">${(e.eval_result.metrics.costPerHour).toFixed(3)}/hr</span>
            </div>
          </div>
          <ExternalLink size={11} className="text-ink-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </a>
      ))}
    </div>
  )
}

export function ResultsModal() {
  const { activeChallenge, evalResult, setEvalResult } = useChallengeStore()
  const { stopSimulation } = useSimStore()
  const simStatus = useSimStore((s) => s.status)
  const { nodes, edges, initFromStarterGraph } = useArchitectureStore()
  const [shareState, setShareState] = useState<'idle' | 'sharing' | 'copied' | 'error'>('idle')
  const [, startTransition] = useTransition()

  if (!evalResult || simStatus !== 'complete' || !activeChallenge) return null

  const result: EvalResult = evalResult
  const challenge = activeChallenge

  const sortedChallenges = [...CHALLENGES].sort((a, b) =>
    a.tier !== b.tier ? a.tier - b.tier : a.order - b.order
  )
  const currentIdx = sortedChallenges.findIndex((c) => c.id === challenge.id)
  const nextChallenge = currentIdx >= 0 ? sortedChallenges[currentIdx + 1] : undefined

  function handleRetry() {
    stopSimulation()
    setEvalResult(null)
    setShareState('idle')
    if (challenge.starterNodes || challenge.starterEdges) {
      initFromStarterGraph(challenge.starterNodes ?? [], challenge.starterEdges ?? [])
    }
  }

  function handleClose() {
    stopSimulation()
    setEvalResult(null)
    setShareState('idle')
  }

  function handleShare() {
    setShareState('sharing')
    startTransition(async () => {
      const res = await createReplay(challenge.id, nodes, edges, result)
      if ('error' in res) {
        setShareState('error')
        return
      }
      const url = `${window.location.origin}/replay/${res.id}`
      await navigator.clipboard.writeText(url)
      setShareState('copied')
      setTimeout(() => setShareState('idle'), 2500)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/80 overflow-y-auto py-8">
      <div
        className="w-[420px] bg-raised border border-edge overflow-hidden"
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
            {(challenge.chaosSchedule?.length ?? 0) > 0 && (
              <ScoreBar label="Resilience" value={result.scores.resilience} color="var(--color-err)" />
            )}
          </div>
        )}

        {/* Leaderboard */}
        {result.passed && (
          <div className="px-6 py-4 border-b border-edge-dim">
            <p className="text-[10px] font-bold text-cyan uppercase tracking-widest mb-2">// Top Scores</p>
            <Leaderboard challengeId={challenge.id} />
          </div>
        )}

        {/* Actions */}
        <div className="px-6 py-4 flex gap-2 flex-wrap">
          <button
            onClick={handleRetry}
            className="flex items-center gap-1.5 px-3 py-2 border border-edge bg-surface hover:bg-overlay text-ink-2 text-[11px] font-bold uppercase tracking-wider transition-colors"
          >
            <RotateCcw size={13} /> Retry
          </button>

          {/* Share button */}
          <button
            onClick={handleShare}
            disabled={shareState === 'sharing'}
            className="flex items-center gap-1.5 px-3 py-2 border border-edge bg-surface hover:bg-overlay text-ink-2 text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            {shareState === 'copied'
              ? <><Check size={13} className="text-ok" /> Copied!</>
              : shareState === 'error'
              ? <><XCircle size={13} className="text-err" /> Error</>
              : <><Share2 size={13} /> Share</>
            }
          </button>

          <button
            onClick={handleClose}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-edge bg-surface hover:bg-overlay text-ink-2 text-[11px] font-bold uppercase tracking-wider transition-colors"
          >
            Close
          </button>

          {result.passed && nextChallenge && (
            <a
              href={`/play/${nextChallenge.id}`}
              className="flex items-center gap-1.5 px-4 py-2 bg-ok hover:bg-ok/90 text-base text-[11px] font-bold uppercase tracking-wider transition-colors"
            >
              Next <ChevronRight size={13} />
            </a>
          )}
          {result.passed && !nextChallenge && (
            <a
              href="/campaign"
              className="flex items-center gap-1.5 px-4 py-2 bg-ok hover:bg-ok/90 text-base text-[11px] font-bold uppercase tracking-wider transition-colors"
            >
              Campaign <ChevronRight size={13} />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
