import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/campaign',
        '/challenge',
        '/sandbox',
        '/play',
        '/profile',
        '/replay',
        '/sign-in',
        '/sign-up',
        '/leaderboard',
        '/community',
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  }
}
