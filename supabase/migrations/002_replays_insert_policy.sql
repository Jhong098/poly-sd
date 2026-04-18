-- Allow anyone (including guests) to insert replays.
-- The table already has a SELECT policy; this adds the missing INSERT side.
-- Guests sharing sandbox replays have user_id = null, which is intentional per schema design.
drop policy if exists "replays_insert" on public.replays;
create policy "replays_insert" on public.replays
  for insert with check (true);
