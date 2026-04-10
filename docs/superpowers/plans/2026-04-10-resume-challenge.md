# Resume Challenge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users continue a challenge from their last-edited canvas state instead of always restarting from the starter graph.

**Architecture:** Draft canvas state is saved to localStorage on every edit (debounced 1.5s) and to Supabase on every sim start. The campaign page shows Continue/Restart buttons for challenges with a Supabase draft; the play page loads the most-recent draft (localStorage vs Supabase by timestamp) when `?resume=true` is in the URL, or clears the local draft when `?restart=true`.

**Tech Stack:** Next.js App Router, TypeScript, Zustand, Supabase (admin client), Clerk (`useAuth`), localStorage

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `lib/actions/drafts.ts` | Server actions: `saveDraft`, `getChallengeDrafts`, `getDraft` |
| Create | `lib/draft.ts` | Client-side localStorage helpers (read, write, clear) |
| Modify | `lib/store/simStore.ts` | Call `saveDraft` fire-and-forget at sim start |
| Modify | `components/canvas/ChallengeLayout.tsx` | Debounced localStorage save on canvas change |
| Modify | `app/campaign/page.tsx` | Fetch drafts; show Continue/Restart on `ChallengeCard` |
| Modify | `app/play/[levelId]/page.tsx` | Handle `?resume=true` and `?restart=true` search params |

---

## Task 1: Create Supabase draft server actions

**Files:**
- Create: `lib/actions/drafts.ts`

- [ ] **Step 1: Create the file**

```typescript
'use server'

import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/server'
import type { ComponentNode, ComponentEdge } from '@/lib/store/architectureStore'

export type DraftSummary = {
  challenge_id: string
  saved_at: string
}

export type DraftRow = {
  nodes: ComponentNode[]
  edges: ComponentEdge[]
  saved_at: string
}

/** Upsert the draft canvas for the current user + challenge. Call fire-and-forget. */
export async function saveDraft(
  challengeId: string,
  nodes: ComponentNode[],
  edges: ComponentEdge[],
): Promise<void> {
  const { userId } = await auth()
  if (!userId) return

  const db = createAdminClient()
  await db.from('challenge_drafts').upsert(
    {
      user_id: userId,
      challenge_id: challengeId,
      nodes,
      edges,
      saved_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,challenge_id' },
  )
}

/** Return challenge_id + saved_at for every draft the current user has. No payload. */
export async function getChallengeDrafts(): Promise<DraftSummary[]> {
  const { userId } = await auth()
  if (!userId) return []

  const db = createAdminClient()
  const { data } = await db
    .from('challenge_drafts')
    .select('challenge_id, saved_at')
    .eq('user_id', userId)

  return (data ?? []) as DraftSummary[]
}

/** Fetch the full draft (nodes + edges + saved_at) for a single challenge. */
export async function getDraft(challengeId: string): Promise<DraftRow | null> {
  const { userId } = await auth()
  if (!userId) return null

  const db = createAdminClient()
  const { data } = await db
    .from('challenge_drafts')
    .select('nodes, edges, saved_at')
    .eq('user_id', userId)
    .eq('challenge_id', challengeId)
    .single()

  return (data as DraftRow) ?? null
}
```

- [ ] **Step 2: Create the `challenge_drafts` table in Supabase**

Run this SQL in the Supabase dashboard SQL editor:

```sql
create table challenge_drafts (
  user_id      text        not null,
  challenge_id text        not null,
  nodes        jsonb       not null default '[]',
  edges        jsonb       not null default '[]',
  saved_at     timestamptz not null default now(),
  primary key (user_id, challenge_id)
);
```

- [ ] **Step 3: Commit**

```bash
git add lib/actions/drafts.ts
git commit -m "feat: add challenge_drafts server actions (saveDraft, getChallengeDrafts, getDraft)"
```

---

## Task 2: Create localStorage draft helpers

**Files:**
- Create: `lib/draft.ts`

- [ ] **Step 1: Create the file**

