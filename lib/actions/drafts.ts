'use server'

import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/server'
import type { ComponentNode, ComponentEdge } from '@/lib/store/architectureStore'

export type DraftSummary = {
  challenge_id: string
  saved_at: string
}

export type DraftRow = {
  nodes: ComponentNode[]
  edges: ComponentEdge[]
  saved_at: string
}

/** Upsert the draft canvas for the current user + challenge. Call fire-and-forget. */
export async function saveDraft(
  challengeId: string,
  nodes: ComponentNode[],
  edges: ComponentEdge[],
): Promise<void> {
  const { userId } = await auth()
  if (!userId) return

  const db = createAdminClient()
  await db.from('challenge_drafts').upsert(
    {
      user_id: userId,
      challenge_id: challengeId,
      nodes,
      edges,
      saved_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,challenge_id' },
  )
}

/** Return challenge_id + saved_at for every draft the current user has. No payload. */
export async function getChallengeDrafts(): Promise<DraftSummary[]> {
  const { userId } = await auth()
  if (!userId) return []

  const db = createAdminClient()
  const { data, error } = await db
    .from('challenge_drafts')
    .select('challenge_id, saved_at')
    .eq('user_id', userId)

  if (error) {
    console.error('getChallengeDrafts error:', error)
    return []
  }
  return (data ?? []) as DraftSummary[]
}

/** Fetch the full draft (nodes + edges + saved_at) for a single challenge. */
export async function getDraft(challengeId: string): Promise<DraftRow | null> {
  const { userId } = await auth()
  if (!userId) return null

  const db = createAdminClient()
  const { data } = await db
    .from('challenge_drafts')
    .select('nodes, edges, saved_at')
    .eq('user_id', userId)
    .eq('challenge_id', challengeId)
    .single()

  return (data as DraftRow) ?? null
}
