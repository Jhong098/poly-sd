import type { SimNode, NodeSnapshot, NodeStatus, ChaosEvent } from '../types'
import type { ClientConfig, ServerConfig, DatabaseConfig, CacheConfig, LoadBalancerConfig, QueueConfig } from '@/lib/components/definitions'
import { SERVER_INSTANCES, DATABASE_INSTANCES, CACHE_INSTANCES, LB_COST_PER_HOUR, LB_MAX_RPS, QUEUE_COST_PER_HOUR } from '@/lib/components/definitions'

export type ComponentState = { queuedRequests: number }

/**
 * Compute one component's output snapshot for a given inputRps.
 * clientRps is only used for 'client' nodes (pre-computed by engine).
 */
export function computeNode(
  node: SimNode,
  inputRps: number,
  _state: ComponentState,
  clientRps?: number,
  chaos?: ChaosEvent,
): NodeSnapshot {
  // Node failure: zero output, full errors
  if (chaos?.type === 'node-failure') {
    return {
      id: node.id,
      inputRps,
      outputRps: 0,
      utilization: 0,
      latencyMs: 0,
      errorRate: 1,
      costPerHour: 0,
      status: 'failed',
    }
  }

  // Latency spike: pass magnitude into compute as a multiplier
  const latencyMult = chaos?.type === 'latency-spike' ? chaos.magnitude : 1

  switch (node.componentType) {
    case 'client':        return computeClient(node, clientRps ?? 0)
    case 'server':        return computeServer(node, inputRps, latencyMult)
    case 'database':      return computeDatabase(node, inputRps, latencyMult)
    case 'cache':         return computeCache(node, inputRps)
    case 'load-balancer': return computeLoadBalancer(node, inputRps)
    case 'queue':         return computeQueue(node, inputRps, latencyMult)
    default:              return idleSnapshot((node as SimNode).id)
  }
}

// ── M/M/1 helpers ────────────────────────────────────────────────────────────

function mm1Latency(baseMs: number, rho: number): number {
  return baseMs / (1 - Math.min(rho, 0.98))
}

function statusFromRho(rho: number, inputRps: number): NodeStatus {
  if (inputRps === 0) return 'idle'
  if (rho < 0.5)  return 'healthy'
  if (rho < 0.8)  return 'warm'
  if (rho < 0.95) return 'hot'
  return 'saturated'
}

// ── Client ────────────────────────────────────────────────────────────────────

function computeClient(node: SimNode, currentRps: number): NodeSnapshot {
  return {
    id: node.id,
    inputRps: 0,
    outputRps: currentRps,
    utilization: 0,
    latencyMs: 0,
    errorRate: 0,
    costPerHour: 0,
    status: currentRps > 0 ? 'healthy' : 'idle',
  }
}

// ── Server ───────────────────────────────────────────────────────────────────

function computeServer(node: SimNode, inputRps: number, latencyMult = 1): NodeSnapshot {
  const cfg = node.config as ServerConfig
  const inst = SERVER_INSTANCES[cfg.instanceType]
  const maxRps = inst.maxRps * cfg.instanceCount
  const costPerHour = inst.costPerHour * cfg.instanceCount

  if (inputRps === 0) return idleSnapshot(node.id, costPerHour)

  const rho = inputRps / maxRps
  const latencyMs = mm1Latency(cfg.baseLatencyMs * latencyMult, rho)

  let errorRate: number, outputRps: number
  if (rho <= 1) {
    errorRate = 0.001 + (rho > 0.8 ? Math.pow((rho - 0.8) * 5, 3) * 0.05 : 0)
    outputRps = inputRps * (1 - errorRate)
  } else {
    errorRate = Math.min((inputRps - maxRps) / inputRps + 0.001, 1)
    outputRps = maxRps * 0.999
  }

  return { id: node.id, inputRps, outputRps, utilization: rho, latencyMs, errorRate, costPerHour, status: statusFromRho(rho, inputRps) }
}

// ── Database ─────────────────────────────────────────────────────────────────

