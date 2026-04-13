import type { ComponentType, ComponentConfig } from '@/lib/components/definitions'
import type { TrafficConfig, ChaosEvent } from '@/sim/types'

export type DiagramType = 'scaling' | 'caching' | 'load-balancing' | 'async-queue' | 'redundancy' | 'budget'

export type FailureCondition =
  | 'db_saturated'
  | 'server_saturated'
  | 'cache_miss_rate_high'
  | 'latency_exceeded'
  | 'error_rate_exceeded'
  | 'budget_exceeded'
  | 'no_redundancy'
  | 'queue_overflow'

export type SlaTargets = {
  p99LatencyMs: number
  errorRate: number        // max acceptable fraction (0.01 = 1%)
}

export type StarterNode = {
  id: string
  type: ComponentType
  position: { x: number; y: number }
  label?: string
  config?: Partial<ComponentConfig>
}

export type StarterEdge = {
  source: string
  target: string
}

export type Challenge = {
  id: string
  tier: 0 | 1 | 2 | 3 | 4 | 5
  order: number
  title: string
  narrative: string        // story framing
  objective: string        // what to achieve (1–2 sentences)
  trafficConfig: TrafficConfig
  slaTargets: SlaTargets
  budgetPerHour: number
  allowedComponents: ComponentType[] | 'all'
  conceptsTaught: string[]
  hints: string[]
  starterNodes?: StarterNode[]
  starterEdges?: StarterEdge[]
  chaosSchedule?: ChaosEvent[]    // auto-injected events (for scripted challenges)
  conceptPrimer?: {
    title: string
    explanation: string   // 2–3 plain-English sentences
    diagramType: DiagramType
  }
  failureHints?: Partial<Record<FailureCondition, string>>  // authored per level (Tutorial only)
  guidedPulseComponent?: ComponentType                       // Tutorial only — which palette item to pulse
}

export type ScoreBreakdown = {
  performance: number    // 0–100
  cost: number           // 0–100
  simplicity: number     // 0–100
  resilience: number     // 0–100 (0 if no chaos events in challenge)
  total: number          // weighted average
}

export type EvalResult = {
  passed: boolean
  passedLatency: boolean
  passedErrors: boolean
  passedBudget: boolean
  scores: ScoreBreakdown
  metrics: {
    p99LatencyMs: number
    errorRate: number
    costPerHour: number
    componentCount: number
  }
}
