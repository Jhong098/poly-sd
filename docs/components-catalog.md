# Components Catalog

Every building block available to the player. Components unlock progressively — see [Level Design](level-design.md) for unlock order.

Each entry lists: description, configurable properties, simulation behavior, and cost model.

---

## Tier 1 — Unlocked from the start

### Client (special)

Not a placeable component. Appears automatically as the traffic source in every challenge. Emits requests at the configured RPS. Cannot be removed, cannot be configured.

---

### Server / Application Instance

A single application server (think EC2 instance, App Service, Compute Engine VM).

**Configurable properties**
| Property | Type | Range | Default |
|----------|------|-------|---------|
| Instance type | Select | t3.micro → m5.4xlarge | t3.small |
| Instance count | Integer | 1–50 | 1 |
| Base latency | Number | 5–500ms | 20ms |
| Max RPS per instance | Number | 10–2000 | 100 |
| Base error rate | Number | 0–5% | 0.1% |

**Behavior**
- `totalMaxRPS = maxRPS * instanceCount`
- As load approaches `totalMaxRPS`, latency grows per M/M/1 formula
- At saturation: drops requests (503)
- No auto-scaling — count is fixed (use K8s component for auto-scaling)

**Cost**: `instanceCount * instanceType.hourlyRate`

| Instance | Hourly Rate | Max RPS | RAM |
|----------|-------------|---------|-----|
| t3.micro | $0.0104 | 50 | 1GB |
| t3.small | $0.0208 | 100 | 2GB |
| t3.medium | $0.0416 | 200 | 4GB |
| m5.large | $0.096 | 500 | 8GB |
| m5.xlarge | $0.192 | 1000 | 16GB |
| m5.4xlarge | $0.768 | 2000 | 64GB |

**Teaches**: horizontal scaling, instance sizing, over-provisioning cost.

---

### SQL Database (Primary)

A relational database (think RDS Postgres, Cloud SQL, Azure Database).

**Configurable properties**
| Property | Type | Range | Default |
|----------|------|-------|---------|
| Instance type | Select | db.t3.micro → db.r5.2xlarge | db.t3.small |
| Read replicas | Integer | 0–5 | 0 |
| Max connections | Integer | 20–5000 | 100 |
| Read/write ratio | Slider | 0–100% reads | 70% |
| Storage (GB) | Integer | 20–10000 | 100 |
| Multi-AZ | Boolean | on/off | off |

**Behavior**
- `maxRPS` derived from `maxConnections * queriesPerConnectionPerSec` (varies by query complexity)
- Reads can go to replicas if configured; writes always to primary
- Replica lag: `5ms–200ms` additional latency on reads (configurable)
- Multi-AZ: second standby in different AZ, failover ~30s sim-time on primary failure
- Without Multi-AZ: primary failure = database unavailable until manual recovery (~5min sim-time)
- p99 multiplier: 5x at high ρ (very long-tailed under load)

**Cost**: `primaryCost + (replicaCount * replicaCost) + (storageGB * 0.115/mo)`

**Teaches**: read replicas, connection limits, Multi-AZ for HA, write bottleneck.

---

### Cache (Redis / Memcached)

An in-memory key-value cache. The most impactful single component for reducing database load.

**Configurable properties**
| Property | Type | Range | Default |
|----------|------|-------|---------|
| Instance type | Select | cache.t3.micro → cache.r6g.2xlarge | cache.t3.small |
| Hit rate | Slider | 0–99% | 80% |
| TTL (seconds) | Integer | 0–86400 | 300 |
| Eviction policy | Select | LRU, LFU, noeviction | LRU |
| Max memory (GB) | — | Derived from instance type | — |

**Behavior**
- On each request: `hitRate` fraction resolves in-cache (`ownLatency` ~1ms), rest passes through
- Thundering herd: on cache flush or cold-start, hit rate = 0 and rebuilds over `warmupPeriod = TTL / 3`
- Memory pressure: when cached data volume approaches max memory, evictions increase → effective hit rate drops
- Cluster mode: multiple nodes increase effective memory and throughput (advanced option)

**Cost**: `instanceType.hourlyRate` (plus cluster nodes if applicable)

**Teaches**: cache hit rates, TTL tradeoffs, thundering herd, cold start penalty, what to cache.

---

## Tier 2 — Unlock after completing Tier 1

### Load Balancer

Distributes incoming traffic across multiple backend instances.

