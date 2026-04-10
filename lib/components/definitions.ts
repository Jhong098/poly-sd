export type ComponentType = 'client' | 'server' | 'database' | 'cache' | 'load-balancer' | 'queue' | 'api-gateway' | 'k8s-fleet' | 'kafka' | 'cdn'

// ── Per-component config shapes ────────────────────────────────────────────

export type TrafficPreset = 'steady' | 'spike' | 'ramp'

export type ClientConfig = {
  rps: number
  preset: TrafficPreset
  peakMultiplier: number   // peak = rps * multiplier (used by spike/ramp)
}

export type ServerConfig = {
  instanceType: 't3.micro' | 't3.small' | 't3.medium' | 'm5.large' | 'm5.xlarge'
  instanceCount: number
  baseLatencyMs: number
}

export type DatabaseConfig = {
  instanceType: 'db.t3.micro' | 'db.t3.small' | 'db.t3.medium' | 'db.r5.large'
  readReplicas: number
  maxConnections: number
  multiAz: boolean
}

export type CacheConfig = {
  instanceType: 'cache.t3.micro' | 'cache.t3.small' | 'cache.r6g.large'
  hitRate: number      // 0–1
  ttlSeconds: number
}

export type LoadBalancerConfig = {
  algorithm: 'round-robin' | 'least-connections' | 'ip-hash'
}

export type QueueConfig = {
  processingRatePerSec: number   // max drain rate (RPS the downstream receives)
  maxDepth: number               // buffer size before dropping requests
}

export type ApiGatewayConfig = {
  maxRps: number              // hard rate cap — excess requests get 429
  timeoutMs: number           // upstream timeout; circuit breaker trips after this
  circuitBreakerEnabled: boolean
}

export type K8sFleetConfig = {
  instanceType: 't3.small' | 't3.medium' | 'm5.large' | 'm5.xlarge'
  minReplicas: number
  maxReplicas: number
  targetUtilization: number   // 0–1; HPA scale-out threshold
}

export type KafkaConfig = {
  partitions: number           // parallelism units; each handles ~10k RPS
  consumerGroups: number       // concurrent consumer groups (read fanout multiplier)
  retentionMs: number          // how long messages are kept (ms)
}

export type CdnConfig = {
  hitRate: number              // 0–1; fraction served from edge
  regions: number              // number of PoPs (affects cost)
  ttlSeconds: number           // edge cache TTL
}

export type ComponentConfig = ClientConfig | ServerConfig | DatabaseConfig | CacheConfig | LoadBalancerConfig | QueueConfig | ApiGatewayConfig | K8sFleetConfig | KafkaConfig | CdnConfig

// ── Instance pricing ────────────────────────────────────────────────────────

export const SERVER_INSTANCES = {
  't3.micro':  { label: 't3.micro',  costPerHour: 0.0104, maxRps: 50  },
  't3.small':  { label: 't3.small',  costPerHour: 0.0208, maxRps: 100 },
  't3.medium': { label: 't3.medium', costPerHour: 0.0416, maxRps: 200 },
  'm5.large':  { label: 'm5.large',  costPerHour: 0.0960, maxRps: 500 },
  'm5.xlarge': { label: 'm5.xlarge', costPerHour: 0.1920, maxRps: 1000},
} as const

export const DATABASE_INSTANCES = {
  'db.t3.micro':  { label: 'db.t3.micro',  costPerHour: 0.017, maxConnections: 60  },
  'db.t3.small':  { label: 'db.t3.small',  costPerHour: 0.034, maxConnections: 150 },
  'db.t3.medium': { label: 'db.t3.medium', costPerHour: 0.068, maxConnections: 300 },
  'db.r5.large':  { label: 'db.r5.large',  costPerHour: 0.240, maxConnections: 500 },
} as const

export const CACHE_INSTANCES = {
  'cache.t3.micro': { label: 'cache.t3.micro', costPerHour: 0.017, memoryGb: 0.5  },
  'cache.t3.small': { label: 'cache.t3.small', costPerHour: 0.034, memoryGb: 1.5  },
  'cache.r6g.large':{ label: 'cache.r6g.large',costPerHour: 0.154, memoryGb: 13.1 },
} as const

// ── Load balancer pricing ───────────────────────────────────────────────────

/** Fixed cost for an Application Load Balancer (simplified flat rate). */
export const LB_COST_PER_HOUR = 0.008
export const LB_MAX_RPS = 100_000

/** Fixed cost for a managed message queue (SQS-like). */
export const QUEUE_COST_PER_HOUR = 0.001

/** Fixed cost for an API Gateway (AWS APIGW-like, simplified flat rate). */
export const GATEWAY_COST_PER_HOUR = 0.023
export const GATEWAY_MAX_RPS = 50_000

