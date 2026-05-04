'use server'

import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getOrCreateProfile } from './profile'
import { xpForCompletion } from '@/lib/xp'
import { CHALLENGE_MAP } from '@/lib/challenges/definitions'
import type { EvalResult } from '@/lib/challenges/types'
import type { ComponentNode, ComponentEdge } from '@/lib/store/architectureStore'

export type CompletionRow = {
  id: string
  challenge_id: string
  passed: boolean
  score: number
  metrics: EvalResult['metrics']
  completed_at: string
}

/**
 * Record a challenge completion. Upserts on (user, challenge) — only
 * persists if this is the first attempt or a higher score. Awards XP on pass.
 */
export async function recordCompletion(
  challengeId: string,
  result: EvalResult,
  nodes: ComponentNode[],
  edges: ComponentEdge[],
): Promise<void> {
  const { userId } = await auth()
  if (!userId) return  // guests (tutorial levels) — just don't persist

  await getOrCreateProfile()
  const db = createAdminClient()

  // Check for existing completion to avoid overwriting a better score
  const { data: existing } = await db
    .from('challenge_completions')
    .select('id, score, passed')
    .eq('user_id', userId)
    .eq('challenge_id', challengeId)
    .single()

  const existingRow = existing as { id: string; score: number; passed: boolean } | null
  const existingScore = existingRow?.score ?? -1
  // Only skip if existing record already passed with equal or better score
  if (existingRow?.passed && existingScore >= result.scores.total) return

  const challenge = CHALLENGE_MAP.get(challengeId)
  const tier = challenge?.tier ?? 1

  const { error: upsertError } = await db.from('challenge_completions').upsert(
    {
      user_id: userId,
      challenge_id: challengeId,
      passed: result.passed,
      score: result.scores.total,
      metrics: result.metrics,
      architecture_snapshot: { nodes, edges },
      completed_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,challenge_id' },
  )
  if (upsertError) throw new Error(`recordCompletion upsert failed: ${upsertError.message}`)

  if (!result.passed) return

  // Award XP on first successful pass (even if they had a prior failed attempt)
  const isFirstPass = !existingRow?.passed
  const xpGained = isFirstPass ? xpForCompletion(tier, result.scores.total) : 0
  if (xpGained <= 0) return

  await db.rpc('increment_xp', { user_id_input: userId, amount: xpGained })
}

export type LeaderboardEntry = {
  rank: number
  username: string | null
  score: number
  completed_at: string
}

/** Fetch top 25 passed completions for a challenge (public leaderboard). */
export async function getLeaderboard(challengeId: string): Promise<LeaderboardEntry[]> {
  let db: ReturnType<typeof createAdminClient>
  try { db = createAdminClient() } catch { return [] }
  const { data } = await db
    .from('challenge_completions')
    .select('score, completed_at, profiles(username)')
    .eq('challenge_id', challengeId)
    .eq('passed', true)
    .order('score', { ascending: false })
    .limit(25)

  if (!data) return []

  type Row = { score: number; completed_at: string; profiles: { username: string | null }[] | null }
  return (data as unknown as Row[]).map((row, i) => ({
    rank: i + 1,
    username: (Array.isArray(row.profiles) ? row.profiles[0]?.username : (row.profiles as { username: string | null } | null)?.username) ?? null,
    score: row.score,
    completed_at: row.completed_at,
  }))
}

/** Fetch all completions for the current user. */
export async function getMyCompletions(): Promise<CompletionRow[]> {
  const { userId } = await auth()
  if (!userId) return []

  const db = createAdminClient()
  const { data } = await db
    .from('challenge_completions')
    .select('id, challenge_id, passed, score, metrics, completed_at')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })

  return (data ?? []) as CompletionRow[]
}