**Configurable properties**
| Property | Type | Range | Default |
|----------|------|-------|---------|
| Algorithm | Select | Round-Robin, Least-Connections, IP Hash, Weighted | Round-Robin |
| Health check interval | Integer | 5–60s | 10s |
| Health check threshold | Integer | 1–5 | 2 |
| Connection draining | Integer | 0–300s | 30s |
| Idle timeout | Integer | 1–3600s | 60s |

**Behavior**
- Splits inputRPS equally across connected backends (Round-Robin)
- Least-Connections: routes to backend with fewest active requests (reduces hotspots)
- IP Hash: consistent assignment per client IP — stateful sessions but unequal distribution
- Health checks: detects failed backends and stops routing to them within `interval * threshold` sim-seconds
- Own latency: ~1ms (negligible)

**Cost**: $0.025/hr base + $0.008 per LCU-hour

**Teaches**: traffic distribution, health checks, session affinity tradeoffs, connection draining.

---

### API Gateway

Managed ingress layer. Handles auth, rate limiting, routing, circuit breaking.

**Configurable properties**
| Property | Type | Range | Default |
|----------|------|-------|---------|
| Rate limit (RPS) | Integer | 10–100,000 | 1000 |
| Auth type | Select | None, JWT, API Key, OAuth | JWT |
| Auth latency | Number | 0–50ms | 5ms |
| Circuit breaker | Boolean | on/off | off |
| CB error threshold | Slider | 10–90% | 50% |
| CB window (seconds) | Integer | 5–60 | 10 |
| CB recovery time (seconds) | Integer | 5–120 | 30 |

**Behavior**
- Requests exceeding rate limit receive 429 (counted as errors against SLA)
- Auth adds constant latency to every request
- Circuit breaker: monitors downstream error rate over window. If > threshold → opens circuit (all requests return 503). After recovery time, sends probe requests. If probe succeeds → closes circuit.
- own latency: 5–20ms base + auth latency

**Cost**: $3.50/million API calls + data transfer

**Teaches**: rate limiting, circuit breaking, authentication overhead, API management.

---

### Message Queue (SQS / Pub-Sub)

Async decoupling. Absorbs traffic spikes by buffering requests for later processing.

**Configurable properties**
| Property | Type | Range | Default |
|----------|------|-------|---------|
| Max queue depth | Integer | 100–10,000,000 | 100,000 |
| Consumer count | Integer | 1–100 | 1 |
| Consumer RPS per instance | Integer | 1–1000 | 50 |
| Visibility timeout | Integer | 1–1200s | 30s |
| Dead letter queue | Boolean | on/off | off |
| Delivery guarantee | Select | At-Least-Once, Exactly-Once | At-Least-Once |

**Behavior**
- Producer (upstream) sends at inputRPS; messages accumulate in queue
- Consumer processes at `consumerCount * consumerRPS`
- If producerRPS > consumerRPS: queue grows. Dwell time (added latency) = `queueDepth / consumerRPS`
- If queue full: producer receives write error (backpressure)
- Decoupled: producer latency is just enqueue time (~5ms), not consumer processing time
- Exactly-Once requires higher overhead (~10ms extra, 15% throughput reduction)

**Cost**: $0.40/million messages + $2/million Exactly-Once

**Teaches**: async decoupling, backpressure, queue dwell time, at-least-once vs exactly-once.

---

### CDN (Content Delivery Network)

Globally distributed cache sitting in front of your origin. Primarily for static/cacheable content.

**Configurable properties**
| Property | Type | Range | Default |
|----------|------|-------|---------|
| Cache hit rate | Slider | 0–99% | 90% |
| TTL | Integer | 0–86400s | 3600s |
| Cache rules | Select | All, Static only, Custom | Static only |
| Origin shield | Boolean | on/off | off |

**Behavior**
- Cache hits: ~10ms latency (edge location), never reaches origin
- Cache misses: ~10ms + origin round-trip
- Origin shield: single intermediate cache layer between CDN edge and origin. Reduces cache miss traffic to origin by ~70%.
- After invalidation/TTL expiry: hit rate drops to 0 for that content class, rebuilds as requests arrive

**Cost**: $0.08/GB egress (first 10TB/mo), $0.02/10,000 HTTPS requests

**Teaches**: CDN offloading, TTL tradeoffs, origin shield, what's cacheable.

---

## Tier 3 — Unlock after completing Tier 2

