'use client'

import { create } from 'zustand'
import type { SimSnapshot, TrafficConfig, TrafficWaypoint, WorkerInbound, WorkerOutbound, ChaosEvent, ChaosType } from '@/sim/types'
import { applyDelta } from '@/sim/delta'
import { makeChaosEvent } from '@/sim/chaos'
import { DEFAULT_TRAFFIC, presetToWaypoints } from '@/sim/types'
import type { TrafficPreset } from '@/lib/components/definitions'
import { useArchitectureStore } from './architectureStore'
import { mergeSnapshotMap } from './snapshotMerge'
import { useChallengeStore } from './challengeStore'
import { evaluateChallenge } from '@/lib/challenges/evaluator'
import { recordCompletion } from '@/lib/actions/completions'
import { saveDraft } from '@/lib/actions/drafts'
import { WorkerManager } from './workerManager'
import { RingBuffer } from './ringBuffer'

// Persistent worker — created once, reused across simulation runs.
const workerManager = new WorkerManager(
  () => new Worker(new URL('@/sim/worker.ts', import.meta.url), { type: 'module' })
)

export type SimStatus = 'idle' | 'running' | 'paused' | 'complete'

const MAX_HISTORY = 60

type SimState = {
  status: SimStatus
  trafficConfig: TrafficConfig
  speed: number
  currentSnapshot: SimSnapshot | null
  history: RingBuffer<SimSnapshot>
  nodeSnapshots: Record<string, SimSnapshot['nodes'][number]>
  edgeSnapshots: Record<string, SimSnapshot['edges'][number]>

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
  destroyWorker: () => void
}

export const useSimStore = create<SimState>((set, get) => ({
  status: 'idle',
  trafficConfig: DEFAULT_TRAFFIC,
  speed: 5,
  currentSnapshot: null,
  history: new RingBuffer<SimSnapshot>(MAX_HISTORY),
  nodeSnapshots: {},
  edgeSnapshots: {},

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
    workerManager.worker?.postMessage({ type: 'SET_SPEED', multiplier: s } satisfies WorkerInbound)
    set({ speed: s })
  },

  startSimulation: () => {
    const { trafficConfig, speed } = get()

    const { nodes, edges } = useArchitectureStore.getState()
    if (nodes.length === 0) return

    // Persist draft so the user can resume later (fire-and-forget)
    const activeChallengeForDraft = useChallengeStore.getState().activeChallenge
    if (activeChallengeForDraft) {
      saveDraft(activeChallengeForDraft.id, nodes, edges).catch(console.error)
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

    const isNew = !workerManager.worker
    const worker = workerManager.getOrCreate()

    if (isNew) {
      worker.onmessage = (e: MessageEvent<WorkerOutbound>) => {
        const msg = e.data
        if (msg.type === 'TICK') {
          const { snapshot } = msg
          set((s) => ({
            currentSnapshot: snapshot,
            nodeSnapshots: mergeSnapshotMap(s.nodeSnapshots, snapshot.nodes),
            edgeSnapshots: mergeSnapshotMap(s.edgeSnapshots, snapshot.edges),
            history: s.history.push(snapshot),
          }))
        } else if (msg.type === 'TICK_DELTA') {
          set((s) => {
            if (!s.currentSnapshot) return {}
            const snapshot = applyDelta(s.currentSnapshot, msg.delta)
            return {
              currentSnapshot: snapshot,
              nodeSnapshots: mergeSnapshotMap(s.nodeSnapshots, snapshot.nodes),
              edgeSnapshots: mergeSnapshotMap(s.edgeSnapshots, snapshot.edges),
              history: s.history.push(snapshot),
            }
          })
        } else if (msg.type === 'COMPLETE') {
          set({ status: 'complete' })
          // Evaluate against active challenge if one is loaded
          const { activeChallenge, setEvalResult } = useChallengeStore.getState()
          if (activeChallenge) {
            const { history, nodeSnapshots } = get()
            const componentCount = Object.keys(nodeSnapshots).length
            const result = evaluateChallenge(activeChallenge, history.toArray(), componentCount)
            setEvalResult(result)
            // Persist completion (fire-and-forget — UI already has the result)
            const { nodes: completionNodes, edges: completionEdges } = useArchitectureStore.getState()
            recordCompletion(activeChallenge.id, result, completionNodes, completionEdges).catch(console.error)
          }
        } else if (msg.type === 'ERROR') {
          console.error('Sim worker error:', msg.message)
          set({ status: 'idle' })
        }
      }

      worker.onerror = (err) => {
        console.error('Sim worker crashed:', err)
        workerManager.dispose()
        set({ status: 'idle' })
      }
    }

    // Stop any running engine before starting a new one
    worker.postMessage({ type: 'STOP' } satisfies WorkerInbound)

    const { activeChallenge } = useChallengeStore.getState()
    worker.postMessage({
      type: 'START',
      graph,
      traffic: trafficConfig,
      speedMultiplier: speed,
      chaosSchedule: activeChallenge?.chaosSchedule ?? [],
    } satisfies WorkerInbound)

    set({ status: 'running', history: new RingBuffer<SimSnapshot>(MAX_HISTORY), currentSnapshot: null, nodeSnapshots: {}, edgeSnapshots: {} })
  },

  pauseSimulation: () => {
    workerManager.worker?.postMessage({ type: 'PAUSE' } satisfies WorkerInbound)
    set({ status: 'paused' })
  },

  resumeSimulation: () => {
    workerManager.worker?.postMessage({ type: 'RESUME' } satisfies WorkerInbound)
    set({ status: 'running' })
  },

  stopSimulation: () => {
    // Send STOP to the engine but keep the worker alive for reuse
    workerManager.worker?.postMessage({ type: 'STOP' } satisfies WorkerInbound)
    set({ status: 'idle', currentSnapshot: null, history: new RingBuffer<SimSnapshot>(MAX_HISTORY), nodeSnapshots: {}, edgeSnapshots: {} })
  },

  injectChaos: (nodeId, type, durationMs = 15_000, magnitude = 5) => {
    const { currentSnapshot } = get()
    if (!workerManager.worker || !currentSnapshot) return
    const event = makeChaosEvent(nodeId, type, currentSnapshot.simTimeMs, durationMs, magnitude)
    workerManager.worker.postMessage({ type: 'INJECT_CHAOS', event } satisfies WorkerInbound)
  },

  destroyWorker: () => {
    workerManager.worker?.postMessage({ type: 'STOP' } satisfies WorkerInbound)
    workerManager.dispose()
    set({ status: 'idle', currentSnapshot: null, history: new RingBuffer<SimSnapshot>(MAX_HISTORY), nodeSnapshots: {}, edgeSnapshots: {} })
  },
}))
