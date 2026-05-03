'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { MobilePalette } from './MobilePalette'
import type { ComponentType } from '@/lib/components/definitions'

type Props = {
  allowedTypes?: ComponentType[] | 'all'
}

export function MobileToolbar({ allowedTypes }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Add component"
        className="absolute bottom-4 right-4 z-10 w-12 h-12 rounded-full bg-cyan flex items-center justify-center shadow-lg active:bg-cyan/90 transition-colors md:hidden"
      >
        <Plus size={20} className="text-base" />
      </button>
      <BottomSheet isOpen={open} onClose={() => setOpen(false)} title="Add Component">
        <MobilePalette allowedTypes={allowedTypes} onSelect={() => setOpen(false)} />
      </BottomSheet>
    </>
  )
}
