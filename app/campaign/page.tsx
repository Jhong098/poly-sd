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
  { id: 0, label: 'Tutorial',              color: 'text-ink-3'   },
  { id: 1, label: 'Tier 1 — Foundations', color: 'text-cyan'    },
  { id: 2, label: 'Tier 2 — Reliability', color: 'text-hot'     },
]

function ChallengeCard({
  challenge,
  completion,
}: {
  challenge: Challenge
  completion: CompletionRow | undefined
}) {
  const tierColors: Record<number, { badge: string; hover: string }> = {
    0: { badge: 'bg-surface text-ink-3',           hover: 'hover:border-edge-strong' },
    1: { badge: 'bg-cyan/10 text-cyan',             hover: 'hover:border-cyan/50'    },
  }
  const colors = tierColors[challenge.tier] ?? tierColors[1]
  const passed = completion?.passed

  return (
    <Link
      href={`/play/${challenge.id}`}
      className={`
        group relative flex flex-col gap-3 p-5 border
        bg-raised transition-colors
        ${passed
          ? 'border-ok/30 hover:border-ok/50'
          : `border-edge-dim ${colors.hover}`
        }
      `}
    >
      {/* Completion badge */}
      {passed && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-1.5 py-0.5 bg-ok/10 border border-ok/30">
          <CheckCircle2 size={11} className="text-ok" />
          <span className="text-[10px] font-bold text-ok">{completion!.score}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 tracking-wider uppercase ${colors.badge}`}>
            {challenge.id}
          </span>
          <h3 className="mt-1.5 text-[14px] font-bold text-ink-2 group-hover:text-ink transition-colors">
            {challenge.title}
          </h3>
        </div>
        {!passed && <Play size={13} className="text-ink-3 group-hover:text-ink-2 flex-shrink-0 mt-5 transition-colors" />}
      </div>

      {/* Narrative */}
      <p className="text-[11px] text-ink-3 leading-relaxed line-clamp-2">{challenge.narrative}</p>

      {/* SLA targets */}
      <div className="flex gap-3 text-[10px]">
        <span className="text-ink-3">p99 ≤ <span className="font-bold text-ink-2">{challenge.slaTargets.p99LatencyMs}ms</span></span>
        <span className="text-edge-strong">·</span>
        <span className="text-ink-3">err ≤ <span className="font-bold text-ink-2">{(challenge.slaTargets.errorRate * 100).toFixed(1)}%</span></span>
        <span className="text-edge-strong">·</span>
        <span className="text-ink-3">budget <span className="font-bold text-ink-2">${challenge.budgetPerHour.toFixed(2)}/hr</span></span>
      </div>

      {/* Concept tags */}
      <div className="flex flex-wrap gap-1">
        {challenge.conceptsTaught.slice(0, 3).map((c) => (
          <span key={c} className="text-[10px] px-1.5 py-0.5 bg-surface text-ink-3 border border-edge-dim">
            {c}
          </span>
        ))}
        {challenge.conceptsTaught.length > 3 && (
          <span className="text-[10px] px-1.5 py-0.5 bg-surface text-ink-3 border border-edge-dim">
            +{challenge.conceptsTaught.length - 3}
          </span>
        )}
      </div>
    </Link>
  )
}

export default async function CampaignPage() {
  const { userId } = await auth()

  const [completions, profile] = await Promise.all([
    userId ? getMyCompletions() : Promise.resolve([]),
    userId ? getOrCreateProfile() : Promise.resolve(null),
  ])

  const completionMap = new Map(completions.map((c) => [c.challenge_id, c]))
  const level = profile ? computeLevel(profile.xp) : null

  const totalPassed = completions.filter((c) => c.passed).length

  return (
    <div className="h-full overflow-y-auto bg-base text-ink">
      {/* Header */}
      <header className="border-b border-edge-dim px-8 py-6">
        <div className="max-w-4xl mx-auto flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-widest text-ink">Campaign</h1>
            <p className="text-[12px] text-ink-3 mt-0.5 tracking-wide">
              Learn distributed systems design through guided challenges
            </p>
          </div>
          <div className="flex items-center gap-2">
            {userId ? (
              <>
                {level && (
                  <Link href="/profile" className="flex items-center gap-2 px-3 py-2 bg-raised border border-edge-dim hover:border-edge transition-colors">
                    <Star size={12} className="text-warn" />
                    <div className="text-right">
                      <p className="text-[12px] font-bold text-ink-2">{level.title}</p>
                      <p className="text-[10px] text-ink-3">{level.currentXp} XP · {totalPassed} cleared</p>
                    </div>
                  </Link>
                )}
                <Link
                  href="/sandbox"
                  className="px-4 py-2 bg-surface border border-edge text-ink-2 text-[13px] font-bold uppercase tracking-wider hover:bg-overlay transition-colors"
                >
                  Free Play →
                </Link>
              </>
            ) : (
              <>
                <p className="text-[11px] text-ink-3 mr-1 tracking-wide">Save progress by signing in</p>
                <Link
                  href="/sign-in"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-edge text-ink-2 text-[13px] font-bold uppercase tracking-wider hover:bg-overlay transition-colors"
                >
                  <LogIn size={12} /> Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan text-base text-[13px] font-bold uppercase tracking-wider hover:bg-cyan/80 transition-colors"
                >
                  <UserPlus size={12} /> Sign up
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
                <h2 className={`text-[11px] font-bold uppercase tracking-widest ${tier.color}`}>
                  {tier.label}
                </h2>
                <div className="flex-1 h-px bg-edge-dim" />
                <span className="text-[10px] text-ink-3 tracking-wider">
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
        <section className="opacity-40">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-ink-3">
              Tier 3 — Distributed Data
            </h2>
            <div className="flex-1 h-px bg-edge-dim" />
            <Lock size={11} className="text-ink-3" />
          </div>
          <div className="flex items-center gap-3 p-4 border border-edge-dim bg-raised">
            <Lock size={14} className="text-ink-3 flex-shrink-0" />
            <p className="text-[12px] text-ink-3">
              Complete Tier 2 to unlock replication, sharding, and consensus protocols.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
