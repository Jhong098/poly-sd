# Resume Challenge Design

## Overview

When a user revisits a challenge they've previously worked on, they should be able to continue from where they left off rather than always starting from scratch. The entry point for this decision is the **campaign page** — not a modal inside the play page — where previously attempted challenges show **Continue** and **Restart** buttons instead of a single Play link.

Draft state is stored in two places: localStorage (updated on every canvas edit, debounced) and Supabase (updated on every simulation start). On resume, the more recent of the two is loaded.

---

## Data Layer

### Supabase: `challenge_drafts` table

```sql
challenge_drafts (
  user_id      text,
  challenge_id text,
  nodes        jsonb,
  edges        jsonb,
  saved_at     timestamptz,
  PRIMARY KEY (user_id, challenge_id)
)
```

Upserted on conflict `(user_id, challenge_id)`. Separate from `challenge_completions` — drafts are updated on every sim run regardless of score; completions only update on a higher score.

### Server actions: `lib/actions/drafts.ts`

- `saveDraft(challengeId, nodes, edges)` — upserts the draft for the current user
- `getChallengeDrafts()` — returns `{ challenge_id, saved_at }[]` for the current user (no payload; used by campaign page to determine presence)
- `getDraft(challengeId)` — returns full `{ nodes, edges, saved_at }` for a single challenge (used by play page on resume)

### localStorage

Key format: `draft:${userId}:${challengeId}`  
Value: `{ nodes, edges, savedAt: string }` (ISO timestamp)

Namespaced by `userId` (from Clerk's `useAuth()`) to prevent cross-user bleed on shared browsers.

A separate restart flag key `restart:${userId}:${challengeId}` is written by the campaign page Restart button and consumed (then cleared) by the play page.

---

## Save Triggers

### localStorage — on canvas edit (debounced)

A `useEffect` in `ChallengeLayout` subscribes to `useArchitectureStore`. After ~1.5s of inactivity following any nodes/edges change, it writes the current canvas to localStorage. Keyed by `activeChallenge.id` and `userId`.

### Supabase — on simulation start

Before launching the sim worker, `saveDraft(challengeId, nodes, edges)` is called. Fire-and-forget (no await, no UI feedback). This ensures the DB draft reflects the architecture the user actually ran, not just something they were editing.

---

## Campaign Page

`CampaignPage` fetches `getMyCompletions()` and `getChallengeDrafts()` in parallel. A `draftMap` is built from the drafts result alongside the existing `completionMap`.

`ChallengeCard` receives a `hasDraft` boolean prop. When `hasDraft` is true:

- The card body (title, narrative, SLA targets, concept tags) is rendered as a non-clickable `div`
- Two buttons are rendered at the card bottom:
  - **Continue** → `href="/play/${id}?resume=true"`
  - **Restart** → sets `restart:${userId}:${challengeId}` in localStorage, then navigates to `/play/${id}`

When `hasDraft` is false, the card remains a single `<Link href="/play/${id}">` as today.

---

## Play Page Resume Logic

The play page (`app/play/[levelId]/page.tsx`) reads `searchParams` for `resume=true`.

### If `?resume=true`:

1. Read localStorage `draft:${userId}:${challengeId}` → `{ nodes, edges, savedAt }`
2. Call `getDraft(challengeId)` → `{ nodes, edges, saved_at }`
3. Compare timestamps — load whichever is more recent via `initFromStarterGraph`
4. Clear any leftover `restart:${userId}:${challengeId}` flag

### If no `?resume=true` (Restart or first visit):

1. Check for `restart:${userId}:${challengeId}` flag
2. If present: clear the localStorage draft and the flag, proceed with starter graph
3. If absent: proceed with starter graph as normal (first-time visit, no draft exists)

The `getDraft` call is async and slots into the existing `ready` state / loading spinner before `setReady(true)` is called. No new loading UI needed.

---

## Edge Cases

- **Guest users** (not signed in): localStorage draft still works within the session. Supabase draft is skipped (`saveDraft` is a no-op for unauthenticated users, matching existing `recordCompletion` behavior). Campaign page shows no Continue/Restart (guests see no completions).
- **Draft exists but challenge has been updated** (e.g. starter graph changed): the draft loads as-is. The user can always Restart if the saved architecture is incompatible.
- **Supabase fetch fails on resume**: fall back to localStorage draft silently. If both fail, fall back to starter graph.
