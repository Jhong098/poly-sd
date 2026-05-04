import { test, expect } from '@playwright/test'

/**
 * E2E tests for the community feed page (/community).
 *
 * The page is server-rendered with no auth requirement for read access.
 * In the test environment the DB is empty so the empty-state branch is
 * exercised; structural tests (nav, tabs, create button) run regardless.
 */

test.describe('Community feed', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/community')
    await page.waitForLoadState('networkidle')
  })

  test('renders the page heading and description', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Community Challenges' })).toBeVisible()
    await expect(page.getByText('Player-created challenges rated by the community.')).toBeVisible()
  })

  test('shows all three feed tabs', async ({ page }) => {
    await expect(page.locator('[data-testid="community-tab-hot"]')).toBeVisible()
    await expect(page.locator('[data-testid="community-tab-new"]')).toBeVisible()
    await expect(page.locator('[data-testid="community-tab-top"]')).toBeVisible()
  })

  test('hot tab is active by default', async ({ page }) => {
    const hotTab = page.locator('[data-testid="community-tab-hot"]')
    // Active tab has the cyan colour applied via Tailwind (border-cyan)
    await expect(hotTab).toHaveClass(/border-cyan/)
    await expect(hotTab).toHaveClass(/text-cyan/)
  })

  test('clicking New tab updates URL query param', async ({ page }) => {
    await page.locator('[data-testid="community-tab-new"]').click()
    await expect(page).toHaveURL(/[?&]tab=new/)
    await expect(page.locator('[data-testid="community-tab-new"]')).toHaveClass(/border-cyan/)
  })

  test('clicking Top tab updates URL query param', async ({ page }) => {
    await page.locator('[data-testid="community-tab-top"]').click()
    await expect(page).toHaveURL(/[?&]tab=top/)
    await expect(page.locator('[data-testid="community-tab-top"]')).toHaveClass(/border-cyan/)
  })

  test('navigating directly to ?tab=top activates the Top tab', async ({ page }) => {
    await page.goto('/community?tab=top')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-testid="community-tab-top"]')).toHaveClass(/border-cyan/)
  })

  test('Create button links to /community/create', async ({ page }) => {
    const createLink = page.getByRole('link', { name: /create/i })
    await expect(createLink).toBeVisible()
    await expect(createLink).toHaveAttribute('href', '/community/create')
  })

  test('shows empty state when no challenges exist', async ({ page }) => {
    // Only one of empty-state or feed is rendered at a time
    const empty = page.locator('[data-testid="community-empty-state"]')
    const feed = page.locator('[data-testid="community-feed"]')
    const hasEmpty = await empty.count()
    const hasFeed = await feed.count()
    // Exactly one must be present
    expect(hasEmpty + hasFeed).toBe(1)
    if (hasEmpty) {
      await expect(empty).toContainText('No community challenges yet')
    }
  })

  test('challenge cards show tier badge, title, and Play link when feed is non-empty', async ({ page }) => {
    const feed = page.locator('[data-testid="community-feed"]')
    if (await feed.count() === 0) {
      // Empty DB in test environment — skip card-level assertions
      test.skip()
      return
    }
    const firstCard = page.locator('[data-testid="community-challenge-card"]').first()
    await expect(firstCard.getByRole('link', { name: /play/i })).toBeVisible()
    // Tier badge starts with 'T'
    await expect(firstCard.locator('div').filter({ hasText: /^T\d$/ }).first()).toBeVisible()
  })
})
