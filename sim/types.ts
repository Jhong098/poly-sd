import type { ComponentType, ComponentConfig, TrafficPreset } from '@/lib/components/definitions'

// ── Traffic ──────────────────────────────────────────────────────────────────

export type { TrafficPreset }

/** A point on the traffic curve. The curve is linearly interpolated between waypoints. */
export type TrafficWaypoint = {
  timeMs: number
  rps: number
}

/**
 * Global traffic config — used when no Client nodes are on the canvas.
 * Waypoints define the full RPS curve over the simulation duration.
 */
export type TrafficConfig = {
  durationMs: number
  waypoints: TrafficWaypoint[]
}

export const DEFAULT_TRAFFIC: TrafficConfig = {
  durationMs: 60_000,
  waypoints: [
    { timeMs: 0,      rps: 200 },
    { timeMs: 60_000, rps: 200 },
  ],
}

/** Generate waypoints from a named preset. */
export function presetToWaypoints(
  preset: TrafficPreset,
  baseRps: number,
  peakMultiplier: number,
  durationMs: number,
): TrafficWaypoint[] {
  const peak = baseRps * peakMultiplier
  switch (preset) {
    case 'steady':
      return [{ timeMs: 0, rps: baseRps }, { timeMs: durationMs, rps: baseRps }]
    case 'spike':
      return [
        { timeMs: 0,                     rps: baseRps },
        { timeMs: durationMs * 0.38,     rps: baseRps },
        { timeMs: durationMs * 0.5,      rps: peak    },
        { timeMs: durationMs * 0.62,     rps: baseRps },
        { timeMs: durationMs,            rps: baseRps },
      ]
    case 'ramp':
      return [
        { timeMs: 0,          rps: baseRps },
        { timeMs: durationMs, rps: peak    },
      ]
  }
}

// ── Worker message protocol ──────────────────────────────────────────────────

export type WorkerInbound =
  | { type: 'START'; graph: SimGraph; traffic: TrafficConfig; speedMultiplier: number; chaosSchedule?: ChaosEvent[] }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'STOP' }
  | { type: 'SET_SPEED'; multiplier: number }
  | { type: 'INJECT_CHAOS'; event: ChaosEvent }

export type WorkerOutbound =
  | { type: 'TICK'; snapshot: SimSnapshot }
  | { type: 'COMPLETE' }
  | { type: 'ERROR'; message: string }

// ── Graph ────────────────────────────────────────────────────────────────────

export type SimGraph = {
  nodes: SimNode[]
  edges: SimEdge[]
}

export type SimNode = {
  id: string
  componentType: ComponentType
  config: ComponentConfig
}

export type SimEdge = {
  id: string
  source: string
  target: string
  splitWeight: number   // relative weight for traffic distribution (default 1)
}

// ── Snapshots ────────────────────────────────────────────────────────────────

export type NodeStatus = 'idle' | 'healthy' | 'warm' | 'hot' | 'saturated' | 'failed'

// ── Chaos ────────────────────────────────────────────────────────────────────

export type ChaosType = 'node-failure' | 'latency-spike' | 'traffic-surge'

export type ChaosEvent = {
  id: string
  nodeId: string
  type: ChaosType
  startSimMs: number
  durationMs: number
  magnitude: number   // node-failure: unused; latency-spike: latency multiplier; traffic-surge: RPS multiplier
}

export type NodeSnapshot = {
  id: string
  inputRps: number
  outputRps: number
  utilization: number
  latencyMs: number
  errorRate: number
  costPerHour: number
  status: NodeStatus
  replicaCount?: number   // K8s Fleet HPA: current replica count
  activeChaosType?: string // visual feedback: which chaos type is active
}

export type EdgeSnapshot = {
  id: string
  throughputRps: number
  latencyMs: number
  dropRate: number
}

export type SimSnapshot = {
  simTimeMs: number
  ingressRps: number
  nodes: NodeSnapshot[]
  edges: EdgeSnapshot[]
  systemP99LatencyMs: number
  systemErrorRate: number
  systemCostPerHour: number
}
