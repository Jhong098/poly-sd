import Link from 'next/link'
import { ThumbsUp, Users, CheckCircle2 } from 'lucide-react'
import { SiteNav } from '@/components/nav/SiteNav'
import { getCommunityFeed } from '@/lib/actions/community-challenges'
import type { FeedTab } from '@/lib/actions/community-challenges'

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab: rawTab } = await searchParams
  const tab: FeedTab =
    rawTab === 'new' || rawTab === 'top' ? rawTab : 'hot'

  const challenges = await getCommunityFeed(tab)

  const tabs: { id: FeedTab; label: string }[] = [
    { id: 'hot', label: 'Hot' },
    { id: 'new', label: 'New' },
    { id: 'top', label: 'Top' },
  ]

  return (
    <div className="h-full flex flex-col overflow-hidden bg-base text-ink">
      <SiteNav />

      <div className="flex-1 overflow-y-auto">
        {/* Sub-header */}
        <header className="border-b border-edge-dim px-8 py-5">
          <div className="max-w-3xl mx-auto flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[15px] font-bold text-ink">Community Challenges</h1>
              <p className="text-[12px] text-ink-3 mt-1">
                Player-created challenges rated by the community.
              </p>
            </div>
            <Link
              href="/community/create"
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-cyan hover:bg-cyan/90 text-base text-[11px] font-bold uppercase tracking-wider transition-colors"
            >
              <span>+</span> Create
            </Link>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-8 py-6">
          {/* Tabs */}
          <div className="flex gap-0 border-b border-edge-dim mb-6">
            {tabs.map(({ id, label }) => (
              <Link
                key={id}
                href={`/community?tab=${id}`}
                className={`px-4 py-2 text-[12px] font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px
                  ${tab === id
                    ? 'border-cyan text-cyan'
                    : 'border-transparent text-ink-3 hover:text-ink-2'
                  }`}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Challenge list */}
          {challenges.length === 0 ? (
            <div className="p-8 border border-edge-dim bg-raised text-center">
              <p className="text-[13px] text-ink-3">
                No community challenges yet. Complete 10 campaign levels to publish the first one.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {challenges.map((c) => {
                const passRate =
                  c.attempt_count > 0
                    ? ((c.pass_count / c.attempt_count) * 100).toFixed(0)
                    : null

                return (
                  <div
                    key={c.id}
                    className="flex gap-4 p-4 border border-edge-dim bg-raised hover:bg-overlay transition-colors"
                  >
                    {/* Tier badge */}
                    <div className="flex-shrink-0 w-9 h-9 bg-surface border border-edge flex items-center justify-center text-[11px] font-bold text-ink-3 uppercase">
                      T{c.tier}
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-ink leading-snug">{c.title}</p>
                      <p className="text-[12px] text-ink-3 mt-0.5 line-clamp-2">{c.narrative}</p>

                      {/* Author row */}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[11px] text-ink-3">
                          {c.author_username ?? 'Unknown'}
                        </span>
                        {c.author_is_badge && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-cyan/10 border border-cyan/30 text-[10px] font-bold text-cyan uppercase tracking-widest">
                            ⬡ Author
                          </span>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1 text-[11px] text-ink-3">
                          <ThumbsUp size={11} />
                          {c.upvote_count}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-ink-3">
                          <Users size={11} />
                          {c.attempt_count}
                        </span>
                        {passRate !== null && (
                          <span className="flex items-center gap-1 text-[11px] text-ink-3">
                            <CheckCircle2 size={11} />
                            {passRate}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Play button */}
                    <div className="flex-shrink-0 flex items-center">
                      <Link
                        href={`/community/${c.id}`}
                        className="h-8 flex items-center px-4 text-[11px] font-bold uppercase tracking-wider bg-cyan text-base hover:bg-cyan/80 transition-colors"
                      >
                        Play
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
