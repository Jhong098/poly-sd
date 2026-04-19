import { test, expect } from '@playwright/test'

// Unauthenticated visitors have no completions, so only tier 0 is unlocked.
// These tests verify the tier-locking UI without requiring a real user account.

test.describe('Campaign tier locking', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/campaign')
    // Wait for the tier sections to be rendered
    await page.waitForSelector('[data-testid="tier-section-0"]', { timeout: 10_000 })
  })

  test('tier 0 is always unlocked and shows completion progress', async ({ page }) => {
    const tier0 = page.locator('[data-testid="tier-section-0"]')
    const status = tier0.locator('[data-testid="tier-status"]')
    // Status shows "N/M completed", not "locked"
    await expect(status).not.toHaveText('locked')
    await expect(status).toContainText('completed')
  })

  test('tier 1 is locked when no tier-0 challenges are passed', async ({ page }) => {
    const tier1 = page.locator('[data-testid="tier-section-1"]')
    const status = tier1.locator('[data-testid="tier-status"]')
    await expect(status).toHaveText('locked')
  })

  test('higher tiers are all locked when tier 0 is not complete', async ({ page }) => {
    for (const tierId of [1, 2, 3, 4, 5]) {
      const section = page.locator(`[data-testid="tier-section-${tierId}"]`)
      if (await section.count() === 0) continue
      const status = section.locator('[data-testid="tier-status"]')
      await expect(status).toHaveText('locked')
    }
  })

  test('locked cards have no Play or Continue links', async ({ page }) => {
    const lockedCards = page.locator('[data-testid="challenge-card-locked"]')
    await expect(lockedCards).not.toHaveCount(0)
    // None of the locked cards should contain a Play or Continue link
    const count = await lockedCards.count()
    for (let i = 0; i < count; i++) {
      const card = lockedCards.nth(i)
      await expect(card.getByRole('link', { name: /play|continue|view solution/i })).toHaveCount(0)
    }
  })

  test('tier-0 cards are playable (have a Play link)', async ({ page }) => {
    const tier0 = page.locator('[data-testid="tier-section-0"]')
    // At least one Play link must exist in the unlocked tier
    await expect(tier0.getByRole('link', { name: /play/i }).first()).toBeVisible()
  })
})
