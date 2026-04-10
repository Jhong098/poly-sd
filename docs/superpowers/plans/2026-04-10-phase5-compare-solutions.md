# Phase 5: Compare Solutions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a solutions gallery page (`/challenge/[id]/solutions`) and a "View Solutions" button in the ResultsModal to close out Phase 5.

**Architecture:** Server-rendered gallery page fetches top 50 replays via the existing `getLeaderboard` action and renders them as a ranked list. The ResultsModal gets a new link button pointing at the gallery. One new client component (`SolutionsTable`) handles the ranked rows.

**Tech Stack:** Next.js 15 App Router (server components), React, TypeScript, Tailwind, Supabase via existing server actions

---

### Task 1: Add "View Solutions" button to ResultsModal

**Files:**
- Modify: `components/overlays/ResultsModal.tsx`

- [ ] **Step 1: Add the link button to the actions row**

In `components/overlays/ResultsModal.tsx`, find the actions `<div>` at line 208. Add a new `<a>` tag after the Share button and before the Close button. Only render it when `result.passed`:

```tsx
{result.passed && (
  <a
    href={`/challenge/${challenge.id}/solutions`}
    className="flex items-center gap-1.5 px-3 py-2 border border-edge bg-surface hover:bg-overlay text-ink-2 text-[11px] font-bold uppercase tracking-wider transition-colors"
  >
    <Trophy size={13} /> Solutions
  </a>
)}
```

`Trophy` is already imported at line 4.

- [ ] **Step 2: Verify the app builds**

```bash
pnpm build 2>&1 | tail -20
```

Expected: no TypeScript errors, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/overlays/ResultsModal.tsx
git commit -m "feat: add View Solutions link to ResultsModal"
```

---

### Task 2: Create SolutionsTable client component

**Files:**
- Create: `components/challenge/SolutionsTable.tsx`

This component receives the fetched entries and renders the ranked list. It is `'use client'` because it uses `ExternalLink` hover interactions, but does no data fetching itself.

- [ ] **Step 1: Create the component file**

Create `components/challenge/SolutionsTable.tsx`:

```tsx
'use client'

import { ExternalLink } from 'lucide-react'
import type { LeaderboardEntry } from '@/lib/actions/replays'
import type { Challenge } from '@/lib/challenges/types'

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="text-[9px] text-ink-3 shrink-0 w-16">{label}</span>
      <div className="flex-1 h-1 bg-surface overflow-hidden">
        <div className="h-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-[9px] text-ink-3 shrink-0 w-5 text-right">{value}</span>
    </div>
  )
}

