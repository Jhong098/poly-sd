'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import { ReactFlowProvider } from '@xyflow/react'
import { TopBar }             from './TopBar'
import { Palette }            from './Palette'
import { GameCanvas }         from './GameCanvas'
import { ConfigPanel }        from '@/components/panels/ConfigPanel'
import { MetricsPanel }       from '@/components/panels/MetricsPanel'
import { ChallengeBriefPanel }from '@/components/panels/ChallengeBriefPanel'
import { ResultsModal }       from '@/components/overlays/ResultsModal'
import { TutorialCallout }   from '@/components/overlays/TutorialCallout'
import { useChallengeStore }  from '@/lib/store/challengeStore'
import { useArchitectureStore } from '@/lib/store/architectureStore'
import { writeLocalDraft } from '@/lib/draft'
import type { ComponentType } from '@/lib/components/definitions'

export function ChallengeLayout() {
  const activeChallenge = useChallengeStore((s) => s.activeChallenge)
  const allowedTypes = activeChallenge?.allowedComponents ?? 'all'
  const { userId } = useAuth()
  const nodes = useArchitectureStore((s) => s.nodes)
  const edges = useArchitectureStore((s) => s.edges)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!activeChallenge || !userId) return
    const challengeId = activeChallenge.id
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      writeLocalDraft(userId, challengeId, nodes, edges)
    }, 1500)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [nodes, edges, activeChallenge?.id, userId])

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-full w-full overflow-hidden">
        <TopBar />
        <div className="flex flex-1 overflow-hidden">
          <ChallengeBriefPanel />
          <Palette allowedTypes={allowedTypes as ComponentType[] | 'all'} />
          <main className="flex-1 relative overflow-hidden">
            <GameCanvas />
            <TutorialCallout />
          </main>
          <ConfigPanel />
        </div>
        <MetricsPanel />
      </div>
      <ResultsModal />
    </ReactFlowProvider>
  )
}
