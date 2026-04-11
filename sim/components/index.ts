import type { SimNode, NodeSnapshot, NodeStatus, ChaosEvent } from '../types'
import type { ClientConfig, ServerConfig, DatabaseConfig, CacheConfig, LoadBalancerConfig, QueueConfig, ApiGatewayConfig, K8sFleetConfig, KafkaConfig, CdnConfig } from '@/lib/components/definitions'
import { SERVER_INSTANCES, DATABASE_INSTANCES, CACHE_INSTANCES, LB_COST_PER_HOUR, LB_MAX_RPS, QUEUE_COST_PER_HOUR, GATEWAY_COST_PER_HOUR, GATEWAY_MAX_RPS, K8S_INSTANCES, KAFKA_COST_PER_PARTITION_HOUR, KAFKA_MAX_RPS_PER_PARTITION, CDN_COST_PER_REGION_HOUR } from '@/lib/components/definitions'

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
  // Node failure: zero output, full errors.
  // Exception: multi-AZ databases — standby promotes automatically. Model as 2× latency
  // (promotion overhead) with no errors, matching real AWS Multi-AZ ~30s failover behavior.
  if (chaos?.type === 'node-failure') {
    if (node.componentType === 'database' && (node.config as DatabaseConfig).multiAz) {
      const snap = computeDatabase(node, inputRps, 2)
      return { ...snap, activeChaosType: 'node-failure' }
    }
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

  let snap: NodeSnapshot
  switch (node.componentType) {
    case 'client':        snap = computeClient(node, clientRps ?? 0); break
    case 'server':        snap = computeServer(node, inputRps, latencyMult); break
    case 'database':      snap = computeDatabase(node, inputRps, latencyMult); break
    case 'cache':         snap = computeCache(node, inputRps); break
    case 'load-balancer': snap = computeLoadBalancer(node, inputRps); break
    case 'queue':         snap = computeQueue(node, inputRps, latencyMult); break
    case 'api-gateway':   snap = computeApiGateway(node, inputRps, chaos); break
    case 'k8s-fleet':     snap = computeK8sFleet(node, inputRps, latencyMult); break
    case 'kafka':         snap = computeKafka(node, inputRps, latencyMult); break
    case 'cdn':           snap = computeCdn(node, inputRps); break
    default:              snap = idleSnapshot((node as SimNode).id); break
  }

  // Tag active chaos type for visual feedback in the UI
  if (chaos && snap.status !== 'failed') {
    snap = { ...snap, activeChaosType: chaos.type }
  }
  return snap
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

// ── API Gateway ───────────────────────────────────────────────────────────────

function computeApiGateway(node: SimNode, inputRps: number, chaos?: ChaosEvent): NodeSnapshot {
  const cfg = node.config as ApiGatewayConfig

  if (inputRps === 0) return idleSnapshot(node.id, GATEWAY_COST_PER_HOUR)

  const rho = inputRps / GATEWAY_MAX_RPS

  // Rate limiting: requests above maxRps get 429
  const rateLimitedRps = Math.min(inputRps, cfg.maxRps)
  const rateDropRate = inputRps > cfg.maxRps ? (inputRps - cfg.maxRps) / inputRps : 0

  // Circuit breaker logic when a latency-spike is active on this node:
  //   CB enabled  → fast-fail: returns immediately (5ms, no downstream forwarding).
  //                 Models: GW detects downstream is unhealthy, short-circuits with fallback.
  //   CB disabled → timeout propagation: requests hang until cfg.timeoutMs before returning.
  //                 Models: GW blindly waits for the slow downstream, stalling the caller.
  const hasChaos = chaos?.type === 'latency-spike'
  const circuitOpen = cfg.circuitBreakerEnabled && hasChaos
  if (circuitOpen) {
    return {
      id: node.id,
      inputRps,
      outputRps: 0,                 // absorbs requests — does NOT forward to slow downstream
      utilization: rho,
      latencyMs: 5,                 // fast-fail: returns fallback immediately
      errorRate: 0.02,              // small error rate — returning stale/empty response
      costPerHour: GATEWAY_COST_PER_HOUR,
      status: 'hot',                // circuit is open
      activeChaosType: 'latency-spike',
    }
  }

  // When slow (CB disabled + latency-spike): requests hang until timeout before caller gives up
  const latencyMs = hasChaos ? cfg.timeoutMs : 2

  return {
    id: node.id,
    inputRps,
    outputRps: rateLimitedRps * 0.9999,
    utilization: rho,
    latencyMs,
    errorRate: rateDropRate + 0.0001,
    costPerHour: GATEWAY_COST_PER_HOUR,
    status: rateDropRate > 0.1 ? 'hot' : statusFromRho(rho, inputRps),
  }
}

// ── K8s Fleet (HPA) ───────────────────────────────────────────────────────────

function computeK8sFleet(node: SimNode, inputRps: number, latencyMult = 1): NodeSnapshot {
  const cfg = node.config as K8sFleetConfig
  const inst = K8S_INSTANCES[cfg.instanceType]
  const perReplicaMaxRps = inst.maxRps

  if (inputRps === 0) {
    // Cluster idles at minReplicas
    return idleSnapshot(node.id, inst.costPerHour * cfg.minReplicas)
  }

  // HPA desired replicas: enough to keep each pod under targetUtilization
  const desiredForLoad = Math.ceil(inputRps / (perReplicaMaxRps * cfg.targetUtilization))
  const actualReplicas = Math.max(cfg.minReplicas, Math.min(cfg.maxReplicas, desiredForLoad))
  const effectiveMaxRps = actualReplicas * perReplicaMaxRps
  const costPerHour = inst.costPerHour * actualReplicas

  const rho = inputRps / effectiveMaxRps
  const latencyMs = mm1Latency(20 * latencyMult, rho)   // 20ms base like a server

  let errorRate: number, outputRps: number
  if (rho <= 1) {
    errorRate = 0.001 + (rho > 0.8 ? Math.pow((rho - 0.8) * 5, 3) * 0.05 : 0)
    outputRps = inputRps * (1 - errorRate)
  } else {
    errorRate = Math.min((inputRps - effectiveMaxRps) / inputRps + 0.001, 1)
    outputRps = effectiveMaxRps * 0.999
  }

  return {
    id: node.id,
    inputRps,
    outputRps,
    utilization: rho,
    latencyMs,
    errorRate,
    costPerHour,
    status: statusFromRho(rho, inputRps),
    replicaCount: actualReplicas,
  }
}

// ── Kafka ─────────────────────────────────────────────────────────────────────

function computeKafka(node: SimNode, inputRps: number, latencyMult = 1): NodeSnapshot {
  const cfg = node.config as KafkaConfig
  const maxRps = cfg.partitions * KAFKA_MAX_RPS_PER_PARTITION
  const costPerHour = cfg.partitions * KAFKA_COST_PER_PARTITION_HOUR

  if (inputRps === 0) return idleSnapshot(node.id, costPerHour)

  const rho = inputRps / maxRps

  // Kafka adds minimal per-message latency; under load producer latency grows slightly
  const latencyMs = mm1Latency(5 * latencyMult, Math.min(rho, 0.95))

  // Fan-out: each consumer group receives a full copy of the stream
  // outputRps = inputRps * consumerGroups (Kafka doesn't consume — it publishes to each group)
  const outputRps = rho <= 1
    ? inputRps * cfg.consumerGroups * 0.9999
    : maxRps * cfg.consumerGroups * 0.999

  const errorRate = rho > 1 ? Math.min((inputRps - maxRps) / inputRps, 1) : 0.0001

  return {
    id: node.id,
    inputRps,
    outputRps,
    utilization: Math.min(rho, 1),
    latencyMs,
    errorRate,
    costPerHour,
    status: statusFromRho(Math.min(rho, 1), inputRps),
  }
}

// ── CDN ───────────────────────────────────────────────────────────────────────

function computeCdn(node: SimNode, inputRps: number): NodeSnapshot {
  const cfg = node.config as CdnConfig
  const costPerHour = cfg.regions * CDN_COST_PER_REGION_HOUR

  if (inputRps === 0) return idleSnapshot(node.id, costPerHour)

  // Hits are served from edge (not forwarded to origin)
  // Output = cache misses only, forwarded to origin
  const missRps = inputRps * (1 - cfg.hitRate)

  // CDN latency: near zero for hits (served at edge), pass-through for misses
  // We model the node's own latency contribution as the edge overhead for hits
  const latencyMs = 2   // ~2ms edge overhead (hit latency is negligible)

  return {
    id: node.id,
    inputRps,
    outputRps: missRps,
    utilization: 1 - cfg.hitRate,   // show utilization as miss rate
    latencyMs,
    errorRate: 0.0001,
    costPerHour,
    status: inputRps > 0 ? 'healthy' : 'idle',
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function idleSnapshot(id: string, costPerHour = 0): NodeSnapshot {
  return { id, inputRps: 0, outputRps: 0, utilization: 0, latencyMs: 0, errorRate: 0, costPerHour, status: 'idle' }
}
