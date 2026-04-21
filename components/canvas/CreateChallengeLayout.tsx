'use client'

import { useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { ChallengeSetupForm, type ChallengeSetupData } from '@/components/challenge/ChallengeSetupForm'
import { CreateTopBar }  from './CreateTopBar'
import { Palette }       from './Palette'
import { GameCanvas }    from './GameCanvas'
import { ConfigPanel }   from '@/components/panels/ConfigPanel'
import { MetricsPanel }  from '@/components/panels/MetricsPanel'

export function CreateChallengeLayout() {
  const [setupData, setSetupData] = useState<ChallengeSetupData | null>(null)

  if (!setupData) {
    return <ChallengeSetupForm onComplete={setSetupData} />
  }

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-full w-full overflow-hidden">
        <CreateTopBar setupData={setupData} />
        <div className="flex flex-1 overflow-hidden">
          <Palette />
          <main className="flex-1 relative overflow-hidden">
            <GameCanvas />
          </main>
          <ConfigPanel />
        </div>
        <MetricsPanel />
      </div>
    </ReactFlowProvider>
  )
}
