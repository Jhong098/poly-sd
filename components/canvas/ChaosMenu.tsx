'use client'

import { useEffect, useRef } from 'react'
import { Zap, WifiOff, TrendingUp } from 'lucide-react'
import { useSimStore } from '@/lib/store/simStore'
import type { ChaosType } from '@/sim/types'

type Props = {
  nodeId: string
  nodeLabel: string
  x: number
  y: number
  onClose: () => void
}

const CHAOS_OPTIONS: { type: ChaosType; label: string; desc: string; icon: React.ReactNode; durationMs: number; magnitude: number }[] = [
  {
    type: 'node-failure',
    label: 'Kill node',
    desc: '15s outage — all requests fail',
    icon: <WifiOff size={13} />,
    durationMs: 15_000,
    magnitude: 1,
  },
  {
    type: 'latency-spike',
    label: 'Spike latency',
    desc: '10s at 5× normal latency',
    icon: <Zap size={13} />,
    durationMs: 10_000,
    magnitude: 5,
  },
  {
    type: 'traffic-surge',
    label: 'Traffic surge',
    desc: '10s of 3× incoming traffic',
    icon: <TrendingUp size={13} />,
    durationMs: 10_000,
    magnitude: 3,
  },
]

export function ChaosMenu({ nodeId, nodeLabel, x, y, onClose }: Props) {
  const { injectChaos } = useSimStore()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  function handleInject(type: ChaosType, durationMs: number, magnitude: number) {
    injectChaos(nodeId, type, durationMs, magnitude)
    onClose()
  }

  return (
    <div
      ref={ref}
      className="fixed z-50 w-56 bg-gray-900 border border-gray-700/60 rounded-xl shadow-2xl shadow-black/60 overflow-hidden"
      style={{ left: x, top: y }}
    >
      <div className="px-3 py-2 border-b border-gray-800/60">
        <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Inject Chaos</p>
        <p className="text-[12px] font-semibold text-gray-300 mt-0.5 truncate">{nodeLabel}</p>
      </div>
      <div className="p-1">
        {CHAOS_OPTIONS.map((opt) => (
          <button
            key={opt.type}
            onClick={() => handleInject(opt.type, opt.durationMs, opt.magnitude)}
            className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg hover:bg-red-500/10 hover:border-red-500/20 border border-transparent transition-colors text-left group"
          >
            <span className="text-red-400 mt-0.5 flex-shrink-0">{opt.icon}</span>
            <div>
              <p className="text-[12px] font-semibold text-gray-200 group-hover:text-red-300 transition-colors">{opt.label}</p>
              <p className="text-[11px] text-gray-600">{opt.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
