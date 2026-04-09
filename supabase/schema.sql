-- Run this in the Supabase SQL editor to set up the Poly-SD schema.

-- ── Profiles ──────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id          text        primary key,          -- Clerk userId (e.g. user_2abc...)
  email       text,
  username    text,
  xp          integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Architectures ─────────────────────────────────────────────────────────────

create table if not exists public.architectures (
  id          uuid        primary key default gen_random_uuid(),
  user_id     text        not null references public.profiles(id) on delete cascade,
  name        text        not null default 'Untitled',
  nodes       jsonb       not null default '[]',
  edges       jsonb       not null default '[]',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists architectures_user_id_idx on public.architectures(user_id);

-- ── Challenge completions ─────────────────────────────────────────────────────
-- One row per (user, challenge). Upsert keeps the best score.

create table if not exists public.challenge_completions (
  id                    uuid        primary key default gen_random_uuid(),
  user_id               text        not null references public.profiles(id) on delete cascade,
  challenge_id          text        not null,
  passed                boolean     not null,
  score                 integer     not null default 0,
  metrics               jsonb       not null default '{}',
  architecture_snapshot jsonb,
  completed_at          timestamptz not null default now(),
  constraint unique_user_challenge unique (user_id, challenge_id)
);

create index if not exists challenge_completions_user_id_idx on public.challenge_completions(user_id);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- All mutations go through the service role (server actions), so RLS is mainly
-- a safety net. SELECT is open so profiles can be read for leaderboards later.

alter table public.profiles             enable row level security;
alter table public.architectures        enable row level security;
alter table public.challenge_completions enable row level security;

-- Profiles: anyone can read, only the service role can write (no user policy needed)
create policy "profiles_select" on public.profiles for select using (true);

-- Architectures: users read their own
create policy "architectures_select" on public.architectures
  for select using (true);   -- broaden to user_id = auth.uid() if using anon key

-- Completions: users read their own
create policy "completions_select" on public.challenge_completions
  for select using (true);

-- ── Helper functions ──────────────────────────────────────────────────────────

-- Atomic XP increment called from server actions
create or replace function public.increment_xp(user_id_input text, amount integer)
returns void language sql security definer as $$
  update public.profiles
  set xp = xp + amount, updated_at = now()
  where id = user_id_input;
$$;
