'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid } from 'lucide-react'
import { SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/nextjs'

const NAV_LINKS = [
  { href: '/campaign',  label: 'Campaign'  },
  { href: '/community', label: 'Community' },
  { href: '/sandbox',   label: 'Free Play' },
]

export function SiteNav() {
  const { isSignedIn, isLoaded } = useAuth()
  const pathname = usePathname()

  return (
    <nav className="flex-shrink-0 flex items-center gap-1 px-6 h-11 bg-raised border-b border-edge-dim">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mr-4">
        <div className="w-6 h-6 bg-surface border border-edge flex items-center justify-center">
          <LayoutGrid size={12} className="text-cyan" />
        </div>
        <span className="text-[13px] font-bold tracking-widest uppercase text-cyan">Poly-SD</span>
      </Link>

      {/* Nav links */}
      {NAV_LINKS.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={`h-7 flex items-center px-3 text-[12px] font-bold uppercase tracking-wider transition-colors border
              ${active
                ? 'border-edge text-ink bg-surface'
                : 'border-transparent text-ink-3 hover:text-ink-2 hover:border-edge-dim'
              }`}
          >
            {label}
          </Link>
        )
      })}

      {/* Right side */}
      <div className="ml-auto flex items-center gap-2">
        {isLoaded && (
          isSignedIn ? (
            <>
              <Link
                href="/profile"
                className={`h-7 flex items-center px-3 text-[12px] font-bold uppercase tracking-wider transition-colors border
                  ${pathname === '/profile'
                    ? 'border-edge text-ink bg-surface'
                    : 'border-transparent text-ink-3 hover:text-ink-2 hover:border-edge-dim'
                  }`}
              >
                Profile
              </Link>
              <div className="h-4 w-px bg-edge" />
              <UserButton />
            </>
          ) : (
            <>
              <SignInButton mode="modal">
                <button className="h-7 flex items-center px-3 text-[12px] font-bold uppercase tracking-wider text-ink-3 hover:text-ink-2 border border-transparent hover:border-edge-dim transition-colors">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="h-7 flex items-center px-3 text-[12px] font-bold uppercase tracking-wider bg-cyan text-base hover:bg-cyan/80 transition-colors">
                  Sign up
                </button>
              </SignUpButton>
            </>
          )
        )}
      </div>
    </nav>
  )
}
