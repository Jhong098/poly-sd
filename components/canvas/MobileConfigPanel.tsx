'use client'

import { useArchitectureStore } from '@/lib/store/architectureStore'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { ConfigPanel } from '@/components/panels/ConfigPanel'

export function MobileConfigPanel() {
  const selectedNodeId = useArchitectureStore((s) => s.selectedNodeId)
  const selectedEdgeId = useArchitectureStore((s) => s.selectedEdgeId)
  const setSelectedNodeId = useArchitectureStore((s) => s.setSelectedNodeId)
  const setSelectedEdgeId = useArchitectureStore((s) => s.setSelectedEdgeId)

  const isOpen = !!(selectedNodeId || selectedEdgeId)

  function handleClose() {
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} title="Configure">
      <ConfigPanel variant="content" />
    </BottomSheet>
  )
}
