import { test, expect, type Page } from '@playwright/test'

async function dropAtOffset(page: Page, componentType: string, offsetX: number, offsetY: number) {
  await page.evaluate(({ type, offsetX, offsetY }) => {
    const renderer = document.querySelector('.react-flow__renderer')
    if (!renderer) throw new Error('.react-flow__renderer not found')
    const rect = renderer.getBoundingClientRect()
    const dt = new DataTransfer()
    dt.setData('componentType', type)
    renderer.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt, clientX: rect.left + offsetX, clientY: rect.top + offsetY }))
    renderer.dispatchEvent(new DragEvent('drop',     { bubbles: true, cancelable: true, dataTransfer: dt, clientX: rect.left + offsetX, clientY: rect.top + offsetY }))
  }, { type: componentType, offsetX, offsetY })
}

// Creates an edge programmatically via the store's onConnect (exposed in dev mode)
async function connectNodes(page: Page, source: string, target: string) {
  await page.evaluate(({ source, target }) => {
    const onConnect = (window as any).__polySDOnConnect
    if (!onConnect) throw new Error('__polySDOnConnect not available')
    onConnect({ source, target, sourceHandle: null, targetHandle: null })
  }, { source, target })
}

// Selects the first edge by reading its data-id from the DOM and calling the dev helper
async function selectFirstEdge(page: Page) {
  const edgeId = await page.evaluate(() => {
    return document.querySelector('.react-flow__edge[data-id]')?.getAttribute('data-id') ?? null
  })
  if (!edgeId) throw new Error('No edge found to select')

  await page.evaluate((id) => {
    const selectEdge = (window as any).__polySDSelectEdge
    if (!selectEdge) throw new Error('__polySDSelectEdge not available')
    selectEdge(id)
  }, edgeId)

  // React Flow adds a .selected class when the edge is selected
  await page.waitForSelector('.react-flow__edge.selected', { timeout: 3_000 })
}

test.describe('Edge removal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sandbox')
    await page.waitForSelector('.react-flow__renderer', { timeout: 10_000 })

    // Drop client (id: client-1) and server (id: server-2)
    await dropAtOffset(page, 'client', 150, 250)
    await dropAtOffset(page, 'server', 550, 250)
    await page.waitForSelector('[data-testid="node-client"]')
    await page.waitForSelector('[data-testid="node-server"]')

    // Wait for dev helpers, then connect the two nodes
    await page.waitForFunction(() => typeof (window as any).__polySDOnConnect === 'function', { timeout: 5_000 })
    await connectNodes(page, 'client-1', 'server-2')
    await page.waitForSelector('.react-flow__edge', { timeout: 5_000 })
  })

  test('inline ✕ button appears on a selected edge and removes it on click', async ({ page }) => {
    await selectFirstEdge(page)

    const removeBtn = page.locator('.react-flow__edgelabel-renderer button')
    await expect(removeBtn).toBeVisible({ timeout: 3_000 })

    await removeBtn.click()
    await expect(page.locator('.react-flow__edge')).toHaveCount(0, { timeout: 3_000 })
  })

  test('Backspace key removes the selected edge', async ({ page }) => {
    await selectFirstEdge(page)
    await page.keyboard.press('Backspace')
    await expect(page.locator('.react-flow__edge')).toHaveCount(0, { timeout: 3_000 })
  })

  test('Delete key removes the selected edge', async ({ page }) => {
    await selectFirstEdge(page)
    await page.keyboard.press('Delete')
    await expect(page.locator('.react-flow__edge')).toHaveCount(0, { timeout: 3_000 })
  })
})
