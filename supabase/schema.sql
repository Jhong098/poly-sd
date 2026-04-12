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

-- ── Replays ──────────────────────────────────────────────────────────────────
-- One row per shared replay. challenge_id is null for sandbox shares.
-- user_id is null when a guest (tutorial) shares.

create table if not exists public.replays (
  id           uuid        primary key default gen_random_uuid(),
  user_id      text        references public.profiles(id) on delete set null,
  challenge_id text,
  architecture jsonb       not null default '{}',
  eval_result  jsonb       not null default '{}',
  score        integer     not null default 0,
  is_public    boolean     not null default true,
  created_at   timestamptz not null default now()
);

-- Fast leaderboard queries: top scores per challenge
create index if not exists replays_challenge_score_idx
  on public.replays(challenge_id, score desc)
  where is_public = true;

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

-- Replays: public replays readable by anyone
alter table public.replays enable row level security;
create policy "replays_select" on public.replays
  for select using (is_public = true);

-- ── Helper functions ──────────────────────────────────────────────────────────

-- Atomic XP increment called from server actions
create or replace function public.increment_xp(user_id_input text, amount integer)
returns void language sql security definer as $$
  update public.profiles
  set xp = xp + amount, updated_at = now()
  where id = user_id_input;
$$;

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
