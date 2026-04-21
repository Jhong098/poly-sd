/**
 * E2E tests for the community challenge creation flow.
 *
 * The flow has two phases:
 *   1. Setup form — collects title, narrative, objective, tier, hints
 *   2. Canvas + publish wizard — SLA targets → preview (2-step wizard)
 *
 * Auth:
 *   The /community/create route requires Clerk auth (server-side).
 *   Authenticated tests use the storageState written by global-setup.ts.
 *   If no credentials were provided, auth state is empty and authenticated
 *   tests skip themselves via beforeAll.
 *
 * Setup: set E2E_USER_EMAIL + E2E_USER_PASSWORD, then run `pnpm test:e2e` once
 *        to persist the session. Subsequent runs reuse it automatically.
 */
import { test, expect, type Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { AUTH_FILE } from './global-setup'

// ── Helpers ────────────────────────────────────────────────────────────────────

async function fillSetupForm(
  page: Page,
  data: { title: string; narrative: string; objective: string },
) {
  await page.fill('#setup-title', data.title)
  await page.fill('#setup-narrative', data.narrative)
  await page.fill('#setup-objective', data.objective)
}

async function dropOntoCanvas(page: Page, componentType: string) {
  await page.evaluate((type) => {
    const renderer = document.querySelector('.react-flow__renderer')
    if (!renderer) throw new Error('.react-flow__renderer not found')
    const rect = renderer.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const dt = new DataTransfer()
    dt.setData('componentType', type)
    renderer.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt, clientX: x, clientY: y }))
    renderer.dispatchEvent(new DragEvent('drop',     { bubbles: true, cancelable: true, dataTransfer: dt, clientX: x, clientY: y }))
  }, componentType)
}

function hasValidAuth(): boolean {
  if (!fs.existsSync(AUTH_FILE)) return false
  try {
    const state = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'))
    return Array.isArray(state.cookies) && state.cookies.length > 0
  } catch {
    return false
  }
}

// ── Unauthenticated ────────────────────────────────────────────────────────────

test.describe('Unauthenticated', () => {
  test('redirects to /sign-in', async ({ page }) => {
    await page.goto('/community/create')
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 10_000 })
  })
})

// ── Authenticated: setup form ──────────────────────────────────────────────────

test.describe('Setup form phase', () => {
  test.use({ storageState: AUTH_FILE })

  test.beforeAll(async () => {
    if (!hasValidAuth()) {
      // eslint-disable-next-line playwright/no-skipped-test
      test.skip()
    }
  })

  test.beforeEach(async ({ page }) => {
    await page.goto('/community/create')
    await page.waitForSelector('#setup-title', { timeout: 10_000 })
  })

  test('shows setup form, not the canvas', async ({ page }) => {
    await expect(page.locator('#setup-title')).toBeVisible()
    await expect(page.locator('.react-flow__renderer')).not.toBeVisible()
  })

  test('"Start Building" is disabled until all required fields have content', async ({ page }) => {
    const cta = page.getByRole('button', { name: /start building/i })

    await expect(cta).toBeDisabled()

    await page.fill('#setup-title', 'My Challenge')
    await expect(cta).toBeDisabled()

    await page.fill('#setup-narrative', 'A server is struggling under peak load.')
    await expect(cta).toBeDisabled()

    await page.fill('#setup-objective', 'Keep p99 under 200ms.')
    await expect(cta).toBeEnabled()
  })

  test('"Start Building" re-disables if a required field is cleared', async ({ page }) => {
    await fillSetupForm(page, {
      title: 'My Challenge',
      narrative: 'Traffic is spiking.',
      objective: 'Keep p99 under 200ms.',
    })
    const cta = page.getByRole('button', { name: /start building/i })
    await expect(cta).toBeEnabled()

    await page.fill('#setup-title', '')
    await expect(cta).toBeDisabled()
  })

  test('transitions to the canvas after form submission', async ({ page }) => {
    await fillSetupForm(page, {
      title: 'Scale This',
      narrative: 'Traffic is spiking at checkout.',
      objective: 'Keep p99 latency under 200ms.',
    })
    await page.getByRole('button', { name: /start building/i }).click()
    await page.waitForSelector('.react-flow__renderer', { timeout: 10_000 })

    await expect(page.locator('.react-flow__renderer')).toBeVisible()
    // Setup form should be gone
    await expect(page.locator('#setup-title')).not.toBeVisible()
  })

  test('canvas shows "Publish Challenge" button (disabled before sim)', async ({ page }) => {
    await fillSetupForm(page, {
      title: 'Scale This',
      narrative: 'Traffic is spiking.',
      objective: 'Keep p99 under 200ms.',
    })
    await page.getByRole('button', { name: /start building/i }).click()
    await page.waitForSelector('.react-flow__renderer', { timeout: 10_000 })

    const publishBtn = page.getByRole('button', { name: /publish challenge/i })
    await expect(publishBtn).toBeVisible()
    await expect(publishBtn).toBeDisabled()
  })
})

