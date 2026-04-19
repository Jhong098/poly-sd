import { test, expect, type Page } from '@playwright/test'

// ── Types (mirrored from lib/actions/architectures to keep test self-contained) ─

type MockNode = {
  id: string
  type: string
  position: { x: number; y: number }
  data: { componentType: string; label: string; config: Record<string, unknown> }
}

type MockSave = {
  id: string
  name: string
  nodes: MockNode[]
  edges: unknown[]
  updated_at: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSave(id: string, name: string, nodeCount = 1): MockSave {
  return {
    id,
    name,
    nodes: Array.from({ length: nodeCount }, (_, i) => ({
      id: `server-${id}-${i}`,
      type: 'server',
      position: { x: 100 + i * 200, y: 100 },
      data: { componentType: 'server', label: `Server ${i + 1}`, config: {} },
    })),
    edges: [],
    updated_at: new Date().toISOString(),
  }
}

/**
 * Registers addInitScript so that on the next navigation the page boots with:
 * - window.__E2E_SIGNED_IN = true  (shows the Saves button)
 * - window.__mockArchitectureActions (in-memory save store, no real Supabase)
 *
 * Must be called BEFORE page.goto() or page.reload() to take effect.
 */
async function setupSaves(page: Page, initialSaves: MockSave[] = []) {
  await page.addInitScript((seeded: MockSave[]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__E2E_SIGNED_IN = true
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__mockArchitectureActions = {
      list: async () => [...seeded],
      save: async (
        name: string,
        nodes: MockNode[],
        edges: unknown[],
        existingId?: string,
      ) => {
        if (existingId) {
          const idx = seeded.findIndex((s) => s.id === existingId)
          if (idx >= 0) {
            seeded[idx] = { ...seeded[idx], name, nodes, edges, updated_at: new Date().toISOString() }
            return seeded[idx]
          }
        }
        const created = { id: String(Date.now()), name, nodes, edges, updated_at: new Date().toISOString() }
        seeded.push(created)
        return created
      },
      delete: async (id: string) => {
        const idx = seeded.findIndex((s) => s.id === id)
        if (idx >= 0) seeded.splice(idx, 1)
      },
    }
  }, initialSaves)
}

async function gotoSandbox(page: Page) {
  await page.goto('/sandbox')
  await page.waitForSelector('.react-flow__renderer', { timeout: 10_000 })
}

async function addNodeViaStore(page: Page, componentType = 'server') {
  await page.evaluate((type: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__architectureStore.getState().addNode(type, { x: 300, y: 200 })
  }, componentType)
  await page.waitForFunction(
    () =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__architectureStore.getState().nodes.length > 0,
  )
}

async function openSavesPanel(page: Page) {
  await page.locator('[data-testid="saves-button"]').click()
  await expect(page.locator('[data-testid="saves-panel"]')).toBeVisible({ timeout: 5_000 })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Saves panel', () => {
  test('saves button is hidden when signed out', async ({ page }) => {
    await gotoSandbox(page)
    await expect(page.locator('[data-testid="saves-button"]')).not.toBeVisible()
  })

  test('saves panel opens and shows empty state', async ({ page }) => {
    await setupSaves(page)
    await gotoSandbox(page)

    await openSavesPanel(page)
    await expect(page.locator('[data-testid="saves-panel"]')).toContainText('No saves yet')
    await expect(page.locator('[data-testid="save-slot"]')).toHaveCount(0)
  })

  test('save-add button is hidden when canvas is empty', async ({ page }) => {
    await setupSaves(page)
    await gotoSandbox(page)

    await openSavesPanel(page)
    await expect(page.locator('[data-testid="saves-add-button"]')).not.toBeVisible()
  })

  test('can save a new architecture', async ({ page }) => {
    await setupSaves(page)
    await gotoSandbox(page)

    await addNodeViaStore(page)
    await openSavesPanel(page)

    await page.locator('[data-testid="saves-add-button"]').click()
    await page.locator('[data-testid="saves-name-input"]').fill('My Test Arch')
    await page.locator('[data-testid="saves-confirm-button"]').click()

    await expect(page.locator('[data-testid="save-slot"]')).toHaveCount(1, { timeout: 5_000 })
    await expect(page.locator('[data-testid="save-slot"]')).toContainText('My Test Arch')
  })

  test('can load a saved architecture onto an empty canvas', async ({ page }) => {
    await setupSaves(page, [makeSave('s1', 'Saved Arch', 2)])
    await gotoSandbox(page)

    // Confirm canvas starts empty
    await page.waitForFunction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => (window as any).__architectureStore.getState().nodes.length === 0,
    )

    await openSavesPanel(page)
    await expect(page.locator('[data-testid="save-slot"]')).toContainText('Saved Arch')

    await page.locator('[data-testid="save-slot-load"]').click()

    // Panel closes and canvas now has the 2 nodes from the save
    await expect(page.locator('[data-testid="saves-panel"]')).not.toBeVisible({ timeout: 3_000 })
    await page.waitForFunction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => (window as any).__architectureStore.getState().nodes.length === 2,
    )
  })

  test('can overwrite an existing save with current canvas', async ({ page }) => {
    await setupSaves(page, [makeSave('s1', 'Original Name')])
    await gotoSandbox(page)

    await addNodeViaStore(page)
    await openSavesPanel(page)

    await page.locator('[data-testid="save-slot-overwrite"]').click()

    // Slot count stays at 1 and name is preserved
    await expect(page.locator('[data-testid="save-slot"]')).toHaveCount(1, { timeout: 5_000 })
    await expect(page.locator('[data-testid="save-slot"]')).toContainText('Original Name')
  })

  test('can delete a save', async ({ page }) => {
    await setupSaves(page, [makeSave('s1', 'To Delete')])
    await gotoSandbox(page)

    await openSavesPanel(page)
    await expect(page.locator('[data-testid="save-slot"]')).toHaveCount(1)

    await page.locator('[data-testid="save-slot-delete"]').click()

    await expect(page.locator('[data-testid="save-slot"]')).toHaveCount(0, { timeout: 5_000 })
    await expect(page.locator('[data-testid="saves-panel"]')).toContainText('No saves yet')
  })

  test('shows max-slots message and hides add button when 3 saves exist', async ({ page }) => {
    await setupSaves(page, [
      makeSave('s1', 'Save 1'),
      makeSave('s2', 'Save 2'),
      makeSave('s3', 'Save 3'),
    ])
    await gotoSandbox(page)

    await addNodeViaStore(page)
    await openSavesPanel(page)

    await expect(page.locator('[data-testid="save-slot"]')).toHaveCount(3)
    await expect(page.locator('[data-testid="saves-max-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="saves-add-button"]')).not.toBeVisible()
  })

  test('Escape key cancels the name input', async ({ page }) => {
    await setupSaves(page)
    await gotoSandbox(page)

    await addNodeViaStore(page)
    await openSavesPanel(page)

    await page.locator('[data-testid="saves-add-button"]').click()
    await expect(page.locator('[data-testid="saves-name-input"]')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.locator('[data-testid="saves-name-input"]')).not.toBeVisible()
    // Add button is back
    await expect(page.locator('[data-testid="saves-add-button"]')).toBeVisible()
  })
})
