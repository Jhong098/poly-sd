import { ExternalLink } from 'lucide-react'
import type { LeaderboardEntry } from '@/lib/actions/replays'
import type { Challenge } from '@/lib/challenges/types'

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="text-[9px] text-ink-3 shrink-0 w-16">{label}</span>
      <div className="flex-1 h-1 bg-surface overflow-hidden">
        <div className="h-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-[9px] text-ink-3 shrink-0 w-5 text-right">{value}</span>
    </div>
  )
}

export function SolutionsTable({
  entries,
  challenge,
}: {
  entries: LeaderboardEntry[]
  challenge: Challenge
}) {
  if (entries.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-[13px] text-ink-3 mb-4">No solutions yet — be the first!</p>
        <a
          href={`/play/${challenge.id}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan/10 hover:bg-cyan/20 border border-cyan/30 text-cyan text-[11px] font-bold uppercase tracking-wider transition-colors"
        >
          Play this challenge
        </a>
      </div>
    )
  }

  return (
    <div className="divide-y divide-edge-dim">
      {entries.map((entry, i) => {
        const nonClientNodes = entry.eval_result.metrics.componentCount
        const date = new Date(entry.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
        const hasResilience = entry.eval_result.scores.resilience > 0

        return (
          <a
            key={entry.id}
            href={`/replay/${entry.id}`}
            className="flex items-center gap-4 px-6 py-4 hover:bg-overlay transition-colors group"
          >
            {/* Rank */}
            <span className="text-[11px] text-ink-3 w-6 shrink-0 font-mono">#{i + 1}</span>

            {/* Score */}
            <div className="w-12 shrink-0 text-right">
              <span className="text-[22px] font-bold text-ink leading-none">{entry.score}</span>
            </div>

            {/* Score breakdown bars */}
            <div className="flex-1 min-w-0 space-y-1">
              <ScoreBar label="Performance" value={entry.eval_result.scores.performance} color="var(--color-cyan)" />
              <ScoreBar label="Cost"        value={entry.eval_result.scores.cost}        color="var(--color-ok)" />
              <ScoreBar label="Simplicity"  value={entry.eval_result.scores.simplicity}  color="var(--color-node-db)" />
              {hasResilience && (
                <ScoreBar label="Resilience" value={entry.eval_result.scores.resilience} color="var(--color-err)" />
              )}
            </div>

            {/* Stats */}
            <div className="flex flex-col items-end gap-1 shrink-0 text-right">
              <span className="text-[11px] text-ink-2">{nonClientNodes} nodes</span>
              <span className="text-[11px] text-ink-3">${entry.eval_result.metrics.costPerHour.toFixed(3)}/hr</span>
              <span className="text-[10px] text-ink-3">{date}</span>
            </div>

            <ExternalLink size={12} className="text-ink-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </a>
        )
      })}
    </div>
  )
}
