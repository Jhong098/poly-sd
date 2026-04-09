import type { SimGraph, SimSnapshot, TrafficConfig, ChaosEvent } from './types'
import type { ClientConfig } from '@/lib/components/definitions'
import { type ComponentState } from './components'
import { sampleTraffic, sampleClientPreset } from './traffic'
import { resolveGraph } from './graph'
import { eventForNode } from './chaos'

const TICK_SIM_MS = 200

type EngineCallbacks = {
  onTick: (snapshot: SimSnapshot) => void
  onComplete: () => void
}

export function createEngine(
  graph: SimGraph,
  traffic: TrafficConfig,
  initialSpeed: number,
  callbacks: EngineCallbacks,
  chaosSchedule: ChaosEvent[] = [],
) {
  let simTimeMs = 0
  let speed = initialSpeed
  let running = false
  let timerId: ReturnType<typeof setTimeout> | null = null

  // Mutable chaos pool — starts with the schedule, grows via injectChaos()
  const chaosPool: ChaosEvent[] = [...chaosSchedule]

  const componentState: Record<string, ComponentState> = {}
  for (const node of graph.nodes) componentState[node.id] = { queuedRequests: 0 }

  const clientNodes = graph.nodes.filter((n) => n.componentType === 'client')
  const hasClients = clientNodes.length > 0

  function scheduleTick() {
    timerId = setTimeout(tick, TICK_SIM_MS / speed)
  }

  function tick() {
    if (!running) return

    const clientRpsMap: Record<string, number> = {}
    if (hasClients) {
      for (const node of clientNodes) {
        const cfg = node.config as ClientConfig
        clientRpsMap[node.id] = sampleClientPreset(
          cfg.preset,
          cfg.rps,
          cfg.peakMultiplier,
          traffic.durationMs,
          simTimeMs,
        )
      }
    }

    // Build per-node chaos modifier map for this tick
    const chaosMap: Record<string, ChaosEvent> = {}
    for (const node of graph.nodes) {
      const evt = eventForNode(chaosPool, node.id, simTimeMs)
      if (evt) chaosMap[node.id] = evt
    }

    const globalRps = hasClients ? 0 : sampleTraffic(traffic, simTimeMs)
    const snapshot = resolveGraph(graph, componentState, globalRps, simTimeMs, clientRpsMap, chaosMap)
    callbacks.onTick(snapshot)

    simTimeMs += TICK_SIM_MS
    if (simTimeMs >= traffic.durationMs) {
      running = false
      callbacks.onComplete()
      return
    }

    scheduleTick()
  }

  return {
    start()  { running = true; tick() },
    pause()  { running = false; if (timerId !== null) clearTimeout(timerId) },
    resume() { running = true; tick() },
    stop()   { running = false; if (timerId !== null) clearTimeout(timerId) },
    setSpeed(s: number) { speed = s },
    injectChaos(event: ChaosEvent) {
      // Remap startSimMs to current sim time (player injected right now)
      chaosPool.push({ ...event, startSimMs: simTimeMs })
    },
  }
}
