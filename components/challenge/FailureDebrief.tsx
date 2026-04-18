'use client'

import { useEffect } from 'react'
import { AlertTriangle, HelpCircle } from 'lucide-react'
import { useChallengeStore } from '@/lib/store/challengeStore'
import { useSimStore } from '@/lib/store/simStore'
import { useArchitectureStore } from '@/lib/store/architectureStore'
import { generateFailureDiagnosis } from '@/lib/challenges/failureDebrief'
import type { Challenge, EvalResult } from '@/lib/challenges/types'

type Props = { challenge: Challenge; result: EvalResult }

export function FailureDebrief({ challenge, result }: Props) {
  const history = useSimStore((s) => s.history)
  const nodes = useArchitectureStore((s) => s.nodes)
  const failedAttempts = useChallengeStore((s) => s.failedAttempts[challenge.id] ?? 0)
  const recordFailedAttempt = useChallengeStore((s) => s.recordFailedAttempt)

  // Record the failed attempt once when this component mounts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { recordFailedAttempt(challenge.id) }, [])

  // Only show for Tutorial and Tier 1 — higher tiers are more open-ended
  if (challenge.tier > 1) return null

  const nodeInfos = nodes.map((n) => ({
    id: n.id,
    componentType: n.data.componentType,
    label: n.data.label,
  }))

  const diagnosis = generateFailureDiagnosis(result, history.toArray(), challenge, nodeInfos, failedAttempts)

  return (
    <div data-testid="failure-debrief" className="px-6 py-4 border-b border-edge-dim space-y-3">
      <p className="text-[10px] font-bold text-warn uppercase tracking-widest">// What went wrong</p>

      <div className="flex items-start gap-2">
        <AlertTriangle size={13} className="text-warn flex-shrink-0 mt-0.5" />
        <p className="text-[12px] font-semibold text-ink">{diagnosis.bottleneck}</p>
      </div>

      <p className="text-[12px] text-ink-2 leading-relaxed">{diagnosis.why}</p>

      <div className="flex items-start gap-2 border border-edge-dim bg-surface px-3 py-2">
        <HelpCircle size={12} className="text-cyan flex-shrink-0 mt-0.5" />
        <p className="text-[12px] text-ink-2 leading-relaxed">
          <span className="font-semibold text-ink">What to try: </span>
          {diagnosis.whatToTry}
        </p>
      </div>
    </div>
  )
}
