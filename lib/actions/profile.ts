'use server'

import { auth, currentUser } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/server'

export type ProfileRow = {
  id: string
  email: string | null
  username: string | null
  xp: number
  is_challenge_author: boolean
  created_at: string
  updated_at: string
}

/** Fetch or create the profile for the current user. */
export async function getOrCreateProfile(): Promise<ProfileRow | null> {
  const { userId } = await auth()
  if (!userId) return null

  const db = createAdminClient()

  const { data: existing } = await db
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (existing) return existing as ProfileRow

  // First sign-in — create profile
  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress ?? null
  const username = user?.username ?? user?.firstName ?? null

  const { data: created, error } = await db
    .from('profiles')
    .insert({ id: userId, email, username })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return created as ProfileRow
}

/** Get a profile by userId (for server component use). */
export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const db = createAdminClient()
  const { data } = await db.from('profiles').select('*').eq('id', userId).single()
  return (data as ProfileRow) ?? null
}
