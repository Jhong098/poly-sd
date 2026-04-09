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
      className="fixed z-50 w-52 bg-raised border border-err/40 shadow-2xl overflow-hidden"
      style={{ left: x, top: y }}
    >
      <div className="px-3 py-2 border-b border-edge-dim">
        <p className="text-[10px] font-bold text-err uppercase tracking-widest">// Inject Chaos</p>
        <p className="text-[12px] font-semibold text-ink mt-0.5 truncate">{nodeLabel}</p>
      </div>
      <div className="p-1">
        {CHAOS_OPTIONS.map((opt) => (
          <button
            key={opt.type}
            onClick={() => handleInject(opt.type, opt.durationMs, opt.magnitude)}
            className="w-full flex items-start gap-2.5 px-3 py-2.5 hover:bg-err/10 border border-transparent hover:border-err/20 transition-colors text-left group"
          >
            <span className="text-err mt-0.5 flex-shrink-0">{opt.icon}</span>
            <div>
              <p className="text-[12px] font-semibold text-ink-2 group-hover:text-err transition-colors">{opt.label}</p>
              <p className="text-[10px] text-ink-3">{opt.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
