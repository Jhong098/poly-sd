/**
 * Playwright global setup — creates an authenticated session for tests that need it.
 *
 * Requires env vars:
 *   E2E_USER_EMAIL    — Clerk account email
 *   E2E_USER_PASSWORD — Clerk account password
 *
 * If vars are absent, writes an empty storage-state file so storageState option
 * doesn't throw, but authenticated tests will redirect to /sign-in and fail clearly.
 *
 * The auth file is gitignored. Delete it to force a fresh sign-in on next run.
 */
import { chromium } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

export const AUTH_FILE = path.join(__dirname, '.auth', 'user.json')

export default async function globalSetup() {
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })

  if (fs.existsSync(AUTH_FILE)) return   // reuse existing session

  const email = process.env.E2E_USER_EMAIL
  const password = process.env.E2E_USER_PASSWORD

  if (!email || !password) {
    fs.writeFileSync(AUTH_FILE, JSON.stringify({ cookies: [], origins: [] }))
    console.warn(
      '\n[global-setup] E2E_USER_EMAIL / E2E_USER_PASSWORD not set.\n' +
      '              Authenticated tests (community-create.spec.ts) will be skipped.\n',
    )
    return
  }

  const browser = await chromium.launch()
  const context = await browser.newContext({ baseURL: 'http://localhost:3000' })
  const page = await context.newPage()

  await page.goto('/sign-in')
  await page.locator('input[name="identifier"]').fill(email)
  await page.getByRole('button', { name: /continue/i }).click()
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: /continue/i }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/sign-in'), { timeout: 20_000 })

  await context.storageState({ path: AUTH_FILE })
  await browser.close()
}
