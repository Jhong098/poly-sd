import { test, expect, type Page } from '@playwright/test'

async function dropOntoCanvas(page: Page, componentType: string) {
  await page.evaluate((type) => {
    const renderer = document.querySelector('.react-flow__renderer')
    if (!renderer) throw new Error('.react-flow__renderer not found')
    const rect = renderer.getBoundingClientRect()
    const dt = new DataTransfer()
    dt.setData('componentType', type)
    renderer.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt, clientX: rect.left + 300, clientY: rect.top + 200 }))
    renderer.dispatchEvent(new DragEvent('drop',     { bubbles: true, cancelable: true, dataTransfer: dt, clientX: rect.left + 300, clientY: rect.top + 200 }))
  }, componentType)
}

test.describe('Config panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sandbox')
    await page.waitForSelector('.react-flow__renderer', { timeout: 10_000 })
    await dropOntoCanvas(page, 'server')
    await page.waitForSelector('[data-testid="node-server"]')
  })

  test('config panel opens when a node is clicked', async ({ page }) => {
    await page.locator('[data-testid="node-server"]').click()
    // Scope to the desktop sidebar to avoid ambiguity with MobileConfigPanel
    const panel = page.locator('[data-testid="config-panel"]')
    await expect(panel.locator('[data-testid="config-instanceCount"]')).toBeVisible({ timeout: 3_000 })
  })

  test('changing instanceCount updates the config panel', async ({ page }) => {
    await page.locator('[data-testid="node-server"]').click()
    const panel = page.locator('[data-testid="config-panel"]')
    await panel.waitFor()

    const input = panel.locator('[data-testid="config-instanceCount"]')
    await input.fill('3')
    await input.press('Tab')

    await expect(input).toHaveValue('3')
  })

  test('config persists after clicking away and back', async ({ page }) => {
    await page.locator('[data-testid="node-server"]').click()
    const panel = page.locator('[data-testid="config-panel"]')
    await panel.waitFor()

    const input = panel.locator('[data-testid="config-instanceCount"]')
    await input.fill('3')
    await input.press('Tab')

    // Click away to deselect — panel reverts to placeholder (instanceCount input hidden).
    // Use position: { x: 10, y: 10 } to click the top-left corner of the pane, which is
    // guaranteed to be empty canvas. The default center click lands on the node because
    // fitView centers the single node in the viewport.
    await page.locator('.react-flow__pane').click({ position: { x: 10, y: 10 } })
    await expect(panel.locator('[data-testid="config-instanceCount"]')).not.toBeVisible({ timeout: 3_000 })

    // Click the node again
    await page.locator('[data-testid="node-server"]').click()
    await panel.waitFor()

    await expect(panel.locator('[data-testid="config-instanceCount"]')).toHaveValue('3')
  })
})
