'use client'

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { SiteNav } from '@/components/nav/SiteNav'

export type ChallengeSetupData = {
  title: string
  narrative: string
  objective: string
  tier: number
  hints: [string, string, string]
}

type Props = {
  onComplete: (data: ChallengeSetupData) => void
}

const TIER_LABELS: Record<number, string> = {
  1: '1 — Foundations',
  2: '2 — Scale Out',
  3: '3 — Resilience',
  4: '4 — Distributed Data',
  5: '5 — Global Systems',
}

const inputCls =
  'w-full bg-surface border border-edge px-2.5 py-1.5 text-[12px] text-ink placeholder-ink-3 focus:outline-none focus:border-cyan transition-colors'

export function ChallengeSetupForm({ onComplete }: Props) {
  const [title, setTitle] = useState('')
  const [narrative, setNarrative] = useState('')
  const [objective, setObjective] = useState('')
  const [tier, setTier] = useState(3)
  const [hints, setHints] = useState<[string, string, string]>(['', '', ''])

  const canSubmit =
    title.trim().length > 0 &&
    narrative.trim().length > 0 &&
    objective.trim().length > 0

  function handleHintChange(idx: 0 | 1 | 2, value: string) {
    const next: [string, string, string] = [...hints] as [string, string, string]
    next[idx] = value
    setHints(next)
  }

  function handleSubmit() {
    if (!canSubmit) return
    onComplete({
      title: title.trim(),
      narrative: narrative.trim(),
      objective: objective.trim(),
      tier,
      hints,
    })
  }

  return (
    <div className="flex flex-col h-full bg-base text-ink">
      <SiteNav />
      <main className="flex-1 overflow-y-auto py-12">
        <div className="max-w-lg w-full mx-auto px-8 space-y-8">
          {/* Header */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-cyan mb-1">
              // Create a Challenge
            </p>
            <h1 className="text-[20px] font-bold text-ink">Define your challenge</h1>
            <p className="text-[12px] text-ink-3 mt-1">
              Set the scene and constraints first — you&apos;ll build the architecture next.
            </p>
          </div>

          {/* Identity */}
          <div className="space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-cyan">// Identity</p>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-ink-2 uppercase tracking-wider">
                Title <span className="text-err">*</span>
              </label>
              <input
                className={inputCls}
                placeholder="Give your challenge a name"
                value={title}
                maxLength={80}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-ink-2 uppercase tracking-wider">
                Story Framing <span className="text-err">*</span>
              </label>
              <textarea
                className={`${inputCls} resize-none`}
                rows={3}
                placeholder="Set the scene — what situation is the player stepping into?"
                value={narrative}
                onChange={(e) => setNarrative(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-ink-2 uppercase tracking-wider">
                Objective <span className="text-err">*</span>
              </label>
              <textarea
                className={`${inputCls} resize-none`}
                rows={3}
                placeholder="What must the player achieve to pass this challenge?"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
              />
            </div>
          </div>

          {/* Constraints */}
          <div className="space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-cyan">// Constraints</p>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-ink-2 uppercase tracking-wider">Tier</label>
              <div className="space-y-1">
                {([1, 2, 3, 4, 5] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTier(t)}
                    className={`w-full text-left px-3 py-2 border text-[12px] font-semibold transition-colors ${
                      tier === t
                        ? 'border-cyan bg-cyan/10 text-cyan'
                        : 'border-edge bg-surface text-ink-2 hover:bg-overlay'
                    }`}
                  >
                    {TIER_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-bold text-ink-2 uppercase tracking-wider">
                Hints (optional)
              </p>
              {([0, 1, 2] as const).map((idx) => (
                <input
                  key={idx}
                  className={inputCls}
                  placeholder={`Hint ${idx + 1}`}
                  value={hints[idx]}
                  onChange={(e) => handleHintChange(idx, e.target.value)}
                />
              ))}
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex items-center gap-2 px-5 py-2.5 bg-cyan hover:bg-cyan/90 disabled:opacity-40 disabled:cursor-not-allowed text-base text-[12px] font-bold uppercase tracking-wider transition-colors"
          >
            Start Building <ArrowRight size={13} />
          </button>
        </div>
      </main>
    </div>
  )
}
