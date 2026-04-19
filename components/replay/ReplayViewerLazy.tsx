'use client'

import dynamic from 'next/dynamic'
import type { ReplayRow } from '@/lib/actions/replays'
import type { Challenge } from '@/lib/challenges/types'

const ReplayViewer = dynamic(
  () => import('./ReplayViewer').then(m => ({ default: m.ReplayViewer })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-gray-950">
        <div className="w-5 h-5 border-2 border-gray-600 border-t-gray-300 rounded-full animate-spin" />
      </div>
    ),
  }
)

export function ReplayViewerLazy({ replay, challenge }: { replay: ReplayRow; challenge: Challenge | null }) {
  return <ReplayViewer replay={replay} challenge={challenge} />
}
