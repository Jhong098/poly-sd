'use server'

import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getOrCreateProfile } from './profile'
import type { ComponentNode, ComponentEdge } from '@/lib/store/architectureStore'

export type SavedArchitecture = {
  id: string
  name: string
  nodes: ComponentNode[]
  edges: ComponentEdge[]
  updated_at: string
}

/** Save (or update) a named architecture. Returns the saved row. */
export async function saveArchitecture(
  name: string,
  nodes: ComponentNode[],
  edges: ComponentEdge[],
  existingId?: string,
): Promise<SavedArchitecture> {
  const { userId } = await auth()
  if (!userId) throw new Error('Not signed in')

  await getOrCreateProfile()
  const db = createAdminClient()

  if (existingId) {
    const { data, error } = await db
      .from('architectures')
      .update({ name, nodes, edges, updated_at: new Date().toISOString() })
      .eq('id', existingId)
      .eq('user_id', userId)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data as unknown as SavedArchitecture
  }

  const { data, error } = await db
    .from('architectures')
    .insert({ user_id: userId, name, nodes, edges })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as unknown as SavedArchitecture
}

/** List all saved architectures for the current user. */
export async function listArchitectures(): Promise<SavedArchitecture[]> {
  const { userId } = await auth()
  if (!userId) return []

  const db = createAdminClient()
  const { data } = await db
    .from('architectures')
    .select('id, name, nodes, edges, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  return (data ?? []) as unknown as SavedArchitecture[]
}

/** Delete an architecture. */
export async function deleteArchitecture(id: string): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Not signed in')

  const db = createAdminClient()
  await db.from('architectures').delete().eq('id', id).eq('user_id', userId)
}
