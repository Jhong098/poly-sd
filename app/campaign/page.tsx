import Link from 'next/link'
import { CheckCircle2, Lock, Play } from 'lucide-react'
import { CHALLENGES } from '@/lib/challenges/definitions'
import type { Challenge } from '@/lib/challenges/types'

// Group challenges by tier
const TIERS = [
  { id: 0, label: 'Tutorial', color: 'text-gray-400', accent: 'border-gray-600/40 bg-gray-800/30' },
  { id: 1, label: 'Tier 1 — Foundations', color: 'text-blue-400', accent: 'border-blue-500/30 bg-blue-500/5' },
]

function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const tierColors: Record<number, { badge: string; hover: string; ring: string }> = {
    0: { badge: 'bg-gray-700 text-gray-400',  hover: 'hover:border-gray-500/60', ring: 'hover:ring-gray-500/20' },
    1: { badge: 'bg-blue-500/20 text-blue-400', hover: 'hover:border-blue-500/50', ring: 'hover:ring-blue-500/10' },
  }
  const colors = tierColors[challenge.tier] ?? tierColors[1]

  return (
    <Link
      href={`/play/${challenge.id}`}
      className={`
        group relative flex flex-col gap-3 p-5 rounded-xl border
        bg-gray-900/60 border-gray-700/40 transition-all duration-200
        ${colors.hover} ${colors.ring} hover:ring-2 hover:shadow-lg hover:shadow-black/30
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${colors.badge}`}>
            {challenge.id}
          </span>
          <h3 className="mt-1.5 text-[15px] font-bold text-gray-100 group-hover:text-white transition-colors">
            {challenge.title}
          </h3>
        </div>
        <Play size={16} className="text-gray-600 group-hover:text-gray-400 flex-shrink-0 mt-1 transition-colors" />
      </div>

      {/* Narrative excerpt */}
      <p className="text-[12px] text-gray-500 leading-relaxed line-clamp-2">{challenge.narrative}</p>

      {/* SLA targets */}
      <div className="flex gap-3 text-[11px]">
        <span className="text-gray-600">p99 ≤ <span className="font-mono text-gray-400">{challenge.slaTargets.p99LatencyMs}ms</span></span>
        <span className="text-gray-700">·</span>
        <span className="text-gray-600">err ≤ <span className="font-mono text-gray-400">{(challenge.slaTargets.errorRate * 100).toFixed(1)}%</span></span>
        <span className="text-gray-700">·</span>
        <span className="text-gray-600">budget <span className="font-mono text-gray-400">${challenge.budgetPerHour.toFixed(2)}/hr</span></span>
      </div>

      {/* Concept tags */}
      <div className="flex flex-wrap gap-1">
        {challenge.conceptsTaught.slice(0, 3).map((c) => (
          <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-600 border border-gray-700/50">
            {c}
          </span>
        ))}
        {challenge.conceptsTaught.length > 3 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-600 border border-gray-700/50">
            +{challenge.conceptsTaught.length - 3} more
          </span>
        )}
      </div>
    </Link>
  )
}

export default function CampaignPage() {
  return (
    <div className="h-full overflow-y-auto bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800/60 px-8 py-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Campaign</h1>
            <p className="text-[13px] text-gray-500 mt-0.5">
              Learn distributed systems design through guided challenges
            </p>
          </div>
          <Link
            href="/sandbox"
            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-[13px] font-medium transition-colors"
          >
            Free Play →
          </Link>
        </div>
      </header>

      {/* Challenge tiers */}
      <main className="max-w-4xl mx-auto px-8 py-8 space-y-10">
        {TIERS.map((tier) => {
          const challenges = CHALLENGES.filter((c) => c.tier === tier.id)
          if (challenges.length === 0) return null

          return (
            <section key={tier.id}>
              <div className="flex items-center gap-3 mb-4">
                <h2 className={`text-[13px] font-bold uppercase tracking-wider ${tier.color}`}>
                  {tier.label}
                </h2>
                <div className="flex-1 h-px bg-gray-800/60" />
                <span className="text-[11px] text-gray-600">{challenges.length} challenges</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {challenges.map((c) => (
                  <ChallengeCard key={c.id} challenge={c} />
                ))}
              </div>
            </section>
          )
        })}

        {/* Locked tiers teaser */}
        <section className="opacity-50">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-[13px] font-bold uppercase tracking-wider text-gray-600">
              Tier 2 — Reliability
            </h2>
            <div className="flex-1 h-px bg-gray-800/40" />
            <Lock size={12} className="text-gray-700" />
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl border border-gray-800/40 bg-gray-900/30">
            <Lock size={16} className="text-gray-700" />
            <p className="text-[13px] text-gray-600">Complete Tier 1 to unlock replicas, failover, and chaos injection.</p>
          </div>
        </section>
      </main>
    </div>
  )
}