```typescript
import type { ComponentNode, ComponentEdge } from '@/lib/store/architectureStore'

type LocalDraft = {
  nodes: ComponentNode[]
  edges: ComponentEdge[]
  savedAt: string  // ISO string
}

function draftKey(userId: string, challengeId: string) {
  return `draft:${userId}:${challengeId}`
}

export function readLocalDraft(userId: string, challengeId: string): LocalDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(userId, challengeId))
    return raw ? (JSON.parse(raw) as LocalDraft) : null
  } catch {
    return null
  }
}

export function writeLocalDraft(
  userId: string,
  challengeId: string,
  nodes: ComponentNode[],
  edges: ComponentEdge[],
): void {
  try {
    const draft: LocalDraft = { nodes, edges, savedAt: new Date().toISOString() }
    localStorage.setItem(draftKey(userId, challengeId), JSON.stringify(draft))
  } catch {
    // Storage quota exceeded or SSR — ignore
  }
}

export function clearLocalDraft(userId: string, challengeId: string): void {
  try {
    localStorage.removeItem(draftKey(userId, challengeId))
  } catch {
    // ignore
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/draft.ts
git commit -m "feat: add localStorage draft helpers"
```

---

## Task 3: Save draft to Supabase on sim start

**Files:**
- Modify: `lib/store/simStore.ts`

- [ ] **Step 1: Add the `saveDraft` import at the top of `lib/store/simStore.ts`**

Find the existing imports block (lines 1–12). Add one import:

```typescript
import { saveDraft } from '@/lib/actions/drafts'
```

So the imports section looks like:

```typescript
import { recordCompletion } from '@/lib/actions/completions'
import { saveDraft } from '@/lib/actions/drafts'
```

- [ ] **Step 2: Call `saveDraft` fire-and-forget at the top of `startSimulation`**

In `startSimulation` (around line 70), the function currently begins with:

```typescript
startSimulation: () => {
  const { worker: prev, trafficConfig, speed } = get()
  if (prev) { prev.postMessage({ type: 'STOP' } satisfies WorkerInbound); prev.terminate() }

  const { nodes, edges } = useArchitectureStore.getState()
  if (nodes.length === 0) return
```

Add the `saveDraft` call after the early-return guard, before the `graph` construction:

```typescript
startSimulation: () => {
  const { worker: prev, trafficConfig, speed } = get()
  if (prev) { prev.postMessage({ type: 'STOP' } satisfies WorkerInbound); prev.terminate() }

  const { nodes, edges } = useArchitectureStore.getState()
  if (nodes.length === 0) return

  // Persist draft so the user can resume later (fire-and-forget)
  const { activeChallenge } = useChallengeStore.getState()
  if (activeChallenge) {
    saveDraft(activeChallenge.id, nodes, edges).catch(console.error)
  }

  const graph = {
```

- [ ] **Step 3: Commit**

```bash
git add lib/store/simStore.ts
git commit -m "feat: save draft to Supabase on sim start"
```

---

## Task 4: Debounced localStorage save on canvas edit

**Files:**
- Modify: `components/canvas/ChallengeLayout.tsx`

- [ ] **Step 1: Add imports**

At the top of `components/canvas/ChallengeLayout.tsx`, add:

```typescript
import { useEffect, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useArchitectureStore } from '@/lib/store/architectureStore'
import { writeLocalDraft } from '@/lib/draft'
```

- [ ] **Step 2: Add the debounced save effect inside `ChallengeLayout`**

Inside the `ChallengeLayout` function, after the existing store selectors, add:

```typescript
const { userId } = useAuth()
const nodes = useArchitectureStore((s) => s.nodes)
const edges = useArchitectureStore((s) => s.edges)
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

useEffect(() => {
  if (!activeChallenge || !userId) return
  if (timerRef.current) clearTimeout(timerRef.current)
  timerRef.current = setTimeout(() => {
    writeLocalDraft(userId, activeChallenge.id, nodes, edges)
  }, 1500)
  return () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }
}, [nodes, edges, activeChallenge?.id, userId])
```

- [ ] **Step 3: Commit**

```bash
git add components/canvas/ChallengeLayout.tsx
git commit -m "feat: debounced localStorage draft save on canvas edit"
```

