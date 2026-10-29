import { createAdminClient } from '@/lib/supabase/server'

// Keep-alive heartbeat. Supabase pauses free-tier projects after ~7 days with no
// activity, so a Vercel Cron hits this daily to keep the prod database warm.
// Deliberately independent of the Playwright canary — a liveness ping should not
// depend on a browser matrix that breaks when runner images or test specs drift.
//
// Vercel sends `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set,
// which keeps this route from being a free query endpoint for anyone who finds it.

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  // Cheapest read that still reaches Postgres — primary key lookup, one row.
  const { error } = await createAdminClient()
    .from('profiles')
    .select('id')
    .limit(1)

  if (error) {
    console.error('[keep-alive] Supabase query failed:', error.message)
    return Response.json({ ok: false, error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true, at: new Date().toISOString() })
}
