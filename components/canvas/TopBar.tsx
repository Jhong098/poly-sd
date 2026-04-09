'use client'

import { useState, useTransition } from 'react'
import { Play, Pause, Square, LayoutGrid, ChevronDown, Plus, X, Save, Check } from 'lucide-react'
import { UserButton, SignInButton, useAuth } from '@clerk/nextjs'
import { useSimStore } from '@/lib/store/simStore'
import { useArchitectureStore } from '@/lib/store/architectureStore'
import { saveArchitecture } from '@/lib/actions/architectures'
import { presetToWaypoints } from '@/sim/types'
import type { TrafficPreset } from '@/lib/components/definitions'

const SPEED_OPTIONS = [1, 5, 10] as const

// ── Traffic curve preview ─────────────────────────────────────────────────────

function CurvePreview({ waypoints, durationMs }: { waypoints: { timeMs: number; rps: number }[]; durationMs: number }) {
  if (waypoints.length < 2) return null
  const sorted = [...waypoints].sort((a, b) => a.timeMs - b.timeMs)
  const maxRps = Math.max(...sorted.map((w) => w.rps), 1)
  const W = 80, H = 24
  const pts = sorted.map((w) => `${(w.timeMs / durationMs) * W},${H - (w.rps / maxRps) * H}`).join(' ')
  return (
    <svg width={W} height={H} className="overflow-visible">
      <polyline points={pts} fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

// ── Waypoint editor popover ───────────────────────────────────────────────────

function TrafficPopover({ onClose }: { onClose: () => void }) {
  const { trafficConfig, setDuration, setWaypoints, applyPreset } = useSimStore()
  const { waypoints, durationMs } = trafficConfig

  const [presetRps, setPresetRps] = useState(200)
  const [presetMult, setPresetMult] = useState(5)

  const durationSec = durationMs / 1000

  function handlePreset(preset: TrafficPreset) {
    applyPreset(preset, presetRps, presetMult)
  }

  function updateWaypoint(idx: number, field: 'timeMs' | 'rps', value: number) {
    const updated = waypoints.map((w, i) =>
      i === idx ? { ...w, [field]: Math.max(0, value) } : w,
    )
    setWaypoints(updated)
  }

  function addWaypoint() {
    const last = waypoints[waypoints.length - 1]
    const newTime = Math.min((last?.timeMs ?? 0) + durationMs * 0.1, durationMs)
    setWaypoints([...waypoints, { timeMs: newTime, rps: last?.rps ?? 200 }])
  }

  function removeWaypoint(idx: number) {
    if (waypoints.length <= 2) return
    setWaypoints(waypoints.filter((_, i) => i !== idx))
  }

  const sorted = [...waypoints].sort((a, b) => a.timeMs - b.timeMs)

  return (
    <div className="absolute top-full left-0 mt-1 z-50 w-96 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl shadow-black/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] font-semibold text-gray-200">Traffic Configuration</p>
        <button onClick={onClose} className="text-gray-600 hover:text-gray-400">
          <X size={14} />
        </button>
      </div>

      {/* Duration */}
      <div className="flex items-center gap-2 mb-4">
        <label className="text-[11px] text-gray-500 w-16">Duration</label>
        <input
          type="number"
          value={durationSec}
          min={10}
          max={3600}
          onChange={(e) => setDuration(Number(e.target.value) * 1000)}
          className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-[12px] text-gray-200 font-mono focus:outline-none"
        />
        <span className="text-[11px] text-gray-600">seconds</span>

        {/* Curve preview */}
        <div className="ml-auto">
          <CurvePreview waypoints={waypoints} durationMs={durationMs} />
        </div>
      </div>

      {/* Quick presets */}
      <div className="mb-3">
        <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Quick presets</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={presetRps}
            min={1}
            onChange={(e) => setPresetRps(Number(e.target.value))}
            className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-[12px] text-gray-200 font-mono focus:outline-none"
            title="Base RPS"
          />
          <span className="text-[11px] text-gray-600">RPS ×</span>
          <input
            type="number"
            value={presetMult}
            min={2}
            max={20}
            onChange={(e) => setPresetMult(Number(e.target.value))}
            className="w-12 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-[12px] text-gray-200 font-mono focus:outline-none"
            title="Peak multiplier"
          />
          <div className="flex gap-1 ml-1">
            {(['steady', 'spike', 'ramp'] as TrafficPreset[]).map((p) => (
              <button
                key={p}
                onClick={() => handlePreset(p)}
                className="px-2 py-1 text-[11px] rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 border border-gray-700 capitalize"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Waypoint editor */}
      <div>
        <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Waypoints</p>
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {sorted.map((w, i) => {
            const origIdx = waypoints.indexOf(w)
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] text-gray-700 w-3">{i + 1}</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={Math.round(w.timeMs / 1000)}
                    min={0}
                    max={durationSec}
                    onChange={(e) => updateWaypoint(origIdx, 'timeMs', Number(e.target.value) * 1000)}
                    className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-[11px] text-gray-200 font-mono focus:outline-none"
                  />
                  <span className="text-[10px] text-gray-600">s</span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={w.rps}
                    min={0}
                    onChange={(e) => updateWaypoint(origIdx, 'rps', Number(e.target.value))}
                    className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-[11px] text-gray-200 font-mono focus:outline-none"
                  />
                  <span className="text-[10px] text-gray-600">RPS</span>
                </div>
                <button
                  onClick={() => removeWaypoint(origIdx)}
                  disabled={waypoints.length <= 2}
                  className="text-gray-700 hover:text-red-400 disabled:opacity-30 ml-auto"
                >
                  <X size={12} />
                </button>
              </div>
            )
          })}
        </div>
        <button
          onClick={addWaypoint}
          className="mt-2 flex items-center gap-1 text-[11px] text-gray-600 hover:text-gray-300 transition-colors"
        >
          <Plus size={12} /> Add waypoint
        </button>
      </div>

      <p className="text-[10px] text-gray-700 mt-3">
        Note: Client nodes on the canvas use their own RPS config and override global traffic.
      </p>
    </div>
  )
}

// ── Save dialog ───────────────────────────────────────────────────────────────

function SaveDialog({ onClose }: { onClose: () => void }) {
  const { nodes, edges } = useArchitectureStore()
  const [name, setName] = useState('My Architecture')
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      await saveArchitecture(name, nodes, edges)
      setSaved(true)
      setTimeout(onClose, 800)
    })
  }

  return (
    <div className="absolute top-full right-0 mt-1 z-50 w-72 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl shadow-black/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] font-semibold text-gray-200">Save Architecture</p>
        <button onClick={onClose} className="text-gray-600 hover:text-gray-400"><X size={14} /></button>
      </div>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        placeholder="Architecture name"
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-[13px] text-gray-200 focus:outline-none focus:border-gray-500 mb-3"
      />
      <button
        onClick={handleSave}
        disabled={isPending || !name.trim()}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-[12px] font-medium transition-colors"
      >
        {saved ? <><Check size={13} /> Saved!</> : isPending ? 'Saving…' : <><Save size={13} /> Save</>}
      </button>
    </div>
  )
}