---

## Task 5: Campaign page — Continue/Restart buttons

**Files:**
- Modify: `app/campaign/page.tsx`

- [ ] **Step 1: Add `getChallengeDrafts` import and fetch**

At the top of `app/campaign/page.tsx`, add the import:

```typescript
import { getChallengeDrafts } from '@/lib/actions/drafts'
```

In `CampaignPage`, update the parallel fetch to include drafts:

```typescript
const [completions, profile, drafts] = await Promise.all([
  userId ? getMyCompletions() : Promise.resolve([]),
  userId ? getOrCreateProfile() : Promise.resolve(null),
  userId ? getChallengeDrafts() : Promise.resolve([]),
])

const completionMap = new Map(completions.map((c) => [c.challenge_id, c]))
const draftMap = new Map(drafts.map((d) => [d.challenge_id, true]))
```

- [ ] **Step 2: Pass `hasDraft` to `ChallengeCard`**

In the grid where `ChallengeCard` is rendered, pass the new prop:

```typescript
<ChallengeCard
  key={c.id}
  challenge={c}
  completion={completionMap.get(c.id)}
  hasDraft={draftMap.get(c.id) ?? false}
/>
```

- [ ] **Step 3: Update `ChallengeCard` props and render**

Update the `ChallengeCard` function signature and body. Replace the entire component:

