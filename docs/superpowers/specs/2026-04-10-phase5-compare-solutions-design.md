# Phase 5 Completion: Compare Solutions

**Date:** 2026-04-10  
**Scope:** Finish Phase 5 social features — compare solutions gallery + ResultsModal link

## What we're building

Two additions that close out Phase 5:

1. A "View Solutions" link in the ResultsModal (shown after passing a challenge)
2. A `/challenge/[id]/solutions` solutions gallery page

PNG export and system design brief auto-generation were explicitly descoped as low ROI given the existing replay viewer.

---

## ResultsModal change

After a player passes a challenge, add a "View Solutions" button in the actions row that navigates to `/challenge/[id]/solutions`. This replaces no existing functionality — it sits alongside the existing Retry / Share / Close / Next buttons.

No thumbnails. Score data already shown in the leaderboard component is sufficient context.

---

## Solutions gallery page: `/challenge/[id]/solutions`

### Route

`app/challenge/[id]/solutions/page.tsx` — server component, fetches top 50 replays for the challenge ordered by score descending.

### Data

Reuses the existing `getLeaderboard` server action from `lib/actions/replays.ts`. Needs a limit increase to 50 (currently capped at 5 for the modal). Add a new export `getSolutions(challengeId, limit)` or just pass `limit=50` to `getLeaderboard`.

Each row has: `id`, `score`, `eval_result` (scores breakdown + metrics), `architecture` (node count), `created_at`.

### Layout

Full-page layout consistent with the existing `/replay/[id]` page style (dark, monospace, `bg-base`).

**Header:** Challenge title, objective, SLA targets — fetched from `CHALLENGE_MAP` client-side or passed as static props.

**Table/list:** Ranked rows, one per solution:

| # | Score | Performance | Cost | Simplicity | Resilience | Nodes | Cost/hr | Date |
|---|-------|-------------|------|------------|------------|-------|---------|------|

- Rank: `#1`, `#2`, etc.
- Score: bold, large
- Score breakdown: small score bars (Performance / Cost / Simplicity / Resilience) — reuse the `ScoreBar` pattern from `ResultsModal` and `ReplayViewer`
- Nodes: count of non-client nodes
- Cost/hr: formatted `$0.XXX/hr`
- Date: short date (`Apr 9`)
- Entire row is a link to `/replay/[id]`

### Empty state

"No solutions yet — be the first!" with a link to `/play/[id]`.

### Auth

Public — no auth required to view. Consistent with replay viewer.

---

## Components

- `app/challenge/[id]/solutions/page.tsx` — new server page
- `components/challenge/SolutionsTable.tsx` — new client component for the ranked list
- `lib/actions/replays.ts` — add `getSolutions` (or parameterize `getLeaderboard`)
- `components/overlays/ResultsModal.tsx` — add "View Solutions" button

No new DB schema needed. Reuses `replays` table.

---

## Out of scope

- Architecture PNG export (descoped)
- System design brief auto-generation (descoped)
- Side-by-side canvas comparison (descoped — replay viewer covers individual viewing)
- Pagination beyond 50 results
