'use client'

import { use, useEffect, useState } from 'react'
import { notFound, useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { CHALLENGE_MAP } from '@/lib/challenges/definitions'
import { useChallengeStore } from '@/lib/store/challengeStore'
import { useArchitectureStore } from '@/lib/store/architectureStore'
import { useSimStore } from '@/lib/store/simStore'
import { ChallengeLayout } from '@/components/canvas/ChallengeLayout'
import { getDraft } from '@/lib/actions/drafts'
import { readLocalDraft, clearLocalDraft } from '@/lib/draft'

export default function PlayPage({ params }: { params: Promise<{ levelId: string }> }) {
  const { levelId } = use(params)
  const challenge = CHALLENGE_MAP.get(levelId)

  const { setActiveChallenge } = useChallengeStore()
  const { initFromStarterGraph, clearCanvas } = useArchitectureStore()
  const { stopSimulation, setDuration, setWaypoints } = useSimStore()
  const [ready, setReady] = useState(false)

  const searchParams = useSearchParams()
  const resume = searchParams.get('resume') === 'true'
  const restart = searchParams.get('restart') === 'true'
  const { userId } = useAuth()

  useEffect(() => {
    if (!challenge) return
    let cancelled = false

    async function init() {
      stopSimulation()
      setActiveChallenge(challenge)
      setDuration(challenge.trafficConfig.durationMs)
      setWaypoints(challenge.trafficConfig.waypoints)

      if (restart && userId) {
        // Path A — restart: clear draft, load starter graph
        clearLocalDraft(userId, challenge.id)
        if (challenge.starterNodes?.length) {
          initFromStarterGraph(challenge.starterNodes, challenge.starterEdges ?? [])
        } else {
          clearCanvas()
        }
      } else if (resume && userId) {
        // Path B — resume: load most recent draft (local or db)
        const local = readLocalDraft(userId, challenge.id)

        let db: { nodes: unknown[]; edges: unknown[]; saved_at: string } | null = null
        try {
          db = await getDraft(challenge.id)
        } catch {
          // Fall back to local draft on error
        }

        if (cancelled) return

        const localTime = local ? new Date(local.savedAt).getTime() : 0
        const dbTime = db ? new Date(db.saved_at).getTime() : 0

        if (localTime === 0 && dbTime === 0) {
          if (challenge.starterNodes?.length) {
            initFromStarterGraph(challenge.starterNodes, challenge.starterEdges ?? [])
          } else {
            clearCanvas()
          }
        } else if (localTime >= dbTime && local) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          initFromStarterGraph(local.nodes as any, local.edges as any)
        } else if (db) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          initFromStarterGraph(db.nodes as any, db.edges as any)
        }
      } else {
        // Path C — normal visit: load starter graph
        if (challenge.starterNodes?.length) {
          initFromStarterGraph(challenge.starterNodes, challenge.starterEdges ?? [])
        } else {
          clearCanvas()
        }
      }

      if (!cancelled) setReady(true)
    }

    init()

    return () => {
      cancelled = true
      stopSimulation()
      setActiveChallenge(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelId])

  if (!challenge) return notFound()
  if (!ready) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-950">
        <div className="w-5 h-5 border-2 border-gray-600 border-t-gray-300 rounded-full animate-spin" />
      </div>
    )
  }

  return <ChallengeLayout />
}
