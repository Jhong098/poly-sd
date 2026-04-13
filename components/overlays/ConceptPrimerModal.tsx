'use client'

import { useState, useEffect } from 'react'
import { X, BookOpen } from 'lucide-react'
import type { Challenge, DiagramType } from '@/lib/challenges/types'

// ── Inline diagrams ───────────────────────────────────────────────────────────

function DiagramScaling() {
  return (
    <svg viewBox="0 0 220 80" className="w-full h-auto" aria-hidden="true">
      {/* Before: one server, red */}
      <rect x="10" y="20" width="50" height="40" rx="3" fill="none" stroke="var(--color-err)" strokeWidth="1.5" />
      <text x="35" y="44" textAnchor="middle" fontSize="9" fill="var(--color-err)">SERVER</text>
      <text x="35" y="55" textAnchor="middle" fontSize="7" fill="var(--color-ink-3)">SATURATED</text>
      <text x="35" y="14" textAnchor="middle" fontSize="7" fill="var(--color-ink-3)">BEFORE</text>
      {/* Arrow */}
      <defs>
        <marker id="sd-arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="var(--color-edge-strong)" />
        </marker>
      </defs>
      <line x1="80" y1="40" x2="110" y2="40" stroke="var(--color-edge-strong)" strokeWidth="1" markerEnd="url(#sd-arrow)" />
      {/* After: two servers, green */}
      <text x="142" y="7" textAnchor="middle" fontSize="7" fill="var(--color-ink-3)">AFTER</text>
      <rect x="120" y="10" width="45" height="28" rx="3" fill="none" stroke="var(--color-ok)" strokeWidth="1.5" />
      <text x="142" y="28" textAnchor="middle" fontSize="8" fill="var(--color-ok)">SERVER</text>
      <rect x="120" y="46" width="45" height="28" rx="3" fill="none" stroke="var(--color-ok)" strokeWidth="1.5" />
      <text x="142" y="64" textAnchor="middle" fontSize="8" fill="var(--color-ok)">SERVER</text>
    </svg>
  )
}

function DiagramCaching() {
  return (
    <svg viewBox="0 0 240 80" className="w-full h-auto" aria-hidden="true">
      <text x="55" y="8" textAnchor="middle" fontSize="7" fill="var(--color-ink-3)">WITHOUT CACHE</text>
      <rect x="10" y="14" width="40" height="24" rx="2" fill="none" stroke="var(--color-cyan)" strokeWidth="1.5" />
      <text x="30" y="30" textAnchor="middle" fontSize="7" fill="var(--color-cyan)">SERVER</text>
      <line x1="50" y1="26" x2="68" y2="26" stroke="var(--color-edge-strong)" strokeWidth="1" />
      <rect x="68" y="14" width="40" height="24" rx="2" fill="none" stroke="var(--color-err)" strokeWidth="1.5" />
      <text x="88" y="27" textAnchor="middle" fontSize="7" fill="var(--color-err)">DATABASE</text>
      <text x="88" y="36" textAnchor="middle" fontSize="6" fill="var(--color-err)">100% load</text>
      <line x1="120" y1="4" x2="120" y2="76" stroke="var(--color-edge)" strokeWidth="0.5" strokeDasharray="3,3" />
      <text x="180" y="8" textAnchor="middle" fontSize="7" fill="var(--color-ink-3)">WITH CACHE</text>
      <rect x="130" y="14" width="40" height="24" rx="2" fill="none" stroke="var(--color-cyan)" strokeWidth="1.5" />
      <text x="150" y="30" textAnchor="middle" fontSize="7" fill="var(--color-cyan)">SERVER</text>
      <line x1="170" y1="26" x2="188" y2="26" stroke="var(--color-edge-strong)" strokeWidth="1" />
      <rect x="188" y="14" width="40" height="24" rx="2" fill="none" stroke="var(--color-node-cache)" strokeWidth="1.5" />
      <text x="208" y="27" textAnchor="middle" fontSize="7" fill="var(--color-node-cache)">CACHE</text>
      <text x="208" y="36" textAnchor="middle" fontSize="6" fill="var(--color-ok)">80% hits</text>
      <line x1="208" y1="38" x2="208" y2="54" stroke="var(--color-edge-strong)" strokeWidth="1" strokeDasharray="2,2" />
      <rect x="188" y="54" width="40" height="20" rx="2" fill="none" stroke="var(--color-ok)" strokeWidth="1.5" />
      <text x="208" y="67" textAnchor="middle" fontSize="7" fill="var(--color-ok)">DB: 20%</text>
    </svg>
  )
}

