'use client'

import { use, useEffect, useState } from 'react'
import { notFound } from 'next/navigation'
import { useChallengeStore } from '@/lib/store/challengeStore'
import { useArchitectureStore } from '@/lib/store/architectureStore'
import { useSimStore } from '@/lib/store/simStore'
import { ChallengeLayout } from '@/components/canvas/ChallengeLayout'
import { getCommunityChallenge, incrementAttemptCount } from '@/lib/actions/community-challenges'
import type { Challenge } from '@/lib/challenges/types'

export default function CommunityPlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const { setActiveChallenge } = useChallengeStore()
  const { initFromStarterGraph, clearCanvas } = useArchitectureStore()
  const { stopSimulation, setDuration, setWaypoints } = useSimStore()

  // undefined = loading, null = not found, Challenge = loaded
  const [challenge, setChallenge] = useState<Challenge | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false

    async function init() {
      stopSimulation()

      const fetched = await getCommunityChallenge(id)
      if (cancelled) return

      if (!fetched) {
        setChallenge(null)
        return
      }

      setChallenge(fetched)
      setActiveChallenge(fetched)
      setDuration(fetched.trafficConfig.durationMs)
      setWaypoints(fetched.trafficConfig.waypoints)

      if (fetched.starterNodes?.length) {
        initFromStarterGraph(fetched.starterNodes, fetched.starterEdges ?? [])
      } else {
        clearCanvas()
      }

      incrementAttemptCount(id)
    }

    init()

    return () => {
      cancelled = true
      stopSimulation()
      setActiveChallenge(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (challenge === null) return notFound()
  if (challenge === undefined) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-950">
        <div className="w-5 h-5 border-2 border-gray-600 border-t-gray-300 rounded-full animate-spin" />
      </div>
    )
  }

  return <ChallengeLayout />
}
