import Link from 'next/link'
import { CheckCircle2, Lock, Play, Star, LogIn, UserPlus } from 'lucide-react'
import { auth } from '@clerk/nextjs/server'
import { CHALLENGES } from '@/lib/challenges/definitions'
import { getMyCompletions } from '@/lib/actions/completions'
import { getOrCreateProfile } from '@/lib/actions/profile'
import { computeLevel } from '@/lib/xp'
import type { Challenge } from '@/lib/challenges/types'
import type { CompletionRow } from '@/lib/actions/completions'

const TIERS = [
  { id: 0, label: 'Tutorial',              color: 'text-gray-400'  },
  { id: 1, label: 'Tier 1 — Foundations', color: 'text-blue-400'  },
]

function ChallengeCard({
  challenge,
  completion,
}: {
  challenge: Challenge
  completion: CompletionRow | undefined
}) {
  const tierColors: Record<number, { badge: string; hover: string }> = {
    0: { badge: 'bg-gray-700 text-gray-400',    hover: 'hover:border-gray-500/60' },
    1: { badge: 'bg-blue-500/20 text-blue-400', hover: 'hover:border-blue-500/50' },
  }
  const colors = tierColors[challenge.tier] ?? tierColors[1]
  const passed = completion?.passed

  return (
    <Link
      href={`/play/${challenge.id}`}
      className={`
        group relative flex flex-col gap-3 p-5 rounded-xl border
        bg-gray-900/60 transition-all duration-200 hover:shadow-lg hover:shadow-black/30
        ${passed
          ? 'border-emerald-500/30 hover:border-emerald-400/50'
          : `border-gray-700/40 ${colors.hover}`
        }
      `}
    >
      {/* Completion badge */}
      {passed && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30">
          <CheckCircle2 size={11} className="text-emerald-400" />
          <span className="text-[10px] font-semibold text-emerald-400">{completion!.score}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${colors.badge}`}>
            {challenge.id}
          </span>
          <h3 className="mt-1.5 text-[15px] font-bold text-gray-100 group-hover:text-white transition-colors">
            {challenge.title}
          </h3>
        </div>
        {!passed && <Play size={15} className="text-gray-600 group-hover:text-gray-400 flex-shrink-0 mt-5 transition-colors" />}
      </div>

      {/* Narrative */}
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
            +{challenge.conceptsTaught.length - 3}
          </span>
        )}
      </div>
    </Link>
  )
}

export default async function CampaignPage() {
  const { userId } = await auth()

  // Fetch completions and profile in parallel (only when signed in)
  const [completions, profile] = await Promise.all([
    userId ? getMyCompletions() : Promise.resolve([]),
    userId ? getOrCreateProfile() : Promise.resolve(null),
  ])

  const completionMap = new Map(completions.map((c) => [c.challenge_id, c]))
  const level = profile ? computeLevel(profile.xp) : null

  const totalPassed = completions.filter((c) => c.passed).length

  return (
    <div className="h-full overflow-y-auto bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800/60 px-8 py-6">
        <div className="max-w-4xl mx-auto flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Campaign</h1>
            <p className="text-[13px] text-gray-500 mt-0.5">
              Learn distributed systems design through guided challenges
            </p>
          </div>
          <div className="flex items-center gap-2">
            {userId ? (
              <>
                {level && (
                  <Link href="/profile" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/60 border border-gray-700/40 hover:bg-gray-800 transition-colors">
                    <Star size={13} className="text-yellow-400" />
                    <div className="text-right">
                      <p className="text-[12px] font-semibold text-gray-200">{level.title}</p>
                      <p className="text-[10px] text-gray-500">{level.currentXp} XP · {totalPassed} cleared</p>
                    </div>
                  </Link>
                )}
                <Link
                  href="/sandbox"
                  className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-[13px] font-medium transition-colors"
                >
                  Free Play →
                </Link>
              </>
            ) : (
              <>
                <p className="text-[12px] text-gray-600 mr-1">Save progress by signing in</p>
                <Link
                  href="/sign-in"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-[13px] font-medium transition-colors border border-gray-700/60"
                >
                  <LogIn size={13} /> Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-medium transition-colors"
                >
                  <UserPlus size={13} /> Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Challenge tiers */}
      <main className="max-w-4xl mx-auto px-8 py-8 space-y-10">
        {TIERS.map((tier) => {
          const challenges = CHALLENGES.filter((c) => c.tier === tier.id)
          if (challenges.length === 0) return null
          const tierPassed = challenges.filter((c) => completionMap.get(c.id)?.passed).length

          return (
            <section key={tier.id}>
              <div className="flex items-center gap-3 mb-4">
                <h2 className={`text-[13px] font-bold uppercase tracking-wider ${tier.color}`}>
                  {tier.label}
                </h2>
                <div className="flex-1 h-px bg-gray-800/60" />
                <span className="text-[11px] text-gray-600">
                  {tierPassed}/{challenges.length} completed
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {challenges.map((c) => (
                  <ChallengeCard key={c.id} challenge={c} completion={completionMap.get(c.id)} />
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
            <p className="text-[13px] text-gray-600">
              Complete Tier 1 to unlock replicas, failover, and chaos injection.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