// ── Authenticated: publish wizard ──────────────────────────────────────────────

test.describe('Publish wizard phase', () => {
  test.use({ storageState: AUTH_FILE })
  test.setTimeout(150_000)   // setup form + sim run + wizard checks

  test.beforeAll(async () => {
    if (!hasValidAuth()) {
      // eslint-disable-next-line playwright/no-skipped-test
      test.skip()
    }
  })

  /**
   * Shared setup: fill the form, get to the canvas, drop a server, run the sim,
   * and wait for completion — then return to let the test open the wizard.
   */
  async function reachPublishWizard(page: Page, title = 'E2E Challenge') {
    await page.goto('/community/create')
    await page.waitForSelector('#setup-title', { timeout: 10_000 })

    await fillSetupForm(page, {
      title,
      narrative: 'A service is under heavy load.',
      objective: 'Keep p99 latency under 300ms.',
    })
    await page.getByRole('button', { name: /start building/i }).click()
    await page.waitForSelector('.react-flow__renderer', { timeout: 10_000 })

    await dropOntoCanvas(page, 'server')
    await page.waitForSelector('[data-testid="node-server"]')

    await page.locator('[data-testid="run-button"]').click()
    await expect(page.locator('[data-testid="sim-status"]')).toContainText('Complete', { timeout: 90_000 })

    await page.getByRole('button', { name: /publish challenge/i }).click()
  }

  test('wizard opens at "Step 1 of 2 — SLA Targets", skipping Identity', async ({ page }) => {
    await reachPublishWizard(page)
    await expect(page.getByText('Step 1 of 2 — SLA Targets')).toBeVisible({ timeout: 5_000 })
    // Identity step must NOT be shown
    await expect(page.getByText('Step 1 of 4 — Identity')).not.toBeVisible()
  })

  test('wizard Cancel button closes the wizard on step 1', async ({ page }) => {
    await reachPublishWizard(page)
    await expect(page.getByText('Step 1 of 2 — SLA Targets')).toBeVisible({ timeout: 5_000 })

    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(page.getByText('Step 1 of 2 — SLA Targets')).not.toBeVisible({ timeout: 3_000 })
  })

  test('wizard advances to "Step 2 of 2 — Preview & Publish" after SLA targets', async ({ page }) => {
    await reachPublishWizard(page)
    await expect(page.getByText('Step 1 of 2 — SLA Targets')).toBeVisible({ timeout: 5_000 })

    await page.getByRole('button', { name: /next/i }).click()
    await expect(page.getByText('Step 2 of 2 — Preview & Publish')).toBeVisible({ timeout: 3_000 })
  })

  test('wizard preview shows title and objective from the setup form', async ({ page }) => {
    const title = 'E2E Preview Check'
    await reachPublishWizard(page, title)
    await expect(page.getByText('Step 1 of 2 — SLA Targets')).toBeVisible({ timeout: 5_000 })

    await page.getByRole('button', { name: /next/i }).click()
    await expect(page.getByText('Step 2 of 2 — Preview & Publish')).toBeVisible({ timeout: 3_000 })

    await expect(page.getByText(title)).toBeVisible()
    await expect(page.getByText('Keep p99 latency under 300ms.')).toBeVisible()
  })

  test('"Back" on wizard preview returns to SLA Targets', async ({ page }) => {
    await reachPublishWizard(page)
    await expect(page.getByText('Step 1 of 2 — SLA Targets')).toBeVisible({ timeout: 5_000 })

    await page.getByRole('button', { name: /next/i }).click()
    await expect(page.getByText('Step 2 of 2 — Preview & Publish')).toBeVisible({ timeout: 3_000 })

    await page.getByRole('button', { name: /back/i }).click()
    await expect(page.getByText('Step 1 of 2 — SLA Targets')).toBeVisible({ timeout: 3_000 })
  })
})
