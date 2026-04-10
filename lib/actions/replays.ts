'use server'

import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/server'
import type { EvalResult } from '@/lib/challenges/types'
import type { ComponentNode, ComponentEdge } from '@/lib/store/architectureStore'

export type ReplayRow = {
  id: string
  user_id: string | null
  challenge_id: string | null
  architecture: { nodes: ComponentNode[]; edges: ComponentEdge[] }
  eval_result: EvalResult
  score: number
  created_at: string
}

export type LeaderboardEntry = {
  id: string
  score: number
  user_id: string | null
  architecture: { nodes: ComponentNode[]; edges: ComponentEdge[] }
  eval_result: EvalResult
  created_at: string
}

/** Create a replay record and return its public ID. */
export async function createReplay(
  challengeId: string | null,
  nodes: ComponentNode[],
  edges: ComponentEdge[],
  evalResult: EvalResult,
): Promise<{ id: string } | { error: string }> {
  const { userId } = await auth()
  const db = createAdminClient()

  const { data, error } = await db
    .from('replays')
    .insert({
      user_id: userId ?? null,
      challenge_id: challengeId,
      architecture: { nodes, edges },
      eval_result: evalResult,
      score: evalResult.scores.total,
      is_public: true,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('createReplay error:', error)
    return { error: 'Failed to save replay' }
  }

  return { id: (data as { id: string }).id }
}

/** Fetch a single replay by ID. */
export async function getReplay(id: string): Promise<ReplayRow | null> {
  const db = createAdminClient()

  const { data, error } = await db
    .from('replays')
    .select('id, user_id, challenge_id, architecture, eval_result, score, created_at')
    .eq('id', id)
    .eq('is_public', true)
    .single()

  if (error || !data) return null
  return data as unknown as ReplayRow
}

/** Top N public replays for a challenge, ordered by score desc. */
export async function getLeaderboard(
  challengeId: string,
  limit = 5,
): Promise<LeaderboardEntry[]> {
  const db = createAdminClient()

  const { data, error } = await db
    .from('replays')
    .select('id, score, user_id, architecture, eval_result, created_at')
    .eq('challenge_id', challengeId)
    .eq('is_public', true)
    .order('score', { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return data as unknown as LeaderboardEntry[]
}

