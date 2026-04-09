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
    .select('id, score')
    .eq('user_id', userId)
    .eq('challenge_id', challengeId)
    .single()

  const existingScore = (existing as { id: string; score: number } | null)?.score ?? -1
  if (existingScore >= result.scores.total) return

  const challenge = CHALLENGE_MAP.get(challengeId)
  const tier = challenge?.tier ?? 1

  await db.from('challenge_completions').upsert(
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

  if (!result.passed) return

  // Award XP: incremental (new score - old score contribution)
  const isFirstPass = existingScore < 0
  const xpGained = isFirstPass ? xpForCompletion(tier, result.scores.total) : 0
  if (xpGained <= 0) return

  // Fetch current XP then update
  const { data: prof } = await db.from('profiles').select('xp').eq('id', userId).single()
  const currentXp = (prof as { xp: number } | null)?.xp ?? 0
  await db.from('profiles')
    .update({ xp: currentXp + xpGained, updated_at: new Date().toISOString() })
    .eq('id', userId)
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
