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
import type { ComponentNode, ComponentEdge } from '@/lib/store/architectureStore'

export default function PlayPage({ params }: { params: Promise<{ levelId: string }> }) {
  const { levelId } = use(params)
  const challenge = CHALLENGE_MAP.get(levelId)

  const { setActiveChallenge } = useChallengeStore()
  const { initFromStarterGraph, clearCanvas, loadDraft } = useArchitectureStore()
  const { stopSimulation, setDuration, setWaypoints } = useSimStore()
  const [ready, setReady] = useState(false)

  const searchParams = useSearchParams()
  const resume = searchParams.get('resume') === 'true'
  const restart = searchParams.get('restart') === 'true'
  const { userId } = useAuth()

  useEffect(() => {
    if (!challenge) return
    // Wait for Clerk auth to resolve before running resume/restart paths
    if ((resume || restart) && userId === undefined) return
    let cancelled = false

    async function init() {
      stopSimulation()
      setActiveChallenge(challenge)
      setDuration(challenge.trafficConfig.durationMs)
      setWaypoints(challenge.trafficConfig.waypoints)

      function loadStarter() {
        if (challenge.starterNodes?.length) {
          initFromStarterGraph(challenge.starterNodes, challenge.starterEdges ?? [])
        } else {
          clearCanvas()
        }
      }

      if (restart && userId) {
        // Clear localStorage draft and load starter graph
        clearLocalDraft(userId, challenge.id)
        loadStarter()
      } else if (resume && userId) {
        // Pick the most recent draft between localStorage and Supabase
        const local = readLocalDraft(userId, challenge.id)
        let db: { nodes: ComponentNode[]; edges: ComponentEdge[]; saved_at: string } | null = null
        try {
          db = await getDraft(challenge.id) as typeof db
        } catch (err) {
          console.warn('getDraft failed, falling back to localStorage:', err)
        }
        if (cancelled) return

        const localTime = local ? new Date(local.savedAt).getTime() : 0
        const dbTime = db ? new Date(db.saved_at).getTime() : 0

        if (localTime === 0 && dbTime === 0) {
          // No draft found — fall back to starter graph
          loadStarter()
        } else if (localTime >= dbTime && local) {
          // localStorage is more recent (or tied — local updates more frequently)
          loadDraft(local.nodes, local.edges)
        } else if (db) {
          loadDraft(db.nodes, db.edges)
        }
      } else {
        // Normal visit — load starter graph
        loadStarter()
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
  }, [levelId, resume, restart, userId])

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
