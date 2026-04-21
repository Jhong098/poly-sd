'use client'

import { useState, useTransition } from 'react'
import React from 'react'
import { CheckCircle2, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { publishCommunityChallenge } from '@/lib/actions/community-challenges'
import type { ComponentNode, ComponentEdge } from '@/lib/store/architectureStore'
import type { ChallengeSetupData } from '@/components/challenge/ChallengeSetupForm'

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  nodes: ComponentNode[]
  edges: ComponentEdge[]
  trafficConfig: { durationMs: number; waypoints: { timeMs: number; rps: number }[] }
  simP99: number
  simCost: number
  onClose: () => void
  onPublished: (id: string) => void
  initialData?: ChallengeSetupData
}

const TIER_LABELS: Record<number, string> = {
  1: '1 — Foundations',
  2: '2 — Scale Out',
  3: '3 — Resilience',
  4: '4 — Distributed Data',
  5: '5 — Global Systems',
}

// ── Helper: compute pre-filled defaults ───────────────────────────────────────

function defaultP99(simP99: number): number {
  if (simP99 <= 0) return 200
  return Math.ceil((simP99 * 1.5) / 10) * 10
}

function defaultBudget(simCost: number): number {
  if (simCost <= 0) return 1.0
  return Math.ceil(simCost * 2 * 10) / 10
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold tracking-widest uppercase text-cyan mb-3">
      // {children}
    </p>
  )
}

// ── Field components ──────────────────────────────────────────────────────────

function Field({
  id,
  label,
  required,
  children,
}: {
  id?: string
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="text-[11px] font-bold text-ink-2 uppercase tracking-wider"
      >
        {label}
        {required && <span className="text-err ml-0.5">*</span>}
      </label>
      {id && React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<{ id?: string }>, { id })
        : children}
    </div>
  )
}

const inputCls =
  'w-full bg-surface border border-edge px-2.5 py-1.5 text-[12px] text-ink placeholder-ink-3 focus:outline-none focus:border-cyan transition-colors'

// ── Step 1: Identity ──────────────────────────────────────────────────────────

function StepIdentity({
  title,
  narrative,
  objective,
  onChange,
}: {
  title: string
  narrative: string
  objective: string
  onChange: (field: 'title' | 'narrative' | 'objective', value: string) => void
}) {
  return (
    <div className="space-y-4">
      <SectionLabel>Identity</SectionLabel>

      <Field id="challenge-title" label="Title" required>
        <input
          className={inputCls}
          placeholder="Give your challenge a name"
          value={title}
          maxLength={80}
          onChange={(e) => onChange('title', e.target.value)}
        />
      </Field>

      <Field id="challenge-narrative" label="Story Framing" required>
        <textarea
          className={`${inputCls} resize-none`}
          rows={3}
          placeholder="Set the scene — what situation is the player stepping into?"
          value={narrative}
          onChange={(e) => onChange('narrative', e.target.value)}
        />
      </Field>

      <Field id="challenge-objective" label="Objective" required>
        <textarea
          className={`${inputCls} resize-none`}
          rows={3}
          placeholder="What must the player achieve to pass this challenge?"
          value={objective}
          onChange={(e) => onChange('objective', e.target.value)}
        />
      </Field>
    </div>
  )
}

// ── Step 2: SLA Targets ───────────────────────────────────────────────────────

function StepSLA({
  p99Target,
  errorRateTarget,
  budget,
  onChange,
}: {
  p99Target: number
  errorRateTarget: number
  budget: number
  onChange: (
    field: 'p99Target' | 'errorRateTarget' | 'budget',
    value: number,
  ) => void
}) {
  return (
    <div className="space-y-4">
      <SectionLabel>SLA Targets</SectionLabel>

      <p className="text-[11px] text-ink-3">
        Pre-filled from your last sim run. Adjust to set the pass threshold.
      </p>

      <Field id="sla-p99" label="p99 Latency Target (ms)" required>
        <input
          type="number"
          min={1}
          className={inputCls}
          value={p99Target}
          onChange={(e) => onChange('p99Target', Number(e.target.value))}
        />
      </Field>

      <Field id="sla-error-rate" label="Error Rate Target (%)" required>
        <input
          type="number"
          min={0}
          max={100}
          step={0.1}
          className={inputCls}
          value={errorRateTarget}
          onChange={(e) => onChange('errorRateTarget', Number(e.target.value))}
        />
      </Field>

      <Field id="sla-budget" label="Budget ($/hr)" required>
        <input
          type="number"
          min={0}
          step={0.1}
          className={inputCls}
          value={budget}
          onChange={(e) => onChange('budget', Number(e.target.value))}
        />
      </Field>
    </div>
  )
}

// ── Step 3: Constraints ───────────────────────────────────────────────────────