```typescript
function ChallengeCard({
  challenge,
  completion,
  hasDraft,
}: {
  challenge: Challenge
  completion: CompletionRow | undefined
  hasDraft: boolean
}) {
  const tierColors: Record<number, { badge: string; hover: string }> = {
    0: { badge: 'bg-surface text-ink-3',       hover: 'hover:border-edge-strong' },
    1: { badge: 'bg-cyan/10 text-cyan',         hover: 'hover:border-cyan/50'    },
  }
  const colors = tierColors[challenge.tier] ?? tierColors[1]
  const passed = completion?.passed

  const cardBody = (
    <>
      {/* Completion badge */}
      {passed && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-1.5 py-0.5 bg-ok/10 border border-ok/30">
          <CheckCircle2 size={11} className="text-ok" />
          <span className="text-[10px] font-bold text-ok">{completion!.score}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 tracking-wider uppercase ${colors.badge}`}>
            {challenge.id}
          </span>
          <h3 className="mt-1.5 text-[14px] font-bold text-ink-2 group-hover:text-ink transition-colors">
            {challenge.title}
          </h3>
        </div>
        {!passed && !hasDraft && <Play size={13} className="text-ink-3 group-hover:text-ink-2 flex-shrink-0 mt-5 transition-colors" />}
      </div>

      {/* Narrative */}
      <p className="text-[11px] text-ink-3 leading-relaxed line-clamp-2">{challenge.narrative}</p>

      {/* SLA targets */}
      <div className="flex gap-3 text-[10px]">
        <span className="text-ink-3">p99 ≤ <span className="font-bold text-ink-2">{challenge.slaTargets.p99LatencyMs}ms</span></span>
        <span className="text-edge-strong">·</span>
        <span className="text-ink-3">err ≤ <span className="font-bold text-ink-2">{(challenge.slaTargets.errorRate * 100).toFixed(1)}%</span></span>
        <span className="text-edge-strong">·</span>
        <span className="text-ink-3">budget <span className="font-bold text-ink-2">${challenge.budgetPerHour.toFixed(2)}/hr</span></span>
      </div>

      {/* Concept tags */}
      <div className="flex flex-wrap gap-1">
        {challenge.conceptsTaught.slice(0, 3).map((c) => (
          <span key={c} className="text-[10px] px-1.5 py-0.5 bg-surface text-ink-3 border border-edge-dim">
            {c}
          </span>
        ))}
        {challenge.conceptsTaught.length > 3 && (
          <span className="text-[10px] px-1.5 py-0.5 bg-surface text-ink-3 border border-edge-dim">
            +{challenge.conceptsTaught.length - 3}
          </span>
        )}
      </div>
    </>
  )

  const cardClass = `
    group relative flex flex-col gap-3 p-5 border
    bg-raised transition-colors
    ${passed
      ? 'border-ok/30 hover:border-ok/50'
      : `border-edge-dim ${colors.hover}`
    }
  `

  if (hasDraft) {
    return (
      <div className={cardClass}>
        {cardBody}
        <div className="flex gap-2 pt-1">
          <Link
            href={`/play/${challenge.id}?resume=true`}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-cyan hover:bg-cyan/90 text-base text-[11px] font-bold uppercase tracking-wider transition-colors"
          >
            <Play size={11} /> Continue
          </Link>
          <Link
            href={`/play/${challenge.id}?restart=true`}
            className="flex items-center gap-1.5 px-3 py-2 border border-edge bg-surface hover:bg-overlay text-ink-2 text-[11px] font-bold uppercase tracking-wider transition-colors"
          >
            <RotateCcw size={11} /> Restart
          </Link>
        </div>
      </div>
    )
  }

  return (
    <Link
      href={`/play/${challenge.id}`}
      className={cardClass}
    >
      {cardBody}
    </Link>
  )
}
```

- [ ] **Step 4: Add missing imports to `app/campaign/page.tsx`**

Add `RotateCcw` to the lucide-react import (it's already used in `ResultsModal` — same icon):

```typescript
import { CheckCircle2, Lock, Play, RotateCcw } from 'lucide-react'
```

- [ ] **Step 5: Commit**

```bash
git add app/campaign/page.tsx
git commit -m "feat: show Continue/Restart buttons on campaign card when draft exists"
```

---

## Task 6: Play page — resume and restart logic

**Files:**
- Modify: `app/play/[levelId]/page.tsx`

- [ ] **Step 1: Add imports**

Add to the top of `app/play/[levelId]/page.tsx`:

```typescript
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { getDraft } from '@/lib/actions/drafts'
import { readLocalDraft, clearLocalDraft } from '@/lib/draft'
```

- [ ] **Step 2: Read search params and userId inside the component**

Inside `PlayPage`, after the existing store destructuring, add:

```typescript
const searchParams = useSearchParams()
const resume = searchParams.get('resume') === 'true'
const restart = searchParams.get('restart') === 'true'
const { userId } = useAuth()
```

- [ ] **Step 3: Replace the `useEffect` with async resume/restart logic**

Replace the existing `useEffect` entirely:

```typescript
useEffect(() => {
  if (!challenge) return
  let cancelled = false

  async function init() {
    stopSimulation()
    setActiveChallenge(challenge)
    setDuration(challenge.trafficConfig.durationMs)
    setWaypoints(challenge.trafficConfig.waypoints)

    if (restart && userId) {
      // Clear localStorage draft so future Continue starts fresh
      clearLocalDraft(userId, challenge.id)
      // Load starter graph
      if (challenge.starterNodes?.length) {
        initFromStarterGraph(challenge.starterNodes, challenge.starterEdges ?? [])
      } else {
        clearCanvas()
      }
    } else if (resume && userId) {
      // Pick the most recent draft between localStorage and Supabase
      const local = readLocalDraft(userId, challenge.id)
      let db: { nodes: typeof local extends null ? never : (typeof local)['nodes']; edges: typeof local extends null ? never : (typeof local)['edges']; saved_at: string } | null = null
      try {
        db = await getDraft(challenge.id)
      } catch {
        // Supabase unavailable — fall back to local
      }
      if (cancelled) return

      const localTime = local ? new Date(local.savedAt).getTime() : 0
      const dbTime = db ? new Date(db.saved_at).getTime() : 0

      if (localTime === 0 && dbTime === 0) {
        // No draft found — fall back to starter graph
        if (challenge.starterNodes?.length) {
          initFromStarterGraph(challenge.starterNodes, challenge.starterEdges ?? [])
        } else {
          clearCanvas()
        }
      } else if (localTime >= dbTime && local) {
        initFromStarterGraph(local.nodes as Parameters<typeof initFromStarterGraph>[0], local.edges as Parameters<typeof initFromStarterGraph>[1])
      } else if (db) {
        initFromStarterGraph(db.nodes as Parameters<typeof initFromStarterGraph>[0], db.edges as Parameters<typeof initFromStarterGraph>[1])
      }
    } else {
      // Normal first visit — load starter graph
      if (challenge.starterNodes?.length) {
        initFromStarterGraph(challenge.starterNodes, challenge.starterEdges ?? [])
      } else {
        clearCanvas()
      }
    }

    if (!cancelled) setReady(true)
  }

  init()

  return () => {
    cancelled = true
    stopSimulation()
    setActiveChallenge(null)
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [levelId])
```

- [ ] **Step 4: Simplify the type assertions in the resume branch**

The `initFromStarterGraph` signature is `(nodes: StarterNode[], edges: StarterEdge[]) => void`. The draft nodes/edges are `ComponentNode[]` / `ComponentEdge[]`. These are compatible shapes — `initFromStarterGraph` maps them the same way. Use `as any` to avoid deep type gymnastics, since the store already guards internally:

Replace the two `initFromStarterGraph` calls in the resume branch with:

```typescript
      } else if (localTime >= dbTime && local) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initFromStarterGraph(local.nodes as any, local.edges as any)
      } else if (db) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initFromStarterGraph(db.nodes as any, db.edges as any)
      }
