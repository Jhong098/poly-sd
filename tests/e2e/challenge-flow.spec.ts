import { test, expect, type Page } from '@playwright/test'

async function dropOntoCanvas(page: Page, componentType: string, offsetX = 0) {
  await page.evaluate(({ type, offsetX }) => {
    const renderer = document.querySelector('.react-flow__renderer')
    if (!renderer) throw new Error('.react-flow__renderer not found')
    const rect = renderer.getBoundingClientRect()
    const x = rect.left + rect.width / 2 + offsetX
    const y = rect.top + rect.height / 2

    const dt = new DataTransfer()
    dt.setData('componentType', type)
    renderer.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt, clientX: x, clientY: y }))
    renderer.dispatchEvent(new DragEvent('drop',     { bubbles: true, cancelable: true, dataTransfer: dt, clientX: x, clientY: y }))
  }, { type: componentType, offsetX })
}

async function dismissConceptPrimerIfVisible(page: Page) {
  const modal = page.locator('[data-testid="concept-primer-modal"]')
  if (await modal.isVisible()) {
    await modal.locator('button', { hasText: "Got it, let's play" }).click()
    await expect(modal).not.toBeVisible({ timeout: 5_000 })
  }
}

async function runSimAndWaitForResult(page: Page) {
  await dismissConceptPrimerIfVisible(page)
  await page.locator('[data-testid="run-button"]').click()
  await expect(page.locator('[data-testid="results-modal"]')).toBeVisible({ timeout: 90_000 })
}

test.describe('Challenge flow', () => {
  test('passes T-0 with a Server node connected to the starter Client', async ({ page }) => {
    test.setTimeout(120_000)

    await page.goto('/play/T-0')
    await page.waitForSelector('.react-flow__renderer', { timeout: 10_000 })

    // Drop a Server to the right of center (Client is pre-placed at center-left)
    await dropOntoCanvas(page, 'server', 200)
    await page.waitForSelector('[data-testid="node-server"]')

    // Wait for both nodes to be fully rendered before connecting
    await page.waitForSelector('[data-testid="node-client"]')
    await page.waitForSelector('[data-testid="node-server"]')

    // Connect Client → Server via the dev-exposed store.
    // React Flow v12 sets pointer-events:none on handles by default, so
    // dragTo() can never pass its actionability check.
    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const store = (window as any).__architectureStore
      const { nodes, onConnect } = store.getState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = nodes.find((n: any) => n.data.componentType === 'client')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const server = nodes.find((n: any) => n.data.componentType === 'server')
      if (!client || !server) throw new Error('Could not find client or server nodes')
      onConnect({ source: client.id, target: server.id, sourceHandle: null, targetHandle: null })
    })
    // Confirm the edge was created before proceeding
    await page.waitForFunction(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (window as any).__architectureStore.getState().edges.length > 0
    })

    await runSimAndWaitForResult(page)

    // ResultsModal shows "Challenge Passed" on success
    await expect(page.locator('[data-testid="result-status"]')).toContainText('Challenge Passed', { timeout: 5_000 })
  })

  test('fails T-0 when Client has no connection', async ({ page }) => {
    test.setTimeout(120_000)

    await page.goto('/play/T-0')
    await page.waitForSelector('.react-flow__renderer', { timeout: 10_000 })

    // Only the starter Client is present — run with nothing connected
    await runSimAndWaitForResult(page)

    // ResultsModal shows "Not Quite" on failure
    await expect(page.locator('[data-testid="result-status"]')).toContainText('Not Quite', { timeout: 5_000 })
  })
})
