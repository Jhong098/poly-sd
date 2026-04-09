'use client'

import { ReactFlowProvider } from '@xyflow/react'
import { TopBar }             from './TopBar'
import { Palette }            from './Palette'
import { GameCanvas }         from './GameCanvas'
import { ConfigPanel }        from '@/components/panels/ConfigPanel'
import { MetricsPanel }       from '@/components/panels/MetricsPanel'
import { ChallengeBriefPanel }from '@/components/panels/ChallengeBriefPanel'
import { ResultsModal }       from '@/components/overlays/ResultsModal'
import { useChallengeStore }  from '@/lib/store/challengeStore'
import type { ComponentType } from '@/lib/components/definitions'

export function ChallengeLayout() {
  const activeChallenge = useChallengeStore((s) => s.activeChallenge)
  const allowedTypes = activeChallenge?.allowedComponents ?? 'all'

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-full w-full overflow-hidden">
        <TopBar />
        <div className="flex flex-1 overflow-hidden">
          <ChallengeBriefPanel />
          <Palette allowedTypes={allowedTypes as ComponentType[] | 'all'} />
          <main className="flex-1 relative overflow-hidden">
            <GameCanvas />
          </main>
          <ConfigPanel />
        </div>
        <MetricsPanel />
      </div>
      <ResultsModal />
    </ReactFlowProvider>
  )
}