### Kubernetes / Container Fleet (HPA)

A managed container platform with Horizontal Pod Autoscaler. Replaces manually-scaled Server component for workloads with variable traffic.

**Configurable properties**
| Property | Type | Range | Default |
|----------|------|-------|---------|
| Node instance type | Select | Same as Server | m5.large |
| Min replicas | Integer | 1–10 | 2 |
| Max replicas | Integer | 1–100 | 10 |
| Target CPU utilization | Slider | 20–90% | 70% |
| Scale-out cooldown | Integer | 30–600s | 90s |
| Scale-in cooldown | Integer | 30–600s | 300s |
| RPS per replica | Integer | 10–2000 | 100 |

**Behavior**
- Auto-scales based on load. When `currentLoad > targetCPU * currentReplicas * rpsPerReplica`, triggers scale-out.
- Scale-out delay: `scaleOutCooldown` sim-seconds before new replicas are ready. During this period, existing replicas absorb traffic (may saturate).
- Scale-in is conservative (longer cooldown) to prevent oscillation.
- Replicas always run between min and max, regardless of load.

**Cost**: `currentReplicas * nodeType.hourlyRate / replicasPerNode`

**Teaches**: horizontal pod autoscaling, scale-out lag, min/max replica tradeoffs, headroom configuration.

---

### Serverless Function (Lambda / Cloud Functions)

Event-driven compute that scales to zero. Pay per invocation.

**Configurable properties**
| Property | Type | Range | Default |
|----------|------|-------|---------|
| Memory (MB) | Select | 128–10240MB | 512 |
| Max concurrency | Integer | 1–3000 | 1000 |
| Timeout (ms) | Integer | 100–900,000 | 3000 |
| Cold start (ms) | Number | 0–2000 | 200 |
| Provisioned concurrency | Integer | 0–1000 | 0 |

**Behavior**
- Scales automatically up to `maxConcurrency`. Above that: throttle errors.
- Cold start: each new execution environment incurs `coldStartMs` one-time penalty. Cold starts occur when `currentConcurrency > warmExecutionEnvironments`.
- Provisioned concurrency: pre-warmed environments (no cold start penalty, continuous cost).
- Timeout: invocations exceeding `timeoutMs` are terminated and return error.

**Cost**: `$0.0000002 * invocations + $0.0000166667 * GB * seconds`

**Teaches**: serverless cost model, cold starts, concurrency limits, provisioned vs on-demand.

---

### NoSQL Database (DynamoDB / Firestore)

Document or key-value store optimized for high-throughput, low-latency access at scale.

**Configurable properties**
| Property | Type | Range | Default |
|----------|------|-------|---------|
| Read capacity units | Integer | 1–40,000 | 100 |
| Write capacity units | Integer | 1–40,000 | 10 |
| Capacity mode | Select | Provisioned, On-Demand | Provisioned |
| Global tables (regions) | Integer | 1–5 | 1 |
| Consistency | Select | Eventual, Strong | Eventual |

**Behavior**
- Provisioned: fixed capacity. Reads/writes exceeding WCU/RCU are throttled (errors).
- On-Demand: auto-scales but costs 6x per unit vs provisioned.
- Global tables: data replicated across regions with ~100ms replication lag. Reads can be served locally (low latency). Writes conflict if same key written in multiple regions simultaneously.
- Strong consistency: reads always return latest write, but doubles read cost (uses 2x RCU).

**Cost**: Provisioned: `$0.00013/RCU-hr + $0.00065/WCU-hr`. On-Demand: `$0.25/million reads + $1.25/million writes`.

**Teaches**: NoSQL scaling, RCU/WCU capacity planning, eventual vs strong consistency, global tables.

---

## Tier 4 — Unlock after completing Tier 3

### Kafka / Streaming Platform

Distributed event streaming for high-throughput, durable, ordered message delivery.

**Configurable properties**
| Property | Type | Range | Default |
|----------|------|-------|---------|
| Partitions | Integer | 1–1000 | 12 |
| Replication factor | Integer | 1–5 | 3 |
| Retention (hours) | Integer | 1–2160 | 168 |
| Consumer groups | Integer | 1–20 | 1 |
| Consumers per group | Integer | 1–1000 | 3 |

