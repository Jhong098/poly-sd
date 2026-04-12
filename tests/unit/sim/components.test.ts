import { describe, it, expect } from 'vitest'
import { computeNode } from '@/sim/components'
import type { SimNode } from '@/sim/types'
import type {
  ServerConfig, DatabaseConfig, CacheConfig, LoadBalancerConfig,
  QueueConfig, ApiGatewayConfig, K8sFleetConfig, KafkaConfig,
  CdnConfig, NoSqlConfig, ObjectStorageConfig, ClientConfig,
} from '@/lib/components/definitions'

// ── Factories ────────────────────────────────────────────────────────────────

function node<T>(id: string, componentType: SimNode['componentType'], config: T): SimNode {
  return { id, componentType, config: config as SimNode['config'] }
}

const FAILURE = { id: 'c1', nodeId: 'server-1', type: 'node-failure' as const, startSimMs: 0, durationMs: 10_000, magnitude: 1 }
const LATENCY_SPIKE = { id: 'c2', nodeId: 'server-1', type: 'latency-spike' as const, startSimMs: 0, durationMs: 10_000, magnitude: 3 }
const STATE = { queuedRequests: 0 }

// ── Shared chaos behavior ─────────────────────────────────────────────────────

describe('computeNode — node-failure chaos', () => {
  it('returns errorRate=1 and outputRps=0 for a regular server', () => {
    const n = node<ServerConfig>('server-1', 'server', {
      instanceType: 't3.medium', instanceCount: 1, baseLatencyMs: 20,
    })
    const snap = computeNode(n, 100, STATE, undefined, FAILURE)
    expect(snap.errorRate).toBe(1)
    expect(snap.outputRps).toBe(0)
    expect(snap.status).toBe('failed')
  })

  it('multi-AZ database under node-failure: latency increases, no errors', () => {
    const n = node<DatabaseConfig>('db-1', 'database', {
      instanceType: 'db.t3.medium', readReplicas: 0, maxConnections: 300, multiAz: true,
    })
    const chaos = { ...FAILURE, nodeId: 'db-1' }
    const normal = computeNode(n, 100, STATE)
    const failSnap = computeNode(n, 100, STATE, undefined, chaos)
    expect(failSnap.latencyMs).toBeGreaterThan(normal.latencyMs)
    expect(failSnap.errorRate).toBeLessThan(0.01)
    expect(failSnap.status).not.toBe('failed')
  })
})

// ── Server ────────────────────────────────────────────────────────────────────

describe('computeServer', () => {
  // t3.medium: maxRps=200 per instance
  const serverNode = node<ServerConfig>('s1', 'server', {
    instanceType: 't3.medium', instanceCount: 1, baseLatencyMs: 20,
  })

  it('returns idle snapshot at 0 RPS', () => {
    const snap = computeNode(serverNode, 0, STATE)
    expect(snap.status).toBe('idle')
    expect(snap.outputRps).toBe(0)
    expect(snap.latencyMs).toBe(0)
  })

  it('is healthy at low load (rho < 0.5)', () => {
    const snap = computeNode(serverNode, 50, STATE)  // rho = 0.25
    expect(snap.status).toBe('healthy')
    expect(snap.errorRate).toBeLessThan(0.002)
    expect(snap.outputRps).toBeCloseTo(50, 0)
  })

  it('is hot when rho approaches 0.9', () => {
    const snap = computeNode(serverNode, 180, STATE)  // rho = 0.9
    expect(['hot', 'saturated']).toContain(snap.status)
    expect(snap.errorRate).toBeGreaterThan(0.001)
  })

  it('caps outputRps at maxRps when overloaded (rho > 1)', () => {
    const snap = computeNode(serverNode, 300, STATE)  // rho = 1.5
    expect(snap.outputRps).toBeCloseTo(200 * 0.999, 0)
    expect(snap.errorRate).toBeGreaterThan(0.3)
  })

  it('instanceCount multiplies capacity', () => {
    const twoInstances = node<ServerConfig>('s2', 'server', {
      instanceType: 't3.medium', instanceCount: 2, baseLatencyMs: 20,
    })
    const snap = computeNode(twoInstances, 300, STATE)  // rho = 0.75 with 2×
    expect(snap.status).toBe('warm')
    expect(snap.errorRate).toBeLessThan(0.005)
  })

  it('latency-spike chaos multiplies latency', () => {
    const normal = computeNode(serverNode, 100, STATE)
    const spiked = computeNode(serverNode, 100, STATE, undefined, LATENCY_SPIKE)
    expect(spiked.latencyMs).toBeGreaterThan(normal.latencyMs * 2)
  })
})

