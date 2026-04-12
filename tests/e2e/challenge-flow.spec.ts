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

async function runSimAndWaitForResult(page: Page) {
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

    // Connect Client → Server using React Flow handles
    const sourceHandle = page.locator('.react-flow__handle-source').first()
    const targetHandle = page.locator('.react-flow__handle-target').first()
    await sourceHandle.dragTo(targetHandle)

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
