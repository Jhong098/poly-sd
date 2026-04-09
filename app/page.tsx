import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-950 gap-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-2">Poly-SD</h1>
        <p className="text-gray-500 text-[15px]">Learn distributed systems design through simulation</p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/campaign"
          className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[14px] transition-colors shadow-lg shadow-blue-500/20"
        >
          Campaign →
        </Link>
        <Link
          href="/sandbox"
          className="px-6 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-[14px] transition-colors"
        >
          Free Play
        </Link>
      </div>
    </div>
  )
}

