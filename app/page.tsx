'use client'

import Link from 'next/link'
import { SignInButton, SignUpButton, useAuth } from '@clerk/nextjs'
import { LayoutGrid, Zap, Trophy, ArrowRight } from 'lucide-react'

const FEATURES = [
  {
    icon: <LayoutGrid size={18} />,
    title: 'Visual Architecture Builder',
    desc: 'Drag-and-drop servers, databases, caches, and load balancers onto a live canvas.',
  },
  {
    icon: <Zap size={18} />,
    title: 'Real Simulation',
    desc: 'M/M/1 queue math drives realistic latency, error rates, and cost — fully in the browser.',
  },
  {
    icon: <Trophy size={18} />,
    title: 'Guided Challenges',
    desc: 'Pass SLA targets, stay within budget. Multiple valid solutions, just like the real world.',
  },
]

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth()

  return (
    <div className="h-full overflow-y-auto bg-gray-950 text-gray-100">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-800/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
            <LayoutGrid size={14} className="text-white" />
          </div>
          <span className="text-[15px] font-bold tracking-tight text-white">Poly-SD</span>
        </div>

        <div className="flex items-center gap-2">
          {isLoaded && (
            isSignedIn ? (
              <>
                <Link
                  href="/sandbox"
                  className="px-3 py-1.5 rounded-lg text-gray-400 hover:text-gray-200 text-[13px] transition-colors"
                >
                  Free Play
                </Link>
                <Link
                  href="/campaign"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-medium transition-colors"
                >
                  Campaign →
                </Link>
              </>
            ) : (
              <>
                <SignInButton mode="modal">
                  <button className="px-3 py-1.5 rounded-lg text-gray-400 hover:text-gray-200 text-[13px] transition-colors">
                    Sign in
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-medium transition-colors">
                    Sign up free
                  </button>
                </SignUpButton>
              </>
            )
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-8 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[12px] font-medium mb-6">
          <Zap size={11} /> Learn by building
        </div>

        <h1 className="text-5xl font-bold text-white leading-tight mb-4">
          Master distributed systems<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">
            by designing them
          </span>
        </h1>
        <p className="text-[17px] text-gray-500 leading-relaxed mb-10 max-w-xl mx-auto">
          A visual sandbox game where you build architectures, run simulations, and
          learn why systems fail — and how to fix them.
        </p>

        {isLoaded && (
          isSignedIn ? (
            <div className="flex items-center justify-center gap-3">
              <Link
                href="/campaign"
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[15px] transition-colors shadow-lg shadow-blue-500/25"
              >
                Go to Campaign <ArrowRight size={16} />
              </Link>
              <Link
                href="/sandbox"
                className="px-6 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-[15px] transition-colors"
              >
                Free Play
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-3">
                <SignUpButton mode="modal">
                  <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[15px] transition-colors shadow-lg shadow-blue-500/25">
                    Get started free <ArrowRight size={16} />
                  </button>
                </SignUpButton>
                <SignInButton mode="modal">
                  <button className="px-6 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-[15px] transition-colors">
                    Sign in
                  </button>
                </SignInButton>
              </div>
              <Link
                href="/play/T-0"
                className="text-[13px] text-gray-600 hover:text-gray-400 transition-colors"
              >
                Try the tutorial without an account →
              </Link>
            </div>
          )
        )}
      </section>

      {/* Features */}
      <section className="max-w-3xl mx-auto px-8 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="p-5 rounded-xl bg-gray-900/60 border border-gray-800/60">
              <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-blue-400 mb-3">
                {f.icon}
              </div>
              <h3 className="text-[13px] font-semibold text-gray-200 mb-1">{f.title}</h3>
              <p className="text-[12px] text-gray-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800/40 px-8 py-5 text-center">
        <p className="text-[12px] text-gray-700">Poly-SD · Distributed systems, made playable</p>
      </footer>
    </div>
  )
}
