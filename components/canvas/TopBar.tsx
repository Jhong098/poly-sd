'use client'

import { useState, useTransition, useEffect } from 'react'
import { Play, Pause, Square, LayoutGrid, ChevronDown, Plus, X, Save, Check, ChevronLeft, Share2, Upload } from 'lucide-react'
import Link from 'next/link'
import { UserButton, SignInButton, useAuth } from '@clerk/nextjs'
import { useSimStore } from '@/lib/store/simStore'
import { useArchitectureStore } from '@/lib/store/architectureStore'
import { useChallengeStore } from '@/lib/store/challengeStore'
import { saveArchitecture } from '@/lib/actions/architectures'
import { createReplay } from '@/lib/actions/replays'
import { presetToWaypoints } from '@/sim/types'
import type { TrafficPreset } from '@/lib/components/definitions'
import type { EvalResult } from '@/lib/challenges/types'
import { PublishWizard } from '@/components/challenge/PublishWizard'
import { checkCanPublish } from '@/lib/actions/community-challenges'
import { COMMUNITY_PUBLISH_MIN_COMPLETIONS } from '@/lib/config'

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
      <polyline points={pts} fill="none" stroke="var(--color-cyan)" strokeWidth="1.5" strokeLinejoin="round" />
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
    <div className="absolute top-full left-0 mt-1 z-50 w-96 bg-raised border border-edge shadow-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-bold tracking-widest uppercase text-cyan">// Traffic Config</p>
        <button onClick={onClose} className="text-ink-3 hover:text-ink-2">
          <X size={14} />
        </button>
      </div>

      {/* Duration */}
      <div className="flex items-center gap-2 mb-4">
        <label className="text-[10px] text-ink-3 tracking-wider w-16 uppercase">Duration</label>
        <input
          type="number"
          value={durationSec}
          min={10}
          max={3600}
          onChange={(e) => setDuration(Number(e.target.value) * 1000)}
          className="w-20 bg-surface border border-edge px-2 py-1 text-[12px] text-ink focus:outline-none focus:border-edge-strong"
        />
        <span className="text-[10px] text-ink-3">seconds</span>
        <div className="ml-auto">
          <CurvePreview waypoints={waypoints} durationMs={durationMs} />
        </div>
      </div>

      {/* Quick presets */}
      <div className="mb-3">
        <p className="text-[10px] text-ink-3 uppercase tracking-widest mb-2">Quick presets</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={presetRps}
            min={1}
            onChange={(e) => setPresetRps(Number(e.target.value))}
            className="w-20 bg-surface border border-edge px-2 py-1 text-[12px] text-ink focus:outline-none"
            title="Base RPS"
          />
          <span className="text-[10px] text-ink-3">RPS ×</span>
          <input
            type="number"
            value={presetMult}
            min={2}
            max={20}
            onChange={(e) => setPresetMult(Number(e.target.value))}
            className="w-12 bg-surface border border-edge px-2 py-1 text-[12px] text-ink focus:outline-none"
            title="Peak multiplier"
          />
          <div className="flex gap-1 ml-1">
            {(['steady', 'spike', 'ramp'] as TrafficPreset[]).map((p) => (
              <button
                key={p}
                onClick={() => handlePreset(p)}
                className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-surface hover:bg-overlay text-ink-3 hover:text-ink-2 border border-edge capitalize transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Waypoint editor */}
      <div>
        <p className="text-[10px] text-ink-3 uppercase tracking-widest mb-2">Waypoints</p>
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {sorted.map((w, i) => {
            const origIdx = waypoints.indexOf(w)
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] text-ink-3 w-3">{i + 1}</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={Math.round(w.timeMs / 1000)}
                    min={0}
                    max={durationSec}
                    onChange={(e) => updateWaypoint(origIdx, 'timeMs', Number(e.target.value) * 1000)}
                    className="w-16 bg-surface border border-edge px-2 py-1 text-[11px] text-ink focus:outline-none"
                  />
                  <span className="text-[10px] text-ink-3">s</span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={w.rps}
                    min={0}
                    onChange={(e) => updateWaypoint(origIdx, 'rps', Number(e.target.value))}
                    className="w-20 bg-surface border border-edge px-2 py-1 text-[11px] text-ink focus:outline-none"
                  />
                  <span className="text-[10px] text-ink-3">RPS</span>
                </div>
                <button
                  onClick={() => removeWaypoint(origIdx)}
                  disabled={waypoints.length <= 2}
                  className="text-ink-3 hover:text-err disabled:opacity-30 ml-auto transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            )
          })}
        </div>
        <button
          onClick={addWaypoint}
          className="mt-2 flex items-center gap-1 text-[10px] text-ink-3 hover:text-ink-2 uppercase tracking-wider transition-colors"
        >
          <Plus size={12} /> Add waypoint
        </button>
      </div>

      <p className="text-[10px] text-ink-3 mt-3 opacity-60">
        // Client nodes on the canvas override global traffic config
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
    <div className="absolute top-full right-0 mt-1 z-50 w-72 bg-raised border border-edge shadow-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-bold tracking-widest uppercase text-cyan">// Save</p>
        <button onClick={onClose} className="text-ink-3 hover:text-ink-2"><X size={14} /></button>
      </div>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        placeholder="Architecture name"
        className="w-full bg-surface border border-edge px-3 py-2 text-[13px] text-ink focus:outline-none focus:border-edge-strong mb-3 placeholder:text-ink-off"
      />
      <button
        onClick={handleSave}
        disabled={isPending || !name.trim()}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-cyan hover:bg-cyan/90 disabled:bg-surface disabled:text-ink-3 text-base text-[11px] font-bold uppercase tracking-wider transition-colors"
      >
        {saved ? <><Check size={13} /> Saved</> : isPending ? 'Saving…' : <><Save size={13} /> Save</>}
      </button>
    </div>
  )
}

