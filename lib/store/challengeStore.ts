'use client'

import { create } from 'zustand'
import type { Challenge } from '@/lib/challenges/types'
import type { EvalResult } from '@/lib/challenges/types'

type ChallengeState = {
  activeChallenge: Challenge | null
  evalResult: EvalResult | null
  failedAttempts: Record<string, number>   // keyed by challenge id

  setActiveChallenge: (challenge: Challenge | null) => void
  setEvalResult: (result: EvalResult | null) => void
  clearChallenge: () => void
  recordFailedAttempt: (challengeId: string) => void
  resetFailedAttempts: (challengeId: string) => void
}

export const useChallengeStore = create<ChallengeState>((set) => ({
  activeChallenge: null,
  evalResult: null,
  failedAttempts: {},

  setActiveChallenge: (challenge) => set({ activeChallenge: challenge, evalResult: null }),
  setEvalResult: (result) => set({ evalResult: result }),
  clearChallenge: () => set({ activeChallenge: null, evalResult: null }),

  recordFailedAttempt: (challengeId) =>
    set((s) => ({
      failedAttempts: {
        ...s.failedAttempts,
        [challengeId]: (s.failedAttempts[challengeId] ?? 0) + 1,
      },
    })),

  resetFailedAttempts: (challengeId) =>
    set((s) => ({
      failedAttempts: { ...s.failedAttempts, [challengeId]: 0 },
    })),
}))