// ── Database ──────────────────────────────────────────────────────────────────

describe('computeDatabase', () => {
  // db.t3.medium: maxConnections=300, maxRps = 300*5 = 1500 (no replicas)
  const dbNode = node<DatabaseConfig>('db1', 'database', {
    instanceType: 'db.t3.medium', readReplicas: 0, maxConnections: 300, multiAz: false,
  })

  it('returns idle snapshot at 0 RPS', () => {
    const snap = computeNode(dbNode, 0, STATE)
    expect(snap.status).toBe('idle')
  })

  it('read replicas scale effective capacity', () => {
    const withReplicas = node<DatabaseConfig>('db2', 'database', {
      instanceType: 'db.t3.medium', readReplicas: 2, maxConnections: 300, multiAz: false,
    })
    const noRepSnap = computeNode(dbNode, 1200, STATE)
    const repSnap   = computeNode(withReplicas, 1200, STATE)
    expect(repSnap.utilization).toBeLessThan(noRepSnap.utilization)
  })

  it('multiAz doubles costPerHour', () => {
    const multiAz = node<DatabaseConfig>('db3', 'database', {
      instanceType: 'db.t3.medium', readReplicas: 0, maxConnections: 300, multiAz: true,
    })
    const normal = computeNode(dbNode, 0, STATE)
    const az     = computeNode(multiAz, 0, STATE)
    expect(az.costPerHour).toBeCloseTo(normal.costPerHour * 2, 4)
  })
})

// ── Cache ─────────────────────────────────────────────────────────────────────

describe('computeCache', () => {
  it('outputRps = inputRps × (1 − hitRate)', () => {
    const cacheNode = node<CacheConfig>('c1', 'cache', {
      instanceType: 'cache.t3.micro', hitRate: 0.8, ttlSeconds: 300,
    })
    const snap = computeNode(cacheNode, 1000, STATE)
    expect(snap.outputRps).toBeCloseTo(200, 1)
  })

  it('passes all traffic when hitRate=0', () => {
    const cacheNode = node<CacheConfig>('c2', 'cache', {
      instanceType: 'cache.t3.micro', hitRate: 0, ttlSeconds: 300,
    })
    const snap = computeNode(cacheNode, 500, STATE)
    expect(snap.outputRps).toBeCloseTo(500, 1)
  })

  it('passes nothing when hitRate=1', () => {
    const cacheNode = node<CacheConfig>('c3', 'cache', {
      instanceType: 'cache.t3.micro', hitRate: 1, ttlSeconds: 300,
    })
    const snap = computeNode(cacheNode, 500, STATE)
    expect(snap.outputRps).toBeCloseTo(0, 1)
  })
})

// ── Queue ─────────────────────────────────────────────────────────────────────

describe('computeQueue', () => {
  const queueNode = node<QueueConfig>('q1', 'queue', {
    processingRatePerSec: 100, maxDepth: 1000,
  })

  it('returns idle snapshot at 0 RPS', () => {
    const snap = computeNode(queueNode, 0, STATE)
    expect(snap.status).toBe('idle')
  })

  it('under capacity: low latency, outputRps ≈ inputRps, errorRate = 0', () => {
    const snap = computeNode(queueNode, 50, STATE)  // rho = 0.5
    expect(snap.errorRate).toBe(0)
    expect(snap.outputRps).toBeCloseTo(50 * 0.9999, 1)
  })

  it('over capacity: outputRps caps at processingRate, errorRate > 0', () => {
    const snap = computeNode(queueNode, 200, STATE)  // rho = 2
    expect(snap.outputRps).toBeCloseTo(100 * 0.9999, 1)
    expect(snap.errorRate).toBeGreaterThan(0.3)
  })
})

// ── Load Balancer ─────────────────────────────────────────────────────────────

describe('computeLoadBalancer', () => {
  const lbNode = node<LoadBalancerConfig>('lb1', 'load-balancer', {
    algorithm: 'round-robin',
  })

  it('passes traffic through with near-zero overhead', () => {
    const snap = computeNode(lbNode, 500, STATE)
    expect(snap.outputRps).toBeCloseTo(500 * 0.9999, 1)
    expect(snap.latencyMs).toBe(1)
    expect(snap.errorRate).toBe(0.0001)
  })

  it('returns idle at 0 RPS', () => {
    expect(computeNode(lbNode, 0, STATE).status).toBe('idle')
  })
})

