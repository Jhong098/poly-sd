'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { SiteNav } from '@/components/nav/SiteNav'

const ThreeBackground = dynamic(
  () => import('@/components/landing/ThreeBackground').then(m => m.ThreeBackground),
  { ssr: false }
)
import styles from './landing.module.css'

const TICKER_ITEMS = [
  '▣ 42 guided scenarios', '◆ Chaos mode',
  '◇ Auto-scaling',        '▣ Consistent hashing',
  '◆ Leader election',     '◇ Rate limiting',
  '▣ Sharding drills',     '◆ CAP tradeoffs',
  '◇ Back-pressure',       '▣ Retries & idempotency',
  '◆ Circuit breakers',    '◇ CDNs & edge caches',
]

function Ticker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS]
  return (
    <div className={styles.ticker}>
      <div className={styles.tickerTrack}>
        {items.map((s, i) => {
          const isAcc = s.startsWith('◆') || s.startsWith('▣')
          return (
            <span key={i}>
              <span className={isAcc ? styles.acc : undefined}>{s}</span>
              <span className={styles.sep}> // </span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className={styles.root}>
      <ThreeBackground />
      <div className={styles.scrim} />
      <div className={styles.grain} />

      <div className={styles.wrap}>
        <SiteNav />

        {/* Hero */}
        <section className={styles.hero}>
          <div>
            <div className={styles.eyebrow}>
              <span className={styles.eyebrowDot} />
              <span>Learn by building · Season 2 out now</span>
            </div>

            <h1 className={styles.headline}>
              <span className={styles.line}>Route traffic.</span>
              <span className={styles.line}>Scale services.</span>
              <span className={styles.line}>Break things</span>
              <span className={styles.line}><em>on purpose</em>.</span>
            </h1>

            <p className={styles.kicker}>
              Wire up services. Route real traffic. Break things on purpose.
            </p>

            <div className={styles.modeBtns}>
              <Link href="/campaign" className={`${styles.mbtn} ${styles.mbtnPrimary}`}>
                <span className={styles.mbtnLabel}>01 · Campaign</span>
                <span className={styles.mbtnName}>
                  Learn by building <span className={styles.arr}>→</span>
                </span>
              </Link>
              <Link href="/sandbox" className={`${styles.mbtn} ${styles.mbtnOutline}`}>
                <span className={styles.mbtnLabel}>02 · Sandbox</span>
                <span className={styles.mbtnName}>
                  Freeplay <span className={styles.arr}>→</span>
                </span>
              </Link>
              <Link href="/community" className={`${styles.mbtn} ${styles.mbtnOutline}`}>
                <span className={styles.mbtnLabel}>03 · Challenges</span>
                <span className={styles.mbtnName}>
                  Build · share · solve <span className={styles.arr}>→</span>
                </span>
              </Link>
            </div>

            <div className={styles.ctaFoot}>
              <span>No signup</span>
              <span className={styles.bullet} />
              <span>Runs in-browser</span>
            </div>
          </div>
        </section>

        {/* Ticker */}
        <Ticker />
      </div>
    </div>
  )
}
