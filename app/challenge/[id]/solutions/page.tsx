import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { CHALLENGE_MAP } from '@/lib/challenges/definitions'
import { getLeaderboard } from '@/lib/actions/replays'
import { SolutionsTable } from '@/components/challenge/SolutionsTable'

export default async function SolutionsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const challenge = CHALLENGE_MAP.get(id)
  if (!challenge) return notFound()

  const entries = await getLeaderboard(id, 50)

  return (
    <div className="min-h-screen bg-base text-ink font-mono">
      {/* Header */}
      <div className="border-b border-edge bg-raised px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <a
            href={`/play/${challenge.id}`}
            className="inline-flex items-center gap-1.5 text-[11px] text-ink-3 hover:text-ink transition-colors mb-3"
          >
            <ArrowLeft size={13} /> Back to challenge
          </a>
          <h1 className="text-[18px] font-bold text-ink">{challenge.title}</h1>
          <p className="text-[12px] text-ink-3 mt-1">{challenge.objective}</p>
          <div className="flex gap-6 mt-3">
            <div>
              <span className="text-[10px] text-ink-3 uppercase tracking-widest">p99 target</span>
              <p className="text-[12px] text-ink-2 font-semibold">{challenge.slaTargets.p99LatencyMs}ms</p>
            </div>
            <div>
              <span className="text-[10px] text-ink-3 uppercase tracking-widest">error rate</span>
              <p className="text-[12px] text-ink-2 font-semibold">{(challenge.slaTargets.errorRate * 100).toFixed(1)}%</p>
            </div>
            <div>
              <span className="text-[10px] text-ink-3 uppercase tracking-widest">budget</span>
              <p className="text-[12px] text-ink-2 font-semibold">${challenge.budgetPerHour.toFixed(2)}/hr</p>
            </div>
            <div>
              <span className="text-[10px] text-ink-3 uppercase tracking-widest">top solutions</span>
              <p className="text-[12px] text-ink-2 font-semibold">{entries.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Solutions list */}
      <div className="max-w-3xl mx-auto py-4">
        <p className="text-[10px] font-bold text-cyan uppercase tracking-widest px-6 mb-2">
          // Top Solutions
        </p>
        <SolutionsTable entries={entries} challenge={challenge} />
      </div>
    </div>
  )
}
