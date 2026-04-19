import { Suspense } from 'react'
import { CHALLENGES } from '@/lib/challenges/definitions'
import { PlayPageClient } from './PlayPageClient'

export function generateStaticParams() {
  return CHALLENGES.map(c => ({ levelId: c.id }))
}

export default function Page({ params }: { params: Promise<{ levelId: string }> }) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full bg-gray-950">
        <div className="w-5 h-5 border-2 border-gray-600 border-t-gray-300 rounded-full animate-spin" />
      </div>
    }>
      <PlayPageClient params={params} />
    </Suspense>
  )
}