**Behavior**
- Throughput scales with partition count (more partitions = more parallelism)
- Replication: each message written to `replicationFactor` brokers. Higher replication = durability + write overhead.
- Consumer groups: multiple independent consumers reading the same stream (fan-out pattern)
- Ordering: guaranteed within a partition. Cross-partition ordering requires single partition (throughput limit).
- vs SQS: Kafka retains messages for `retention` hours (replay-able). SQS deletes on acknowledgment.

**Cost**: MSK pricing: `$0.21/broker-hr + $0.10/GB-hr storage`

**Teaches**: partitioning, consumer groups, at-least-once delivery, message replay, fan-out vs queue.

---

### Service Mesh (Istio / Linkerd)

Adds observability, traffic management, and security to inter-service communication via sidecar proxies.

**Configurable properties**
| Property | Type | Range | Default |
|----------|------|-------|---------|
| mTLS | Boolean | on/off | on |
| Retry policy | Select | None, 1x, 2x, 3x | None |
| Retry budget | Slider | 10–50% | 20% |
| Timeout (ms) | Integer | 100–60000 | 5000 |
| Traffic split (%) | Number | 0–100 | — |

**Behavior**
- Adds ~2ms latency per hop (sidecar overhead)
- Retry policy: failed requests are retried up to N times. Retry budget caps total retries as % of total traffic (prevents retry storm).
- Traffic split: A/B or canary — send X% to one backend, (100-X)% to another
- Timeout: requests exceeding `timeoutMs` are terminated (circuit breaker per connection)

**Cost**: CPU overhead ~10% per sidecar (increases effective compute cost). No direct cost.

**Teaches**: retries and retry storms, canary deployments, mTLS, sidecar pattern.

---

### Read Replica (explicit)

Available as a standalone addition to SQL Database when student is learning read scaling specifically.

See SQL Database above for behavior — this is an explicit visual component rather than a property slider, making the read replica topology visible in the canvas.

---

## Tier 5 — Advanced (Principal Engineer+)

### Global Load Balancer / GeoDNS

Routes traffic to the nearest regional cluster based on geographic origin.

**Configurable properties**
| Property | Type | Range | Default |
|----------|------|-------|---------|
| Regions | Multi-select | us-east, us-west, eu-west, ap-southeast, etc. | us-east |
| Routing policy | Select | Latency-based, Geo, Weighted, Failover | Latency-based |
| Health check interval | Integer | 10–300s | 30s |
| Failover threshold | Integer | 1–5 | 2 |

**Behavior**
- Each region has its own sub-architecture (a cluster within the canvas, grouped visually)
- Latency-based routing: directs user to lowest-latency region
- Geo routing: directs by IP geolocation regardless of latency
- Failover: if primary region fails health checks, routes to secondary
- DNS TTL affects failover speed: low TTL = faster failover, higher DNS query cost

**Teaches**: multi-region architecture, active-active vs active-passive, DNS-based failover, replication consistency tradeoffs.

---

### Distributed Cache (Redis Cluster)

Horizontally sharded cache across multiple nodes using consistent hashing.

**Configurable properties**
| Property | Type | Range | Default |
|----------|------|-------|---------|
| Node count | Integer | 3–100 | 3 |
| Memory per node (GB) | Select | 1–128GB | 16GB |
| Replication | Boolean | on/off | on |

**Behavior**
- Data sharded across nodes via consistent hashing ring
- Node failure: responsible for 1/N of keyspace. Other nodes absorb traffic (increased load). If replication off: data loss for that shard. If replication on: replica promotes (brief unavailability during failover).
- Adding a node: rebalancing causes temporary miss rate spike

**Teaches**: consistent hashing, data distribution, rebalancing cost, hot key problem.

---

### Object Storage (S3 / GCS)

Durable, scalable blob storage. Not a database — optimized for large objects, not random access.

**Configurable properties**
| Property | Type | Range | Default |
|----------|------|-------|---------|
| Storage class | Select | Standard, Infrequent Access, Archive | Standard |
| Versioning | Boolean | on/off | off |
| Replication | Select | None, Cross-Region | None |

**Behavior**
- Effectively unlimited throughput and storage (not a bottleneck in normal use)
- Latency: ~20–100ms first byte (much higher than cache or database)
- Typically used as origin for CDN, not directly user-facing
- Not suitable for: low-latency lookups, transactional data, small objects at high frequency

**Cost**: `$0.023/GB-mo (standard) + $0.09/GB egress`

**Teaches**: appropriate use of object storage, hot/cold storage tiers, S3 as CDN origin.
