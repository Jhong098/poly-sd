'use client'

import Link from 'next/link'
import { SignUpButton, SignInButton, useAuth } from '@clerk/nextjs'
import { LayoutGrid, Zap, Trophy, ArrowRight } from 'lucide-react'
import { SiteNav } from '@/components/nav/SiteNav'

const FEATURES = [
  {
    icon: <LayoutGrid size={16} />,
    title: 'Visual Architecture Builder',
    desc: 'Drag-and-drop servers, databases, caches, and load balancers onto a live canvas.',
  },
  {
    icon: <Zap size={16} />,
    title: 'Real Simulation',
    desc: 'M/M/1 queue math drives realistic latency, error rates, and cost — fully in the browser.',
  },
  {
    icon: <Trophy size={16} />,
    title: 'Guided Challenges',
    desc: 'Pass SLA targets, stay within budget. Multiple valid solutions, just like the real world.',
  },
]

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth()

  return (
    <div className="h-full flex flex-col overflow-hidden bg-base text-ink">
      <SiteNav />

      <div className="flex-1 overflow-y-auto">
        {/* Hero */}
        <section className="max-w-3xl mx-auto px-8 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-cyan/20 bg-cyan/5 text-cyan text-[11px] font-bold tracking-widest uppercase mb-6">
            <Zap size={10} /> Learn by building
          </div>

          <h1 className="text-5xl font-bold text-ink leading-tight mb-4 tracking-tight">
            Master distributed systems<br />
            <span className="text-cyan">
              by designing them
            </span>
          </h1>
          <p className="text-[16px] text-ink-3 leading-relaxed mb-10 max-w-xl mx-auto">
            A visual sandbox game where you build architectures, run simulations, and
            learn why systems fail — and how to fix them.
          </p>

          {isLoaded && (
            isSignedIn ? (
              <div className="flex items-center justify-center gap-3">
                <Link
                  href="/campaign"
                  className="flex items-center gap-2 px-6 py-3 bg-cyan text-base font-bold text-[14px] tracking-wider uppercase hover:bg-cyan/80 transition-colors"
                >
                  Go to Campaign <ArrowRight size={15} />
                </Link>
                <Link
                  href="/sandbox"
                  className="px-6 py-3 bg-surface border border-edge text-ink-2 font-bold text-[14px] tracking-wider uppercase hover:bg-overlay transition-colors"
                >
                  Free Play
                </Link>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-3">
                  <SignUpButton mode="modal">
                    <button className="flex items-center gap-2 px-6 py-3 bg-cyan text-base font-bold text-[14px] tracking-wider uppercase hover:bg-cyan/80 transition-colors">
                      Get started free <ArrowRight size={15} />
                    </button>
                  </SignUpButton>
                  <SignInButton mode="modal">
                    <button className="px-6 py-3 bg-surface border border-edge text-ink-2 font-bold text-[14px] tracking-wider uppercase hover:bg-overlay transition-colors">
                      Sign in
                    </button>
                  </SignInButton>
                </div>
                <Link
                  href="/play/T-0"
                  className="text-[12px] text-ink-3 hover:text-ink-2 transition-colors tracking-wider"
                >
                  Try the tutorial without an account →
                </Link>
              </div>
            )
          )}
        </section>

        {/* Features */}
        <section className="max-w-3xl mx-auto px-8 pb-16">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="p-5 bg-raised border border-edge-dim">
                <div className="w-7 h-7 bg-surface border border-edge flex items-center justify-center text-cyan mb-3">
                  {f.icon}
                </div>
                <h3 className="text-[12px] font-bold uppercase tracking-wider text-ink-2 mb-1">{f.title}</h3>
                <p className="text-[11px] text-ink-3 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-edge-dim px-8 py-5 text-center">
          <p className="text-[11px] text-ink-3 tracking-wider uppercase">Poly-SD · Distributed systems, made playable</p>
        </footer>
      </div>
    </div>
  )
}
