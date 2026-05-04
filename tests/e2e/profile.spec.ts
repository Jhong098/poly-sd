import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import { AUTH_FILE } from './global-setup'

/**
 * E2E tests for the profile page (/profile).
 *
 * Unauthenticated tests run always. Authenticated tests require a persisted
 * Clerk session (E2E_USER_EMAIL + E2E_USER_PASSWORD set, then `pnpm test:e2e`
 * run once to seed AUTH_FILE).
 */

function hasValidAuth(): boolean {
  if (!fs.existsSync(AUTH_FILE)) return false
  try {
    const state = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'))
    return Array.isArray(state.cookies) && state.cookies.length > 0
  } catch {
    return false
  }
}

// ── Unauthenticated ───────────────────────────────────────────────────────────

test.describe('Profile — unauthenticated', () => {
  test('redirects to /sign-in when not logged in', async ({ page }) => {
    await page.goto('/profile')
    await page.waitForURL(/\/sign-in/, { timeout: 10_000 })
    expect(page.url()).toContain('/sign-in')
  })
})

// ── Authenticated ─────────────────────────────────────────────────────────────

test.describe('Profile — authenticated', () => {
  let authAvailable = false

  test.beforeAll(() => {
    authAvailable = hasValidAuth()
  })

  test.beforeEach(async ({ page }) => {
    if (!authAvailable) {
      test.skip()
      return
    }
    // Load persisted Clerk session
    await page.context().addCookies(
      JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8')).cookies,
    )
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')
  })

  test('shows the XP progress section', async ({ page }) => {
    await expect(page.locator('[data-testid="profile-xp-section"]')).toBeVisible()
    await expect(page.locator('[data-testid="profile-xp-section"]')).toContainText('XP')
  })

  test('shows the stats grid with Completed, Attempted, and Best Score', async ({ page }) => {
    const stats = page.locator('[data-testid="profile-stats"]')
    await expect(stats).toBeVisible()
    await expect(stats).toContainText('Completed')
    await expect(stats).toContainText('Attempted')
    await expect(stats).toContainText('Best Score')
  })

  test('shows the completion history section', async ({ page }) => {
    await expect(page.locator('[data-testid="profile-history"]')).toBeVisible()
  })

  test('empty history state shows a link to Campaign', async ({ page }) => {
    const empty = page.locator('[data-testid="profile-history-empty"]')
    if (await empty.count() === 0) {
      // User has completions — skip empty-state assertion
      test.skip()
      return
    }
    await expect(empty).toContainText('No completions yet')
    await expect(empty.getByRole('link', { name: /go to campaign/i })).toHaveAttribute('href', '/campaign')
  })

  test('level title and level number are displayed in the header', async ({ page }) => {
    // Header shows level title and "Level N"
    await expect(page.getByText(/Level \d+/)).toBeVisible()
  })
})
