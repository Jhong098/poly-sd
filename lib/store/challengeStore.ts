'use client'

import { create } from 'zustand'
import type { Challenge } from '@/lib/challenges/types'
import type { EvalResult } from '@/lib/challenges/types'

type ChallengeState = {
  activeChallenge: Challenge | null
  evalResult: EvalResult | null

  setActiveChallenge: (challenge: Challenge | null) => void
  setEvalResult: (result: EvalResult | null) => void
  clearChallenge: () => void
}

export const useChallengeStore = create<ChallengeState>((set) => ({
  activeChallenge: null,
  evalResult: null,

  setActiveChallenge: (challenge) => set({ activeChallenge: challenge, evalResult: null }),
  setEvalResult: (result) => set({ evalResult: result }),
  clearChallenge: () => set({ activeChallenge: null, evalResult: null }),
}))
