import { notFound } from 'next/navigation'
import { getReplay } from '@/lib/actions/replays'
import { CHALLENGE_MAP } from '@/lib/challenges/definitions'
import { ReplayViewer } from '@/components/replay/ReplayViewer'

export default async function ReplayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const replay = await getReplay(id)
  if (!replay) return notFound()

  const challenge = replay.challenge_id ? CHALLENGE_MAP.get(replay.challenge_id) ?? null : null

  return <ReplayViewer replay={replay} challenge={challenge ?? null} />
}
