# Community Challenge Submissions — Design

**Date:** 2026-04-12
**Phase:** 7
**Status:** Approved

---

## Overview

Players can author and publish their own challenges directly from the sandbox canvas. Community challenges are discoverable via a minimal `/community` feed and played using the existing play page infrastructure.

---

## Data Model

### New table: `community_challenges`

```sql
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

create index if not exists community_challenges_status_upvotes_idx
  on public.community_challenges(status, upvote_count desc)
  where status = 'published';

create index if not exists community_challenges_status_published_at_idx
  on public.community_challenges(status, published_at desc)
  where status = 'published';
```

### New table: `community_challenge_upvotes`

```sql
create table if not exists public.community_challenge_upvotes (
  challenge_id  uuid  not null references public.community_challenges(id) on delete cascade,
  user_id       text  not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (challenge_id, user_id)
);
```

### Migration: `profiles`

```sql
alter table public.profiles
  add column if not exists is_challenge_author boolean not null default false;
```

---

## Configuration

A single constant controls the publish gate:

```ts
// lib/config.ts
export const COMMUNITY_PUBLISH_MIN_COMPLETIONS = 10
```

Checked server-side at publish time. Change the value to raise or lower the quality floor without touching gating logic.

---

## Creation Flow

Creators never leave the canvas. The full flow:

1. **Build on `/sandbox`** — creator uses the existing sandbox canvas to construct their challenge architecture (intentionally flawed or difficult).
2. **Run the sim** — creator verifies the architecture fails or barely passes the intended SLA. This confirms the challenge is interesting.
3. **"Publish as Challenge" button** — visible in the canvas toolbar only to users with ≥ `COMMUNITY_PUBLISH_MIN_COMPLETIONS` campaign completions. Grayed out with tooltip for ineligible users.
4. **Publish wizard (modal, 4 steps):**
   - **Step 1 — Identity:** Title, narrative (story framing), objective (1–2 sentences).
   - **Step 2 — SLA Targets:** p99 latency (ms), error rate, budget/hr. Pre-filled with suggestions derived from the current sim result — creator adjusts to set the actual target.
   - **Step 3 — Constraints:** Tier (1–5, creator-declared difficulty), allowed components (default: all), optional hints (up to 3 strings).
   - **Step 4 — Preview & Publish:** Renders the challenge brief exactly as players will see it. Creator clicks Publish → row saved to `community_challenges` with `status: 'published'`, `published_at: now()`.
5. **Starter state** — current canvas nodes and edges captured automatically at publish time and stored as `starter_nodes` / `starter_edges`.

**Chaos events:** descoped from v1. Creators achieve difficulty through architecture design alone.

---

## Discovery — `/community`

A minimal feed page with three tabs:

| Tab | Sort |
|-----|------|
| Hot | `(upvote_count * 10 + attempt_count) / age_hours^1.5` |
| New | `published_at desc` |
| Top | `upvote_count desc` |

Each card displays:
- Title + narrative snippet (truncated to 2 lines)
- Creator username + Challenge Author badge (if applicable)
- Tier badge, attempt count, pass rate (`pass_count / attempt_count`), upvote count
- "Play" button → `/community/[id]`

Pagination: 20 cards per page, "Load more" button.

**Nav:** "Community" link added to `SiteNav` between Campaign and Leaderboard.

---

## Playing a Community Challenge

`/community/[id]` fetches the row from `community_challenges`, deserializes it into the existing `Challenge` TypeScript shape, and renders the standard play page — no changes to the canvas, sim engine, or metrics panel.

**Challenge ID convention:** completions recorded in `challenge_completions` with `challenge_id = 'community:<uuid>'` to avoid collisions with campaign IDs.

**On sim completion:**
- Score + pass/fail saved to `challenge_completions` as normal.
- `attempt_count` atomically incremented (always).
- `pass_count` atomically incremented if passed.
- Upvote button shown on the completion screen. One tap → row in `community_challenge_upvotes`, `upvote_count` incremented. Idempotent (PK constraint).

---

## Creator Badge

**Earning:** `profiles.is_challenge_author` flipped to `true` server-side on first successful publish. One-time, permanent.

**Display locations:**
- **Profile page** — badge next to username in the header: `⬡ Challenge Author` in cyan.
- **Community feed cards** — inline next to creator username.
- **Leaderboard entries** — inline next to username.

---

## What's Not in v1

- Chaos events in community challenges
- Challenge editing after publish
- Creator analytics (views, completion funnel)
- Filters/search on the community feed
- Reporting / flagging bad challenges
- XP rewards for creators

These are natural Phase 7 follow-ons once there's real community content to iterate on.
