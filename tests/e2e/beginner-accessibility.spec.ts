import { test, expect, type Page } from '@playwright/test'

// ── Helpers ───────────────────────────────────────────────────────────────────

async function dropOntoCanvas(page: Page, componentType: string, offsetX = 0) {
  await page.evaluate(({ type, offsetX }) => {
    const renderer = document.querySelector('.react-flow__renderer')
    if (!renderer) throw new Error('.react-flow__renderer not found')
    const rect = renderer.getBoundingClientRect()
    const dt = new DataTransfer()
    dt.setData('componentType', type)
    renderer.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt, clientX: rect.left + rect.width / 2 + offsetX, clientY: rect.top + rect.height / 2 }))
    renderer.dispatchEvent(new DragEvent('drop',     { bubbles: true, cancelable: true, dataTransfer: dt, clientX: rect.left + rect.width / 2 + offsetX, clientY: rect.top + rect.height / 2 }))
  }, { type: componentType, offsetX })
}

async function connectNodesViaStore(page: Page, sourceType: string, targetType: string) {
  await page.evaluate(({ sourceType, targetType }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store = (window as any).__architectureStore
    const { nodes, onConnect } = store.getState()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const source = nodes.find((n: any) => n.data.componentType === sourceType)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const target = nodes.find((n: any) => n.data.componentType === targetType)
    if (!source || !target) throw new Error(`Could not find ${sourceType} or ${targetType} nodes`)
    onConnect({ source: source.id, target: target.id, sourceHandle: null, targetHandle: null })
  }, { sourceType, targetType })
  await page.waitForFunction(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).__architectureStore.getState().edges.length > 0
  })
}

async function dismissPrimerIfVisible(page: Page) {
  const primer = page.locator('[data-testid="concept-primer-modal"]')
  if (await primer.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await page.getByText("Got it, let's play").click()
    await expect(primer).not.toBeVisible({ timeout: 3_000 })
  }
}

// ── ConceptPrimerModal ────────────────────────────────────────────────────────

test.describe('ConceptPrimerModal', () => {
  test('appears on first visit to a level that has a conceptPrimer', async ({ page }) => {
    // Inject script that clears primer-seen keys BEFORE React hydrates
    await page.addInitScript(() => {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('primer-seen-'))
        .forEach((k) => localStorage.removeItem(k))
    })

    await page.goto('/play/T-1')
    await page.waitForSelector('.react-flow__renderer', { timeout: 10_000 })

    const modal = page.locator('[data-testid="concept-primer-modal"]')
    await expect(modal).toBeVisible({ timeout: 5_000 })
    // T-1 primer title is "Scaling"
    await expect(modal).toContainText('Scaling')
  })

  test('is not shown again after dismissal via button', async ({ page }) => {
    // Clear the localStorage key on the same origin BEFORE navigating to the play page.
    // Using addInitScript here would re-clear on every navigation (including the return
    // trip), so we use page.evaluate on /sandbox (same origin) instead.
    await page.goto('/sandbox')
    await page.evaluate(() => localStorage.removeItem('primer-seen-T-1'))

    await page.goto('/play/T-1')
    await page.waitForSelector('[data-testid="concept-primer-modal"]', { timeout: 10_000 })

    // Dismiss via the CTA button
    await page.getByText("Got it, let's play").click()
    await expect(page.locator('[data-testid="concept-primer-modal"]')).not.toBeVisible({ timeout: 3_000 })

    // Navigate away and back — no addInitScript this time, localStorage persists
    await page.goto('/sandbox')
    await page.goto('/play/T-1')
    await page.waitForSelector('.react-flow__renderer', { timeout: 10_000 })

    // Modal must NOT reappear
    await expect(page.locator('[data-testid="concept-primer-modal"]')).not.toBeVisible({ timeout: 3_000 })
  })

  test('does not appear in sandbox (no active challenge)', async ({ page }) => {
    await page.goto('/sandbox')
    await page.waitForSelector('.react-flow__renderer', { timeout: 10_000 })
    await expect(page.locator('[data-testid="concept-primer-modal"]')).not.toBeVisible()
  })
})

// ── FailureDebrief ────────────────────────────────────────────────────────────

test.describe('FailureDebrief', () => {
  test('shows "What went wrong" when a Tutorial sim fails', async ({ page }) => {
    test.setTimeout(120_000)

    await page.goto('/play/T-0')
    await page.waitForSelector('.react-flow__renderer', { timeout: 10_000 })
    await dismissPrimerIfVisible(page)

    // Run with only the starter Client — no server connected → fails
    await page.locator('[data-testid="run-button"]').click()
    await expect(page.locator('[data-testid="results-modal"]')).toBeVisible({ timeout: 90_000 })
    await expect(page.locator('[data-testid="result-status"]')).toContainText('Not Quite')

    const debrief = page.locator('[data-testid="failure-debrief"]')
    await expect(debrief).toBeVisible()
    await expect(debrief).toContainText('What went wrong')
    await expect(debrief).toContainText('What to try')
  })

  test('does not appear when a Tutorial sim passes', async ({ page }) => {
    test.setTimeout(120_000)

    await page.goto('/play/T-0')
    await page.waitForSelector('.react-flow__renderer', { timeout: 10_000 })
    await dismissPrimerIfVisible(page)

    // Build a passing solution: Client → Server
    await dropOntoCanvas(page, 'server', 200)
    await page.waitForSelector('[data-testid="node-server"]')
    await connectNodesViaStore(page, 'client', 'server')

    await page.locator('[data-testid="run-button"]').click()
    await expect(page.locator('[data-testid="results-modal"]')).toBeVisible({ timeout: 90_000 })
    await expect(page.locator('[data-testid="result-status"]')).toContainText('Challenge Passed')

    await expect(page.locator('[data-testid="failure-debrief"]')).not.toBeVisible()
  })
})
