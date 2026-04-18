/**
 * Database migration runner.
 *
 * Usage:
 *   pnpm db:migrate
 *
 * Requires DATABASE_URL in your environment (Supabase → Settings → Database →
 * Connection string → URI mode, with [YOUR-PASSWORD] filled in).
 *
 * How it works:
 *   1. Creates a _migrations table to track applied files.
 *   2. Reads supabase/migrations/*.sql in filename order.
 *   3. Skips files already recorded in _migrations.
 *   4. Applies and records each new file in a transaction.
 */

import { Client } from 'pg'
import * as fs from 'fs'
import * as path from 'path'
import * as url from 'url'

const MIGRATIONS_DIR = path.join(
  path.dirname(url.fileURLToPath(import.meta.url)),
  '../supabase/migrations',
)

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('DATABASE_URL is not set.')
    console.error('Get it from Supabase → Settings → Database → Connection string (URI mode).')
    process.exit(1)
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })
  await client.connect()

  try {
    // Ensure tracking table exists
    await client.query(`
      create table if not exists public._migrations (
        id          text        primary key,
        applied_at  timestamptz not null default now()
      );
    `)

    // Fetch already-applied migrations
    const { rows } = await client.query<{ id: string }>('select id from public._migrations')
    const applied = new Set(rows.map((r) => r.id))

    // Collect and sort migration files
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort()

    let ran = 0
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`  skip  ${file}`)
        continue
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')

      await client.query('begin')
      try {
        await client.query(sql)
        await client.query('insert into public._migrations (id) values ($1)', [file])
        await client.query('commit')
        console.log(`  apply ${file}`)
        ran++
      } catch (err) {
        await client.query('rollback')
        console.error(`  FAIL  ${file}`)
        throw err
      }
    }

    if (ran === 0) {
      console.log('Nothing to migrate.')
    } else {
      console.log(`\nApplied ${ran} migration(s).`)
    }
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