function DiagramLoadBalancing() {
  return (
    <svg viewBox="0 0 220 80" className="w-full h-auto" aria-hidden="true">
      <text x="110" y="8" textAnchor="middle" fontSize="7" fill="var(--color-ink-3)">LOAD BALANCER DISTRIBUTES TRAFFIC</text>
      <rect x="10" y="20" width="35" height="22" rx="2" fill="none" stroke="var(--color-cyan)" strokeWidth="1.5" />
      <text x="27" y="34" textAnchor="middle" fontSize="7" fill="var(--color-cyan)">CLIENT</text>
      <line x1="45" y1="31" x2="65" y2="31" stroke="var(--color-edge-strong)" strokeWidth="1" />
      <rect x="65" y="20" width="35" height="22" rx="2" fill="none" stroke="var(--color-node-lb)" strokeWidth="1.5" />
      <text x="82" y="34" textAnchor="middle" fontSize="7" fill="var(--color-node-lb)">LB</text>
      <line x1="100" y1="31" x2="120" y2="20" stroke="var(--color-edge-strong)" strokeWidth="1" />
      <line x1="100" y1="31" x2="120" y2="42" stroke="var(--color-edge-strong)" strokeWidth="1" />
      <rect x="120" y="10" width="40" height="20" rx="2" fill="none" stroke="var(--color-ok)" strokeWidth="1.5" />
      <text x="140" y="23" textAnchor="middle" fontSize="7" fill="var(--color-ok)">SERVER A</text>
      <rect x="120" y="38" width="40" height="20" rx="2" fill="none" stroke="var(--color-ok)" strokeWidth="1.5" />
      <text x="140" y="51" textAnchor="middle" fontSize="7" fill="var(--color-ok)">SERVER B</text>
    </svg>
  )
}

function DiagramRedundancy() {
  return (
    <svg viewBox="0 0 240 80" className="w-full h-auto" aria-hidden="true">
      <text x="55" y="8" textAnchor="middle" fontSize="7" fill="var(--color-ink-3)">SINGLE POINT</text>
      <rect x="30" y="14" width="50" height="22" rx="2" fill="none" stroke="var(--color-err)" strokeWidth="1.5" />
      <text x="55" y="28" textAnchor="middle" fontSize="7" fill="var(--color-err)">SERVER</text>
      <text x="55" y="50" textAnchor="middle" fontSize="7" fill="var(--color-err)">⚠ DOWN = OUTAGE</text>
      <line x1="120" y1="4" x2="120" y2="76" stroke="var(--color-edge)" strokeWidth="0.5" strokeDasharray="3,3" />
      <text x="180" y="8" textAnchor="middle" fontSize="7" fill="var(--color-ink-3)">REDUNDANT</text>
      <rect x="155" y="12" width="50" height="20" rx="2" fill="none" stroke="var(--color-ok)" strokeWidth="1.5" />
      <text x="180" y="25" textAnchor="middle" fontSize="7" fill="var(--color-ok)">SERVER A ✓</text>
      <rect x="155" y="42" width="50" height="20" rx="2" fill="none" stroke="var(--color-err)" strokeWidth="1.5" />
      <text x="180" y="55" textAnchor="middle" fontSize="7" fill="var(--color-err)">SERVER B ✗</text>
      <text x="180" y="72" textAnchor="middle" fontSize="7" fill="var(--color-ok)">A handles all traffic</text>
    </svg>
  )
}

function DiagramAsyncQueue() {
  return (
    <svg viewBox="0 0 240 80" className="w-full h-auto" aria-hidden="true">
      <rect x="10" y="26" width="40" height="22" rx="2" fill="none" stroke="var(--color-cyan)" strokeWidth="1.5" />
      <text x="30" y="40" textAnchor="middle" fontSize="7" fill="var(--color-cyan)">API</text>
      <line x1="50" y1="37" x2="70" y2="37" stroke="var(--color-edge-strong)" strokeWidth="1" />
      <text x="60" y="32" textAnchor="middle" fontSize="6" fill="var(--color-ok)">ack</text>
      <rect x="70" y="24" width="50" height="26" rx="2" fill="none" stroke="var(--color-node-queue)" strokeWidth="1.5" />
      <text x="95" y="40" textAnchor="middle" fontSize="7" fill="var(--color-node-queue)">QUEUE</text>
      <line x1="120" y1="37" x2="140" y2="37" stroke="var(--color-edge-strong)" strokeWidth="1" />
      <text x="130" y="32" textAnchor="middle" fontSize="6" fill="var(--color-ink-3)">async</text>
      <rect x="140" y="26" width="50" height="22" rx="2" fill="none" stroke="var(--color-ok)" strokeWidth="1.5" />
      <text x="165" y="40" textAnchor="middle" fontSize="7" fill="var(--color-ok)">WORKER</text>
      <text x="120" y="70" textAnchor="middle" fontSize="7" fill="var(--color-ink-3)">API responds fast. Worker processes at own rate.</text>
    </svg>
  )
}

