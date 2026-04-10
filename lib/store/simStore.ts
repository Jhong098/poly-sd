'use client'

import { create } from 'zustand'
import type { SimSnapshot, TrafficConfig, TrafficWaypoint, WorkerInbound, WorkerOutbound, ChaosEvent, ChaosType } from '@/sim/types'
import { makeChaosEvent } from '@/sim/chaos'
import { DEFAULT_TRAFFIC, presetToWaypoints } from '@/sim/types'
import type { TrafficPreset } from '@/lib/components/definitions'
import { useArchitectureStore } from './architectureStore'
import { useChallengeStore } from './challengeStore'
import { evaluateChallenge } from '@/lib/challenges/evaluator'
import { recordCompletion } from '@/lib/actions/completions'
import { saveDraft } from '@/lib/actions/drafts'

export type SimStatus = 'idle' | 'running' | 'paused' | 'complete'

const MAX_HISTORY = 60

type SimState = {
  status: SimStatus
  trafficConfig: TrafficConfig
  speed: number
  currentSnapshot: SimSnapshot | null
  history: SimSnapshot[]
  nodeSnapshots: Record<string, SimSnapshot['nodes'][number]>
  edgeSnapshots: Record<string, SimSnapshot['edges'][number]>
  worker: Worker | null

  // Traffic config actions
  setDuration: (ms: number) => void
  setWaypoints: (waypoints: TrafficWaypoint[]) => void
  applyPreset: (preset: TrafficPreset, baseRps: number, peakMultiplier: number) => void

  // Simulation controls
  setSpeed: (s: number) => void
  startSimulation: () => void
  pauseSimulation: () => void
  resumeSimulation: () => void
  stopSimulation: () => void
  injectChaos: (nodeId: string, type: ChaosType, durationMs?: number, magnitude?: number) => void
}

export const useSimStore = create<SimState>((set, get) => ({
  status: 'idle',
  trafficConfig: DEFAULT_TRAFFIC,
  speed: 5,
  currentSnapshot: null,
  history: [],
  nodeSnapshots: {},
  edgeSnapshots: {},
  worker: null,

  setDuration: (ms) =>
    set((s) => ({ trafficConfig: { ...s.trafficConfig, durationMs: ms } })),

  setWaypoints: (waypoints) =>
    set((s) => ({ trafficConfig: { ...s.trafficConfig, waypoints } })),

  applyPreset: (preset, baseRps, peakMultiplier) =>
    set((s) => ({
      trafficConfig: {
        ...s.trafficConfig,
        waypoints: presetToWaypoints(preset, baseRps, peakMultiplier, s.trafficConfig.durationMs),
      },
    })),

  setSpeed: (s) => {
    get().worker?.postMessage({ type: 'SET_SPEED', multiplier: s } satisfies WorkerInbound)
    set({ speed: s })
  },

  startSimulation: () => {
    const { worker: prev, trafficConfig, speed } = get()
    if (prev) { prev.postMessage({ type: 'STOP' } satisfies WorkerInbound); prev.terminate() }

    const { nodes, edges } = useArchitectureStore.getState()
    if (nodes.length === 0) return

    // Persist draft so the user can resume later (fire-and-forget)
    const { activeChallenge } = useChallengeStore.getState()
    if (activeChallenge) {
      saveDraft(activeChallenge.id, nodes, edges).catch(console.error)
    }

    const graph = {
      nodes: nodes.map((n) => ({
        id: n.id,
        componentType: n.data.componentType,
        config: n.data.config,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        splitWeight: e.data?.splitWeight ?? 1,
      })),
    }

    const worker = new Worker(new URL('@/sim/worker.ts', import.meta.url), { type: 'module' })

    worker.onmessage = (e: MessageEvent<WorkerOutbound>) => {
      const msg = e.data
      if (msg.type === 'TICK') {
        const { snapshot } = msg
        const nodeSnapshots: Record<string, SimSnapshot['nodes'][number]> = {}
        const edgeSnapshots: Record<string, SimSnapshot['edges'][number]> = {}
        for (const n of snapshot.nodes) nodeSnapshots[n.id] = n
        for (const ed of snapshot.edges) edgeSnapshots[ed.id] = ed
        set((s) => ({
          currentSnapshot: snapshot,
          nodeSnapshots,
          edgeSnapshots,
          history: [...s.history.slice(-(MAX_HISTORY - 1)), snapshot],
        }))
      } else if (msg.type === 'COMPLETE') {
        set({ status: 'complete' })
        // Evaluate against active challenge if one is loaded
        const { activeChallenge, setEvalResult } = useChallengeStore.getState()
        if (activeChallenge) {
          const { history, nodeSnapshots } = get()
          const componentCount = Object.keys(nodeSnapshots).length
          const result = evaluateChallenge(activeChallenge, history, componentCount)
          setEvalResult(result)
          // Persist completion (fire-and-forget — UI already has the result)
          const { nodes, edges } = useArchitectureStore.getState()
          recordCompletion(activeChallenge.id, result, nodes, edges).catch(console.error)
        }
      } else if (msg.type === 'ERROR') {
        console.error('Sim worker error:', msg.message)
        set({ status: 'idle' })
      }
    }

    worker.onerror = (err) => {
      console.error('Sim worker crashed:', err)
      set({ status: 'idle', worker: null })
    }

    const { activeChallenge } = useChallengeStore.getState()
    worker.postMessage({
      type: 'START',
      graph,
      traffic: trafficConfig,
      speedMultiplier: speed,
      chaosSchedule: activeChallenge?.chaosSchedule ?? [],
    } satisfies WorkerInbound)

    set({ worker, status: 'running', history: [], currentSnapshot: null, nodeSnapshots: {}, edgeSnapshots: {} })
  },

  pauseSimulation: () => {
    get().worker?.postMessage({ type: 'PAUSE' } satisfies WorkerInbound)
    set({ status: 'paused' })
  },

  resumeSimulation: () => {
    get().worker?.postMessage({ type: 'RESUME' } satisfies WorkerInbound)
    set({ status: 'running' })
  },

  stopSimulation: () => {
    const { worker } = get()
    if (worker) { worker.postMessage({ type: 'STOP' } satisfies WorkerInbound); worker.terminate() }
    set({ status: 'idle', worker: null, currentSnapshot: null, history: [], nodeSnapshots: {}, edgeSnapshots: {} })
  },

  injectChaos: (nodeId, type, durationMs = 15_000, magnitude = 5) => {
    const { worker, currentSnapshot } = get()
    if (!worker || !currentSnapshot) return
    const event = makeChaosEvent(nodeId, type, currentSnapshot.simTimeMs, durationMs, magnitude)
    worker.postMessage({ type: 'INJECT_CHAOS', event } satisfies WorkerInbound)
  },
}))
