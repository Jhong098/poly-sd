import type { ComponentType, ComponentConfig } from '@/lib/components/definitions'
import type { TrafficConfig } from '@/sim/types'

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
}

export type ScoreBreakdown = {
  performance: number    // 0–100
  cost: number           // 0–100
  simplicity: number     // 0–100
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
