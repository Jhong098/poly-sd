import { notFound } from 'next/navigation'
import { getReplay } from '@/lib/actions/replays'
import { CHALLENGE_MAP } from '@/lib/challenges/definitions'
import { ReplayViewerLazy } from '@/components/replay/ReplayViewerLazy'

export default async function ReplayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const replay = await getReplay(id)
  if (!replay) return notFound()

  const challenge = replay.challenge_id ? CHALLENGE_MAP.get(replay.challenge_id) ?? null : null

  return <ReplayViewerLazy replay={replay} challenge={challenge ?? null} />
}