function StepConstraints({
  tier,
  hints,
  onTierChange,
  onHintChange,
}: {
  tier: number
  hints: [string, string, string]
  onTierChange: (t: number) => void
  onHintChange: (idx: 0 | 1 | 2, value: string) => void
}) {
  return (
    <div className="space-y-4">
      <SectionLabel>Constraints</SectionLabel>

      {/* Tier selector */}
      <Field label="Tier">
        <div className="space-y-1">
          {([1, 2, 3, 4, 5] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTierChange(t)}
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
      </Field>

      {/* Hints */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold text-ink-2 uppercase tracking-wider">Hints (optional)</p>
        {([0, 1, 2] as const).map((idx) => (
          <input
            key={idx}
            className={inputCls}
            placeholder={`Hint ${idx + 1}`}
            value={hints[idx]}
            onChange={(e) => onHintChange(idx, e.target.value)}
          />
        ))}
      </div>
    </div>
  )
}

// ── Step 4: Preview & Publish ─────────────────────────────────────────────────

function StepPreview({
  title,
  narrative,
  objective,
  tier,
  p99Target,
  errorRateTarget,
  budget,
  hints,
  nodeCount,
  edgeCount,
}: {
  title: string
  narrative: string
  objective: string
  tier: number
  p99Target: number
  errorRateTarget: number
  budget: number
  hints: [string, string, string]
  nodeCount: number
  edgeCount: number
}) {
  const filledHints = hints.filter((h) => h.trim().length > 0)

  return (
    <div className="space-y-4">
      <SectionLabel>Preview</SectionLabel>

      {/* Challenge brief */}
      <div className="bg-surface border border-edge p-4 space-y-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-cyan mb-0.5">
            Tier {tier} — {TIER_LABELS[tier].split(' — ')[1]}
          </p>
          <p className="text-[15px] font-bold text-ink">{title}</p>
        </div>

        {narrative && (
          <p className="text-[12px] text-ink-3 leading-relaxed">{narrative}</p>
        )}

        {objective && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-2 mb-1">Objective</p>
            <p className="text-[12px] text-ink leading-relaxed">{objective}</p>
          </div>
        )}

        {/* SLA summary */}
        <div className="border-t border-edge-dim pt-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-2 mb-2">SLA Targets</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <p className="text-[13px] font-bold text-ink">{p99Target}ms</p>
              <p className="text-[10px] text-ink-3">p99 latency</p>
            </div>
            <div className="text-center">
              <p className="text-[13px] font-bold text-ink">{errorRateTarget}%</p>
              <p className="text-[10px] text-ink-3">error rate</p>
            </div>
            <div className="text-center">
              <p className="text-[13px] font-bold text-ink">${budget.toFixed(2)}/hr</p>
              <p className="text-[10px] text-ink-3">budget</p>
            </div>
          </div>
        </div>

        {/* Hints */}
        {filledHints.length > 0 && (
          <div className="border-t border-edge-dim pt-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-2 mb-2">Hints</p>
            <ol className="space-y-1 list-decimal list-inside">
              {filledHints.map((h, i) => (
                <li key={i} className="text-[12px] text-ink-3">{h}</li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* Architecture stats */}
      <p className="text-[11px] text-ink-3">
        Architecture: <span className="text-ink font-semibold">{nodeCount} nodes</span>,{' '}
        <span className="text-ink font-semibold">{edgeCount} edges</span> will be saved as the starter graph.
      </p>
    </div>
  )
}

// ── Success state ─────────────────────────────────────────────────────────────

function PublishSuccess({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-4">
      <CheckCircle2 size={48} className="text-ok" />
      <div className="text-center">
        <p className="text-[18px] font-bold text-ok">Published!</p>
        <p className="text-[12px] text-ink-3 mt-1">Your challenge is now live in the Community feed.</p>
      </div>
      <button
        onClick={onClose}
        className="px-6 py-2 bg-ok hover:bg-ok/90 text-base text-[11px] font-bold uppercase tracking-wider transition-colors"
      >
        Done
      </button>
    </div>
  )
}

// ── PublishWizard ─────────────────────────────────────────────────────────────

export function PublishWizard({
  nodes,
  edges,
  trafficConfig,
  simP99,
  simCost,
  onClose,
  onPublished,
  initialData,
}: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(initialData ? 2 : 1)
  const [published, setPublished] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Step 1
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [narrative, setNarrative] = useState(initialData?.narrative ?? '')
  const [objective, setObjective] = useState(initialData?.objective ?? '')

  // Step 2
  const [p99Target, setP99Target] = useState(() => defaultP99(simP99))
  const [errorRateTarget, setErrorRateTarget] = useState(1)
  const [budget, setBudget] = useState(() => defaultBudget(simCost))

  // Step 3
  const [tier, setTier] = useState(initialData?.tier ?? 3)
  const [hints, setHints] = useState<[string, string, string]>(initialData?.hints ?? ['', '', ''])

  function handleHintChange(idx: 0 | 1 | 2, value: string) {
    const next: [string, string, string] = [...hints] as [string, string, string]
    next[idx] = value
    setHints(next)
  }

  // Validation per step
  const step1Valid = title.trim().length > 0 && narrative.trim().length > 0 && objective.trim().length > 0
  const step2Valid = p99Target > 0 && errorRateTarget >= 0 && budget > 0

  function canNext(): boolean {
    if (step === 1) return step1Valid
    if (step === 2) return step2Valid
    return true
  }

  function handleNext() {
    if (initialData && step === 2) { setStep(4); return }
    if (step < 4) setStep((s) => (s + 1) as 1 | 2 | 3 | 4)
  }

  function handleBack() {
    if (initialData && step === 4) { setStep(2); return }
    if (step > 1) setStep((s) => (s - 1) as 1 | 2 | 3 | 4)
  }

  function handlePublish() {
    startTransition(async () => {
      const result = await publishCommunityChallenge({
        title: title.trim(),
        narrative: narrative.trim(),
        objective: objective.trim(),
        tier,
        slaTargets: {
          p99LatencyMs: p99Target,
          errorRate: errorRateTarget / 100,
        },
        budgetPerHour: budget,
        allowedComponents: 'all',
        hints: hints.filter((h) => h.trim().length > 0),
        nodes,
        edges,
        trafficConfig,
      })

      if ('error' in result) {
        alert(result.error)
        return
      }

      setPublished(true)
      onPublished(result.id)
    })
  }

  const stepTitles: Record<number, string> = {
    1: 'Identity',
    2: 'SLA Targets',
    3: 'Constraints',
    4: 'Preview & Publish',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/80 overflow-y-auto py-8">
      <div
        className="w-[480px] bg-raised border border-edge overflow-hidden"
        style={{ borderTopWidth: 2, borderTopColor: 'var(--color-cyan)' }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-edge-dim flex items-center justify-between">
          <div>
            <p className="text-[16px] font-bold text-ink">Publish Challenge</p>
            {!published && (
              <p className="text-[11px] text-ink-3">
                {initialData
                  ? `Step ${step === 2 ? 1 : 2} of 2 — ${stepTitles[step]}`
                  : `Step ${step} of 4 — ${stepTitles[step]}`
                }
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-ink-3 hover:text-ink transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {published ? (
            <PublishSuccess onClose={onClose} />
          ) : (
            <>
              {step === 1 && (
                <StepIdentity
                  title={title}
                  narrative={narrative}
                  objective={objective}
                  onChange={(field, value) => {
                    if (field === 'title') setTitle(value)
                    else if (field === 'narrative') setNarrative(value)
                    else setObjective(value)
                  }}
                />
              )}
              {step === 2 && (
                <StepSLA
                  p99Target={p99Target}
                  errorRateTarget={errorRateTarget}
                  budget={budget}
                  onChange={(field, value) => {
                    if (field === 'p99Target') setP99Target(value)
                    else if (field === 'errorRateTarget') setErrorRateTarget(value)
                    else setBudget(value)
                  }}
                />
              )}
              {step === 3 && (
                <StepConstraints
                  tier={tier}
                  hints={hints}
                  onTierChange={setTier}
                  onHintChange={handleHintChange}
                />
              )}
              {step === 4 && (
                <StepPreview
                  title={title}
                  narrative={narrative}
                  objective={objective}
                  tier={tier}
                  p99Target={p99Target}
                  errorRateTarget={errorRateTarget}
                  budget={budget}
                  hints={hints}
                  nodeCount={nodes.length}
                  edgeCount={edges.length}
                />
              )}
            </>
          )}
        </div>

        {/* Footer navigation */}
        {!published && (
          <div className="px-6 py-4 border-t border-edge-dim flex items-center justify-between">
            {/* Left: Back / Cancel */}
            <button
              onClick={(initialData ? step === 2 : step === 1) ? onClose : handleBack}
              className="flex items-center gap-1 px-3 py-2 border border-edge bg-surface hover:bg-overlay text-ink-2 text-[11px] font-bold uppercase tracking-wider transition-colors"
            >
              {(initialData ? step === 2 : step === 1) ? (
                'Cancel'
              ) : (
                <>
                  <ChevronLeft size={13} /> Back
                </>
              )}
            </button>

            {/* Right: Next / Publish */}
            {step < 4 ? (
              <button
                onClick={handleNext}
                disabled={!canNext()}
                className="flex items-center gap-1 px-4 py-2 bg-cyan hover:bg-cyan/90 text-base text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight size={13} />
              </button>
            ) : (
              <button
                onClick={handlePublish}
                disabled={isPending}
                className="flex items-center gap-1 px-4 py-2 bg-cyan hover:bg-cyan/90 text-base text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPending ? 'Publishing…' : 'Publish'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
