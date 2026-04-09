'use client'

import { use, useEffect, useState } from 'react'
import { notFound } from 'next/navigation'
import { CHALLENGE_MAP } from '@/lib/challenges/definitions'
import { useChallengeStore } from '@/lib/store/challengeStore'
import { useArchitectureStore } from '@/lib/store/architectureStore'
import { useSimStore } from '@/lib/store/simStore'
import { ChallengeLayout } from '@/components/canvas/ChallengeLayout'

export default function PlayPage({ params }: { params: Promise<{ levelId: string }> }) {
  const { levelId } = use(params)
  const challenge = CHALLENGE_MAP.get(levelId)

  const { setActiveChallenge } = useChallengeStore()
  const { initFromStarterGraph, clearCanvas } = useArchitectureStore()
  const { stopSimulation, setDuration, setWaypoints } = useSimStore()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!challenge) return

    // Reset state from any previous session
    stopSimulation()
    setActiveChallenge(challenge)

    // Wire up the traffic config from the challenge
    setDuration(challenge.trafficConfig.durationMs)
    setWaypoints(challenge.trafficConfig.waypoints)

    // Initialize starter graph (if provided) or clear canvas
    if (challenge.starterNodes?.length) {
      initFromStarterGraph(challenge.starterNodes, challenge.starterEdges ?? [])
    } else {
      clearCanvas()
    }

    setReady(true)

    return () => {
      // Clean up when leaving
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
