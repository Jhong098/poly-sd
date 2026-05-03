import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'

// Server-side admin client — uses service role key, bypasses RLS.
// Only call from Server Actions or Route Handlers after verifying Clerk session.
// Wrapped with React cache() so all server actions within the same request
// share one client instance instead of constructing a new one per call.
export const createAdminClient = cache(() =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
)
