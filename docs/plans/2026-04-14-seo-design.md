# SEO Improvements Design

**Date:** 2026-04-14  
**Scope:** Option B — Landing page expansion + technical SEO basics

## Goals

- Rank for terms like "learn distributed systems," "system design game," "distributed systems tutorial"
- Rich social sharing previews (OG/Twitter cards) when shared on LinkedIn, Twitter, Discord
- Keep the landing page minimal and visual — no text walls

## Indexable surface

Only `/` is crawlable. All other routes (campaign, challenges, sandbox, play, profile, replay, auth) are auth-gated and should be blocked from crawlers.

---

## 1. Metadata (`app/layout.tsx`)

Expand the existing `metadata` export:

- `metadataBase`: production domain (used to resolve relative OG image URLs)
- `description`: richer copy targeting keywords — "distributed systems," "system design," "learn by simulation," "systems design game"
- `openGraph`: title, description, type (`website`), URL, site name, image (points to the OG image route)
- `twitter`: card (`summary_large_image`), title, description

No per-page metadata needed — the landing page is the only indexable route.

## 2. OG Image (`app/opengraph-image.tsx`)

Use Next.js's built-in `ImageResponse` from `next/og` to generate a 1200×630px branded image at build time. No external service.

Content: game name + tagline, dark background, cyan accent — matching the existing design palette. Next.js auto-wires this to the OG image metadata.

## 3. Landing page additions (`app/page.tsx`)

Two minimal visual additions inserted between the Features grid and the footer:

**Static canvas preview**  
An SVG mock of the game canvas: 4–5 connected nodes (Load Balancer → Server → Cache → Database) with edge lines and small status indicators. Node labels ("Load Balancer," "Redis Cache," "Postgres") are crawlable HTML text seeding keywords. Short hook above: *"Your architecture, live."*

**Concept chips row**  
A single line of pill badges: `Load Balancing` · `Caching` · `Message Queues` · `Sharding` · `Circuit Breakers` · `Rate Limiting` · `Fault Tolerance`. Visually minimal, SEO-dense.

No new routes. No "Who it's for" section — hero copy already implies the audience.

## 4. Sitemap & robots (`app/sitemap.ts`, `app/robots.ts`)

**sitemap.ts**: Returns only `/`.

**robots.ts**: 
- Allow: `/`  
- Disallow: `/campaign`, `/challenge`, `/sandbox`, `/play`, `/profile`, `/replay`, `/sign-in`, `/sign-up`

Prevents crawlers from hitting auth redirects and wasting crawl budget.
