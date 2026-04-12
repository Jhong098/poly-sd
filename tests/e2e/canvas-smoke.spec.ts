import { test, expect, type Page } from '@playwright/test'

// Dispatches HTML5 drag events directly — Playwright can't set DataTransfer.setData natively
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

test.describe('Canvas smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sandbox')
    await page.waitForSelector('.react-flow__renderer', { timeout: 10_000 })
  })

  test('can drop a Server node onto the canvas', async ({ page }) => {
    await dropOntoCanvas(page, 'server')
    await expect(page.locator('[data-testid="node-server"]')).toBeVisible({ timeout: 5_000 })
  })

  test('run button is enabled after adding a node', async ({ page }) => {
    await dropOntoCanvas(page, 'server')
    await page.waitForSelector('[data-testid="node-server"]')
    const runBtn = page.locator('[data-testid="run-button"]')
    await expect(runBtn).toBeEnabled({ timeout: 3_000 })
  })

  test('simulation runs and completes', async ({ page }) => {
    test.setTimeout(120_000)  // sim can take up to 60s at 1× speed
    await dropOntoCanvas(page, 'server')
    await page.waitForSelector('[data-testid="node-server"]')

    await page.locator('[data-testid="run-button"]').click()

    await expect(page.locator('[data-testid="sim-status"]')).toContainText('Running', { timeout: 5_000 })
    await expect(page.locator('[data-testid="sim-status"]')).toContainText('Complete', { timeout: 90_000 })
  })
})
