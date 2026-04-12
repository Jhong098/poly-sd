# Community Challenge Submissions — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let players author and publish challenges from the sandbox canvas, discoverable via a `/community` feed, playable with the existing sim engine.

**Architecture:** New `community_challenges` + `community_challenge_upvotes` Supabase tables store challenges in the same JSON shape as the code-defined `Challenge` type. A new `/community/[id]` page fetches from DB and feeds the challenge into the existing `ChallengeLayout`. A 4-step publish wizard captures metadata from the sandbox canvas. Completions are recorded with a `community:<uuid>` prefixed ID to avoid collision with campaign IDs.

**Tech Stack:** Next.js App Router, Supabase (via service role), Clerk auth, Zustand (`challengeStore`, `architectureStore`, `simStore`), Tailwind, TypeScript.

---

### Task 1: DB Migration

**Files:**
- Modify: `supabase/schema.sql`

**Step 1: Add the new tables and column to schema.sql**

Append to the bottom of `supabase/schema.sql` (before the closing comment if any):

```sql
-- ── Community Challenges ──────────────────────────────────────────────────────

create table if not exists public.community_challenges (
  id                  uuid        primary key default gen_random_uuid(),
  author_id           text        not null references public.profiles(id) on delete cascade,
  title               text        not null,
  narrative           text        not null,
  objective           text        not null,
  tier                integer     not null check (tier between 1 and 5),
  traffic_config      jsonb       not null,
  sla_targets         jsonb       not null,
  budget_per_hour     numeric     not null,
  allowed_components  jsonb       not null default '"all"',
  concepts_taught     jsonb       not null default '[]',
  hints               jsonb       not null default '[]',
  starter_nodes       jsonb       not null default '[]',
  starter_edges       jsonb       not null default '[]',
  chaos_schedule      jsonb       not null default '[]',
  status              text        not null default 'draft' check (status in ('draft', 'published')),
  attempt_count       integer     not null default 0,
  pass_count          integer     not null default 0,
  upvote_count        integer     not null default 0,
  created_at          timestamptz not null default now(),
  published_at        timestamptz
);

create index if not exists community_challenges_hot_idx
  on public.community_challenges(status, upvote_count desc, attempt_count desc)
  where status = 'published';

create index if not exists community_challenges_new_idx
  on public.community_challenges(status, published_at desc)
  where status = 'published';

create table if not exists public.community_challenge_upvotes (
  challenge_id  uuid  not null references public.community_challenges(id) on delete cascade,
  user_id       text  not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (challenge_id, user_id)
);

alter table public.profiles
  add column if not exists is_challenge_author boolean not null default false;

-- RLS for community challenges — public read, service role writes
alter table public.community_challenges enable row level security;
create policy "community_challenges_select" on public.community_challenges
  for select using (status = 'published');

alter table public.community_challenge_upvotes enable row level security;
create policy "community_upvotes_select" on public.community_challenge_upvotes
  for select using (true);
```

**Step 2: Run the migration**

Paste the new SQL into the Supabase SQL editor and execute. Verify the three changes:
- `community_challenges` table created
- `community_challenge_upvotes` table created
- `profiles.is_challenge_author` column added

**Step 3: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: add community_challenges and upvotes schema"
```

---

### Task 2: Config Constant

**Files:**
- Create: `lib/config.ts`

**Step 1: Create the file**

```ts
/** Minimum campaign completions required to publish a community challenge. */
export const COMMUNITY_PUBLISH_MIN_COMPLETIONS = 10
```

**Step 2: Commit**

```bash
git add lib/config.ts
git commit -m "feat: add COMMUNITY_PUBLISH_MIN_COMPLETIONS config constant"
```

---

### Task 3: Server Actions

**Files:**
- Create: `lib/actions/community-challenges.ts`

**Step 1: Write the file**

```ts
'use server'

import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getOrCreateProfile } from './profile'
import { COMMUNITY_PUBLISH_MIN_COMPLETIONS } from '@/lib/config'
import type { Challenge } from '@/lib/challenges/types'
import type { ComponentNode, ComponentEdge } from '@/lib/store/architectureStore'

// ── Types ─────────────────────────────────────────────────────────────────────

export type CommunityChallengeSummary = {
  id: string
  author_id: string
  author_username: string | null
  author_is_badge: boolean
  title: string
  narrative: string
  tier: number
  attempt_count: number
  pass_count: number
  upvote_count: number
  published_at: string
}

