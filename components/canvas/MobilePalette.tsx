'use client'

import { useReactFlow } from '@xyflow/react'
import { Users, Server, Database, Zap, Shuffle, List, Shield, Layers, Radio, Globe, Box, HardDrive } from 'lucide-react'
import { useArchitectureStore } from '@/lib/store/architectureStore'
import { COMPONENT_META, type ComponentType } from '@/lib/components/definitions'

type Item = { type: ComponentType; icon: React.ReactNode; shortDesc: string }

const TIERS: { label: string; items: Item[] }[] = [
  {
    label: 'Tier 1 — Foundations',
    items: [
      { type: 'client',   icon: <Users size={18} />,    shortDesc: 'Traffic source'  },
      { type: 'server',   icon: <Server size={18} />,   shortDesc: 'App server'      },
      { type: 'database', icon: <Database size={18} />, shortDesc: 'Relational DB'   },
      { type: 'cache',    icon: <Zap size={18} />,      shortDesc: 'In-memory cache' },
    ],
  },
  {
    label: 'Tier 2 — Scaling',
    items: [
      { type: 'load-balancer', icon: <Shuffle size={18} />, shortDesc: 'Distribute traffic' },
      { type: 'queue',         icon: <List size={18} />,    shortDesc: 'Buffer & decouple'  },
    ],
  },
  {
    label: 'Tier 3 — Advanced',
    items: [
      { type: 'api-gateway',    icon: <Shield size={18} />,    shortDesc: 'Rate limit & circuit breaker' },
      { type: 'k8s-fleet',      icon: <Layers size={18} />,    shortDesc: 'Auto-scaling pod fleet'       },
      { type: 'kafka',          icon: <Radio size={18} />,     shortDesc: 'Distributed event stream'     },
      { type: 'cdn',            icon: <Globe size={18} />,     shortDesc: 'Edge cache, global PoPs'      },
      { type: 'nosql',          icon: <Box size={18} />,       shortDesc: 'High-throughput key-value DB' },
      { type: 'object-storage', icon: <HardDrive size={18} />, shortDesc: 'Durable blob storage (S3)'   },
    ],
  },
]

const TYPE_COLOR_VAR: Record<string, string> = {
  amber:   'var(--color-node-client)',
  blue:    'var(--color-node-server)',
  violet:  'var(--color-node-db)',
  emerald: 'var(--color-node-cache)',
  sky:     'var(--color-node-lb)',
  orange:  'var(--color-node-queue)',
  pink:    'var(--color-node-gateway)',
  indigo:  'var(--color-node-k8s)',
  teal:    'var(--color-node-kafka)',
  lime:    'var(--color-node-cdn)',
  fuchsia: 'var(--color-node-nosql)',
  rose:    'var(--color-node-object-storage)',
}

type Props = {
  allowedTypes?: ComponentType[] | 'all'
  onSelect: () => void
}

export function MobilePalette({ allowedTypes, onSelect }: Props) {
  const { screenToFlowPosition } = useReactFlow()
  const addNode = useArchitectureStore((s) => s.addNode)

  const allow = allowedTypes === 'all' || allowedTypes === undefined ? null : new Set(allowedTypes)

  function handleTap(type: ComponentType) {
    const position = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    })
    addNode(type, position)
    onSelect()
  }

  const visibleTiers = TIERS.map((tier) => ({
    ...tier,
    items: allow ? tier.items.filter((i) => allow.has(i.type)) : tier.items,
  })).filter((tier) => tier.items.length > 0)

  return (
    <div className="py-2">
      {visibleTiers.map((tier) => (
        <div key={tier.label} className="px-4 py-3 border-t border-edge-dim first:border-t-0">
          <p className="text-[9px] font-bold text-ink-3 uppercase tracking-widest mb-3">{tier.label}</p>
          <div className="grid grid-cols-2 gap-2">
            {tier.items.map((item) => {
              const meta = COMPONENT_META[item.type]
              const color = TYPE_COLOR_VAR[meta.accentColor] ?? 'var(--color-edge-strong)'
              return (
                <button
                  key={item.type}
                  onClick={() => handleTap(item.type)}
                  className="flex items-center gap-3 px-3 py-3 border border-edge bg-surface active:bg-overlay transition-colors text-left"
                  style={{ borderLeftWidth: 2, borderLeftColor: color }}
                >
                  <span style={{ color }} className="flex-shrink-0">{item.icon}</span>
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold tracking-wider uppercase" style={{ color }}>{meta.label}</p>
                    <p className="text-[10px] text-ink-3 truncate">{item.shortDesc}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
