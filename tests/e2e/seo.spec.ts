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

test('robots.txt disallows auth routes', async ({ request }) => {
  const response = await request.get('/robots.txt')
  expect(response.status()).toBe(200)
  const body = await response.text()
  expect(body).toContain('Disallow: /campaign')
  expect(body).toContain('Disallow: /sign-in')
  expect(body).toContain('Allow: /')
})
