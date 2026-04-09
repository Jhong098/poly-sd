import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Star, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react'
import { getOrCreateProfile } from '@/lib/actions/profile'
import { getMyCompletions } from '@/lib/actions/completions'
import { computeLevel } from '@/lib/xp'
import { CHALLENGE_MAP } from '@/lib/challenges/definitions'

export default async function ProfilePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [profile, completions] = await Promise.all([
    getOrCreateProfile(),
    getMyCompletions(),
  ])

  if (!profile) redirect('/sign-in')

  const level = computeLevel(profile.xp)

  return (
    <div className="h-full overflow-y-auto bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800/60 px-8 py-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/campaign" className="flex items-center gap-1.5 text-[12px] text-gray-600 hover:text-gray-400 mb-4 transition-colors w-fit">
            <ArrowLeft size={13} /> Campaign
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xl font-bold text-white">
              {(profile.username ?? profile.email ?? 'U')[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{profile.username ?? profile.email ?? 'Anonymous'}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Star size={13} className="text-yellow-400" />
                <span className="text-[13px] font-semibold text-yellow-300">{level.title}</span>
                <span className="text-gray-700">·</span>
                <span className="text-[13px] text-gray-500">Level {level.level}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-8 py-8 space-y-8">
        {/* XP progress */}
        <section className="bg-gray-900/60 border border-gray-800/60 rounded-xl p-5">
          <div className="flex justify-between items-end mb-3">
            <div>
              <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Experience</p>
              <p className="text-2xl font-bold text-white mt-0.5">{level.currentXp.toLocaleString()} XP</p>
            </div>
            {level.nextLevelXp !== null && (
              <p className="text-[12px] text-gray-500">
                {level.nextLevelXp - level.currentXp} XP to Level {level.level + 1}
              </p>
            )}
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-700"
              style={{ width: `${level.progress * 100}%` }}
            />
          </div>
          {level.nextLevelXp === null && (
            <p className="text-[11px] text-gray-600 mt-2">Maximum level reached.</p>
          )}
        </section>

        {/* Stats */}
        <section className="grid grid-cols-3 gap-3">
          {[
            { label: 'Completed',  value: completions.filter((c) => c.passed).length },
            { label: 'Attempted',  value: completions.length },
            { label: 'Best Score', value: completions.length > 0 ? Math.max(...completions.map((c) => c.score)) : '—' },
          ].map((s) => (
            <div key={s.label} className="bg-gray-900/60 border border-gray-800/60 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </section>

        {/* Completion history */}
        <section>
          <h2 className="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-3">History</h2>
          {completions.length === 0 ? (
            <div className="p-6 rounded-xl border border-gray-800/40 bg-gray-900/30 text-center">
              <p className="text-[13px] text-gray-600">No completions yet. Head to Campaign to start playing.</p>
              <Link href="/campaign" className="mt-3 inline-block text-[12px] text-blue-400 hover:text-blue-300">
                Go to Campaign →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {completions.map((c) => {
                const challenge = CHALLENGE_MAP.get(c.challenge_id)
                return (
                  <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-800/40 bg-gray-900/40">
                    {c.passed
                      ? <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                      : <XCircle size={16} className="text-red-400 flex-shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-gray-200 truncate">
                        {challenge?.title ?? c.challenge_id}
                      </p>
                      <p className="text-[11px] text-gray-600">
                        {c.challenge_id} · {new Date(c.completed_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[14px] font-bold text-white">{c.score}</p>
                      <p className="text-[10px] text-gray-600">score</p>
                    </div>
                    <Link
                      href={`/play/${c.challenge_id}`}
                      className="px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 text-[11px] transition-colors"
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
  )
}
