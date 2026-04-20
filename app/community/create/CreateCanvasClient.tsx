'use client'

import dynamic from 'next/dynamic'

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

export function CreateCanvasClient() {
  return <CreateChallengeLayout />
}
