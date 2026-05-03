'use client'

import { useEffect, useRef } from 'react'
import { useArchitectureStore } from '@/lib/store/architectureStore'
import { writeLocalDraft } from '@/lib/draft'

/**
 * Render-less component that persists canvas drafts via a Zustand store
 * subscription. By subscribing outside React's render cycle, it avoids
 * re-rendering ChallengeLayout on every node position change during drags.
 */
export function DraftSaver({ challengeId, userId }: { challengeId: string; userId: string }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const unsubscribe = useArchitectureStore.subscribe((state) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        writeLocalDraft(userId, challengeId, state.nodes, state.edges)
      }, 1500)
    })
    return () => {
      unsubscribe()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [challengeId, userId])

  return null
}