function computeDatabase(node: SimNode, inputRps: number, latencyMult = 1): NodeSnapshot {
  const cfg = node.config as DatabaseConfig
  const inst = DATABASE_INSTANCES[cfg.instanceType]
  const maxRps = cfg.maxConnections * 5
  const costPerHour = inst.costPerHour * (1 + cfg.readReplicas) * (cfg.multiAz ? 2 : 1)

  if (inputRps === 0) return idleSnapshot(node.id, costPerHour)

  const rho = inputRps / maxRps
  const latencyMs = mm1Latency(10 * latencyMult, rho)

  let errorRate: number, outputRps: number
  if (rho <= 1) {
    errorRate = 0.0001 + (rho > 0.8 ? Math.pow((rho - 0.8) * 5, 4) * 0.3 : 0)
    outputRps = inputRps * (1 - errorRate)
  } else {
    errorRate = Math.min((inputRps - maxRps) / inputRps + 0.001, 1)
    outputRps = maxRps * 0.999
  }

  return { id: node.id, inputRps, outputRps, utilization: rho, latencyMs, errorRate, costPerHour, status: statusFromRho(rho, inputRps) }
}

// ── Cache ─────────────────────────────────────────────────────────────────────

function computeCache(node: SimNode, inputRps: number): NodeSnapshot {
  const cfg = node.config as CacheConfig
  const inst = CACHE_INSTANCES[cfg.instanceType]

  if (inputRps === 0) return idleSnapshot(node.id, inst.costPerHour)

  return {
    id: node.id,
    inputRps,
    outputRps: inputRps * (1 - cfg.hitRate),
    utilization: 0.05,
    latencyMs: 1,
    errorRate: 0.0001,
    costPerHour: inst.costPerHour,
    status: 'healthy',
  }
}

// ── Queue ─────────────────────────────────────────────────────────────────────

function computeQueue(node: SimNode, inputRps: number, latencyMult = 1): NodeSnapshot {
  const cfg = node.config as QueueConfig
  const { processingRatePerSec, maxDepth } = cfg

  if (inputRps === 0) return idleSnapshot(node.id, QUEUE_COST_PER_HOUR)

  const rho = inputRps / processingRatePerSec

  // Queue depth estimate via Little's law (L = λW)
  const baseWaitMs = rho < 1
    ? (rho / (processingRatePerSec * (1 - rho))) * 1000
    : (maxDepth / processingRatePerSec) * 1000
  const latencyMs = Math.min(baseWaitMs * latencyMult, 30_000)

  // When overloaded: output is capped at drain rate, excess is dropped
  const overflow = Math.max(inputRps - processingRatePerSec, 0)
  const dropRate = overflow > 0 ? overflow / inputRps : 0
  const outputRps = Math.min(inputRps, processingRatePerSec) * (1 - 0.0001)

  return {
    id: node.id,
    inputRps,
    outputRps,
    utilization: Math.min(rho, 1),
    latencyMs,
    errorRate: dropRate,
    costPerHour: QUEUE_COST_PER_HOUR,
    status: statusFromRho(Math.min(rho, 1), inputRps),
  }
}

// ── Load Balancer ─────────────────────────────────────────────────────────────

function computeLoadBalancer(node: SimNode, inputRps: number): NodeSnapshot {
  // LB is modeled as near-zero-overhead pass-through. The actual distribution
  // to backends is handled by edge split weights in graph.ts.
  void (node.config as LoadBalancerConfig)  // algorithm is conceptual in Phase 2

  if (inputRps === 0) return idleSnapshot(node.id, LB_COST_PER_HOUR)

  const rho = inputRps / LB_MAX_RPS
  return {
    id: node.id,
    inputRps,
    outputRps: inputRps * 0.9999,
    utilization: rho,
    latencyMs: 1,       // ~1ms L7 overhead
    errorRate: 0.0001,
    costPerHour: LB_COST_PER_HOUR,
    status: statusFromRho(rho, inputRps),
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function idleSnapshot(id: string, costPerHour = 0): NodeSnapshot {
  return { id, inputRps: 0, outputRps: 0, utilization: 0, latencyMs: 0, errorRate: 0, costPerHour, status: 'idle' }
}
