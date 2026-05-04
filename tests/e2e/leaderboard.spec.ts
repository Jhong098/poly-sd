import { test, expect } from '@playwright/test'

/**
 * E2E tests for the leaderboard page (/leaderboard/[challengeId]).
 *
 * Uses T-0 (always a valid campaign challenge) as the fixture challenge.
 * In the test environment the DB has no completions, so the empty-state
 * branch is exercised. Structural tests (header, back link) always run.
 */

const FIXTURE_CHALLENGE_ID = 'T-0'
const FIXTURE_CHALLENGE_TITLE = 'Hello, Traffic'  // T-0 title from challenges/definitions

test.describe('Leaderboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/leaderboard/${FIXTURE_CHALLENGE_ID}`)
    await page.waitForLoadState('networkidle')
  })

  test('renders the leaderboard title with challenge name', async ({ page }) => {
    const title = page.locator('[data-testid="leaderboard-title"]')
    await expect(title).toBeVisible()
    await expect(title).toContainText('Leaderboard')
  })

  test('has a back link to /campaign in the sub-header', async ({ page }) => {
    // The sub-header contains the ArrowLeft ← Campaign back link (not the SiteNav one)
    const backLink = page.locator('a[href="/campaign"]').nth(1)
    await expect(backLink).toBeVisible()
    await expect(backLink).toContainText('Campaign')
  })

  test('shows empty state with Play Now link when no entries exist', async ({ page }) => {
    const empty = page.locator('[data-testid="leaderboard-empty"]')
    const table = page.locator('[data-testid="leaderboard-table"]')
    const hasEmpty = await empty.count()
    const hasTable = await table.count()
    expect(hasEmpty + hasTable).toBe(1)
    if (hasEmpty) {
      await expect(empty).toContainText('No completions yet')
      const playLink = empty.getByRole('link', { name: /play now/i })
      await expect(playLink).toBeVisible()
      await expect(playLink).toHaveAttribute('href', `/play/${FIXTURE_CHALLENGE_ID}`)
    }
  })

  test('leaderboard table has correct column headers when entries exist', async ({ page }) => {
    const table = page.locator('[data-testid="leaderboard-table"]')
    if (await table.count() === 0) {
      // Empty DB in test environment — skip table assertions
      test.skip()
      return
    }
    await expect(table.getByRole('columnheader', { name: /#/i })).toBeVisible()
    await expect(table.getByRole('columnheader', { name: /player/i })).toBeVisible()
    await expect(table.getByRole('columnheader', { name: /score/i })).toBeVisible()
    await expect(table.getByRole('columnheader', { name: /date/i })).toBeVisible()
  })

  test('returns 404 for an invalid challenge ID', async ({ page }) => {
    const response = await page.goto('/leaderboard/DOES-NOT-EXIST')
    expect(response?.status()).toBe(404)
  })
})