/** K8s server instance sizes (per pod/replica). */
export const K8S_INSTANCES = {
  't3.small':  { label: 't3.small',  costPerHour: 0.0208, maxRps: 100 },
  't3.medium': { label: 't3.medium', costPerHour: 0.0416, maxRps: 200 },
  'm5.large':  { label: 'm5.large',  costPerHour: 0.0960, maxRps: 500 },
  'm5.xlarge': { label: 'm5.xlarge', costPerHour: 0.1920, maxRps: 1000},
} as const

/** Kafka: cost per partition per hour (MSK-like). */
export const KAFKA_COST_PER_PARTITION_HOUR = 0.010
export const KAFKA_MAX_RPS_PER_PARTITION = 10_000

/** CDN: cost per region per hour (CloudFront-like flat rate). */
export const CDN_COST_PER_REGION_HOUR = 0.008

// ── Default configs ─────────────────────────────────────────────────────────

export const DEFAULT_CONFIGS: Record<ComponentType, ComponentConfig> = {
  client: {
    rps: 200,
    preset: 'steady',
    peakMultiplier: 5,
  } satisfies ClientConfig,
  server: {
    instanceType: 't3.small',
    instanceCount: 1,
    baseLatencyMs: 20,
  } satisfies ServerConfig,
  database: {
    instanceType: 'db.t3.small',
    readReplicas: 0,
    maxConnections: 100,
    multiAz: false,
  } satisfies DatabaseConfig,
  cache: {
    instanceType: 'cache.t3.small',
    hitRate: 0.8,
    ttlSeconds: 300,
  } satisfies CacheConfig,
  'load-balancer': {
    algorithm: 'round-robin',
  } satisfies LoadBalancerConfig,
  queue: {
    processingRatePerSec: 200,
    maxDepth: 10_000,
  } satisfies QueueConfig,
  'api-gateway': {
    maxRps: 1_000,
    timeoutMs: 5_000,
    circuitBreakerEnabled: false,
  } satisfies ApiGatewayConfig,
  'k8s-fleet': {
    instanceType: 't3.medium',
    minReplicas: 2,
    maxReplicas: 10,
    targetUtilization: 0.7,
  } satisfies K8sFleetConfig,
  kafka: {
    partitions: 4,
    consumerGroups: 1,
    retentionMs: 604_800_000,  // 7 days
  } satisfies KafkaConfig,
  cdn: {
    hitRate: 0.85,
    regions: 3,
    ttlSeconds: 3600,
  } satisfies CdnConfig,
}

// ── Visual metadata ─────────────────────────────────────────────────────────

export type ComponentMeta = {
  label: string
  description: string
  accentColor: string
  tier: number
  sourceOnly?: boolean  // true = no input handle (traffic sources)
}

export const COMPONENT_META: Record<ComponentType, ComponentMeta> = {
  client: {
    label: 'Client',
    description: 'Traffic source. Generates requests at configured RPS.',
    accentColor: 'amber',
    tier: 1,
    sourceOnly: true,
  },
  server: {
    label: 'Server',
    description: 'Application server. Handles request processing.',
    accentColor: 'blue',
    tier: 1,
  },
  database: {
    label: 'Database',
    description: 'Relational database. Persistent storage with ACID guarantees.',
    accentColor: 'violet',
    tier: 1,
  },
  cache: {
    label: 'Cache',
    description: 'In-memory key-value store. Reduces database load.',
    accentColor: 'emerald',
    tier: 1,
  },
  'load-balancer': {
    label: 'Load Balancer',
    description: 'Distributes traffic across multiple backends. Enables horizontal scaling.',
    accentColor: 'sky',
    tier: 2,
  },
  queue: {
    label: 'Queue',
    description: 'Message queue. Decouples producers from consumers, absorbs traffic bursts.',
    accentColor: 'orange',
    tier: 2,
  },
  'api-gateway': {
    label: 'API Gateway',
    description: 'Rate limiting, auth, and routing at the edge. Optional circuit breaker prevents cascading failures.',
    accentColor: 'pink',
    tier: 3,
  },
  'k8s-fleet': {
    label: 'K8s Fleet',
    description: 'Auto-scaling pod fleet (HPA). Scales replicas up/down based on utilization.',
    accentColor: 'indigo',
    tier: 3,
  },
  kafka: {
    label: 'Kafka',
    description: 'Distributed event stream. High-throughput, durable, ordered, replayable. Scales with partitions.',
    accentColor: 'teal',
    tier: 3,
  },
  cdn: {
    label: 'CDN',
    description: 'Edge caching layer. Serves cached responses from PoPs near users. Drastically reduces origin load.',
    accentColor: 'lime',
    tier: 3,
  },
}
