import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Star, CheckCircle2, XCircle, ThumbsUp, Users, Pencil } from 'lucide-react'
import { getOrCreateProfile } from '@/lib/actions/profile'
import { getMyCompletions } from '@/lib/actions/completions'
import { getMyAuthoredChallenges, getCommunityChallengeTitles } from '@/lib/actions/community-challenges'
import { computeLevel } from '@/lib/xp'
import { CHALLENGE_MAP } from '@/lib/challenges/definitions'
import { SiteNav } from '@/components/nav/SiteNav'

export default async function ProfilePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [profile, completions] = await Promise.all([
    getOrCreateProfile(),
    getMyCompletions(),
  ])

  if (!profile) redirect('/sign-in')

  // Resolve titles for community challenge completions (challenge_id = "community:<uuid>")
  const communityUuids = completions
    .filter((c) => c.challenge_id.startsWith('community:'))
    .map((c) => c.challenge_id.slice('community:'.length))

  const [communityTitles, authoredChallenges] = await Promise.all([
    getCommunityChallengeTitles(communityUuids),
    profile.is_challenge_author ? getMyAuthoredChallenges() : Promise.resolve([]),
  ])

  const level = computeLevel(profile.xp)

  return (
    <div className="h-full flex flex-col overflow-hidden bg-base text-ink">
      <SiteNav />

      <div className="flex-1 overflow-y-auto">
        {/* Sub-header */}
        <header className="border-b border-edge-dim px-8 py-5">
          <div className="max-w-3xl mx-auto flex items-center gap-4">
            <div className="w-12 h-12 bg-surface border border-edge flex items-center justify-center text-xl font-bold text-cyan">
              {(profile.username ?? profile.email ?? 'U')[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-ink">{profile.username ?? profile.email ?? 'Anonymous'}</h1>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <Star size={12} className="text-warn" />
                <span className="text-[12px] font-bold text-warn">{level.title}</span>
                <span className="text-edge-strong">·</span>
                <span className="text-[12px] text-ink-3">Level {level.level}</span>
                {profile.is_challenge_author && (
                  <>
                    <span className="text-edge-strong">·</span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-cyan/10 border border-cyan/30 text-[10px] font-bold text-cyan uppercase tracking-widest">
                      ⬡ Challenge Author
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-8 py-8 space-y-8">
          {/* XP progress */}
          <section className="bg-raised border border-edge-dim p-5">
            <div className="flex justify-between items-end mb-3">
              <div>
                <p className="text-[10px] font-bold text-ink-3 uppercase tracking-widest">Experience</p>
                <p className="text-2xl font-bold text-ink mt-0.5">{level.currentXp.toLocaleString()} XP</p>
              </div>
              {level.nextLevelXp !== null && (
                <p className="text-[11px] text-ink-3">
                  {level.nextLevelXp - level.currentXp} XP to Level {level.level + 1}
                </p>
              )}
            </div>
            <div className="h-1.5 bg-surface overflow-hidden">
              <div
                className="h-full bg-cyan transition-[width] duration-700"
                style={{ width: `${level.progress * 100}%` }}
              />
            </div>
            {level.nextLevelXp === null && (
              <p className="text-[11px] text-ink-3 mt-2">Maximum level reached.</p>
            )}
          </section>

          {/* Stats */}
          <section className="grid grid-cols-3 gap-3">
            {[
              { label: 'Completed',  value: completions.filter((c) => c.passed).length },
              { label: 'Attempted',  value: completions.length },
              { label: 'Best Score', value: completions.length > 0 ? Math.max(...completions.map((c) => c.score)) : '—' },
            ].map((s) => (
              <div key={s.label} className="bg-raised border border-edge-dim p-4 text-center">
                <p className="text-2xl font-bold text-ink">{s.value}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-3 mt-1">{s.label}</p>
              </div>
            ))}
          </section>

          {/* My Challenges — only for challenge authors */}
          {profile.is_challenge_author && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[11px] font-bold text-ink-3 uppercase tracking-widest">My Challenges</h2>
                <Link
                  href="/community/create"
                  className="flex items-center gap-1 text-[11px] text-cyan hover:text-cyan/80 transition-colors"
                >
                  <Pencil size={11} /> New
                </Link>
              </div>
              {authoredChallenges.length === 0 ? (
                <div className="p-6 border border-edge-dim bg-raised text-center">
                  <p className="text-[12px] text-ink-3">No published challenges yet.</p>
                  <Link href="/community/create" className="mt-3 inline-block text-[12px] text-cyan hover:text-cyan/80 transition-colors">
                    Create your first challenge →
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {authoredChallenges.map((c) => {
                    const passRate = c.attempt_count > 0
                      ? Math.round((c.pass_count / c.attempt_count) * 100)
                      : null
                    return (
                      <div key={c.id} className="flex items-center gap-3 p-3 border border-edge-dim bg-raised">
                        <div className="flex-shrink-0 w-7 h-7 bg-surface border border-edge flex items-center justify-center text-[10px] font-bold text-ink-3 uppercase">
                          T{c.tier}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-ink-2 truncate">{c.title}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-[11px] text-ink-3">
                              <ThumbsUp size={10} /> {c.upvote_count}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] text-ink-3">
                              <Users size={10} /> {c.attempt_count}
                            </span>
                            {passRate !== null && (
                              <span className="flex items-center gap-1 text-[11px] text-ink-3">
                                <CheckCircle2 size={10} /> {passRate}%
                              </span>
                            )}
                          </div>
                        </div>
                        <Link
                          href={`/community/${c.id}`}
                          className="h-7 flex items-center px-3 text-[11px] font-bold uppercase tracking-wider bg-surface border border-edge text-ink-3 hover:text-ink-2 hover:bg-overlay transition-colors"
                        >
                          View
                        </Link>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )}

          {/* Completion history */}
          <section>
            <h2 className="text-[11px] font-bold text-ink-3 uppercase tracking-widest mb-3">History</h2>
            {completions.length === 0 ? (
              <div className="p-6 border border-edge-dim bg-raised text-center">
                <p className="text-[12px] text-ink-3">No completions yet. Head to Campaign to start playing.</p>
                <Link href="/campaign" className="mt-3 inline-block text-[12px] text-cyan hover:text-cyan/80 transition-colors">
                  Go to Campaign →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {completions.map((c) => {
                  const isCommunity = c.challenge_id.startsWith('community:')
                  const uuid = isCommunity ? c.challenge_id.slice('community:'.length) : null
                  const title = isCommunity
                    ? (communityTitles[uuid!] ?? 'Community Challenge')
                    : (CHALLENGE_MAP.get(c.challenge_id)?.title ?? c.challenge_id)
                  const retryHref = isCommunity ? `/community/${uuid}` : `/play/${c.challenge_id}`

                  return (
                    <div key={c.id} className="flex items-center gap-3 p-3 border border-edge-dim bg-raised">
                      {c.passed
                        ? <CheckCircle2 size={15} className="text-ok flex-shrink-0" />
                        : <XCircle size={15} className="text-err flex-shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-ink-2 truncate">{title}</p>
                        <p className="text-[10px] text-ink-3">
                          {isCommunity ? 'Community' : c.challenge_id} · {new Date(c.completed_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[14px] font-bold text-ink">{c.score}</p>
                        <p className="text-[10px] text-ink-3 uppercase tracking-wider">score</p>
                      </div>
                      <Link
                        href={retryHref}
                        className="h-7 flex items-center px-3 text-[11px] font-bold uppercase tracking-wider bg-surface border border-edge text-ink-3 hover:text-ink-2 hover:bg-overlay transition-colors"
                      >
                        Retry
                      </Link>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}