export function SolutionsTable({
  entries,
  challenge,
}: {
  entries: LeaderboardEntry[]
  challenge: Challenge
}) {
  if (entries.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-[13px] text-ink-3 mb-4">No solutions yet — be the first!</p>
        <a
          href={`/play/${challenge.id}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan/10 hover:bg-cyan/20 border border-cyan/30 text-cyan text-[11px] font-bold uppercase tracking-wider transition-colors"
        >
          Play this challenge
        </a>
      </div>
    )
  }

  return (
    <div className="divide-y divide-edge-dim">
      {entries.map((entry, i) => {
        const nonClientNodes = entry.architecture.nodes.filter(
          (n) => n.data.componentType !== 'client'
        ).length
        const date = new Date(entry.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
        const hasResilience = entry.eval_result.scores.resilience > 0

        return (
          <a
            key={entry.id}
            href={`/replay/${entry.id}`}
            className="flex items-center gap-4 px-6 py-4 hover:bg-overlay transition-colors group"
          >
            {/* Rank */}
            <span className="text-[11px] text-ink-3 w-6 shrink-0 font-mono">#{i + 1}</span>

            {/* Score */}
            <div className="w-12 shrink-0 text-right">
              <span className="text-[22px] font-bold text-ink leading-none">{entry.score}</span>
            </div>

            {/* Score breakdown bars */}
            <div className="flex-1 min-w-0 space-y-1">
              <ScoreBar label="Performance" value={entry.eval_result.scores.performance} color="var(--color-cyan)" />
              <ScoreBar label="Cost"        value={entry.eval_result.scores.cost}        color="var(--color-ok)" />
              <ScoreBar label="Simplicity"  value={entry.eval_result.scores.simplicity}  color="var(--color-node-db)" />
              {hasResilience && (
                <ScoreBar label="Resilience" value={entry.eval_result.scores.resilience} color="var(--color-err)" />
              )}
            </div>

            {/* Stats */}
            <div className="flex flex-col items-end gap-1 shrink-0 text-right">
              <span className="text-[11px] text-ink-2">{nonClientNodes} nodes</span>
              <span className="text-[11px] text-ink-3">${entry.eval_result.metrics.costPerHour.toFixed(3)}/hr</span>
              <span className="text-[10px] text-ink-3">{date}</span>
            </div>

            <ExternalLink size={12} className="text-ink-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </a>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript is happy**

```bash
pnpm tsc --noEmit 2>&1 | grep -v node_modules
```

Expected: no errors referencing `SolutionsTable.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/challenge/SolutionsTable.tsx
git commit -m "feat: add SolutionsTable component"
```

---

### Task 3: Create solutions gallery page

**Files:**
- Create: `app/challenge/[id]/solutions/page.tsx`

This is a server component. It fetches data and passes it to `SolutionsTable`.

- [ ] **Step 1: Create the page**

Create `app/challenge/[id]/solutions/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { CHALLENGE_MAP } from '@/lib/challenges/definitions'
import { getLeaderboard } from '@/lib/actions/replays'
import { SolutionsTable } from '@/components/challenge/SolutionsTable'

export default async function SolutionsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const challenge = CHALLENGE_MAP.get(id)
  if (!challenge) return notFound()

  const entries = await getLeaderboard(id, 50)

  return (
    <div className="min-h-screen bg-base text-ink font-mono">
      {/* Header */}
      <div className="border-b border-edge bg-raised px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <a
            href={`/play/${challenge.id}`}
            className="inline-flex items-center gap-1.5 text-[11px] text-ink-3 hover:text-ink transition-colors mb-3"
          >
            <ArrowLeft size={13} /> Back to challenge
          </a>
          <h1 className="text-[18px] font-bold text-ink">{challenge.title}</h1>
          <p className="text-[12px] text-ink-3 mt-1">{challenge.objective}</p>
          <div className="flex gap-6 mt-3">
            <div>
              <span className="text-[10px] text-ink-3 uppercase tracking-widest">p99 target</span>
              <p className="text-[12px] text-ink-2 font-semibold">{challenge.slaTargets.p99LatencyMs}ms</p>
            </div>
            <div>
              <span className="text-[10px] text-ink-3 uppercase tracking-widest">error rate</span>
              <p className="text-[12px] text-ink-2 font-semibold">{(challenge.slaTargets.errorRate * 100).toFixed(1)}%</p>
            </div>
            <div>
              <span className="text-[10px] text-ink-3 uppercase tracking-widest">budget</span>
              <p className="text-[12px] text-ink-2 font-semibold">${challenge.budgetPerHour.toFixed(2)}/hr</p>
            </div>
            <div>
              <span className="text-[10px] text-ink-3 uppercase tracking-widest">solutions</span>
              <p className="text-[12px] text-ink-2 font-semibold">{entries.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Solutions list */}
      <div className="max-w-3xl mx-auto py-4">
        <p className="text-[10px] font-bold text-cyan uppercase tracking-widest px-6 mb-2">
          // Top Solutions
        </p>
        <SolutionsTable entries={entries} challenge={challenge} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify the app builds**

```bash
pnpm build 2>&1 | tail -20
```

Expected: build succeeds with new route `/challenge/[id]/solutions` listed in output.

- [ ] **Step 3: Commit**

```bash
git add app/challenge/[id]/solutions/page.tsx
git commit -m "feat: add challenge solutions gallery page"
```
