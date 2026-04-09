'use client'

import { ReactFlowProvider } from '@xyflow/react'
import { TopBar }      from './TopBar'
import { Palette }     from './Palette'
import { GameCanvas }  from './GameCanvas'
import { ConfigPanel } from '@/components/panels/ConfigPanel'
import { MetricsPanel }from '@/components/panels/MetricsPanel'

export function SandboxLayout() {
  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-full w-full overflow-hidden">
        <TopBar />
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
