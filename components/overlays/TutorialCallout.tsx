'use client'

import { useState, useEffect } from 'react'
import { ChevronRight, X, Lightbulb } from 'lucide-react'
import { useChallengeStore } from '@/lib/store/challengeStore'
import { useSimStore } from '@/lib/store/simStore'

/**
 * Step-by-step hint callout shown during tutorial levels (tier 0).
 * Floats at the bottom-center of the canvas. Dismissed per-hint.
 * Disappears once the sim starts.
 */
export function TutorialCallout() {
  const activeChallenge = useChallengeStore((s) => s.activeChallenge)
  const simStatus = useSimStore((s) => s.status)
  const [step, setStep] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  // Reset when the challenge changes
  useEffect(() => {
    setStep(0)
    setDismissed(false)
  }, [activeChallenge?.id])

  if (!activeChallenge || activeChallenge.tier !== 0) return null
  if (simStatus === 'running' || simStatus === 'complete') return null
  if (dismissed) return null

  const hints = activeChallenge.hints
  if (hints.length === 0) return null

  const isLast = step >= hints.length - 1

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 w-[420px] pointer-events-auto">
      <div
        className="bg-raised border border-edge shadow-2xl overflow-hidden"
        style={{ borderTopWidth: 2, borderTopColor: 'var(--color-cyan)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-surface border-b border-edge-dim">
          <Lightbulb size={12} className="text-cyan flex-shrink-0" />
          <span className="text-[10px] font-bold text-cyan uppercase tracking-widest flex-1">
            // Step {step + 1} of {hints.length}
          </span>
          <button
            onClick={() => setDismissed(true)}
            className="text-ink-3 hover:text-ink-2 transition-colors"
          >
            <X size={13} />
          </button>
        </div>

        {/* Hint text */}
        <div className="px-4 py-3">
          <p className="text-[13px] text-ink leading-relaxed">{hints[step]}</p>
        </div>

        {/* Progress dots + navigation */}
        <div className="px-4 pb-3 flex items-center justify-between">
          <div className="flex gap-1.5">
            {hints.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className="w-1.5 h-1.5 rounded-full transition-colors"
                style={{ background: i === step ? 'var(--color-cyan)' : 'var(--color-edge-strong)' }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-3 hover:text-ink-2 border border-edge bg-surface hover:bg-overlay transition-colors"
              >
                Back
              </button>
            )}
            {!isLast ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="flex items-center gap-1 px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-cyan hover:bg-cyan/90 text-base transition-colors"
              >
                Next <ChevronRight size={11} />
              </button>
            ) : (
              <button
                onClick={() => setDismissed(true)}
                className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-cyan hover:bg-cyan/90 text-base transition-colors"
              >
                Got it
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
