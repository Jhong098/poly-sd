'use server'

import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/server'
import { COMMUNITY_PUBLISH_MIN_COMPLETIONS } from '@/lib/config'
import type { Challenge } from '@/lib/challenges/types'
import type { ComponentType } from '@/lib/components/definitions'
import type { ComponentNode, ComponentEdge } from '@/lib/store/architectureStore'

// ── Exported types ────────────────────────────────────────────────────────────

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

export type FeedTab = 'hot' | 'new' | 'top'

// ── Internal row shape ────────────────────────────────────────────────────────

type CommunityRow = Record<string, unknown>

// ── rowToChallenge ────────────────────────────────────────────────────────────

/** Converts a DB row into a Challenge object. ID is prefixed with 'community:'. */
export function rowToChallenge(row: CommunityRow): Challenge {
  const allowedRaw = row.allowed_components as string[] | 'all' | null
  const allowedComponents: ComponentType[] | 'all' =
    allowedRaw === 'all' || allowedRaw == null
      ? 'all'
      : (allowedRaw as ComponentType[])

  const trafficConfigRaw = row.traffic_config as {
    durationMs: number
    waypoints: { timeMs: number; rps: number }[]
  }

  return {
    id: `community:${row.id as string}`,
    tier: (row.tier as 0 | 1 | 2 | 3 | 4 | 5) ?? 1,
    order: 0,
    title: row.title as string,
    narrative: row.narrative as string,
    objective: row.objective as string,
    trafficConfig: trafficConfigRaw,
    slaTargets: row.sla_targets as { p99LatencyMs: number; errorRate: number },
    budgetPerHour: row.budget_per_hour as number,
    allowedComponents,
    conceptsTaught: [],
    hints: (row.hints as string[]) ?? [],
    starterNodes: (row.starter_nodes as Challenge['starterNodes']) ?? [],
    starterEdges: (row.starter_edges as Challenge['starterEdges']) ?? [],
  }
}

// ── checkCanPublish ───────────────────────────────────────────────────────────

/** Returns true if the current user has enough passed completions to publish. */
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

// ── publishCommunityChallenge ─────────────────────────────────────────────────

