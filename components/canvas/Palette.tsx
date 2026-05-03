'use client'

import { Users, Server, Database, Zap, Shuffle, List, Shield, Layers, Radio, Globe, Box, HardDrive } from 'lucide-react'
import { COMPONENT_META, type ComponentType } from '@/lib/components/definitions'

type PaletteItem = {
  type: ComponentType
  icon: React.ReactNode
  shortDesc: string
}

const TIER1_ITEMS: PaletteItem[] = [
  { type: 'client',   icon: <Users size={16} />,    shortDesc: 'Traffic source'  },
  { type: 'server',   icon: <Server size={16} />,   shortDesc: 'App server'      },
  { type: 'database', icon: <Database size={16} />, shortDesc: 'Relational DB'   },
  { type: 'cache',    icon: <Zap size={16} />,      shortDesc: 'In-memory cache' },
]

const TIER2_ITEMS: PaletteItem[] = [
  { type: 'load-balancer', icon: <Shuffle size={16} />, shortDesc: 'Distribute traffic' },
  { type: 'queue',         icon: <List size={16} />,    shortDesc: 'Buffer & decouple'  },
]

const TIER3_ITEMS: PaletteItem[] = [
  { type: 'api-gateway',    icon: <Shield    size={16} />, shortDesc: 'Rate limit & circuit breaker' },
  { type: 'k8s-fleet',      icon: <Layers    size={16} />, shortDesc: 'Auto-scaling pod fleet'       },
  { type: 'kafka',          icon: <Radio     size={16} />, shortDesc: 'Distributed event stream'     },
  { type: 'cdn',            icon: <Globe     size={16} />, shortDesc: 'Edge cache, global PoPs'      },
  { type: 'nosql',          icon: <Box       size={16} />, shortDesc: 'High-throughput key-value DB' },
  { type: 'object-storage', icon: <HardDrive size={16} />, shortDesc: 'Durable blob storage (S3)'   },
]

// Maps accentColor → design system color variable
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

function PaletteCard({ item, pulse }: { item: PaletteItem; pulse?: boolean }) {
  const meta = COMPONENT_META[item.type]
  const color = TYPE_COLOR_VAR[meta.accentColor] ?? 'var(--color-edge-strong)'

  function onDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('componentType', item.type)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      data-testid={`palette-item-${item.type}`}
      className={`flex items-center gap-3 px-3 py-2.5 border bg-surface hover:bg-overlay cursor-grab active:cursor-grabbing transition-colors duration-150 select-none
  ${pulse ? 'border-cyan animate-pulse shadow-[0_0_8px_var(--color-cyan)]' : 'border-edge'}`}
      style={{ borderLeftWidth: 2, borderLeftColor: pulse ? 'var(--color-cyan)' : color }}
    >
      <span style={{ color }} className="flex-shrink-0">{item.icon}</span>
      <div className="min-w-0">
        <p className="text-[12px] font-bold tracking-wider uppercase" style={{ color }}>{meta.label}</p>
        <p className="text-[10px] text-ink-3 truncate">{item.shortDesc}</p>
      </div>
    </div>
  )
}

const ALL_TIERS = [
  { label: 'Tier 1 — Foundations', items: TIER1_ITEMS },
  { label: 'Tier 2 — Scaling',     items: TIER2_ITEMS },
  { label: 'Tier 3 — Advanced',    items: TIER3_ITEMS },
]

export function Palette({
  allowedTypes,
  pulseType,
}: {
  allowedTypes?: ComponentType[] | 'all'
  pulseType?: ComponentType
}) {
  const allow = allowedTypes === 'all' || allowedTypes === undefined
    ? null
    : new Set(allowedTypes)

  const visibleTiers = ALL_TIERS.map((tier) => ({
    ...tier,
    items: allow ? tier.items.filter((i) => allow.has(i.type)) : tier.items,
  })).filter((tier) => tier.items.length > 0)

  return (
    <aside className="w-52 flex-shrink-0 h-full bg-raised border-r border-edge hidden md:flex flex-col overflow-y-auto">
      <div className="px-4 pt-4 pb-3 border-b border-edge-dim">
        <p className="text-[10px] font-bold text-cyan uppercase tracking-widest">// Components</p>
        <p className="text-[10px] text-ink-3 mt-0.5">Drag onto canvas</p>
      </div>

      {visibleTiers.map((tier) => (
        <div key={tier.label} className="px-3 py-3 border-t border-edge-dim first:border-t-0">
          <p className="text-[9px] font-bold text-ink-3 uppercase tracking-widest mb-2 px-1">
            {tier.label}
          </p>
          <div className="space-y-1.5">
            {tier.items.map((item) => (
              <PaletteCard key={item.type} item={item} pulse={pulseType === item.type} />
            ))}
          </div>
        </div>
      ))}

      <div className="px-3 py-3 border-t border-edge-dim mt-auto">
        <p className="text-[10px] text-ink-3 text-center">
          // More unlock as you progress
        </p>
      </div>
    </aside>
  )
}
