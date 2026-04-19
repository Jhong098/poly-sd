import Link from 'next/link'
import { CheckCircle2, Lock, Play, RotateCcw, Trophy } from 'lucide-react'
import { auth } from '@clerk/nextjs/server'
import { CHALLENGES } from '@/lib/challenges/definitions'
import { getMyCompletions } from '@/lib/actions/completions'
import { getOrCreateProfile } from '@/lib/actions/profile'
import { getChallengeDrafts } from '@/lib/actions/drafts'
import { computeLevel } from '@/lib/xp'
import { computeUnlockedTiers } from '@/lib/campaign/tierUnlock'
import { SiteNav } from '@/components/nav/SiteNav'
import type { Challenge } from '@/lib/challenges/types'
import type { CompletionRow } from '@/lib/actions/completions'

const TIERS = [
  { id: 0, label: 'Tutorial',                    color: 'text-ink-3'  },
  { id: 1, label: 'Tier 1 — Foundations',        color: 'text-cyan'   },
  { id: 2, label: 'Tier 2 — Scale Out',          color: 'text-hot'    },
  { id: 3, label: 'Tier 3 — Resilience',         color: 'text-violet' },
  { id: 4, label: 'Tier 4 — Distributed Data',  color: 'text-ok'     },
  { id: 5, label: 'Tier 5 — Global Systems',    color: 'text-warn'   },
]

