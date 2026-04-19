import { test, expect } from '@playwright/test'

test.describe('SEO metadata', () => {
  test('homepage has OG title meta tag', async ({ page }) => {
    await page.goto('/')
    const ogTitle = page.locator('meta[property="og:title"]')
    await expect(ogTitle).toHaveAttribute('content', /Poly-SD/)
  })

  test('homepage has OG description meta tag', async ({ page }) => {
    await page.goto('/')
    const ogDesc = page.locator('meta[property="og:description"]')
    await expect(ogDesc).toHaveAttribute('content', /distributed systems/)
  })

  test('homepage has twitter:card meta tag', async ({ page }) => {
    await page.goto('/')
    const twitterCard = page.locator('meta[name="twitter:card"]')
    await expect(twitterCard).toHaveAttribute('content', 'summary_large_image')
  })

  test('homepage has og:image meta tag wired up', async ({ page }) => {
    await page.goto('/')
    const ogImage = page.locator('meta[property="og:image"]')
    const content = await ogImage.getAttribute('content')
    expect(content).toBeTruthy()
    expect(content).toMatch(/opengraph-image/)
  })
})

test('OG image route returns an image', async ({ request }) => {
  const response = await request.get('/opengraph-image')
  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toMatch(/image\/png/)
})

test('robots.txt blocks private and gameplay routes', async ({ request }) => {
  const response = await request.get('/robots.txt')
  expect(response.status()).toBe(200)
  const body = await response.text()
  expect(body).toContain('Allow: /')
  expect(body).toContain('Disallow: /campaign')
  expect(body).toContain('Disallow: /challenge')
  expect(body).toContain('Disallow: /sandbox')
  expect(body).toContain('Disallow: /play')
  expect(body).toContain('Disallow: /profile')
  expect(body).toContain('Disallow: /replay')
  expect(body).toContain('Disallow: /sign-in')
  expect(body).toContain('Disallow: /sign-up')
  expect(body).toContain('Disallow: /leaderboard')
  expect(body).toContain('Disallow: /community')
})

test('sitemap.xml contains the homepage URL', async ({ request }) => {
  const response = await request.get('/sitemap.xml')
  expect(response.status()).toBe(200)
  const body = await response.text()
  expect(body).toContain('<loc>')
  expect(body).not.toContain('<loc></loc>')
})

test('landing page shows hero headline and mode buttons', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('text=Route traffic').first()).toBeVisible()
  await expect(page.locator('text=on purpose').first()).toBeVisible()
  await expect(page.locator('a[href="/campaign"]').first()).toBeVisible()
  await expect(page.locator('a[href="/sandbox"]').first()).toBeVisible()
  await expect(page.locator('a[href="/community"]').first()).toBeVisible()
})

test('landing page ticker shows distributed systems concepts', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('text=Circuit breakers').first()).toBeVisible()
  await expect(page.locator('text=Chaos mode').first()).toBeVisible()
})
