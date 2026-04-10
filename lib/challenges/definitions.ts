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
]

/** Fast lookup by challenge ID. */
export const CHALLENGE_MAP = new Map(CHALLENGES.map((c) => [c.id, c]))
