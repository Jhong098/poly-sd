'use client'

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
import { DraftSaver }        from './DraftSaver'
import { useChallengeStore }  from '@/lib/store/challengeStore'
import { useArchitectureStore } from '@/lib/store/architectureStore'
import type { ComponentType } from '@/lib/components/definitions'

export function ChallengeLayout() {
  const activeChallenge = useChallengeStore((s) => s.activeChallenge)
  const allowedTypes = activeChallenge?.allowedComponents ?? 'all'
  const { userId } = useAuth()

  // Compute palette pulse: show pulse if the Tutorial-specified component hasn't been placed yet
  const guidedType = activeChallenge?.guidedPulseComponent
  const hasPlacedGuided = useArchitectureStore((s) =>
    guidedType ? s.nodes.some((n) => n.data.componentType === guidedType) : true
  )
  const pulseType = (!hasPlacedGuided && guidedType) ? guidedType : undefined

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
      {activeChallenge && userId && (
        <DraftSaver challengeId={activeChallenge.id} userId={userId} />
      )}
    </ReactFlowProvider>
  )
}