export type PublishInput = {
  title: string
  narrative: string
  objective: string
  tier: number
  slaTargets: { p99LatencyMs: number; errorRate: number }
  budgetPerHour: number
  allowedComponents: string[] | 'all'
  hints: string[]
  nodes: ComponentNode[]
  edges: ComponentEdge[]
  trafficConfig: { durationMs: number; waypoints: { timeMs: number; rps: number }[] }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Deserialise a community_challenges DB row into the Challenge shape the sim consumes. */
export function rowToChallenge(row: Record<string, unknown>): Challenge {
  return {
    id: `community:${row.id as string}`,
    tier: row.tier as Challenge['tier'],
    order: 0,
    title: row.title as string,
    narrative: row.narrative as string,
    objective: row.objective as string,
    trafficConfig: row.traffic_config as Challenge['trafficConfig'],
    slaTargets: row.sla_targets as Challenge['slaTargets'],
    budgetPerHour: Number(row.budget_per_hour),
    allowedComponents: row.allowed_components as Challenge['allowedComponents'],
    conceptsTaught: (row.concepts_taught as string[]) ?? [],
    hints: (row.hints as string[]) ?? [],
    starterNodes: (row.starter_nodes as Challenge['starterNodes']) ?? [],
    starterEdges: (row.starter_edges as Challenge['starterEdges']) ?? [],
    chaosSchedule: (row.chaos_schedule as Challenge['chaosSchedule']) ?? [],
  }
}

// ── Actions ───────────────────────────────────────────────────────────────────

/** Returns true if the current user has met the publish gating threshold. */
export async function checkCanPublish(): Promise<boolean> {
  const { userId } = await auth()
  if (!userId) return false

  const db = createAdminClient()
  const { count } = await db
    .from('challenge_completions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('passed', true)

  return (count ?? 0) >= COMMUNITY_PUBLISH_MIN_COMPLETIONS
}

/** Publish a community challenge. Returns the new challenge id or an error. */
export async function publishCommunityChallenge(
  input: PublishInput,
): Promise<{ id: string } | { error: string }> {
  const { userId } = await auth()
  if (!userId) return { error: 'Not signed in' }

  const canPublish = await checkCanPublish()
  if (!canPublish) return { error: `Complete ${COMMUNITY_PUBLISH_MIN_COMPLETIONS} campaign levels first` }

  await getOrCreateProfile()
  const db = createAdminClient()

  const { data, error } = await db
    .from('community_challenges')
    .insert({
      author_id: userId,
      title: input.title,
      narrative: input.narrative,
      objective: input.objective,
      tier: input.tier,
      traffic_config: input.trafficConfig,
      sla_targets: input.slaTargets,
      budget_per_hour: input.budgetPerHour,
      allowed_components: input.allowedComponents,
      concepts_taught: [],
      hints: input.hints,
      starter_nodes: input.nodes,
      starter_edges: input.edges,
      chaos_schedule: [],
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'Insert failed' }

  // Award author badge on first publish
  await db
    .from('profiles')
    .update({ is_challenge_author: true })
    .eq('id', userId)
    .eq('is_challenge_author', false)   // no-op if already set

  return { id: (data as { id: string }).id }
}

/** Fetch a single community challenge by UUID (not prefixed). */
export async function getCommunityChallenge(
  uuid: string,
): Promise<Challenge | null> {
  const db = createAdminClient()
  const { data } = await db
    .from('community_challenges')
    .select('*')
    .eq('id', uuid)
    .eq('status', 'published')
    .single()

  if (!data) return null
  return rowToChallenge(data as Record<string, unknown>)
}

export type FeedTab = 'hot' | 'new' | 'top'

/** Fetch paginated community feed. */
export async function getCommunityFeed(
  tab: FeedTab,
  page = 0,
  pageSize = 20,
): Promise<CommunityChallengeSummary[]> {
  const db = createAdminClient()

  let query = db
    .from('community_challenges')
    .select('id, author_id, title, narrative, tier, attempt_count, pass_count, upvote_count, published_at, profiles(username, is_challenge_author)')
    .eq('status', 'published')
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (tab === 'new') query = query.order('published_at', { ascending: false })
  else if (tab === 'top') query = query.order('upvote_count', { ascending: false })
  else query = query.order('upvote_count', { ascending: false }).order('attempt_count', { ascending: false })

  const { data } = await query
  if (!data) return []

  type Row = {
    id: string; author_id: string; title: string; narrative: string; tier: number
    attempt_count: number; pass_count: number; upvote_count: number; published_at: string
    profiles: { username: string | null; is_challenge_author: boolean } | null
  }

  return (data as unknown as Row[]).map((row) => ({
    id: row.id,
    author_id: row.author_id,
    author_username: row.profiles?.username ?? null,
    author_is_badge: row.profiles?.is_challenge_author ?? false,
    title: row.title,
    narrative: row.narrative,
    tier: row.tier,
    attempt_count: row.attempt_count,
    pass_count: row.pass_count,
    upvote_count: row.upvote_count,
    published_at: row.published_at,
  }))
}

/** Toggle upvote on a community challenge. Returns the new upvote count. */
export async function upvoteCommunityChallenge(
  uuid: string,
): Promise<{ upvoteCount: number; upvoted: boolean } | { error: string }> {
  const { userId } = await auth()
  if (!userId) return { error: 'Not signed in' }

  const db = createAdminClient()

  // Check existing upvote
  const { data: existing } = await db
    .from('community_challenge_upvotes')
    .select('challenge_id')
    .eq('challenge_id', uuid)
    .eq('user_id', userId)
    .single()

  if (existing) {
    // Already upvoted — remove it
    await db
      .from('community_challenge_upvotes')
      .delete()
      .eq('challenge_id', uuid)
      .eq('user_id', userId)

    await db.rpc('decrement_community_upvote', { challenge_id_input: uuid })

    const { data } = await db
      .from('community_challenges')
      .select('upvote_count')
      .eq('id', uuid)
      .single()

    return { upvoteCount: (data as { upvote_count: number } | null)?.upvote_count ?? 0, upvoted: false }
  }

  // Insert upvote
  await db
    .from('community_challenge_upvotes')
    .insert({ challenge_id: uuid, user_id: userId })

  await db.rpc('increment_community_upvote', { challenge_id_input: uuid })

  const { data } = await db
    .from('community_challenges')
    .select('upvote_count')
    .eq('id', uuid)
    .single()

  return { upvoteCount: (data as { upvote_count: number } | null)?.upvote_count ?? 0, upvoted: true }
}

/** Atomically increment attempt_count. Call when a player starts a community challenge. */
export async function incrementAttemptCount(uuid: string): Promise<void> {
  const db = createAdminClient()
  await db.rpc('increment_community_attempt', { challenge_id_input: uuid })
}

/** Atomically increment pass_count. Call when a player passes a community challenge. */
export async function incrementPassCount(uuid: string): Promise<void> {
  const db = createAdminClient()
  await db.rpc('increment_community_pass', { challenge_id_input: uuid })
}
```

**Step 2: Add the four RPC helper functions to schema.sql**

Append to `supabase/schema.sql`:

```sql
-- Community challenge atomic counters

create or replace function public.increment_community_upvote(challenge_id_input uuid)
returns void language sql security definer as $$
  update public.community_challenges
  set upvote_count = upvote_count + 1
  where id = challenge_id_input;
$$;

create or replace function public.decrement_community_upvote(challenge_id_input uuid)
returns void language sql security definer as $$
  update public.community_challenges
  set upvote_count = greatest(0, upvote_count - 1)
  where id = challenge_id_input;
$$;

create or replace function public.increment_community_attempt(challenge_id_input uuid)
returns void language sql security definer as $$
  update public.community_challenges
  set attempt_count = attempt_count + 1
  where id = challenge_id_input;
$$;

create or replace function public.increment_community_pass(challenge_id_input uuid)
returns void language sql security definer as $$
  update public.community_challenges
  set pass_count = pass_count + 1
  where id = challenge_id_input;
$$;
```

Run in Supabase SQL editor.

**Step 3: Commit**

```bash
git add lib/actions/community-challenges.ts supabase/schema.sql
git commit -m "feat: community challenge server actions and RPC helpers"
```

---

### Task 4: Publish Wizard Component

**Files:**
- Create: `components/challenge/PublishWizard.tsx`

**Step 1: Write the component**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { X, ChevronRight, ChevronLeft, Check, Upload } from 'lucide-react'
import { publishCommunityChallenge, type PublishInput } from '@/lib/actions/community-challenges'
import type { ComponentNode, ComponentEdge } from '@/lib/store/architectureStore'

type Props = {
  nodes: ComponentNode[]
  edges: ComponentEdge[]
  trafficConfig: { durationMs: number; waypoints: { timeMs: number; rps: number }[] }
  simP99: number       // last sim result p99 — used to pre-fill SLA suggestion
  simCost: number      // last sim result cost/hr — used to pre-fill budget suggestion
  onClose: () => void
  onPublished: (id: string) => void
}

const TIER_LABELS: Record<number, string> = {
  1: '1 — Foundations',
  2: '2 — Scale Out',
  3: '3 — Resilience',
  4: '4 — Distributed Data',
  5: '5 — Global Systems',
}

export function PublishWizard({ nodes, edges, trafficConfig, simP99, simCost, onClose, onPublished }: Props) {
  const [step, setStep] = useState(1)
  const [isPending, startTransition] = useTransition()
  const [published, setPublished] = useState(false)

  // Step 1
  const [title, setTitle] = useState('')
  const [narrative, setNarrative] = useState('')
  const [objective, setObjective] = useState('')

  // Step 2 — pre-fill from sim, but round up generously so the challenge is passable
  const suggestedP99 = Math.ceil(simP99 * 1.5 / 10) * 10  // 50% headroom, round to 10ms
  const suggestedBudget = Math.ceil(simCost * 2 * 10) / 10  // 2× headroom, round to $0.1
  const [p99Target, setP99Target] = useState(suggestedP99 || 200)
  const [errorRateTarget, setErrorRateTarget] = useState(1)   // 1%
  const [budget, setBudget] = useState(suggestedBudget || 1.0)

  // Step 3
  const [tier, setTier] = useState(3)
  const [hints, setHints] = useState(['', '', ''])

  function updateHint(i: number, v: string) {
    setHints((h) => h.map((x, j) => (j === i ? v : x)))
  }

  const filledHints = hints.filter((h) => h.trim())

  function handlePublish() {
    const input: PublishInput = {
      title: title.trim(),
      narrative: narrative.trim(),
      objective: objective.trim(),
      tier,
      slaTargets: { p99LatencyMs: p99Target, errorRate: errorRateTarget / 100 },
      budgetPerHour: budget,
      allowedComponents: 'all',
      hints: filledHints,
      nodes,
      edges,
      trafficConfig,
    }

    startTransition(async () => {
      const result = await publishCommunityChallenge(input)
      if ('error' in result) {
        alert(result.error)
        return
      }
      setPublished(true)
      onPublished(result.id)
    })
  }

  const step1Valid = title.trim() && narrative.trim() && objective.trim()
  const step2Valid = p99Target > 0 && errorRateTarget > 0 && budget > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/80">
      <div className="w-[480px] bg-raised border border-edge overflow-hidden" style={{ borderTopWidth: 2, borderTopColor: 'var(--color-cyan)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-edge-dim">
          <p className="text-[11px] font-bold tracking-widest uppercase text-cyan">// Publish Challenge</p>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-ink-3">Step {step} of 4</span>
            <button onClick={onClose} className="text-ink-3 hover:text-ink-2"><X size={14} /></button>
          </div>
        </div>

        {/* Step 1 — Identity */}
        {step === 1 && (
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-ink-3 mb-1.5">Title</label>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Read-Heavy API"
                className="w-full bg-surface border border-edge px-3 py-2 text-[13px] text-ink focus:outline-none focus:border-edge-strong placeholder:text-ink-off"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-ink-3 mb-1.5">Narrative</label>
              <textarea
                value={narrative}
                onChange={(e) => setNarrative(e.target.value)}
                rows={3}
                placeholder="Story framing — what situation is the player in?"
                className="w-full bg-surface border border-edge px-3 py-2 text-[13px] text-ink focus:outline-none focus:border-edge-strong placeholder:text-ink-off resize-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-ink-3 mb-1.5">Objective</label>
              <textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                rows={2}
                placeholder="What must the player achieve? (1–2 sentences)"
                className="w-full bg-surface border border-edge px-3 py-2 text-[13px] text-ink focus:outline-none focus:border-edge-strong placeholder:text-ink-off resize-none"
              />
            </div>
          </div>
        )}

        {/* Step 2 — SLA Targets */}
        {step === 2 && (
          <div className="px-6 py-5 space-y-4">
            <p className="text-[11px] text-ink-3">Pre-filled from your last sim run. Adjust to set the pass threshold.</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-ink-3 mb-1.5">p99 Latency target (ms)</label>
                <input
                  type="number"
                  value={p99Target}
                  min={10}
                  onChange={(e) => setP99Target(Number(e.target.value))}
                  className="w-full bg-surface border border-edge px-3 py-2 text-[13px] text-ink focus:outline-none focus:border-edge-strong"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-ink-3 mb-1.5">Error rate target (%)</label>
                <input
                  type="number"
                  value={errorRateTarget}
                  min={0.01}
                  max={50}
                  step={0.1}
                  onChange={(e) => setErrorRateTarget(Number(e.target.value))}
                  className="w-full bg-surface border border-edge px-3 py-2 text-[13px] text-ink focus:outline-none focus:border-edge-strong"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-ink-3 mb-1.5">Budget ($/hr)</label>
                <input
                  type="number"
                  value={budget}
                  min={0.01}
                  step={0.1}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full bg-surface border border-edge px-3 py-2 text-[13px] text-ink focus:outline-none focus:border-edge-strong"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Constraints */}
        {step === 3 && (
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-ink-3 mb-1.5">Difficulty Tier</label>
              <div className="grid grid-cols-1 gap-1.5">
                {[1, 2, 3, 4, 5].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTier(t)}
                    className={`flex items-center gap-2 px-3 py-2 border text-[12px] text-left transition-colors
                      ${tier === t ? 'border-cyan text-ink bg-surface' : 'border-edge text-ink-3 hover:border-edge-strong hover:text-ink-2'}`}
                  >
                    {tier === t && <Check size={12} className="text-cyan flex-shrink-0" />}
                    <span className={tier === t ? '' : 'ml-[20px]'}>{TIER_LABELS[t]}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-ink-3 mb-1.5">Hints (optional, up to 3)</label>
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <input
                    key={i}
                    value={hints[i]}
                    onChange={(e) => updateHint(i, e.target.value)}
                    placeholder={`Hint ${i + 1}`}
                    className="w-full bg-surface border border-edge px-3 py-2 text-[13px] text-ink focus:outline-none focus:border-edge-strong placeholder:text-ink-off"
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4 — Preview */}
        {step === 4 && (
          <div className="px-6 py-5 space-y-3">
            {published ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="w-10 h-10 bg-ok/10 border border-ok flex items-center justify-center">
                  <Check size={20} className="text-ok" />
                </div>
                <p className="text-[14px] font-bold text-ok">Published!</p>
                <p className="text-[12px] text-ink-3 text-center">Your challenge is live on the Community feed.</p>
              </div>
            ) : (
              <>
                <div className="bg-surface border border-edge-dim p-4 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-cyan">// Challenge Preview</p>
                  <p className="text-[15px] font-bold text-ink">{title}</p>
                  <p className="text-[12px] text-ink-2">{narrative}</p>
                  <p className="text-[11px] text-ink-3 italic">{objective}</p>
                  <div className="flex gap-4 pt-2 text-[11px] text-ink-3">
                    <span>Tier {tier}</span>
                    <span>p99 ≤ {p99Target}ms</span>
                    <span>Error ≤ {errorRateTarget}%</span>
                    <span>Budget ≤ ${budget}/hr</span>
                  </div>
                  {filledHints.length > 0 && (
                    <div className="pt-2 space-y-1">
                      {filledHints.map((h, i) => (
                        <p key={i} className="text-[11px] text-ink-3">💡 {h}</p>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-ink-3">
                  {nodes.length} starter nodes · {edges.length} starter edges
                </p>
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-edge-dim flex justify-between">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            disabled={published}
            className="flex items-center gap-1.5 px-3 py-2 border border-edge text-ink-3 hover:text-ink-2 text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-30"
          >
            <ChevronLeft size={12} /> {step === 1 ? 'Cancel' : 'Back'}
          </button>

          {step < 4 && (
            <button
              onClick={() => setStep(step + 1)}
              disabled={(step === 1 && !step1Valid) || (step === 2 && !step2Valid)}
              className="flex items-center gap-1.5 px-3 py-2 bg-cyan hover:bg-cyan/90 disabled:bg-surface disabled:text-ink-3 text-base text-[11px] font-bold uppercase tracking-wider transition-colors"
            >
              Next <ChevronRight size={12} />
            </button>
          )}

          {step === 4 && !published && (
            <button
              onClick={handlePublish}
              disabled={isPending}
              className="flex items-center gap-1.5 px-4 py-2 bg-cyan hover:bg-cyan/90 disabled:bg-surface disabled:text-ink-3 text-base text-[11px] font-bold uppercase tracking-wider transition-colors"
            >
              <Upload size={12} /> {isPending ? 'Publishing…' : 'Publish'}
            </button>
          )}

          {published && (
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-4 py-2 bg-ok hover:bg-ok/90 text-base text-[11px] font-bold uppercase tracking-wider transition-colors"
            >
              Done <Check size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/challenge/PublishWizard.tsx
git commit -m "feat: PublishWizard component (4-step publish modal)"
```

---

### Task 5: "Publish as Challenge" Button in TopBar

**Files:**
- Modify: `components/canvas/TopBar.tsx`

**Step 1: Add state and import**

At the top of `TopBar.tsx`, add the new imports alongside existing ones:

```ts
import { Upload } from 'lucide-react'
import { PublishWizard } from '@/components/challenge/PublishWizard'
import { checkCanPublish } from '@/lib/actions/community-challenges'
```

**Step 2: Add `showPublish`, `canPublish`, and `publishedId` state inside `TopBar()`**

After the existing `useState` declarations:

```ts
const [showPublish, setShowPublish] = useState(false)
const [canPublish, setCanPublish] = useState(false)
const [publishedId, setPublishedId] = useState<string | null>(null)
```

**Step 3: Add effect to check eligibility**

After the existing state declarations:

```ts
useEffect(() => {
  if (!isSignedIn || activeChallenge) return
  checkCanPublish().then(setCanPublish)
}, [isSignedIn, activeChallenge])
```

**Step 4: Add the button to the right-side cluster**

Inside the `ml-auto` div, after the Share button and before the Save button, add:

```tsx
{/* Publish as Challenge — sandbox only, gated by completion count */}
{isSignedIn && !activeChallenge && status === 'complete' && (
  canPublish ? (
    <button
      onClick={() => setShowPublish(true)}
      className="flex items-center gap-1.5 px-2.5 py-1.5 border border-edge bg-raised hover:bg-overlay text-ink-3 hover:text-ink-2 text-[11px] font-bold uppercase tracking-wider transition-colors"
    >
      <Upload size={12} /> Publish
    </button>
  ) : (
    <span
      title={`Complete ${COMMUNITY_PUBLISH_MIN_COMPLETIONS} campaign levels to publish challenges`}
      className="flex items-center gap-1.5 px-2.5 py-1.5 border border-edge-dim text-ink-off text-[11px] font-bold uppercase tracking-wider cursor-not-allowed"
    >
      <Upload size={12} /> Publish
    </span>
  )
)}
```

Also add the import for the config constant at the top:
```ts
import { COMMUNITY_PUBLISH_MIN_COMPLETIONS } from '@/lib/config'
```

**Step 5: Render the wizard**

At the end of the JSX, just before the closing `</header>`:

```tsx
{showPublish && (
  <PublishWizard
    nodes={nodes}
    edges={edges}
    trafficConfig={trafficConfig}
    simP99={history.length > 0 ? history[history.length - 1].systemP99LatencyMs : 0}
    simCost={history.length > 0 ? history[history.length - 1].systemCostPerHour : 0}
    onClose={() => setShowPublish(false)}
    onPublished={(id) => {
      setPublishedId(id)
      setShowPublish(false)
    }}
  />
)}
```

**Step 6: Commit**

```bash
git add components/canvas/TopBar.tsx
git commit -m "feat: Publish as Challenge button in sandbox TopBar"
```

---

### Task 6: Community Play Page

**Files:**
- Create: `app/community/[id]/page.tsx`

**Step 1: Write the page**

```tsx
'use client'

import { use, useEffect, useState } from 'react'
import { notFound } from 'next/navigation'
import { useChallengeStore } from '@/lib/store/challengeStore'
import { useArchitectureStore } from '@/lib/store/architectureStore'
import { useSimStore } from '@/lib/store/simStore'
import { ChallengeLayout } from '@/components/canvas/ChallengeLayout'
import { getCommunityChallenge, incrementAttemptCount } from '@/lib/actions/community-challenges'
import type { Challenge } from '@/lib/challenges/types'

export default function CommunityPlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [challenge, setChallenge] = useState<Challenge | null | undefined>(undefined)

  const { setActiveChallenge } = useChallengeStore()
  const { initFromStarterGraph, clearCanvas } = useArchitectureStore()
  const { stopSimulation, setDuration, setWaypoints } = useSimStore()

  useEffect(() => {
    getCommunityChallenge(id).then(async (c) => {
      if (!c) { setChallenge(null); return }
      setChallenge(c)
      stopSimulation()
      setActiveChallenge(c)
      setDuration(c.trafficConfig.durationMs)
      setWaypoints(c.trafficConfig.waypoints)
      if (c.starterNodes?.length) {
        initFromStarterGraph(c.starterNodes, c.starterEdges ?? [])
      } else {
        clearCanvas()
      }
      await incrementAttemptCount(id)
    })
    return () => {
      stopSimulation()
      setActiveChallenge(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (challenge === null) return notFound()
  if (challenge === undefined) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-950">
        <div className="w-5 h-5 border-2 border-gray-600 border-t-gray-300 rounded-full animate-spin" />
      </div>
    )
  }

  return <ChallengeLayout />
}
```

**Step 2: Commit**

```bash
git add app/community/\[id\]/page.tsx
git commit -m "feat: community challenge play page"
```

---

### Task 7: Community Feed Page

**Files:**
- Create: `app/community/page.tsx`

**Step 1: Write the page**

```tsx
import Link from 'next/link'
import { SiteNav } from '@/components/nav/SiteNav'
import { getCommunityFeed, type FeedTab } from '@/lib/actions/community-challenges'
import { ThumbsUp, Users, CheckCircle2 } from 'lucide-react'

const TABS: { key: FeedTab; label: string }[] = [
  { key: 'hot',  label: 'Hot' },
  { key: 'new',  label: 'New' },
  { key: 'top',  label: 'Top' },
]

function AuthorBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-cyan/10 border border-cyan/30 text-[10px] font-bold text-cyan uppercase tracking-widest">
      ⬡ Author
    </span>
  )
}

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab: tabParam } = await searchParams
  const tab: FeedTab = (tabParam === 'new' || tabParam === 'top') ? tabParam : 'hot'
  const challenges = await getCommunityFeed(tab)

  return (
    <div className="h-full flex flex-col overflow-hidden bg-base text-ink">
      <SiteNav />

      <header className="border-b border-edge-dim px-8 py-5">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-[15px] font-bold text-ink">Community Challenges</h1>
          <p className="text-[12px] text-ink-3 mt-0.5">Player-created challenges. Complete 10 campaign levels to publish your own.</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-6">
          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b border-edge-dim">
            {TABS.map(({ key, label }) => (
              <Link
                key={key}
                href={`/community?tab=${key}`}
                className={`px-4 py-2 text-[12px] font-bold uppercase tracking-wider border-b-2 transition-colors -mb-px
                  ${tab === key
                    ? 'border-cyan text-cyan'
                    : 'border-transparent text-ink-3 hover:text-ink-2'
                  }`}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Feed */}
          {challenges.length === 0 ? (
            <div className="p-12 border border-edge-dim bg-raised text-center">
              <p className="text-[13px] text-ink-3">No community challenges yet.</p>
              <p className="text-[12px] text-ink-3 mt-1">Complete 10 campaign levels to publish the first one.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {challenges.map((c) => {
                const passRate = c.attempt_count > 0
                  ? Math.round((c.pass_count / c.attempt_count) * 100)
                  : null

                return (
                  <div key={c.id} className="bg-raised border border-edge-dim p-5 flex gap-4 items-start">
                    {/* Tier badge */}
                    <div className="flex-shrink-0 w-8 h-8 bg-surface border border-edge flex items-center justify-center text-[12px] font-bold text-ink-3">
                      T{c.tier}
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[14px] font-bold text-ink">{c.title}</p>
                          <p className="text-[12px] text-ink-3 mt-0.5 line-clamp-2">{c.narrative}</p>
                        </div>
                        <Link
                          href={`/community/${c.id}`}
                          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-cyan hover:bg-cyan/90 text-base text-[11px] font-bold uppercase tracking-wider transition-colors"
                        >
                          Play
                        </Link>
                      </div>

                      {/* Meta row */}
                      <div className="flex items-center gap-4 mt-3 text-[11px] text-ink-3 flex-wrap">
                        <span className="flex items-center gap-1">
                          <ThumbsUp size={11} /> {c.upvote_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={11} /> {c.attempt_count} attempts
                        </span>
                        {passRate !== null && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 size={11} /> {passRate}% pass rate
                          </span>
                        )}
                        <span className="text-ink-off">
                          by {c.author_username ?? 'Anonymous'}
                          {c.author_is_badge && <span className="ml-1.5"><AuthorBadge /></span>}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add app/community/page.tsx
git commit -m "feat: community feed page with Hot/New/Top tabs"
```

---

### Task 8: Upvote Button in ResultsModal

**Files:**
- Modify: `components/overlays/ResultsModal.tsx`

**Step 1: Add imports**

```ts
import { ThumbsUp } from 'lucide-react'
import { upvoteCommunityChallenge, incrementPassCount } from '@/lib/actions/community-challenges'
```

**Step 2: Add upvote state inside `ResultsModal()`**

After the existing state declarations:

```ts
const [upvoted, setUpvoted] = useState(false)
const [upvoteCount, setUpvoteCount] = useState<number | null>(null)
const [, startUpvoteTransition] = useTransition()
```

**Step 3: Extract UUID from community challenge ID**

```ts
const isCommunityChallenge = challenge.id.startsWith('community:')
const communityUuid = isCommunityChallenge ? challenge.id.slice('community:'.length) : null
```

**Step 4: Call `incrementPassCount` on pass**

Add a `useEffect` after the existing ones:

```ts
useEffect(() => {
  if (result.passed && communityUuid) {
    incrementPassCount(communityUuid)
  }
}, [result.passed, communityUuid])
```

**Step 5: Add upvote button to the Actions section**

In the actions `div`, after the Share button, add:

```tsx
{result.passed && communityUuid && (
  <button
    onClick={() => {
      startUpvoteTransition(async () => {
        const res = await upvoteCommunityChallenge(communityUuid)
        if ('error' in res) return
        setUpvoted(res.upvoted)
        setUpvoteCount(res.upvoteCount)
      })
    }}
    className={`flex items-center gap-1.5 px-3 py-2 border text-[11px] font-bold uppercase tracking-wider transition-colors
      ${upvoted
        ? 'border-cyan bg-cyan/10 text-cyan'
        : 'border-edge bg-surface hover:bg-overlay text-ink-2'
      }`}
  >
    <ThumbsUp size={13} />
    {upvoteCount !== null ? upvoteCount : 'Upvote'}
  </button>
)}
```

**Step 6: Commit**

```bash
git add components/overlays/ResultsModal.tsx
git commit -m "feat: upvote button on community challenge completion screen"
```

---

### Task 9: Creator Badge on Profile Page

**Files:**
- Modify: `app/profile/page.tsx`

**Step 1: Add the badge next to the architect title**

Find this block in the profile header:

```tsx
<div className="flex items-center gap-2 mt-0.5">
  <Star size={12} className="text-warn" />
  <span className="text-[12px] font-bold text-warn">{level.title}</span>
  <span className="text-edge-strong">·</span>
  <span className="text-[12px] text-ink-3">Level {level.level}</span>
</div>
```

Replace with:

```tsx
<div className="flex items-center gap-2 mt-0.5 flex-wrap">
  <Star size={12} className="text-warn" />
  <span className="text-[12px] font-bold text-warn">{level.title}</span>
  <span className="text-edge-strong">·</span>
  <span className="text-[12px] text-ink-3">Level {level.level}</span>
  {profile.is_challenge_author && (
    <>
      <span className="text-edge-strong">·</span>
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-cyan/10 border border-cyan/30 text-[10px] font-bold text-cyan uppercase tracking-widest">
        ⬡ Challenge Author
      </span>
    </>
  )}
</div>
```

**Step 2: Ensure `is_challenge_author` is fetched**

Check that `getOrCreateProfile` in `lib/actions/profile.ts` selects this column. Open that file and confirm the select includes `is_challenge_author`. If the select uses `*` it already works; if it lists columns explicitly, add `is_challenge_author`.

**Step 3: Commit**

```bash
git add app/profile/page.tsx lib/actions/profile.ts
git commit -m "feat: Challenge Author badge on profile page"
```

---

### Task 10: SiteNav Community Link

**Files:**
- Modify: `components/nav/SiteNav.tsx`

**Step 1: Add Community to NAV_LINKS**

Find:
```ts
const NAV_LINKS = [
  { href: '/campaign', label: 'Campaign' },
  { href: '/sandbox',  label: 'Free Play' },
]
```

Replace with:
```ts
const NAV_LINKS = [
  { href: '/campaign',  label: 'Campaign'  },
  { href: '/community', label: 'Community' },
  { href: '/sandbox',   label: 'Free Play' },
]
```

**Step 2: Commit**

```bash
git add components/nav/SiteNav.tsx
git commit -m "feat: add Community link to SiteNav"
```

---

## Testing Checklist

After all tasks are complete, manually verify:

- [ ] Sandbox: "Publish" button hidden until sim completes and user has ≥ 10 campaign completions
- [ ] Sandbox: Grayed-out Publish button shows tooltip for ineligible users
- [ ] Publish wizard: all 4 steps navigable, SLA fields pre-filled from sim
- [ ] Publish wizard: publishing saves to `community_challenges` in Supabase
- [ ] Profile: `is_challenge_author` badge appears after first publish
- [ ] `/community` feed: Hot/New/Top tabs return challenges sorted correctly
- [ ] `/community/[id]`: renders starter graph, sim runs normally
- [ ] Completion screen on community challenge: upvote button appears on pass
- [ ] Upvote toggles on/off, count updates
- [ ] `challenge_completions` records `community:<uuid>` as challenge_id
- [ ] `attempt_count` increments on page load, `pass_count` increments on pass
- [ ] SiteNav shows Community link, active state highlights correctly
