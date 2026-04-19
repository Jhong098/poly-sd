import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { SiteNav } from '@/components/nav/SiteNav'
import { getTutorialProgress } from '@/lib/actions/community-challenges'
import { TUTORIAL_CHALLENGE_IDS } from '@/lib/config'

const CreateChallengeLayout = dynamic(
  () => import('@/components/canvas/CreateChallengeLayout').then((m) => ({ default: m.CreateChallengeLayout })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-base">
        <div className="w-5 h-5 border-2 border-gray-600 border-t-gray-300 rounded-full animate-spin" />
      </div>
    ),
  }
)

export default async function CommunityCreatePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { passed, total } = await getTutorialProgress()
  const eligible = passed >= total

  if (!eligible) {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-base text-ink">
        <SiteNav />
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-sm w-full mx-auto px-8 text-center space-y-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-3 mb-2">
                Challenge Creation Locked
              </p>
              <p className="text-[18px] font-bold text-ink">Complete the Tutorial First</p>
              <p className="text-[13px] text-ink-3 mt-2">
                Finish all {total} tutorial levels to unlock the ability to create and publish community challenges.
              </p>
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-[11px] text-ink-3 mb-1.5">
                <span>Tutorial progress</span>
                <span>{passed} / {total}</span>
              </div>
              <div className="h-1.5 bg-surface border border-edge overflow-hidden">
                <div
                  className="h-full bg-cyan transition-all"
                  style={{ width: `${(passed / total) * 100}%` }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Link
                href="/campaign"
                className="w-full flex items-center justify-center px-4 py-2 bg-cyan hover:bg-cyan/90 text-base text-[11px] font-bold uppercase tracking-wider transition-colors"
              >
                Go to Campaign
              </Link>
              <Link
                href="/community"
                className="w-full flex items-center justify-center px-4 py-2 border border-edge bg-raised hover:bg-overlay text-ink-3 text-[11px] font-bold uppercase tracking-wider transition-colors"
              >
                Back to Community
              </Link>
            </div>

            <p className="text-[11px] text-ink-3">
              Tutorial levels: {TUTORIAL_CHALLENGE_IDS.map((id, i) => (
                <span key={id}>
                  <span className={i < passed ? 'text-ok' : 'text-ink-3'}>{id}</span>
                  {i < TUTORIAL_CHALLENGE_IDS.length - 1 ? ', ' : ''}
                </span>
              ))}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-base text-ink">
      <CreateChallengeLayout />
    </div>
  )
}