function ChallengeCard({
  challenge,
  completion,
  hasDraft,
  isLocked,
}: {
  challenge: Challenge
  completion: CompletionRow | undefined
  hasDraft: boolean
  isLocked: boolean
}) {
  if (isLocked) {
    return (
      <div data-testid="challenge-card-locked" className="group relative flex flex-col gap-3 p-5 border border-edge-dim bg-raised opacity-40 cursor-not-allowed select-none">
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <span className="text-[10px] font-bold px-1.5 py-0.5 tracking-wider uppercase bg-surface text-ink-3">
              {challenge.id}
            </span>
            <h3 className="mt-1.5 text-[14px] font-bold text-ink-3">{challenge.title}</h3>
          </div>
          <Lock size={13} className="text-ink-3 flex-shrink-0 mt-5" />
        </div>
        <p className="text-[11px] text-ink-3 leading-relaxed line-clamp-2">{challenge.narrative}</p>
        <div className="flex gap-3 text-[10px]">
          <span className="text-ink-3">p99 ≤ <span className="font-bold text-ink-3">{challenge.slaTargets.p99LatencyMs}ms</span></span>
          <span className="text-edge-strong">·</span>
          <span className="text-ink-3">err ≤ <span className="font-bold text-ink-3">{(challenge.slaTargets.errorRate * 100).toFixed(1)}%</span></span>
          <span className="text-edge-strong">·</span>
          <span className="text-ink-3">budget <span className="font-bold text-ink-3">${challenge.budgetPerHour.toFixed(2)}/hr</span></span>
        </div>
      </div>
    )
  }

  const tierColors: Record<number, { badge: string; hover: string }> = {
    0: { badge: 'bg-surface text-ink-3',       hover: 'hover:border-edge-strong' },
    1: { badge: 'bg-cyan/10 text-cyan',         hover: 'hover:border-cyan/50'    },
  }
  const colors = tierColors[challenge.tier] ?? tierColors[1]
  const passed = completion?.passed
  // A passed challenge always shows as completed — draft only matters for incomplete work
  const showDraftButtons = hasDraft && !passed

  const cardBody = (
    <>
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
        {!passed && !hasDraft && <Play size={13} className="text-ink-3 group-hover:text-ink-2 flex-shrink-0 mt-5 transition-colors" />}
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
    </>
  )

  const cardClass = `
    group relative flex flex-col gap-3 p-5 border
    bg-raised transition-colors
    ${showDraftButtons
      ? 'border-edge-dim cursor-default'
      : passed
        ? 'border-ok/30 hover:border-ok/50'
        : `border-edge-dim ${colors.hover}`
    }
  `

  if (showDraftButtons) {
    return (
      <div className={cardClass}>
        {cardBody}
        <div className="flex gap-2 pt-1">
          <Link
            href={`/play/${challenge.id}?resume=true`}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-cyan hover:bg-cyan/90 text-base text-[11px] font-bold uppercase tracking-wider transition-colors"
          >
            <Play size={11} /> Continue
          </Link>
          <Link
            href={`/play/${challenge.id}?restart=true`}
            className="flex items-center gap-1.5 px-3 py-2 border border-edge bg-surface hover:bg-overlay text-ink-2 text-[11px] font-bold uppercase tracking-wider transition-colors"
          >
            <RotateCcw size={11} /> Restart
          </Link>
          <Link
            href={`/leaderboard/${challenge.id}`}
            className="flex items-center gap-1.5 px-3 py-2 border border-edge bg-surface hover:bg-overlay text-ink-2 text-[11px] font-bold uppercase tracking-wider transition-colors"
          >
            <Trophy size={11} />
          </Link>
        </div>
      </div>
    )
  }

  // Passed challenges: clicking loads the winning solution; Restart resets to starter
  if (passed) {
    return (
      <div className={cardClass}>
        {cardBody}
        <div className="flex gap-2 pt-1">
          <Link
            href={`/play/${challenge.id}?resume=true`}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-ok/40 bg-ok/5 hover:bg-ok/10 text-ok text-[11px] font-bold uppercase tracking-wider transition-colors"
          >
            <Play size={11} /> View Solution
          </Link>
          <Link
            href={`/play/${challenge.id}?restart=true`}
            className="flex items-center gap-1.5 px-3 py-2 border border-edge bg-surface hover:bg-overlay text-ink-2 text-[11px] font-bold uppercase tracking-wider transition-colors"
          >
            <RotateCcw size={11} /> Restart
          </Link>
          <Link
            href={`/leaderboard/${challenge.id}`}
            className="flex items-center gap-1.5 px-3 py-2 border border-edge bg-surface hover:bg-overlay text-ink-2 text-[11px] font-bold uppercase tracking-wider transition-colors"
          >
            <Trophy size={11} />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={cardClass}>
      <Link href={`/play/${challenge.id}`} className="flex flex-col gap-3 flex-1">
        {cardBody}
      </Link>
      <div className="flex gap-2 pt-1">
        <Link
          href={`/play/${challenge.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-edge bg-surface hover:bg-overlay text-ink-2 text-[11px] font-bold uppercase tracking-wider transition-colors"
        >
          <Play size={11} /> Play
        </Link>
        <Link
          href={`/leaderboard/${challenge.id}`}
          className="flex items-center gap-1.5 px-3 py-2 border border-edge bg-surface hover:bg-overlay text-ink-2 text-[11px] font-bold uppercase tracking-wider transition-colors"
        >
          <Trophy size={11} />
        </Link>
      </div>
    </div>
  )
}

export default async function CampaignPage() {
  const { userId } = await auth()

  const [completions, profile, drafts] = await Promise.all([
    userId ? getMyCompletions() : Promise.resolve([]),
    userId ? getOrCreateProfile() : Promise.resolve(null),
    userId ? getChallengeDrafts() : Promise.resolve([]),
  ])

  const completionMap = new Map(completions.map((c) => [c.challenge_id, c]))
  const draftMap = new Map(drafts.map((d) => [d.challenge_id, true]))
  const level = profile ? computeLevel(profile.xp) : null
  const totalPassed = completions.filter((c) => c.passed).length

  const unlockedTiers = computeUnlockedTiers(CHALLENGES, completionMap)

  return (
    <div className="h-full flex flex-col overflow-hidden bg-base text-ink">
      <SiteNav />

      {/* Sub-header */}
      <div className="flex-shrink-0 flex items-center justify-between px-8 py-3 border-b border-edge-dim bg-base">
        <div>
          <h1 className="text-[11px] font-bold uppercase tracking-widest text-ink">Campaign</h1>
          <p className="text-[11px] text-ink-3">Learn distributed systems design through guided challenges</p>
        </div>
        {level && (
          <div className="text-right">
            <p className="text-[12px] font-bold text-ink-2">{level.title}</p>
            <p className="text-[10px] text-ink-3">{level.currentXp} XP · {totalPassed} cleared</p>
          </div>
        )}
      </div>

      {/* Challenge tiers */}
      <main className="flex-1 overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
        <div className="max-w-4xl mx-auto px-8 py-8 space-y-10">
          {TIERS.map((tier) => {
            const challenges = CHALLENGES.filter((c) => c.tier === tier.id).sort((a, b) => a.order - b.order)
            if (challenges.length === 0) return null
            const tierPassed = challenges.filter((c) => completionMap.get(c.id)?.passed).length
            const tierUnlocked = unlockedTiers.has(tier.id)

            return (
              <section key={tier.id} data-testid={`tier-section-${tier.id}`}>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className={`text-[11px] font-bold uppercase tracking-widest ${tierUnlocked ? tier.color : 'text-ink-3'}`}>
                    {tier.label}
                  </h2>
                  {!tierUnlocked && <Lock size={11} className="text-ink-3" />}
                  <div className="flex-1 h-px bg-edge-dim" />
                  <span data-testid="tier-status" className="text-[10px] text-ink-3 tracking-wider">
                    {tierUnlocked ? `${tierPassed}/${challenges.length} completed` : 'locked'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {challenges.map((c) => (
                    <ChallengeCard
                      key={c.id}
                      challenge={c}
                      completion={completionMap.get(c.id)}
                      hasDraft={draftMap.get(c.id) ?? false}
                      isLocked={!tierUnlocked}
                    />
                  ))}
                </div>
              </section>
            )
          })}

        </div>
      </main>
    </div>
  )
}