/** Publishes a new community challenge. Returns the new UUID on success. */
export async function publishCommunityChallenge(
  input: PublishInput,
): Promise<{ id: string } | { error: string }> {
  const { userId } = await auth()
  if (!userId) return { error: 'Not authenticated' }

  const canPublish = await checkCanPublish()
  if (!canPublish) return { error: 'Not enough completed challenges to publish' }

  const db = createAdminClient()

  const { data, error } = await db
    .from('community_challenges')
    .insert({
      author_id: userId,
      title: input.title,
      narrative: input.narrative,
      objective: input.objective,
      tier: input.tier,
      sla_targets: input.slaTargets,
      budget_per_hour: input.budgetPerHour,
      allowed_components: input.allowedComponents,
      hints: input.hints,
      starter_nodes: input.nodes,
      starter_edges: input.edges,
      traffic_config: input.trafficConfig,
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  const newId = (data as { id: string }).id

  // Flip is_challenge_author to true only if it's currently false (single unconditional upsert)
  await db
    .from('profiles')
    .update({ is_challenge_author: true })
    .eq('id', userId)
    .eq('is_challenge_author', false)

  return { id: newId }
}

// ── getCommunityChallenge ─────────────────────────────────────────────────────

/** Fetches a single published community challenge by UUID. */
export async function getCommunityChallenge(uuid: string): Promise<Challenge | null> {
  const db = createAdminClient()
  const { data } = await db
    .from('community_challenges')
    .select('*')
    .eq('id', uuid)
    .eq('status', 'published')
    .single()

  if (!data) return null
  return rowToChallenge(data as CommunityRow)
}

// ── getCommunityFeed ──────────────────────────────────────────────────────────

/** Fetches paginated community challenges with author info. */
export async function getCommunityFeed(
  tab: FeedTab,
  page = 0,
  pageSize = 20,
): Promise<CommunityChallengeSummary[]> {
  const db = createAdminClient()

  let query = db
    .from('community_challenges')
    .select(
      'id, author_id, title, narrative, tier, attempt_count, pass_count, upvote_count, published_at, profiles(username, is_challenge_author)',
    )
    .eq('status', 'published')

  if (tab === 'new') {
    query = query.order('published_at', { ascending: false })
  } else if (tab === 'top') {
    query = query.order('upvote_count', { ascending: false })
  } else {
    // hot: upvote_count desc, then attempt_count desc
    query = query
      .order('upvote_count', { ascending: false })
      .order('attempt_count', { ascending: false })
  }

  query = query.range(page * pageSize, (page + 1) * pageSize - 1)

  const { data } = await query
  if (!data) return []

  type FeedRow = {
    id: string
    author_id: string
    title: string
    narrative: string
    tier: number
    attempt_count: number
    pass_count: number
    upvote_count: number
    published_at: string
    profiles: { username: string | null; is_challenge_author: boolean } | { username: string | null; is_challenge_author: boolean }[] | null
  }

  return (data as unknown as FeedRow[]).map((row) => {
    const profile = Array.isArray(row.profiles)
      ? row.profiles[0] ?? null
      : row.profiles
    return {
      id: row.id,
      author_id: row.author_id,
      author_username: profile?.username ?? null,
      author_is_badge: profile?.is_challenge_author ?? false,
      title: row.title,
      narrative: row.narrative,
      tier: row.tier,
      attempt_count: row.attempt_count,
      pass_count: row.pass_count,
      upvote_count: row.upvote_count,
      published_at: row.published_at,
    }
  })
}

// ── upvoteCommunityChallenge ──────────────────────────────────────────────────

/** Toggles an upvote on a community challenge. */
export async function upvoteCommunityChallenge(
  uuid: string,
): Promise<{ upvoteCount: number; upvoted: boolean } | { error: string }> {
  const { userId } = await auth()
  if (!userId) return { error: 'Not authenticated' }

  const db = createAdminClient()

  // Check for an existing upvote
  const { data: existing } = await db
    .from('community_challenge_upvotes')
    .select('id')
    .eq('user_id', userId)
    .eq('challenge_id', uuid)
    .single()

  let upvoted: boolean

  if (existing) {
    // Remove upvote
    const { error: deleteError } = await db
      .from('community_challenge_upvotes')
      .delete()
      .eq('challenge_id', uuid)
      .eq('user_id', userId)
    if (deleteError) return { error: deleteError.message }

    await db.rpc('decrement_community_upvote', { challenge_id: uuid })
    upvoted = false
  } else {
    // Add upvote
    const { error: insertError } = await db
      .from('community_challenge_upvotes')
      .insert({ challenge_id: uuid, user_id: userId })
    if (insertError) return { error: insertError.message }

    await db.rpc('increment_community_upvote', { challenge_id: uuid })
    upvoted = true
  }

  // Fetch updated count
  const { data: updated } = await db
    .from('community_challenges')
    .select('upvote_count')
    .eq('id', uuid)
    .single()

  const upvoteCount = (updated as { upvote_count: number } | null)?.upvote_count ?? 0
  return { upvoteCount, upvoted }
}

// ── incrementAttemptCount ─────────────────────────────────────────────────────

/** Increments the attempt counter for a community challenge. No auth required. */
export async function incrementAttemptCount(uuid: string): Promise<void> {
  const db = createAdminClient()
  await db.rpc('increment_community_attempt', { challenge_id: uuid })
}

// ── incrementPassCount ────────────────────────────────────────────────────────

/** Increments the pass counter for a community challenge. No auth required. */
export async function incrementPassCount(uuid: string): Promise<void> {
  const db = createAdminClient()
  await db.rpc('increment_community_pass', { challenge_id: uuid })
}
