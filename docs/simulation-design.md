# Simulation Design

## Philosophy

The simulation must be honest but comprehensible. Two failure modes to avoid:

- **Too realistic**: Modeling TCP slow start, kernel scheduling, JVM GC pauses — players can't reason about it.
- **Too abstract**: Linear scaling, no interactions — doesn't teach anything real.

The target: a model where the important distributed systems behaviors emerge naturally — saturation, cascades, backpressure, cold-start penalties — from a small set of understandable rules.

---

## Model: Flow-Based Component Graph

The sim models the system as a directed graph where each node (component) transforms an input flow into an output flow each tick.

```
                    inputRPS
                       │
                       ▼
             ┌─────────────────┐
             │   Component     │
             │                 │
             │  apply capacity │
             │  apply latency  │
             │  apply errors   │
             │  apply cost     │
             └─────────────────┘
                       │
                       ▼
                   outputRPS
                (+ queueDepth, latency, errorRate, cost)
```

Traffic flows through the graph. Each component applies its own transformation. The simulation tick resolves the graph in topological order.

---

## Simulation Loop

Runs in a Web Worker. Not real-time — time is compressed.

```typescript
const TICK_SIM_MS = 100          // each tick = 100ms of simulated time
const SNAPSHOT_INTERVAL_MS = 100 // post snapshot to UI every 100ms real-time
const MAX_SPEED = 10             // 10x compression = 1 sim hour in 6 real seconds

function runSimulation(graph: SimGraph, traffic: TrafficConfig, duration: number) {
  let simTime = 0
  const state = initializeComponentState(graph)

  while (simTime < duration) {
    const rps = sampleTrafficCurve(traffic, simTime)

    // 1. Inject traffic at ingress nodes
    injectTraffic(state, graph.ingressNodeIds, rps)

    // 2. Resolve graph in topological order
    for (const nodeId of topologicalOrder(graph)) {
      resolveComponent(state, graph, nodeId)
    }

    // 3. Apply chaos events scheduled for this tick
    applyChaosEvents(state, chaosSchedule, simTime)

    // 4. Collect tick metrics
    recordTick(state, simTime)

    simTime += TICK_SIM_MS
  }

  return computeFinalResult(state)
}
```

---

## Component Resolution

The core math per component per tick.

### Capacity model: M/M/1 queue approximation

Each component has a `maxRPS` (service rate μ). When `inputRPS` approaches `maxRPS`, latency grows nonlinearly using the M/M/1 formula:

```
ρ = inputRPS / maxRPS           // utilization (0.0 – 1.0)
latency = baseLatency / (1 - ρ) // latency explodes as ρ → 1
```

When `ρ > 1.0` (overloaded):
- `queueDepth` grows at rate `(inputRPS - maxRPS) * TICK_SIM_MS / 1000`
- Requests are dropped once queue exceeds `maxQueueDepth` (returns errors)
- `outputRPS = maxRPS` (component processes at max rate, rest queued or dropped)

When `ρ ≤ 1.0`:
- `queueDepth` drains at rate proportional to slack capacity
- `outputRPS = inputRPS * (1 - errorRate)`

### Error rate model

```
// Base error rate set in component config
// Increases with load (errors rise under pressure)
effectiveErrorRate = baseErrorRate + (ρ^3) * LOAD_ERROR_FACTOR

// Propagated errors from upstream (cascade failures)
upstreamErrorRate = weightedAvg(incomingEdgeErrorRates)
totalErrorRate = 1 - (1 - effectiveErrorRate) * (1 - upstreamErrorRate)
```

The cubic factor means error rate accelerates sharply at high utilization — matching the "it was fine until it wasn't" behavior of real systems.

### Latency composition

```
// Component adds its own latency + weighted upstream latency
incomingLatency = max(upstreamLatencies)  // critical path
ownLatency      = baseLatency / (1 - ρ)   // M/M/1 formula
totalLatency    = incomingLatency + ownLatency
```