// ── TopBar ────────────────────────────────────────────────────────────────────

export function TopBar() {
  const [showTraffic, setShowTraffic] = useState(false)
  const [showSave, setShowSave] = useState(false)
  const [shareState, setShareState] = useState<'idle' | 'sharing' | 'copied' | 'error'>('idle')
  const [, startShareTransition] = useTransition()
  const [showPublish, setShowPublish] = useState(false)
  const [canPublish, setCanPublish] = useState(false)
  const [publishSnap, setPublishSnap] = useState<{ edges: import('@/lib/store/architectureStore').ComponentEdge[]; simP99: number; simCost: number } | null>(null)

  const { isSignedIn } = useAuth()
  const nodes = useArchitectureStore((s) => s.nodes)
  const { activeChallenge, evalResult } = useChallengeStore()
  const status = useSimStore((s) => s.status)
  const speed = useSimStore((s) => s.speed)
  const trafficConfig = useSimStore((s) => s.trafficConfig)
  const setSpeed = useSimStore((s) => s.setSpeed)
  const startSimulation = useSimStore((s) => s.startSimulation)
  const pauseSimulation = useSimStore((s) => s.pauseSimulation)
  const resumeSimulation = useSimStore((s) => s.resumeSimulation)
  const stopSimulation = useSimStore((s) => s.stopSimulation)

  useEffect(() => {
    if (!isSignedIn || activeChallenge) return
    checkCanPublish().then(setCanPublish)
  }, [isSignedIn, activeChallenge])

  function handleShare() {
    setShareState('sharing')
    startShareTransition(async () => {
      // Access history/snapshots/edges lazily — not subscribed at render time
      const { history, nodeSnapshots } = useSimStore.getState()
      const { edges } = useArchitectureStore.getState()
      // For sandbox (no activeChallenge), build a minimal EvalResult from history
      let result: EvalResult
      if (evalResult) {
        result = evalResult
      } else {
        const snap = history.length > 0 ? history[history.length - 1] : null
        const componentCount = Object.keys(nodeSnapshots).length
        result = {
          passed: false,
          passedLatency: false,
          passedErrors: false,
          passedBudget: false,
          scores: { performance: 0, cost: 0, simplicity: 0, resilience: 0, total: 0 },
          metrics: {
            p99LatencyMs: snap?.systemP99LatencyMs ?? 0,
            errorRate: snap?.systemErrorRate ?? 0,
            costPerHour: snap?.systemCostPerHour ?? 0,
            componentCount,
          },
        }
      }
      const res = await createReplay(activeChallenge?.id ?? null, nodes, edges, result)
      if ('error' in res) { setShareState('error'); return }
      await navigator.clipboard.writeText(`${window.location.origin}/replay/${res.id}`)
      setShareState('copied')
      setTimeout(() => setShareState('idle'), 2500)
    })
  }

  function openPublishWizard() {
    // Capture snapshot data at click time — no render-time subscription to history/edges needed
    const { history } = useSimStore.getState()
    const { edges } = useArchitectureStore.getState()
    const snap = history.length > 0 ? history[history.length - 1] : null
    setPublishSnap({
      edges,
      simP99: snap?.systemP99LatencyMs ?? 0,
      simCost: snap?.systemCostPerHour ?? 0,
    })
    setShowPublish(true)
  }

  const hasClients = nodes.some((n) => n.data.componentType === 'client')
  const canRun = nodes.length > 0 && status === 'idle'
  const isRunning = status === 'running'
  const isPaused = status === 'paused'
  const isActive = isRunning || isPaused || status === 'complete'

  const { waypoints, durationMs } = trafficConfig
  const maxRps = Math.max(...waypoints.map((w) => w.rps))

  return (
    <header className="h-11 flex-shrink-0 flex items-center gap-3 px-4 bg-raised border-b border-edge relative">
      {/* Logo + back nav */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link href="/" className="flex items-center gap-1.5 group">
          <LayoutGrid size={13} className="text-cyan" />
          <span className="text-[13px] font-bold tracking-widest text-cyan">POLY-SD</span>
        </Link>
        <Link
          href="/campaign"
          className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-ink-3 hover:text-ink-2 transition-colors"
        >
          <ChevronLeft size={11} />Campaign
        </Link>
      </div>

      <div className="h-4 w-px bg-edge" />

      {/* Traffic summary + editor trigger */}
      <div className="relative">
        <button
          onClick={() => setShowTraffic((v) => !v)}
          disabled={isActive}
          className={`flex items-center gap-2 px-2.5 py-1.5 border text-[11px] transition-colors
            ${isActive
              ? 'border-edge-dim text-ink-3 cursor-not-allowed'
              : 'border-edge bg-surface hover:bg-overlay text-ink-2 hover:text-ink'
            }`}
        >
          {!hasClients && <CurvePreview waypoints={waypoints} durationMs={durationMs} />}
          <div className="text-left">
            {hasClients
              ? <span className="text-warn font-semibold">Client nodes active</span>
              : <span>{maxRps.toLocaleString()} RPS peak · {durationMs / 1000}s</span>
            }
          </div>
          {!isActive && <ChevronDown size={11} className="text-ink-3" />}
        </button>

        {showTraffic && !isActive && (
          <TrafficPopover onClose={() => setShowTraffic(false)} />
        )}
      </div>

      <div className="h-4 w-px bg-edge" />

      {/* Playback */}
      <div className="flex items-center gap-1.5">
        {!isActive ? (
          <button
            onClick={startSimulation}
            disabled={!canRun}
            data-testid="run-button"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan hover:bg-cyan/90 disabled:bg-surface disabled:text-ink-3 disabled:cursor-not-allowed text-base text-[11px] font-bold uppercase tracking-wider transition-colors"
          >
            <Play size={11} />
            Run
          </button>
        ) : (
          <>
            {isRunning && (
              <button
                onClick={pauseSimulation}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-warn text-warn text-[11px] font-bold uppercase tracking-wider transition-colors hover:bg-warn/10"
              >
                <Pause size={11} /> Pause
              </button>
            )}
            {isPaused && (
              <button
                onClick={resumeSimulation}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan hover:bg-cyan/90 text-base text-[11px] font-bold uppercase tracking-wider transition-colors"
              >
                <Play size={11} /> Resume
              </button>
            )}
            <button
              onClick={stopSimulation}
              className="flex items-center gap-1.5 px-2.5 py-1.5 border border-edge bg-surface hover:bg-overlay text-ink-2 text-[11px] font-bold uppercase tracking-wider transition-colors"
            >
              <Square size={11} /> Stop
            </button>
          </>
        )}
      </div>

      {/* Speed */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-ink-3 uppercase tracking-widest">Speed</span>
        <div className="flex border border-edge">
          {SPEED_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-2.5 py-1 text-[11px] font-bold tracking-wider transition-colors border-l border-edge first:border-l-0 ${
                speed === s
                  ? 'bg-cyan text-base'
                  : 'bg-raised text-ink-3 hover:text-ink-2 hover:bg-overlay'
              }`}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      {/* Right: status / save / auth */}
      <div className="ml-auto flex items-center gap-3">
        {/* Running indicator */}
        {isActive && (
          <div className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: isRunning ? 'var(--color-ok)' : isPaused ? 'var(--color-warn)' : 'var(--color-cyan)',
              }}
            />
            <span className="text-[10px] text-ink-3 uppercase tracking-wider" data-testid="sim-status">
              {isRunning ? 'Running' : isPaused ? 'Paused' : 'Complete'}
            </span>
          </div>
        )}

        {nodes.length === 0 && status === 'idle' && (
          <span className="text-[10px] text-ink-3 tracking-wider">// drag a Client onto the canvas</span>
        )}

        {status === 'complete' && (
          <button
            onClick={handleShare}
            disabled={shareState === 'sharing'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 border border-edge bg-raised hover:bg-overlay text-ink-3 hover:text-ink-2 text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            {shareState === 'copied'
              ? <><Check size={12} className="text-ok" /> Copied!</>
              : shareState === 'error'
              ? <><X size={12} className="text-err" /> Error</>
              : <><Share2 size={12} /> Share</>
            }
          </button>
        )}

        {isSignedIn && !activeChallenge && status === 'complete' && (
          canPublish ? (
            <button
              onClick={openPublishWizard}
              className="flex items-center gap-1.5 px-2.5 py-1.5 border border-edge bg-raised hover:bg-overlay text-ink-3 hover:text-ink-2 text-[11px] font-bold uppercase tracking-wider transition-colors"
            >
              <Upload size={12} /> Publish
            </button>
          ) : (
            <span
              title={`Complete ${COMMUNITY_PUBLISH_MIN_COMPLETIONS} campaign levels to publish challenges`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 border border-edge-dim text-ink-off text-[11px] font-bold uppercase tracking-wider cursor-not-allowed"
            >
              <Upload size={12} /> Publish
            </span>
          )
        )}

        {isSignedIn && nodes.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowSave((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 border border-edge bg-raised hover:bg-overlay text-ink-3 hover:text-ink-2 text-[11px] font-bold uppercase tracking-wider transition-colors"
            >
              <Save size={12} /> Save
            </button>
            {showSave && <SaveDialog onClose={() => setShowSave(false)} />}
          </div>
        )}

        {isSignedIn ? (
          <UserButton />
        ) : (
          <SignInButton mode="modal">
            <button className="px-3 py-1.5 border border-edge bg-raised hover:bg-overlay text-ink-3 hover:text-ink-2 text-[11px] font-bold uppercase tracking-wider transition-colors">
              Sign in
            </button>
          </SignInButton>
        )}
      </div>
      {showPublish && publishSnap && (
        <PublishWizard
          nodes={nodes}
          edges={publishSnap.edges}
          trafficConfig={trafficConfig}
          simP99={publishSnap.simP99}
          simCost={publishSnap.simCost}
          onClose={() => setShowPublish(false)}
          onPublished={() => {
            setShowPublish(false)
          }}
        />
      )}
    </header>
  )
}
