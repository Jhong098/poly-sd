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
})

test('sitemap.xml contains the homepage URL', async ({ request }) => {
  const response = await request.get('/sitemap.xml')
  expect(response.status()).toBe(200)
  const body = await response.text()
  expect(body).toContain('<loc>')
  expect(body).toContain('localhost:3000')
})

test('landing page shows canvas preview with node labels', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('text=Load Balancer').first()).toBeVisible()
  await expect(page.locator('text=Your architecture, live')).toBeVisible()
})

test('landing page shows distributed systems concept chips', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('text=Message Queues')).toBeVisible()
  await expect(page.locator('text=Circuit Breakers')).toBeVisible()
})
