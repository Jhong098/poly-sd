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
import { ConceptPrimerModal } from '@/components/overlays/ConceptPrimerModal'
import { TutorialCallout }   from '@/components/overlays/TutorialCallout'
import { MobileToolbar }     from './MobileToolbar'
import { MobileConfigPanel } from './MobileConfigPanel'
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

  // Compute palette pulse: show pulse if the Tutorial-specified component hasn't been placed yet
  const guidedType = activeChallenge?.guidedPulseComponent
  const hasPlacedGuided = useArchitectureStore((s) =>
    guidedType ? s.nodes.some((n) => n.data.componentType === guidedType) : true
  )
  const pulseType = (!hasPlacedGuided && guidedType) ? guidedType : undefined

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
      {activeChallenge && (
        <ConceptPrimerModal
          key={activeChallenge.id}
          challenge={activeChallenge}
          onDismiss={() => {}}
        />
      )}
      <div className="flex flex-col h-full w-full overflow-hidden">
        <TopBar />
        <div className="flex flex-1 overflow-hidden">
          <ChallengeBriefPanel />
          <Palette allowedTypes={allowedTypes as ComponentType[] | 'all'} pulseType={pulseType} />
          <main className="flex-1 relative overflow-hidden">
            <GameCanvas />
            <TutorialCallout />
            <MobileToolbar allowedTypes={allowedTypes as ComponentType[] | 'all'} />
          </main>
          <ConfigPanel />
        </div>
        <MetricsPanel />
        <MobileConfigPanel />
      </div>
      <ResultsModal />
    </ReactFlowProvider>
  )
}
