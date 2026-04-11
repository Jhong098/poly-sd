import Link from 'next/link'
import { ArrowLeft, Trophy } from 'lucide-react'
import { notFound } from 'next/navigation'
import { CHALLENGE_MAP } from '@/lib/challenges/definitions'
import { getLeaderboard } from '@/lib/actions/completions'
import { SiteNav } from '@/components/nav/SiteNav'

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ challengeId: string }>
}) {
  const { challengeId } = await params
  const challenge = CHALLENGE_MAP.get(challengeId)
  if (!challenge) notFound()

  const entries = await getLeaderboard(challengeId)

  const rankColors: Record<number, string> = {
    1: 'text-yellow-400',
    2: 'text-slate-300',
    3: 'text-amber-600',
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-base text-ink">
      <SiteNav />

      {/* Sub-header */}
      <div className="flex-shrink-0 flex items-center gap-4 px-8 py-3 border-b border-edge-dim bg-base">
        <Link
          href="/campaign"
          className="flex items-center gap-1.5 text-[11px] text-ink-3 hover:text-ink transition-colors"
        >
          <ArrowLeft size={12} />
          Campaign
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Trophy size={13} className="text-yellow-400" />
            <h1 className="text-[11px] font-bold uppercase tracking-widest text-ink">
              Leaderboard — {challenge.title}
            </h1>
          </div>
          <p className="text-[11px] text-ink-3">Top scores by passed players</p>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-8">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Trophy size={32} className="text-ink-3 opacity-40" />
              <p className="text-[12px] text-ink-3">No completions yet. Be the first to clear this challenge!</p>
              <Link
                href={`/play/${challengeId}`}
                className="mt-2 px-4 py-2 bg-cyan hover:bg-cyan/90 text-base text-[11px] font-bold uppercase tracking-wider transition-colors"
              >
                Play Now
              </Link>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-edge-dim">
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-ink-3 pb-2 w-12">#</th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-ink-3 pb-2">Player</th>
                  <th className="text-right text-[10px] font-bold uppercase tracking-widest text-ink-3 pb-2">Score</th>
                  <th className="text-right text-[10px] font-bold uppercase tracking-widest text-ink-3 pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.rank}
                    className="border-b border-edge-dim hover:bg-raised transition-colors"
                  >
                    <td className={`py-3 text-[13px] font-bold ${rankColors[entry.rank] ?? 'text-ink-3'}`}>
                      {entry.rank}
                    </td>
                    <td className="py-3 text-[13px] text-ink-2">
                      {entry.username ?? <span className="text-ink-3 italic">Anonymous</span>}
                    </td>
                    <td className="py-3 text-right text-[13px] font-bold text-ink">
                      {entry.score}
                    </td>
                    <td className="py-3 text-right text-[11px] text-ink-3">
                      {new Date(entry.completed_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