// ── API Gateway ───────────────────────────────────────────────────────────────

describe('computeApiGateway', () => {
  const gwNode = node<ApiGatewayConfig>('gw1', 'api-gateway', {
    maxRps: 200, timeoutMs: 5000, circuitBreakerEnabled: false,
  })

  it('rate limits requests above maxRps', () => {
    const snap = computeNode(gwNode, 400, STATE)
    expect(snap.errorRate).toBeGreaterThan(0.4)
    expect(snap.outputRps).toBeCloseTo(200 * 0.9999, 1)
  })

  it('passes traffic at maxRps with minimal errors', () => {
    const snap = computeNode(gwNode, 200, STATE)
    expect(snap.errorRate).toBeCloseTo(0.0001, 4)
  })

  it('circuit breaker open under latency-spike: fast-fail, no downstream forwarding', () => {
    const cbNode = node<ApiGatewayConfig>('gw2', 'api-gateway', {
      maxRps: 200, timeoutMs: 5000, circuitBreakerEnabled: true,
    })
    const chaos = { id: 'ls', nodeId: 'gw2', type: 'latency-spike' as const, startSimMs: 0, durationMs: 10_000, magnitude: 5 }
    const snap = computeNode(cbNode, 100, STATE, undefined, chaos)
    expect(snap.outputRps).toBe(0)
    expect(snap.latencyMs).toBe(5)
    expect(snap.errorRate).toBe(0.02)
  })

  it('circuit breaker disabled under latency-spike: timeout propagation', () => {
    const chaos = { id: 'ls', nodeId: 'gw1', type: 'latency-spike' as const, startSimMs: 0, durationMs: 10_000, magnitude: 5 }
    const snap = computeNode(gwNode, 100, STATE, undefined, chaos)
    expect(snap.latencyMs).toBe(5000)
    expect(snap.outputRps).toBeGreaterThan(0)
  })
})

// ── K8s Fleet ─────────────────────────────────────────────────────────────────

describe('computeK8sFleet', () => {
  // t3.medium: maxRps=200/replica, costPerHour=0.0416
  const k8sNode = node<K8sFleetConfig>('k1', 'k8s-fleet', {
    instanceType: 't3.medium', minReplicas: 1, maxReplicas: 10, targetUtilization: 0.7,
  })

  it('idles at minReplicas when load is 0', () => {
    const snap = computeNode(k8sNode, 0, STATE)
    expect(snap.status).toBe('idle')
    expect(snap.costPerHour).toBeCloseTo(0.0416, 4)
  })

  it('scales up replicas to handle load', () => {
    // 700 RPS, targetUtil=0.7, perReplica=200 → desired = ceil(700/(200*0.7)) = 5
    const snap = computeNode(k8sNode, 700, STATE)
    expect(snap.replicaCount).toBe(5)
    expect(snap.costPerHour).toBeCloseTo(0.0416 * 5, 4)
  })

  it('clamps to maxReplicas', () => {
    const snap = computeNode(k8sNode, 100_000, STATE)
    expect(snap.replicaCount).toBe(10)
  })

  it('clamps to minReplicas', () => {
    const snap = computeNode(k8sNode, 1, STATE)
    expect(snap.replicaCount).toBeGreaterThanOrEqual(1)
  })
})

// ── Kafka ─────────────────────────────────────────────────────────────────────

describe('computeKafka', () => {
  // 2 partitions, 2 consumer groups → maxRps = 2*10000 = 20000
  const kafkaNode = node<KafkaConfig>('kf1', 'kafka', {
    partitions: 2, consumerGroups: 2, retentionMs: 86_400_000,
  })

  it('fan-out: outputRps = inputRps × consumerGroups when under capacity', () => {
    const snap = computeNode(kafkaNode, 1000, STATE)
    expect(snap.outputRps).toBeCloseTo(1000 * 2 * 0.9999, 1)
  })

  it('errorRate > 0 when over capacity', () => {
    const snap = computeNode(kafkaNode, 25_000, STATE)
    expect(snap.errorRate).toBeGreaterThan(0.1)
  })

  it('costPerHour = partitions × KAFKA_COST_PER_PARTITION_HOUR', () => {
    const snap = computeNode(kafkaNode, 1000, STATE)
    expect(snap.costPerHour).toBeCloseTo(2 * 0.010, 4)
  })
})

