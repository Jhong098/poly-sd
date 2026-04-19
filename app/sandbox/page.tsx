'use client'

import dynamic from 'next/dynamic'

const SandboxLayout = dynamic(
  () => import('@/components/canvas/SandboxLayout').then(m => ({ default: m.SandboxLayout })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-gray-950">
        <div className="w-5 h-5 border-2 border-gray-600 border-t-gray-300 rounded-full animate-spin" />
      </div>
    ),
  }
)

export default function SandboxPage() {
  return <SandboxLayout />
}
