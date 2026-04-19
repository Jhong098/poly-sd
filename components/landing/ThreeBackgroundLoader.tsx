'use client'

import dynamic from 'next/dynamic'

const ThreeBackground = dynamic(
  () => import('./ThreeBackground').then(m => m.ThreeBackground),
  { ssr: false }
)

export function ThreeBackgroundLoader() {
  return <ThreeBackground />
}