```

- [ ] **Step 5: Clean up the `db` variable type**

Replace the overly complex `db` type inline with a simple local type. The full `init` function should look like this (final version):

```typescript
async function init() {
  stopSimulation()
  setActiveChallenge(challenge)
  setDuration(challenge.trafficConfig.durationMs)
  setWaypoints(challenge.trafficConfig.waypoints)

  if (restart && userId) {
    clearLocalDraft(userId, challenge.id)
    if (challenge.starterNodes?.length) {
      initFromStarterGraph(challenge.starterNodes, challenge.starterEdges ?? [])
    } else {
      clearCanvas()
    }
  } else if (resume && userId) {
    const local = readLocalDraft(userId, challenge.id)
    let db: { nodes: unknown[]; edges: unknown[]; saved_at: string } | null = null
    try {
      db = await getDraft(challenge.id)
    } catch {
      // Supabase unavailable — fall back to local
    }
    if (cancelled) return

    const localTime = local ? new Date(local.savedAt).getTime() : 0
    const dbTime = db ? new Date(db.saved_at).getTime() : 0

    if (localTime === 0 && dbTime === 0) {
      if (challenge.starterNodes?.length) {
        initFromStarterGraph(challenge.starterNodes, challenge.starterEdges ?? [])
      } else {
        clearCanvas()
      }
    } else if (localTime >= dbTime && local) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initFromStarterGraph(local.nodes as any, local.edges as any)
    } else if (db) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initFromStarterGraph(db.nodes as any, db.edges as any)
    }
  } else {
    if (challenge.starterNodes?.length) {
      initFromStarterGraph(challenge.starterNodes, challenge.starterEdges ?? [])
    } else {
      clearCanvas()
    }
  }

  if (!cancelled) setReady(true)
}
```

- [ ] **Step 6: Commit**

```bash
git add app/play/[levelId]/page.tsx
git commit -m "feat: resume or restart challenge from last draft on play page"
```

---

## Task 7: Verify the build

- [ ] **Step 1: Run the build**

```bash
pnpm build
```

Expected: no TypeScript errors, no build failures. If errors appear related to `initFromStarterGraph` types, confirm the `as any` casts are present per Task 6 Step 5.

- [ ] **Step 2: Smoke test manually**

1. Open `/campaign` — all challenge cards show the normal Play link (no drafts yet)
2. Open any challenge at `/play/[id]` — canvas loads normally
3. Add some nodes, wait 2s — check DevTools → Application → Local Storage for `draft:[userId]:[challengeId]`
4. Run the simulation — check Supabase `challenge_drafts` table for a new row
5. Go back to `/campaign` — the challenge card should now show **Continue** and **Restart**
6. Click **Continue** — canvas loads the saved design
7. Click **Restart** — canvas loads the starter graph, localStorage draft is cleared
