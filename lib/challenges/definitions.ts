import { presetToWaypoints } from '@/sim/types'
import { makeChaosEvent } from '@/sim/chaos'
import type { Challenge } from './types'

export const CHALLENGES: Challenge[] = [
  // ── Tutorial ────────────────────────────────────────────────────────────────

  {
    id: 'T-0',
    tier: 0,
    order: 0,
    title: 'Hello, Traffic',
    narrative:
      'Your startup just launched. One server is handling all requests. ' +
      'The traffic is light, but it needs to actually work.',
    objective:
      'Connect a Client to a Server. Run the simulation and see traffic flow.',
    trafficConfig: {
      durationMs: 30_000,
      waypoints: presetToWaypoints('steady', 50, 1, 30_000),
    },
    slaTargets: { p99LatencyMs: 500, errorRate: 0.05 },
    budgetPerHour: 1.0,
    allowedComponents: ['client', 'server'],
    conceptsTaught: ['request flow', 'latency', 'error rate'],
    hints: [
      'Drag a Client node and a Server node onto the canvas.',
      'Draw a connection from the Client to the Server.',
      'Press Run and watch the metrics appear.',
    ],
    starterNodes: [
      { id: 'client-1', type: 'client', position: { x: 80, y: 200 }, label: 'Users', config: { rps: 50, preset: 'steady', peakMultiplier: 1 } },
    ],
  },

  {
    id: 'T-1',
    tier: 0,
    order: 1,
    title: 'Growing Pains',
    narrative:
      'Traffic doubled overnight. Your single t3.micro is sweating — ' +
      'p99 latency is creeping up and errors are starting to appear.',
    objective:
      'Keep p99 latency under 200ms and errors under 1% at 100 RPS. ' +
      'Upgrade the server or add a second one.',
    trafficConfig: {
      durationMs: 45_000,
      waypoints: presetToWaypoints('steady', 100, 1, 45_000),
    },
    slaTargets: { p99LatencyMs: 200, errorRate: 0.01 },
    budgetPerHour: 0.5,
    allowedComponents: ['client', 'server'],
    conceptsTaught: ['vertical scaling', 'horizontal scaling', 'instance types'],
    hints: [
      'A t3.micro handles 50 RPS max — 100 RPS will saturate it.',
      'Try upgrading the instance type to t3.small or t3.medium.',
      'Or add a second server node and split traffic with edge weights.',
    ],
    starterNodes: [
      { id: 'client-1', type: 'client', position: { x: 80, y: 200 }, label: 'Users', config: { rps: 100, preset: 'steady', peakMultiplier: 1 } },
      { id: 'server-1', type: 'server', position: { x: 320, y: 200 }, label: 'App Server', config: { instanceType: 't3.micro', instanceCount: 1, baseLatencyMs: 20 } },
    ],
    starterEdges: [
      { source: 'client-1', target: 'server-1' },
    ],
  },

  {
    id: 'T-2',
    tier: 0,
    order: 2,
    title: 'The Spike',
    narrative:
      'Your blog post went viral. Traffic is mostly steady but spikes to 5× ' +
      "at noon. Your server handles the baseline fine — it's the spike that kills you.",
    objective:
      'Survive a 5× traffic spike without exceeding 300ms p99 or 2% error rate.',
    trafficConfig: {
      durationMs: 60_000,
      waypoints: presetToWaypoints('spike', 100, 5, 60_000),
    },
    slaTargets: { p99LatencyMs: 300, errorRate: 0.02 },
    budgetPerHour: 1.0,
    allowedComponents: ['client', 'server'],
    conceptsTaught: ['traffic spikes', 'over-provisioning', 'peak capacity planning'],
    hints: [
      'Watch the traffic curve — RPS peaks at 500 at the midpoint.',
      'You need enough total capacity to handle the peak, not just the baseline.',
      'Multiple smaller servers can be more cost-effective than one giant one.',
    ],
    starterNodes: [
      { id: 'client-1', type: 'client', position: { x: 80, y: 200 }, label: 'Users', config: { rps: 100, preset: 'spike', peakMultiplier: 5 } },
    ],
  },

  {
    id: 'T-3',
    tier: 0,
    order: 3,
    title: 'The Database Bottleneck',
    narrative:
      'You added a database for persistence. Now every request hits the DB — ' +
      'and the DB can only handle so many connections.',
    objective:
      'Route Server → Database and keep everything under 400ms p99 at 80 RPS.',
    trafficConfig: {
      durationMs: 45_000,
      waypoints: presetToWaypoints('steady', 80, 1, 45_000),
    },
    slaTargets: { p99LatencyMs: 400, errorRate: 0.01 },
    budgetPerHour: 0.5,
    allowedComponents: ['client', 'server', 'database'],
    conceptsTaught: ['database connections', 'latency stacking', 'connection pools'],
    hints: [
      'Every hop adds latency. Client → Server → DB means latencies add up.',
      'The database maxConnections setting throttles how many simultaneous queries it can handle.',
      'Try db.t3.small with maxConnections = 150 to start.',
    ],
    starterNodes: [
      { id: 'client-1', type: 'client', position: { x: 60, y: 200 }, label: 'Users', config: { rps: 80, preset: 'steady', peakMultiplier: 1 } },
      { id: 'server-1', type: 'server', position: { x: 280, y: 200 }, label: 'App Server', config: { instanceType: 't3.small', instanceCount: 1, baseLatencyMs: 20 } },
    ],
    starterEdges: [
      { source: 'client-1', target: 'server-1' },
    ],
  },

  // ── Tier 1 ──────────────────────────────────────────────────────────────────

  {
    id: '1-1',
    tier: 1,
    order: 0,
    title: 'Cache Money',
    narrative:
      'Your product is gaining users. DB queries are the bottleneck — 90% of ' +
      'reads are for the same 100 products. Time to introduce a cache.',
    objective:
      'Achieve p99 < 150ms and < 0.5% errors at 200 RPS. Stay under $0.20/hr.',
    trafficConfig: {
      durationMs: 60_000,
      waypoints: presetToWaypoints('steady', 200, 1, 60_000),
    },
    slaTargets: { p99LatencyMs: 150, errorRate: 0.005 },
    budgetPerHour: 0.20,
    allowedComponents: ['client', 'server', 'database', 'cache'],
    conceptsTaught: ['cache-aside pattern', 'cache hit rate', 'read amplification reduction'],
    hints: [
      'Route: Client → Server → Cache → Database.',
      'The Cache passes through only cache-miss requests (1 - hitRate) to the DB.',
      'A 90% hit rate means the DB only sees 10% of requests.',
      'cache.t3.micro is cheap — use it to absorb reads.',
    ],
    starterNodes: [
      { id: 'client-1', type: 'client', position: { x: 60, y: 200 }, label: 'Users', config: { rps: 200, preset: 'steady', peakMultiplier: 1 } },
    ],
  },

  {
    id: '1-2',
    tier: 1,
    order: 1,
    title: 'Load Balancing 101',
    narrative:
      'Engineering tells you a single server maxes out at 500 RPS. You\'re at ' +
      '400 now and trending up. Time to learn about load balancers.',
    objective:
      'Handle 600 RPS with p99 < 100ms, < 0.5% errors, under $0.50/hr.',
    trafficConfig: {
      durationMs: 60_000,
      waypoints: presetToWaypoints('steady', 600, 1, 60_000),
    },
    slaTargets: { p99LatencyMs: 100, errorRate: 0.005 },
    budgetPerHour: 0.50,
    allowedComponents: ['client', 'server', 'load-balancer'],
    conceptsTaught: ['horizontal scaling', 'load balancing', 'traffic distribution', 'edge weights'],
    hints: [
      'A single m5.large handles 500 RPS — you need more.',
      'Place a Load Balancer between the Client and your servers.',
      'Connect the LB to 2+ servers. Adjust edge weights for even distribution.',
      'Two t3.medium instances = 400 RPS combined, $0.083/hr — cheap and sufficient.',
    ],
    starterNodes: [
      { id: 'client-1', type: 'client', position: { x: 60, y: 250 }, label: 'Users', config: { rps: 600, preset: 'steady', peakMultiplier: 1 } },
    ],
  },

  {
    id: '1-3',
    tier: 1,
    order: 2,
    title: 'The Ramp',
    narrative:
      'You\'re onboarding a new enterprise customer. Traffic will ramp from ' +
      '100 to 800 RPS over the next hour. Design for the peak, optimize for cost.',
    objective:
      'Handle a ramp from 100 to 800 RPS with p99 < 200ms, < 1% errors, under $0.80/hr.',
    trafficConfig: {
      durationMs: 90_000,
      waypoints: presetToWaypoints('ramp', 100, 8, 90_000),
    },
    slaTargets: { p99LatencyMs: 200, errorRate: 0.01 },
    budgetPerHour: 0.80,
    allowedComponents: ['client', 'server', 'database', 'cache', 'load-balancer'],
    conceptsTaught: ['capacity planning', 'ramp traffic', 'cost vs. headroom'],
    hints: [
      'The ramp ends at 800 RPS. Your architecture must handle the peak.',
      'A Load Balancer + multiple servers gives you the throughput you need.',
      'Add a Cache to reduce DB load as traffic grows.',
      'Balance: enough servers to handle peak, cheap enough to stay in budget.',
    ],
    starterNodes: [
      { id: 'client-1', type: 'client', position: { x: 60, y: 250 }, label: 'Users', config: { rps: 100, preset: 'ramp', peakMultiplier: 8 } },
    ],
  },

  {
    id: '1-4',
    tier: 1,
    order: 3,
    title: 'Flash Sale',
    narrative:
      'Black Friday. Traffic is steady at 150 RPS then spikes to 1,000 RPS for ' +
      '5 minutes at peak. You have a $1/hr budget. Design for the chaos.',
    objective:
      'Survive a 6.7× spike to 1,000 RPS: p99 < 250ms, < 1% errors, under $1/hr.',
    trafficConfig: {
      durationMs: 120_000,
      waypoints: presetToWaypoints('spike', 150, 7, 120_000),
    },
    slaTargets: { p99LatencyMs: 250, errorRate: 0.01 },
    budgetPerHour: 1.00,
    allowedComponents: ['client', 'server', 'database', 'cache', 'load-balancer'],
    conceptsTaught: ['spike handling', 'cache as buffer', 'over-provisioning trade-offs'],
    hints: [
      'Peak is ~1,050 RPS. You need headroom above that.',
      'A high-hit-rate cache dramatically reduces DB pressure during spikes.',
      'Consider: LB → 3-4 servers → Cache → DB.',
      'Watch both the latency spike and error rate — they\'re linked.',
    ],
    starterNodes: [
      { id: 'client-1', type: 'client', position: { x: 60, y: 250 }, label: 'Users', config: { rps: 150, preset: 'spike', peakMultiplier: 7 } },
    ],
  },

  // ── Tier 2 ──────────────────────────────────────────────────────────────────

  {
    id: '2-1',
    tier: 2,
    order: 0,
    title: 'Buffer the Storm',
    narrative:
      'Your database is getting hammered during traffic spikes. Every spike causes ' +
      'connection exhaustion and cascading errors. A queue can absorb the burst and ' +
      'feed the database at a steady rate.',
    objective:
      'Use a Queue to smooth out a 6× traffic spike. Keep errors under 1% and p99 under 800ms.',
    trafficConfig: {
      durationMs: 90_000,
      waypoints: presetToWaypoints('spike', 100, 6, 90_000),
    },
    slaTargets: { p99LatencyMs: 800, errorRate: 0.01 },
    budgetPerHour: 0.40,
    allowedComponents: ['client', 'server', 'database', 'cache', 'queue'],
    conceptsTaught: ['message queues', 'backpressure', 'decoupling', 'spike smoothing'],
    hints: [
      'Route: Client → Server → Queue → Database.',
      'Set the Queue drain rate to match what the DB can handle (not the peak RPS).',
      'The Queue adds latency but prevents DB connection exhaustion.',
      'A cache before the queue can reduce the write load entirely.',
    ],
    starterNodes: [
      { id: 'client-1', type: 'client', position: { x: 60, y: 250 }, label: 'Users', config: { rps: 100, preset: 'spike', peakMultiplier: 6 } },
    ],
  },

  {
    id: '2-2',
    tier: 2,
    order: 1,
    title: 'No Single Point of Failure',
    narrative:
      "It's 2am. Your on-call phone rings. The primary app server just died. " +
      "Traffic is piling up and users are seeing errors. You swore you'd add redundancy " +
      "last quarter. Now it's too late — or is it?",
    objective:
      'Design an architecture that survives an automatic node failure at t=40s. ' +
      'Keep errors under 5% across the full 90s simulation.',
    trafficConfig: {
      durationMs: 90_000,
      waypoints: presetToWaypoints('steady', 300, 1, 90_000),
    },
    slaTargets: { p99LatencyMs: 300, errorRate: 0.05 },
    budgetPerHour: 0.60,
    allowedComponents: ['client', 'server', 'database', 'load-balancer'],
    conceptsTaught: ['redundancy', 'failover', 'single point of failure', 'load balancing'],
    hints: [
      'A single server that fails = 100% error rate. You need at least 2.',
      'A Load Balancer distributes traffic so one server failure is non-fatal.',
      'The failure happens at t=40s for 15s — size your remaining capacity to handle full load.',
      'Watch the "Node Failed" overlay appear on the server during the chaos window.',
    ],
    starterNodes: [
      { id: 'client-1', type: 'client', position: { x: 60, y: 250 }, label: 'Users', config: { rps: 300, preset: 'steady', peakMultiplier: 1 } },
      { id: 'server-1', type: 'server', position: { x: 400, y: 150 }, label: 'App Server A', config: { instanceType: 'm5.large', instanceCount: 1, baseLatencyMs: 20 } },
    ],
    // Automatically kill server-1 at t=40s for 15s
    chaosSchedule: [
      makeChaosEvent('server-1', 'node-failure', 40_000, 15_000),
    ],
  },

  // ── Tier 2 (continued) ───────────────────────────────────────────────────

  {
    id: '2-3',
    tier: 2,
    order: 2,
    title: 'Async Upload Pipeline',
    narrative:
      'Your image processing service handles 100 uploads per second, and each job takes ~2 seconds. ' +
      'Processing everything synchronously means users wait 2s for an ack — and your server explodes at any burst. ' +
      'Decouple the upload endpoint from the worker fleet.',
    objective:
      'Keep the full processing pipeline under 1.5s p99 and drop rate under 0.5%. ' +
      'The key insight: if the queue overflows, jobs are lost — zero drops = the workers are keeping up.',
    trafficConfig: {
      durationMs: 90_000,
      waypoints: presetToWaypoints('steady', 100, 1, 90_000),
    },
    slaTargets: { p99LatencyMs: 1500, errorRate: 0.005 },
    budgetPerHour: 2.00,
    allowedComponents: ['client', 'server', 'database', 'cache', 'queue', 'k8s-fleet'],
    conceptsTaught: ['async decoupling', 'queue dwell time', 'worker pools', 'backpressure'],
    hints: [
      'Route: Client → Server → Queue → K8s Fleet → Database.',
      'Size the Server with headroom — at 100 RPS input, use t3.medium or larger so enqueue latency stays low.',
      'Set Queue drain rate to 2–3× your input RPS (e.g. 250 RPS for 100 RPS input). At drain = input, ρ = 1 and dwell time explodes.',
      'The K8s Fleet must handle the drain rate, not just the input. At 250 RPS drain, provision enough replicas (≥ 2 t3.medium).',
      'Zero errors means the queue is never overflowing. Watch for error rate > 0 — that means jobs are being dropped.',
    ],
    starterNodes: [
      { id: 'client-1', type: 'client',  position: { x: 60,  y: 250 }, label: 'Upload Clients', config: { rps: 100, preset: 'steady', peakMultiplier: 1 } },
      { id: 'server-1', type: 'server',  position: { x: 280, y: 250 }, label: 'Upload API',     config: { instanceType: 't3.medium', instanceCount: 1, baseLatencyMs: 20 } },
    ],
  },

  {
    id: '2-4',
    tier: 2,
    order: 3,
    title: 'Cascading Failure',
    narrative:
      'Your checkout service calls a fraud detection API. At t=45s it gets slow — 5× latency. ' +
      "Without protection every checkout hangs, and users see timeouts. Add a circuit breaker.",
    objective:
      'Keep checkout p99 under 500ms and errors under 2% across the full 90s — including the slowdown window.',
    trafficConfig: {
      durationMs: 90_000,
      waypoints: presetToWaypoints('steady', 200, 1, 90_000),
    },
    slaTargets: { p99LatencyMs: 500, errorRate: 0.02 },
    budgetPerHour: 0.50,
    allowedComponents: ['client', 'server', 'database', 'cache', 'api-gateway'],
    conceptsTaught: ['circuit breaker', 'cascading failure', 'fast-fail', 'graceful degradation'],
    hints: [
      'Place an API Gateway in front of your Server. Enable the Circuit Breaker option.',
      'Without circuit breaker: the latency spike propagates all the way to the user.',
      'With circuit breaker: the Gateway opens on the spike and fast-fails (5ms, not 5s).',
      'Fast-fail means higher error rate briefly — but much lower latency. That trade-off saves the system.',
      'The chaos fires on the "fraud-api" node — you must name a server node exactly "fraud-api" to trigger it.',
    ],
    starterNodes: [
      { id: 'client-1',   type: 'client',   position: { x: 60,  y: 250 }, label: 'Checkout Clients', config: { rps: 200, preset: 'steady', peakMultiplier: 1 } },
      { id: 'fraud-api',  type: 'server',   position: { x: 600, y: 250 }, label: 'Fraud API',        config: { instanceType: 'm5.large', instanceCount: 1, baseLatencyMs: 50 } },
    ],
    chaosSchedule: [
      makeChaosEvent('fraud-api', 'latency-spike', 45_000, 30_000, 5),
    ],
  },

  {
    id: '2-5',
    tier: 2,
    order: 4,
    title: 'Flash Sale Scale-Out',
    narrative:
      'Your e-commerce platform normally handles 300 RPS. A flash sale starts at t=20s — ' +
      'traffic surges to 2,400 RPS for 40 seconds, then drops back. ' +
      'Static provisioning for peak wastes money at baseline. Use a K8s Fleet to auto-scale.',
    objective:
      'Keep p99 under 400ms and errors under 2% through the spike. Stay under $1.50/hr average cost.',
    trafficConfig: {
      durationMs: 90_000,
      waypoints: [
        { timeMs: 0,      rps: 300  },
        { timeMs: 20_000, rps: 300  },
        { timeMs: 25_000, rps: 2400 },
        { timeMs: 65_000, rps: 2400 },
        { timeMs: 70_000, rps: 300  },
        { timeMs: 90_000, rps: 300  },
      ],
    },
    slaTargets: { p99LatencyMs: 400, errorRate: 0.02 },
    budgetPerHour: 1.50,
    allowedComponents: ['client', 'server', 'database', 'cache', 'load-balancer', 'queue', 'k8s-fleet'],
    conceptsTaught: ['horizontal auto-scaling', 'HPA', 'cost vs. headroom', 'scale-out'],
    hints: [
      'A static server fleet provisioned for 2,400 RPS burns budget at baseline.',
      'A K8s Fleet with HPA scales from minReplicas at rest to maxReplicas at peak — automatically.',
      'Set targetUtilization ~70% so the fleet has headroom before the spike arrives.',
      'A Cache in front reduces read-heavy product queries — meaning the fleet sees less RPS.',
    ],
    starterNodes: [
      { id: 'client-1', type: 'client', position: { x: 60, y: 250 }, label: 'Shoppers', config: { rps: 300, preset: 'spike', peakMultiplier: 8 } },
    ],
  },

  // ── Tier 3 ──────────────────────────────────────────────────────────────────

  {
    id: '3-2',
    tier: 3,
    order: 1,
    title: 'Autoscale Tuning',
    narrative:
      'Your K8s fleet keeps falling behind on traffic spikes. ' +
      'The HPA target is too conservative and the replica cap is too low — ' +
      'the scaler runs out of headroom before traffic peaks.',
    objective:
      'Survive three traffic surges without exceeding 300ms p99 or 0.5% errors. ' +
      'Stay under $1.50/hr. Tune targetUtilization and maxReplicas on the K8s Fleet.',
    trafficConfig: {
      durationMs: 120_000,
      waypoints: [
        { timeMs: 0,       rps: 300  },
        { timeMs: 15_000,  rps: 300  },
        { timeMs: 20_000,  rps: 1_100 },
        { timeMs: 35_000,  rps: 300  },
        { timeMs: 50_000,  rps: 300  },
        { timeMs: 55_000,  rps: 1_000 },
        { timeMs: 70_000,  rps: 300  },
        { timeMs: 85_000,  rps: 300  },
        { timeMs: 90_000,  rps: 900  },
        { timeMs: 105_000, rps: 300  },
        { timeMs: 120_000, rps: 300  },
      ],
    },
    slaTargets: { p99LatencyMs: 300, errorRate: 0.005 },
    budgetPerHour: 1.50,
    allowedComponents: ['client', 'server', 'database', 'cache', 'load-balancer', 'k8s-fleet'],
    conceptsTaught: ['HPA target utilization', 'replica limits', 'scale-out headroom', 'cost vs. headroom'],
    hints: [
      'At targetUtilization=0.92, the HPA only adds replicas when pods are nearly full — no headroom for bursts.',
      'Lower targetUtilization (try 0.65) so HPA scales out earlier, giving headroom before the spike arrives.',
      'maxReplicas=4 caps you at 800 RPS. Raise it to 8–10 so the scaler can actually reach peak capacity.',
      'Adding a Cache in front reduces the effective RPS seen by the fleet at the same cost.',
    ],
    starterNodes: [
      { id: 'client-1', type: 'client',    position: { x: 60,  y: 250 }, label: 'Users',     config: { rps: 300, preset: 'steady', peakMultiplier: 1 } },
      { id: 'fleet-1',  type: 'k8s-fleet', position: { x: 320, y: 250 }, label: 'App Fleet', config: { instanceType: 't3.medium', minReplicas: 2, maxReplicas: 4, targetUtilization: 0.92 } },
    ],
    starterEdges: [
      { source: 'client-1', target: 'fleet-1' },
    ],
    chaosSchedule: [
      makeChaosEvent('fleet-1', 'traffic-surge', 20_000, 5_000, 1.2),
      makeChaosEvent('fleet-1', 'traffic-surge', 55_000, 5_000, 1.2),
      makeChaosEvent('fleet-1', 'traffic-surge', 90_000, 5_000, 1.2),
    ],
  },

  {
    id: '3-6',
    tier: 3,
    order: 5,
    title: 'The Retry Storm',
    narrative:
      'Your API gateway retries every failed request 3×. ' +
      'At t=60s users start getting timeouts and their clients retry too. ' +
      'A hiccup that should last 10 seconds turns into a 30-second avalanche — ' +
      'the backend is drowning in retried requests.',
    objective:
      'Survive a 3× traffic surge at t=60s. Keep errors under 2% and p99 under 500ms. ' +
      'Rate-limit the gateway, scale the fleet, or add a queue — stop the amplification.',
    trafficConfig: {
      durationMs: 120_000,
      waypoints: presetToWaypoints('steady', 400, 1, 120_000),
    },
    slaTargets: { p99LatencyMs: 500, errorRate: 0.02 },
    budgetPerHour: 1.00,
    allowedComponents: ['client', 'server', 'database', 'cache', 'load-balancer', 'queue', 'api-gateway', 'k8s-fleet'],
    conceptsTaught: ['retry amplification', 'rate limiting', 'retry budgets', 'exponential backoff'],
    hints: [
      'The traffic-surge triples requests hitting the API Gateway at t=60s — 400 RPS becomes 1,200 RPS.',
      'Option A — Rate limit: lower the Gateway\'s maxRps to ~450. Excess retries get 429d before reaching the fleet.',
      'Option B — Scale out: raise the K8s Fleet maxReplicas to handle 1,200 RPS at peak.',
      'Option C — Buffer: insert a Queue before the fleet. It absorbs the burst and drains at a steady rate.',
      'In production, the fix is all three: rate limit at the edge, autoscale the fleet, buffer with a queue.',
    ],
    starterNodes: [
      { id: 'client-1',  type: 'client',      position: { x: 60,  y: 250 }, label: 'Users',       config: { rps: 400, preset: 'steady', peakMultiplier: 1 } },
      { id: 'gw-1',      type: 'api-gateway', position: { x: 280, y: 250 }, label: 'API Gateway',  config: { maxRps: 5000, timeoutMs: 5000, circuitBreakerEnabled: false } },
      { id: 'fleet-1',   type: 'k8s-fleet',   position: { x: 500, y: 250 }, label: 'App Fleet',   config: { instanceType: 't3.medium', minReplicas: 2, maxReplicas: 4, targetUtilization: 0.7 } },
    ],
    starterEdges: [
      { source: 'client-1', target: 'gw-1'    },
      { source: 'gw-1',     target: 'fleet-1' },
    ],
    chaosSchedule: [
      makeChaosEvent('gw-1', 'traffic-surge', 60_000, 30_000, 3),
    ],
  },

  {
    id: '3-5',
    tier: 3,
    order: 4,
    title: 'Graceful Degradation',
    narrative:
      'Your product page calls a recommendation service. ' +
      'At t=30s the recommendation service crashes — permanently. ' +
      'Without protection, the product page hangs waiting for recs that never come. ' +
      'Non-critical features should fail silently.',
    objective:
      'Keep product page p99 under 250ms even after the recommendation service dies. ' +
      'Enable the circuit breaker so the gateway returns empty recs instantly instead of timing out.',
    trafficConfig: {
      durationMs: 90_000,
      waypoints: presetToWaypoints('steady', 300, 1, 90_000),
    },
    slaTargets: { p99LatencyMs: 250, errorRate: 0.05 },
    budgetPerHour: 0.50,
    allowedComponents: ['client', 'server', 'database', 'cache', 'api-gateway'],
    conceptsTaught: ['graceful degradation', 'non-critical dependency isolation', 'fallback responses', 'circuit breaker'],
    hints: [
      'The rec-service dies at t=30s. Without a circuit breaker, gw-recs waits 5s on every request.',
      'Enable the Circuit Breaker on gw-recs. It detects the dead downstream and returns an empty response (5ms).',
      'The product page latency drops from ~5000ms back to ~25ms — users just see no recommendations.',
      'Reducing timeoutMs on the gateway also helps — a 100ms timeout means only 100ms hang, not 5s.',
    ],
    starterNodes: [
      { id: 'client-1',    type: 'client',      position: { x: 60,  y: 250 }, label: 'Users',            config: { rps: 300, preset: 'steady', peakMultiplier: 1 } },
      { id: 'product-1',   type: 'server',      position: { x: 280, y: 250 }, label: 'Product Page',     config: { instanceType: 'm5.large', instanceCount: 1, baseLatencyMs: 20 } },
      { id: 'gw-recs',     type: 'api-gateway', position: { x: 500, y: 250 }, label: 'Rec Gateway',      config: { maxRps: 1000, timeoutMs: 5000, circuitBreakerEnabled: false } },
      { id: 'rec-service', type: 'server',      position: { x: 720, y: 250 }, label: 'Recommendation Svc', config: { instanceType: 't3.medium', instanceCount: 1, baseLatencyMs: 30 } },
    ],
    starterEdges: [
      { source: 'client-1',  target: 'product-1'  },
      { source: 'product-1', target: 'gw-recs'    },
      { source: 'gw-recs',   target: 'rec-service'},
    ],
    chaosSchedule: [
      makeChaosEvent('rec-service', 'node-failure',  30_000, 60_000),
      makeChaosEvent('gw-recs',     'latency-spike', 30_000, 60_000, 5),
    ],
  },

  {
    id: '3-4',
    tier: 3,
    order: 3,
    title: 'The AZ Outage',
    narrative:
      'AWS us-east-1a just went dark. Your entire fleet — servers, database — all live in 1a. ' +
      'Traffic is dead. Add capacity in a second AZ so one AZ going down is invisible to users.',
    objective:
      'Survive the simultaneous failure of all AZ-1a nodes at t=60s. ' +
      'Keep errors under 5% and p99 under 400ms for the full 150s simulation.',
    trafficConfig: {
      durationMs: 150_000,
      waypoints: presetToWaypoints('steady', 600, 1, 150_000),
    },
    slaTargets: { p99LatencyMs: 400, errorRate: 0.05 },
    budgetPerHour: 1.50,
    allowedComponents: 'all',
    conceptsTaught: ['multi-AZ architecture', 'blast radius', 'AZ independence', 'capacity spread'],
    hints: [
      'The three pre-placed nodes (server-1a, server-2a, db-1a) all fail at t=60s — they represent your AZ-1a fleet.',
      'Add new nodes that are NOT in the chaos schedule: they represent your AZ-1b capacity.',
      'A Load Balancer distributes across both AZs. When 1a fails, 1b absorbs all traffic.',
      'Your AZ-1b capacity must handle the full 600 RPS on its own — size it accordingly.',
      'A Multi-AZ database (or a second DB node in 1b) ensures data availability when 1a goes down.',
    ],
    starterNodes: [
      { id: 'client-1',   type: 'client',      position: { x: 60,  y: 250 }, label: 'Users',           config: { rps: 600, preset: 'steady', peakMultiplier: 1 } },
      { id: 'lb-1',       type: 'load-balancer',position: { x: 260, y: 250 }, label: 'Load Balancer' },
      { id: 'server-1a',  type: 'server',       position: { x: 460, y: 150 }, label: 'Server (AZ-1a)', config: { instanceType: 'm5.large', instanceCount: 1, baseLatencyMs: 20 } },
      { id: 'server-2a',  type: 'server',       position: { x: 460, y: 350 }, label: 'Server (AZ-1a)', config: { instanceType: 'm5.large', instanceCount: 1, baseLatencyMs: 20 } },
      { id: 'db-1a',      type: 'database',     position: { x: 660, y: 250 }, label: 'DB (AZ-1a)',     config: { instanceType: 'db.t3.medium', readReplicas: 0, maxConnections: 300, multiAz: false } },
    ],
    starterEdges: [
      { source: 'client-1',  target: 'lb-1'      },
      { source: 'lb-1',      target: 'server-1a' },
      { source: 'lb-1',      target: 'server-2a' },
      { source: 'server-1a', target: 'db-1a'     },
      { source: 'server-2a', target: 'db-1a'     },
    ],
    chaosSchedule: [
      makeChaosEvent('server-1a', 'node-failure', 60_000, 90_000),
      makeChaosEvent('server-2a', 'node-failure', 60_000, 90_000),
      makeChaosEvent('db-1a',     'node-failure', 60_000, 90_000),
    ],
  },

  {
    id: '3-3',
    tier: 3,
    order: 2,
    title: 'The Cascade',
    narrative:
      'Your checkout service calls a payment API. At t=45s the payment API gets slow — ' +
      'timeouts start piling up. Without a circuit breaker, every checkout hangs for 5 seconds ' +
      'waiting for a response that never comes fast enough.',
    objective:
      'Keep checkout p99 under 400ms during the payment API slowdown. ' +
      'Enable the circuit breaker on the API Gateway to fast-fail instead of timing out.',
    trafficConfig: {
      durationMs: 90_000,
      waypoints: presetToWaypoints('steady', 200, 1, 90_000),
    },
    slaTargets: { p99LatencyMs: 400, errorRate: 0.05 },
    budgetPerHour: 0.60,
    allowedComponents: ['client', 'server', 'database', 'cache', 'api-gateway'],
    conceptsTaught: ['circuit breaker', 'cascading failure', 'timeout propagation', 'fast-fail vs. slow-fail'],
    hints: [
      'Without a circuit breaker, the API Gateway waits up to timeoutMs (5s) for the payment API — every request hangs.',
      'Enable the Circuit Breaker on the API Gateway. It detects the slowdown and returns a fast fallback (5ms) instead.',
      'Fast-fail means a small error rate during the window, but p99 stays low. Slow-fail means low errors but terrible latency.',
      'You can also reduce timeoutMs on the gateway as a partial fix — lower timeout = less hang time.',
    ],
    starterNodes: [
      { id: 'client-1',    type: 'client',      position: { x: 60,  y: 250 }, label: 'Checkout Clients', config: { rps: 200, preset: 'steady', peakMultiplier: 1 } },
      { id: 'checkout-1',  type: 'server',      position: { x: 280, y: 250 }, label: 'Checkout Service', config: { instanceType: 'm5.large', instanceCount: 1, baseLatencyMs: 20 } },
      { id: 'gw-payment',  type: 'api-gateway', position: { x: 500, y: 250 }, label: 'Payment Gateway',  config: { maxRps: 1000, timeoutMs: 5000, circuitBreakerEnabled: false } },
      { id: 'payment-api', type: 'server',      position: { x: 720, y: 250 }, label: 'Payment API',      config: { instanceType: 'm5.large', instanceCount: 1, baseLatencyMs: 40 } },
    ],
    starterEdges: [
      { source: 'client-1',   target: 'checkout-1'  },
      { source: 'checkout-1', target: 'gw-payment'  },
      { source: 'gw-payment', target: 'payment-api' },
    ],
    chaosSchedule: [
      makeChaosEvent('gw-payment', 'latency-spike', 45_000, 45_000, 5),
    ],
  },

  {
    id: '3-1',
    tier: 3,
    order: 0,
    title: 'Database HA',
    narrative:
      'Your primary database crashed at 3am. No standby. No replica. ' +
      'You spent 45 minutes restoring from backup while users saw errors. ' +
      "It's time to never let that happen again.",
    objective:
      'Survive a primary database failure at t=60s. Keep errors under 2% ' +
      'across the full simulation. Hint: a Multi-AZ database has a warm standby that promotes automatically.',
    trafficConfig: {
      durationMs: 180_000,
      waypoints: presetToWaypoints('steady', 300, 1, 180_000),
    },
    slaTargets: { p99LatencyMs: 300, errorRate: 0.02 },
    budgetPerHour: 0.50,
    allowedComponents: ['client', 'server', 'database', 'cache', 'load-balancer'],
    conceptsTaught: ['Multi-AZ failover', 'single point of failure', 'uptime SLAs', 'standby promotion'],
    hints: [
      'With multiAz=false, a node failure means total data unavailability until manual recovery.',
      'Enable Multi-AZ on the database node — AWS provisions a synchronous standby in a second AZ.',
      'Multi-AZ failover takes ~30s in reality; the sim models it as elevated latency (no errors).',
      'Multi-AZ doubles the DB cost — check your budget.',
    ],
    starterNodes: [
      { id: 'client-1',     type: 'client',   position: { x: 60,  y: 250 }, label: 'Users',      config: { rps: 300, preset: 'steady', peakMultiplier: 1 } },
      { id: 'server-1',     type: 'server',   position: { x: 280, y: 250 }, label: 'App Server',  config: { instanceType: 'm5.large', instanceCount: 1, baseLatencyMs: 20 } },
      { id: 'db-primary',   type: 'database', position: { x: 500, y: 250 }, label: 'Primary DB',  config: { instanceType: 'db.t3.small', readReplicas: 0, maxConnections: 150, multiAz: false } },
    ],
    starterEdges: [
      { source: 'client-1',   target: 'server-1'   },
      { source: 'server-1',   target: 'db-primary'  },
    ],
    chaosSchedule: [
      makeChaosEvent('db-primary', 'node-failure', 60_000, 120_000),
    ],
  },
]

/** Fast lookup by challenge ID. */
export const CHALLENGE_MAP = new Map(CHALLENGES.map((c) => [c.id, c]))