p99 latency uses a multiplier over average:
```
p99Latency = avgLatency * p99Multiplier  // typically 2.5-5x depending on component type
```

---

## Per-Component Behaviors

### Load Balancer

- Splits `inputRPS` across N backend connections using configured algorithm
- Round-robin / least-conn: equal split
- Consistent hash: can create hotspots (visualized as unequal distribution)
- Health checks: if backend `status == 'failed'`, routes 0 traffic to it (others absorb)
- `ownLatency`: ~1ms (negligible)
- No queue: drops requests immediately if all backends saturated

### Cache (Redis / Memcached)

- `hitRate` is a configured property (0.0–1.0), reduced dynamically after cold-start or flush
- `outputRPS` to downstream = `inputRPS * (1 - hitRate)` (cache hits don't reach backend)
- Cache hit responses have `ownLatency` ~1ms
- Cache miss responses incur `ownLatency` ~1ms + downstream round-trip
- After cold-start (cache flush event): `hitRate` rebuilds linearly over `warmupPeriodSec`
- Memory limit: if `inputRPS * avgItemSize > cacheMemory`, evictions increase miss rate

### Database

- Most complex component. Has `maxRPS` (connections × queries/sec/connection)
- `baseLatency` is configurable (OLTP ~5ms, analytical ~100ms)
- Replication: replicas handle read traffic. Only primary handles writes.
  - Read/write ratio set in config
  - Replica lag = additional latency on reads (0ms–500ms configurable)
- Connection pool: `maxConnections` caps throughput before M/M/1 model
- Saturation at high ρ produces very long-tailed latency (p99Multiplier = 8x when ρ > 0.9)

### Message Queue (Kafka / SQS)

- Decouples producer and consumer. Key mechanic: absorbs traffic spikes.
- Queue depth = `∫(producerRPS - consumerRPS) dt` over time
- If depth > `maxQueueDepth`: producer experiences backpressure (writes start failing)
- Consumer `maxRPS` is configurable (number of consumer instances × throughput per instance)
- Adds `ownLatency` equal to queue dwell time: `queueDepth / consumerRPS`
- Durability: all messages survive component failures (queue contents persist)

### API Gateway

- Rate limiting: requests exceeding `rateLimit` return 429 (counted as errors)
- Auth overhead: adds `authLatencyMs` to each request
- Circuit breaker: if downstream `errorRate > cbThreshold` for `cbWindowSec`, opens circuit
  - Open circuit: returns 503 immediately, stops traffic to downstream
  - Half-open: probes at low rate, closes circuit if succeeds
- `ownLatency`: 5–20ms base

### CDN

- Simulates geographic distribution. Reduces effective RPS hitting origin.
- `cacheHitRate` (0.0–1.0) configured per challenge based on content type
- Cache hit: `ownLatency` ~5ms, request never reaches origin
- Cache miss: `ownLatency` ~5ms + origin round-trip (includes propagation delay)
- After origin change or cache purge: hit rate drops to 0 and rebuilds over `ttlSec`

### Serverless Function

- `maxConcurrency` caps simultaneous executions (configurable)
- Cold start: first invocation after `idlePeriodSec` incurs `coldStartMs` penalty
- Auto-scales within concurrency limit (no manual replica count)
- Cost model: per-invocation + per-GB-second (different from hourly server cost)
- `maxExecutionMs`: requests exceeding this are terminated (error)

### Kubernetes / Container Pool

- Abstracts a fleet of instances with HPA (Horizontal Pod Autoscaler)
- `minReplicas`, `maxReplicas`, `targetCPUPct` configurable
- Scale-out delay: `scaleOutDelaySec` (default 90s sim-time). During delay, existing replicas absorb traffic (may saturate).
- Scale-in delay: `scaleInDelaySec` (default 300s sim-time). Prevents oscillation.
- Cost: `currentReplicas * costPerReplicaPerHour`

---

## Chaos Events

Each challenge includes a `chaosSchedule`: a list of events injected at specific sim times.

```typescript
type ChaosEvent = {
  simTimeMs: number
  type: 'NODE_FAILURE' | 'TRAFFIC_SPIKE' | 'CACHE_FLUSH' | 'NETWORK_PARTITION' | 'LATENCY_INJECTION'
  targetNodeId?: string
  params: Record<string, unknown>
  durationMs?: number           // for temporary events
}
```

### NODE_FAILURE
Sets target component `status = 'failed'`. `outputRPS = 0`. Traffic that was routed to it must find another path or be dropped. After `durationMs`, component recovers.

### TRAFFIC_SPIKE
Multiplies ingress RPS by `params.multiplier` for `durationMs`.

### CACHE_FLUSH
Sets cache `hitRate = 0`. Rebuilds over `params.warmupSec`. Causes thundering herd on backing store.

### NETWORK_PARTITION
Drops all traffic on the edge between two specified nodes. Both sides continue operating independently. If they share mutable state (DB), split-brain can occur.

### LATENCY_INJECTION
Adds `params.extraLatencyMs` to a specific edge for `durationMs`. Simulates slow network, noisy neighbor.

---

## Graph Resolution: Cycles

Distributed systems can have feedback loops (e.g., service A calls service B which calls service A). The sim handles this with fixed-point iteration:

1. Attempt topological sort
2. If cycles detected, break at the cycle edge (mark as "deferred")
3. Resolve all non-cycle nodes first
4. Re-resolve cycle nodes using previous tick's values for deferred edges
5. Iterate until values converge (max 5 iterations)

In practice, cycles should be rare. The game's challenge design steers away from them at lower tiers.

---

## Cost Model

Cost is computed per tick and accumulated.

```typescript
function computeCost(component: ComponentConfig, state: ComponentState): number {
  switch (component.type) {
    case 'server':
      return component.instanceCount * component.instanceType.costPerHour
    case 'database':
      return component.instanceType.costPerHour + component.replicaCount * component.replicaType.costPerHour + state.storageGB * 0.10 // per GB/mo amortized
    case 'cache':
      return component.instanceType.costPerHour
    case 'cdn':
      return state.egressGB * 0.08  // per GB egress
    case 'serverless':
      return state.invocations * 0.0000002 + state.gbSeconds * 0.0000166667
    case 'queue':
      return state.messagesMillions * 0.40  // per million messages
    case 'load_balancer':
      return 0.025 + state.lbuHours * 0.008  // fixed + LCU hours
  }
}
```

---

## Metrics Collected

Per tick, per component:
- `inputRPS`, `outputRPS`
- `queueDepth` (0.0–1.0)
- `avgLatencyMs`, `p99LatencyMs`
- `errorRate`
- `costPerHour`
- `status`

Aggregated at system level:
- `systemP99LatencyMs` — max p99 along critical path from ingress to egress
- `systemErrorRate` — error rate at egress (requests that never got a successful response)
- `systemCostPerHour` — sum of all component costs
- `totalRequestsServed`
- `totalRequestsDropped`

These are what the win-condition checker compares against SLA targets.

---

## Win Condition Evaluation

Evaluated against the last 80% of simulation time (first 20% is warm-up):

```typescript
function evaluateWinConditions(result: SimResult, challenge: Challenge): EvalResult {
  const steady = result.ticks.slice(Math.floor(result.ticks.length * 0.2))

  const p99 = percentile(steady.map(t => t.systemP99LatencyMs), 99)
  const errorRate = mean(steady.map(t => t.systemErrorRate))
  const cost = mean(steady.map(t => t.systemCostPerHour))

  return {
    passedLatency: p99 <= challenge.slaTargets.p99LatencyMs,
    passedErrors:  errorRate <= challenge.slaTargets.errorRate,
    passedCost:    cost <= challenge.budgetPerHour,
    passedResilience: evaluateChaosPhase(result, challenge.chaosEvents),
    p99, errorRate, cost
  }
}
```

All four conditions must pass for level completion. Score is computed on top of a passing run.
