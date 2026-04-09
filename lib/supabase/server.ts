import { createClient } from '@supabase/supabase-js'

// Server-side admin client — uses service role key, bypasses RLS.
// Only call from Server Actions or Route Handlers after verifying Clerk session.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}