// ── CDN ───────────────────────────────────────────────────────────────────────

describe('computeCdn', () => {
  const cdnNode = node<CdnConfig>('cdn1', 'cdn', {
    hitRate: 0.9, regions: 3, ttlSeconds: 3600,
  })

  it('outputRps = missRps only (hits absorbed at edge)', () => {
    const snap = computeNode(cdnNode, 1000, STATE)
    expect(snap.outputRps).toBeCloseTo(1000 * 0.1, 1)
  })

  it('costPerHour = regions × CDN_COST_PER_REGION_HOUR', () => {
    const snap = computeNode(cdnNode, 1000, STATE)
    expect(snap.costPerHour).toBeCloseTo(3 * 0.008, 4)
  })
})

// ── NoSQL ─────────────────────────────────────────────────────────────────────

describe('computeNoSql', () => {
  it('provisioned mode: cost = (rcu + wcu) × globalTables × unit rates', () => {
    const nosqlNode = node<NoSqlConfig>('ns1', 'nosql', {
      capacityMode: 'provisioned', rcuCapacity: 1000, wcuCapacity: 500, globalTables: 1,
    })
    const snap = computeNode(nosqlNode, 0, STATE)
    const expectedCost = (1000 * 0.00013 + 500 * 0.00065) * 1
    expect(snap.costPerHour).toBeCloseTo(expectedCost, 5)
  })

  it('on-demand mode: cost scales with inputRps', () => {
    const nosqlNode = node<NoSqlConfig>('ns2', 'nosql', {
      capacityMode: 'on-demand', rcuCapacity: 0, wcuCapacity: 0, globalTables: 1,
    })
    const snap = computeNode(nosqlNode, 1000, STATE)
    expect(snap.costPerHour).toBeCloseTo(1.0, 2)
  })

  it('throttles when over provisioned capacity', () => {
    const nosqlNode = node<NoSqlConfig>('ns3', 'nosql', {
      capacityMode: 'provisioned', rcuCapacity: 100, wcuCapacity: 50, globalTables: 1,
    })
    // maxRps = 100 + 50 = 150; send 300
    const snap = computeNode(nosqlNode, 300, STATE)
    expect(snap.errorRate).toBeGreaterThan(0.3)
    expect(snap.outputRps).toBeCloseTo(150 * 0.999, 0)
  })
})

// ── Object Storage ────────────────────────────────────────────────────────────

describe('computeObjectStorage', () => {
  it('never saturates — passes all traffic', () => {
    const osNode = node<ObjectStorageConfig>('os1', 'object-storage', {
      storageClass: 'standard', replication: 'none',
    })
    const snap = computeNode(osNode, 50_000, STATE)
    expect(snap.utilization).toBe(0.01)
    expect(snap.status).toBe('healthy')
    expect(snap.outputRps).toBeCloseTo(50_000 * 0.9999, 0)
  })

  it('cross-region replication doubles costPerHour', () => {
    const single = node<ObjectStorageConfig>('os2', 'object-storage', {
      storageClass: 'standard', replication: 'none',
    })
    const crossRegion = node<ObjectStorageConfig>('os3', 'object-storage', {
      storageClass: 'standard', replication: 'cross-region',
    })
    const s1 = computeNode(single, 0, STATE)
    const s2 = computeNode(crossRegion, 0, STATE)
    expect(s2.costPerHour).toBeCloseTo(s1.costPerHour * 2, 4)
  })
})

// ── Client ────────────────────────────────────────────────────────────────────

describe('computeClient', () => {
  const clientNode = node<ClientConfig>('cl1', 'client', {
    rps: 100, preset: 'steady', peakMultiplier: 1,
  })

  it('outputRps = clientRps parameter, not inputRps', () => {
    const snap = computeNode(clientNode, 0, STATE, 250)
    expect(snap.outputRps).toBe(250)
    expect(snap.inputRps).toBe(0)
  })

  it('status is healthy when rps > 0', () => {
    const snap = computeNode(clientNode, 0, STATE, 100)
    expect(snap.status).toBe('healthy')
  })

  it('status is idle when rps = 0', () => {
    const snap = computeNode(clientNode, 0, STATE, 0)
    expect(snap.status).toBe('idle')
  })
})