function DiagramBudget() {
  return (
    <svg viewBox="0 0 220 80" className="w-full h-auto" aria-hidden="true">
      <text x="110" y="10" textAnchor="middle" fontSize="7" fill="var(--color-ink-3)">COST VS PERFORMANCE TRADEOFF</text>
      <rect x="30" y="20" width="30" height="40" fill="var(--color-err)" opacity="0.7" />
      <text x="45" y="68" textAnchor="middle" fontSize="7" fill="var(--color-ink-3)">Over-</text>
      <text x="45" y="76" textAnchor="middle" fontSize="7" fill="var(--color-ink-3)">provisioned</text>
      <rect x="90" y="34" width="30" height="26" fill="var(--color-ok)" opacity="0.7" />
      <text x="105" y="68" textAnchor="middle" fontSize="7" fill="var(--color-ok)">Just</text>
      <text x="105" y="76" textAnchor="middle" fontSize="7" fill="var(--color-ok)">right</text>
      <rect x="150" y="48" width="30" height="12" fill="var(--color-err)" opacity="0.7" />
      <text x="165" y="68" textAnchor="middle" fontSize="7" fill="var(--color-ink-3)">Under-</text>
      <text x="165" y="76" textAnchor="middle" fontSize="7" fill="var(--color-ink-3)">provisioned</text>
      <line x1="20" y1="60" x2="200" y2="60" stroke="var(--color-edge-strong)" strokeWidth="0.5" />
    </svg>
  )
}

const DIAGRAMS: Record<DiagramType, React.ReactNode> = {
  'scaling':        <DiagramScaling />,
  'caching':        <DiagramCaching />,
  'load-balancing': <DiagramLoadBalancing />,
  'redundancy':     <DiagramRedundancy />,
  'async-queue':    <DiagramAsyncQueue />,
  'budget':         <DiagramBudget />,
}

// ── Storage helpers ───────────────────────────────────────────────────────────

function seenKey(challengeId: string) { return `primer-seen-${challengeId}` }
function markSeen(challengeId: string) {
  try { localStorage.setItem(seenKey(challengeId), '1') } catch { /* SSR */ }
}
function hasSeen(challengeId: string): boolean {
  try { return localStorage.getItem(seenKey(challengeId)) === '1' } catch { return false }
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = { challenge: Challenge; onDismiss: () => void }

export function ConceptPrimerModal({ challenge, onDismiss }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!challenge.conceptPrimer) return
    if (hasSeen(challenge.id)) return
    setVisible(true)
  }, [challenge.id, challenge.conceptPrimer])

  if (!visible || !challenge.conceptPrimer) return null

  const { title, explanation, diagramType } = challenge.conceptPrimer

  function handleDismiss() {
    markSeen(challenge.id)
    setVisible(false)
    onDismiss()
  }

  return (
    <div
      data-testid="concept-primer-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-base/80"
    >
      <div
        className="w-[440px] bg-raised border border-edge overflow-hidden"
        style={{ borderTopWidth: 2, borderTopColor: 'var(--color-cyan)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-edge-dim bg-surface">
          <BookOpen size={13} className="text-cyan flex-shrink-0" />
          <span className="text-[10px] font-bold text-cyan uppercase tracking-widest flex-1">
            // Concept: {title}
          </span>
          <button
            onClick={handleDismiss}
            className="text-ink-3 hover:text-ink-2 transition-colors"
            aria-label="Close"
          >
            <X size={13} />
          </button>
        </div>

        {/* Diagram */}
        <div className="px-5 pt-4 pb-2 bg-surface/50 border-b border-edge-dim">
          {DIAGRAMS[diagramType]}
        </div>

        {/* Explanation */}
        <div className="px-5 py-4">
          <p className="text-[13px] text-ink leading-relaxed">{explanation}</p>
        </div>

        {/* Action */}
        <div className="px-5 pb-4">
          <button
            onClick={handleDismiss}
            className="w-full py-2 bg-cyan hover:bg-cyan/90 text-base text-[11px] font-bold uppercase tracking-widest transition-colors"
          >
            Got it, let&apos;s play
          </button>
        </div>
      </div>
    </div>
  )
}
