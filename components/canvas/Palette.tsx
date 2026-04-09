'use client'

import { Users, Server, Database, Zap, Shuffle } from 'lucide-react'
import { COMPONENT_META, type ComponentType } from '@/lib/components/definitions'

type PaletteItem = {
  type: ComponentType
  icon: React.ReactNode
  shortDesc: string
}

const TIER1_ITEMS: PaletteItem[] = [
  { type: 'client',   icon: <Users size={18} />,    shortDesc: 'Traffic source'  },
  { type: 'server',   icon: <Server size={18} />,   shortDesc: 'App server'      },
  { type: 'database', icon: <Database size={18} />, shortDesc: 'Relational DB'   },
  { type: 'cache',    icon: <Zap size={18} />,      shortDesc: 'In-memory cache' },
]

const TIER2_ITEMS: PaletteItem[] = [
  { type: 'load-balancer', icon: <Shuffle size={18} />, shortDesc: 'Distribute traffic' },
]

const ACCENT_CLASSES: Record<string, { card: string; icon: string }> = {
  amber: {
    card: 'border-amber-500/30 hover:border-amber-400/60 hover:bg-amber-500/5',
    icon: 'text-amber-400 bg-amber-500/10',
  },
  blue: {
    card: 'border-blue-500/30 hover:border-blue-400/60 hover:bg-blue-500/5',
    icon: 'text-blue-400 bg-blue-500/10',
  },
  violet: {
    card: 'border-violet-500/30 hover:border-violet-400/60 hover:bg-violet-500/5',
    icon: 'text-violet-400 bg-violet-500/10',
  },
  emerald: {
    card: 'border-emerald-500/30 hover:border-emerald-400/60 hover:bg-emerald-500/5',
    icon: 'text-emerald-400 bg-emerald-500/10',
  },
  sky: {
    card: 'border-sky-500/30 hover:border-sky-400/60 hover:bg-sky-500/5',
    icon: 'text-sky-400 bg-sky-500/10',
  },
}

function PaletteCard({ item }: { item: PaletteItem }) {
  const meta = COMPONENT_META[item.type]
  const accent = ACCENT_CLASSES[meta.accentColor] ?? ACCENT_CLASSES.blue

  function onDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('componentType', item.type)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-lg border
        bg-gray-900/50 cursor-grab active:cursor-grabbing
        transition-all duration-150 select-none
        ${accent.card}
      `}
    >
      <div className={`p-1.5 rounded-md flex-shrink-0 ${accent.icon}`}>
        {item.icon}
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-gray-200">{meta.label}</p>
        <p className="text-[11px] text-gray-500 truncate">{item.shortDesc}</p>
      </div>
    </div>
  )
}

const ALL_TIERS = [
  { label: 'Tier 1 — Foundations', items: TIER1_ITEMS },
  { label: 'Tier 2 — Scaling',     items: TIER2_ITEMS },
]

export function Palette({ allowedTypes }: { allowedTypes?: ComponentType[] | 'all' }) {
  const allow = allowedTypes === 'all' || allowedTypes === undefined
    ? null
    : new Set(allowedTypes)

  const visibleTiers = ALL_TIERS.map((tier) => ({
    ...tier,
    items: allow ? tier.items.filter((i) => allow.has(i.type)) : tier.items,
  })).filter((tier) => tier.items.length > 0)

  return (
    <aside className="w-56 flex-shrink-0 h-full bg-gray-900/80 border-r border-gray-800/60 flex flex-col overflow-y-auto">
      <div className="px-4 pt-4 pb-3 border-b border-gray-800/60">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Components</p>
        <p className="text-[11px] text-gray-600 mt-0.5">Drag onto canvas</p>
      </div>

      {visibleTiers.map((tier) => (
        <div key={tier.label} className="px-3 py-3 border-t border-gray-800/40 first:border-t-0">
          <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-2 px-1">
            {tier.label}
          </p>
          <div className="space-y-1.5">
            {tier.items.map((item) => (
              <PaletteCard key={item.type} item={item} />
            ))}
          </div>
        </div>
      ))}

      <div className="px-3 py-3 border-t border-gray-800/40 mt-auto">
        <p className="text-[11px] text-gray-700 text-center">
          More components unlock as you progress
        </p>
      </div>
    </aside>
  )
}