// ── TopBar ────────────────────────────────────────────────────────────────────

export function TopBar() {
  const [showTraffic, setShowTraffic] = useState(false)
  const [showSave, setShowSave] = useState(false)

  const { isSignedIn } = useAuth()
  const { nodes } = useArchitectureStore()
  const { status, speed, trafficConfig, setSpeed, startSimulation, pauseSimulation, resumeSimulation, stopSimulation } = useSimStore()

  const hasClients = nodes.some((n) => n.data.componentType === 'client')
  const canRun = nodes.length > 0 && status === 'idle'
  const isRunning = status === 'running'
  const isPaused = status === 'paused'
  const isActive = isRunning || isPaused || status === 'complete'

  const { waypoints, durationMs } = trafficConfig
  const maxRps = Math.max(...waypoints.map((w) => w.rps))

  return (
    <header className="h-12 flex-shrink-0 flex items-center gap-3 px-4 bg-gray-900/90 border-b border-gray-800/60 backdrop-blur-sm relative">
      {/* Logo */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
          <LayoutGrid size={13} className="text-white" />
        </div>
        <span className="text-[14px] font-bold tracking-tight text-gray-100">Poly-SD</span>
      </div>

      <div className="h-5 w-px bg-gray-800" />

      {/* Traffic summary + editor trigger */}
      <div className="relative">
        <button
          onClick={() => setShowTraffic((v) => !v)}
          disabled={isActive}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[12px] transition-colors
            ${isActive
              ? 'border-gray-800 text-gray-600 cursor-not-allowed'
              : 'border-gray-700/60 bg-gray-800/50 hover:bg-gray-800 text-gray-300 hover:text-gray-100'
            }`}
        >
          {!hasClients && <CurvePreview waypoints={waypoints} durationMs={durationMs} />}
          <div className="text-left">
            {hasClients
              ? <span className="text-amber-400 font-medium">Client nodes active</span>
              : <span>{maxRps.toLocaleString()} RPS peak · {durationMs / 1000}s</span>
            }
          </div>
          {!isActive && <ChevronDown size={12} className="text-gray-600" />}
        </button>

        {showTraffic && !isActive && (
          <TrafficPopover onClose={() => setShowTraffic(false)} />
        )}
      </div>

      <div className="h-5 w-px bg-gray-800" />

      {/* Playback */}
      <div className="flex items-center gap-1.5">
        {!isActive ? (
          <button
            onClick={startSimulation}
            disabled={!canRun}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white text-[12px] font-medium transition-colors"
          >
            <Play size={11} />
            Run
          </button>
        ) : (
          <>
            {isRunning && (
              <button onClick={pauseSimulation} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-600/80 hover:bg-yellow-500/80 text-white text-[12px] font-medium transition-colors">
                <Pause size={11} /> Pause
              </button>
            )}
            {isPaused && (
              <button onClick={resumeSimulation} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[12px] font-medium transition-colors">
                <Play size={11} /> Resume
              </button>
            )}
            <button onClick={stopSimulation} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-[12px] font-medium transition-colors">
              <Square size={11} /> Stop
            </button>
          </>
        )}
      </div>

      {/* Speed */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-gray-600">Speed</span>
        <div className="flex rounded-md overflow-hidden border border-gray-700/60">
          {SPEED_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-2 py-1 text-[11px] font-mono font-medium transition-colors ${
                speed === s ? 'bg-gray-600 text-gray-100' : 'bg-gray-800/80 text-gray-500 hover:text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      {/* Right side: hint / save / user */}
      <div className="ml-auto flex items-center gap-3">
        {nodes.length === 0 && status === 'idle' && (
          <span className="text-[11px] text-gray-700">← drag a Client + components onto the canvas</span>
        )}

        {/* Save button (only in sandbox, only when signed in) */}
        {isSignedIn && nodes.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowSave((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-700/60 bg-gray-800/50 hover:bg-gray-800 text-gray-400 hover:text-gray-200 text-[12px] transition-colors"
            >
              <Save size={12} /> Save
            </button>
            {showSave && <SaveDialog onClose={() => setShowSave(false)} />}
          </div>
        )}

        {/* Auth */}
        {isSignedIn ? (
          <UserButton />
        ) : (
          <SignInButton mode="modal">
            <button className="px-3 py-1.5 rounded-lg border border-gray-700/60 bg-gray-800/50 hover:bg-gray-800 text-gray-400 hover:text-gray-200 text-[12px] transition-colors">
              Sign in
            </button>
          </SignInButton>
        )}
      </div>
    </header>
  )
}
