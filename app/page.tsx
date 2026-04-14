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

        {/* Canvas preview */}
        <section className="max-w-3xl mx-auto px-8 pb-12">
          <p className="text-[11px] text-ink-3 font-bold uppercase tracking-widest mb-4">Your architecture, live.</p>
          <div className="bg-raised border border-edge p-6">
            <svg
              viewBox="0 0 560 120"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full"
              role="img"
              aria-label="Distributed system diagram: Load Balancer connected to Servers, Cache, and Database"
            >
              {/* Arrowhead marker */}
              <defs>
                <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L6,3 z" fill="#334155" />
                </marker>
              </defs>

              {/* Edges */}
              <line x1="120" y1="60" x2="158" y2="60" stroke="#334155" strokeWidth="1.5" markerEnd="url(#arrow)" />
              <line x1="270" y1="60" x2="308" y2="60" stroke="#334155" strokeWidth="1.5" markerEnd="url(#arrow)" />
              <line x1="420" y1="60" x2="458" y2="60" stroke="#334155" strokeWidth="1.5" markerEnd="url(#arrow)" />

              {/* Load Balancer */}
              <rect x="10" y="42" width="110" height="36" rx="2" fill="#1e293b" stroke="#22d3ee" strokeWidth="1" />
              <circle cx="22" cy="52" r="3" fill="#22d3ee" />
              <text x="35" y="57" fill="#f1f5f9" fontSize="10" fontFamily="monospace">Load Balancer</text>
              <text x="35" y="70" fill="#64748b" fontSize="8" fontFamily="monospace">nginx</text>

              {/* Server */}
              <rect x="160" y="42" width="110" height="36" rx="2" fill="#1e293b" stroke="#334155" strokeWidth="1" />
              <circle cx="172" cy="52" r="3" fill="#4ade80" />
              <text x="187" y="57" fill="#f1f5f9" fontSize="10" fontFamily="monospace">Server</text>
              <text x="187" y="70" fill="#64748b" fontSize="8" fontFamily="monospace">2 replicas</text>

              {/* Cache */}
              <rect x="310" y="42" width="110" height="36" rx="2" fill="#1e293b" stroke="#334155" strokeWidth="1" />
              <circle cx="322" cy="52" r="3" fill="#4ade80" />
              <text x="337" y="57" fill="#f1f5f9" fontSize="10" fontFamily="monospace">Redis Cache</text>
              <text x="337" y="70" fill="#64748b" fontSize="8" fontFamily="monospace">read-through</text>

              {/* Database */}
              <rect x="460" y="42" width="90" height="36" rx="2" fill="#1e293b" stroke="#334155" strokeWidth="1" />
              <circle cx="472" cy="52" r="3" fill="#4ade80" />
              <text x="487" y="57" fill="#f1f5f9" fontSize="10" fontFamily="monospace">Postgres</text>
              <text x="487" y="70" fill="#64748b" fontSize="8" fontFamily="monospace">primary</text>
            </svg>
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
