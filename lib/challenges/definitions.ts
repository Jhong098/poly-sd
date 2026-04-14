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
    conceptPrimer: {
      title: 'Request Flow',
      diagramType: 'load-balancing',
      explanation: 'Every user action — clicking a button, loading a page — becomes a request that travels from a client to your servers. Latency is how long that round trip takes. Error rate is how often requests fail completely. These are the two numbers that determine whether your users are happy.',
    },
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
    conceptPrimer: {
      title: 'Scaling',
      diagramType: 'scaling',
      explanation: 'Each server can only handle so many requests per second before it runs out of CPU and memory. When demand exceeds capacity, requests queue up and latency climbs. You can scale vertically (bigger server) or horizontally (more servers) — both work, but they have different cost profiles.',
    },
    guidedPulseComponent: 'server',
    failureHints: {
      server_saturated: 'Your server is at maximum capacity. Try upgrading the instance type in the config panel (click the server node), or drag a second server from the palette and connect it to the client.',
      latency_exceeded: 'High latency usually means a component is handling more requests than it can process. Click each node to see its utilization. The one above 80% is your problem.',
    },
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
    conceptPrimer: {
      title: 'Traffic Spikes',
      diagramType: 'scaling',
      explanation: 'Traffic is rarely steady. A flash sale, a viral post, or a morning rush can send 5–10× normal traffic in seconds. Systems designed for average load will saturate during spikes. You need headroom — extra capacity that sits idle most of the time but absorbs the peak.',
    },
    guidedPulseComponent: 'server',
    failureHints: {
      server_saturated: 'Your server saturated during the spike. You need more capacity headroom. Try upgrading the server or adding a second one before running again.',
      latency_exceeded: 'The spike overwhelmed your architecture. Which component went red? That\'s your bottleneck. Increase its capacity so it can handle peak traffic.',
    },
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
    conceptPrimer: {
      title: 'The Database Bottleneck',
      diagramType: 'caching',
      explanation: 'Databases are powerful but slow. Every query takes time, and a database can only handle so many simultaneous connections. When all your servers hammer one database, connection exhaustion and query queuing drive latency through the roof. The fix is to reduce how many requests reach the database — or increase how many it can handle.',
    },
    failureHints: {
      db_saturated: 'Your database is saturated — it is receiving more queries than it can process. Try upgrading the database instance type, or increase maxConnections in the config panel.',
      latency_exceeded: 'Latency is stacking across your hops. Each arrow in your architecture adds delay. Check which component has the highest p99 and address it first.',
    },
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
    conceptPrimer: {
      title: 'Caching',
      diagramType: 'caching',
      explanation: 'A cache stores the results of recent database queries in fast memory. When the same data is requested again, the cache answers instantly — the database never sees the request. If 80% of reads hit the cache, your database only sees 20% of traffic. This is the single most effective way to reduce database load for read-heavy systems.',
    },
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
    conceptPrimer: {
      title: 'Load Balancing',
      diagramType: 'load-balancing',
      explanation: 'When one server can no longer handle your traffic, you add more servers and put a load balancer in front. The load balancer distributes incoming requests across all servers — each server handles a fraction of the total. This is horizontal scaling: adding more machines instead of making one machine bigger.',
    },
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
    conceptPrimer: {
      title: 'Capacity Planning',
      diagramType: 'scaling',
      explanation: 'Real traffic grows over time. You must design for the peak you expect — not the traffic you have today. Under-provision and you fail at the peak. Over-provision and you waste money at the baseline. The goal is to find the minimum architecture that can handle the highest expected load within budget.',
    },
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
    conceptPrimer: {
      title: 'Spikes and Buffers',
      diagramType: 'caching',
      explanation: 'Flash sales and viral moments send 5–10× normal traffic in seconds. A cache acts as a buffer: it absorbs the spike of reads so your database never sees the full load. Pair that with enough server capacity to handle peak RPS and you can survive almost any traffic event without failing SLAs.',
    },
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

  // ── Tier 4: Distributed Data ────────────────────────────────────────────────

  {
    id: '4-1',
    tier: 4,
    order: 0,
    title: 'Read Scaling',
    narrative:
      'Your social feed database is groaning. 5,000 reads per second, ' +
      'and your primary can\'t keep up. Every user-facing page is slow.',
    objective:
      'Handle 5,000 RPS on a read-heavy workload within budget. ' +
      'Add read replicas to distribute the load across multiple DB instances.',
    trafficConfig: {
      durationMs: 90_000,
      waypoints: presetToWaypoints('steady', 5000, 1, 90_000),
    },
    slaTargets: { p99LatencyMs: 100, errorRate: 0.005 },
    budgetPerHour: 1.50,
    allowedComponents: ['client', 'server', 'database', 'cache', 'load-balancer'],
    conceptsTaught: ['read replicas', 'read scaling', 'replica lag', 'primary vs replica'],
    hints: [
      'Your database\'s max connections define its throughput ceiling.',
      'Each read replica adds roughly as much read capacity as the primary.',
      'Read replicas add a small latency overhead (~5ms) due to replication routing.',
      'Multi-AZ and read replicas are separate concerns — replicas scale reads, Multi-AZ provides HA.',
    ],
    starterNodes: [
      { id: 'client-1', type: 'client',   position: { x: 60,  y: 200 }, label: 'Users',      config: { rps: 5000, preset: 'steady', peakMultiplier: 1 } },
      { id: 'lb-1',     type: 'load-balancer', position: { x: 260, y: 200 }, label: 'LB',    config: { algorithm: 'round-robin' } },
      { id: 'srv-1',    type: 'server',   position: { x: 460, y: 120 }, label: 'App Server 1', config: { instanceType: 'm5.large', instanceCount: 1, baseLatencyMs: 20 } },
      { id: 'srv-2',    type: 'server',   position: { x: 460, y: 280 }, label: 'App Server 2', config: { instanceType: 'm5.large', instanceCount: 1, baseLatencyMs: 20 } },
      { id: 'db-1',     type: 'database', position: { x: 680, y: 200 }, label: 'Primary DB',   config: { instanceType: 'db.t3.medium', readReplicas: 0, maxConnections: 300, multiAz: false } },
    ],
    starterEdges: [
      { source: 'client-1', target: 'lb-1'  },
      { source: 'lb-1',     target: 'srv-1' },
      { source: 'lb-1',     target: 'srv-2' },
      { source: 'srv-1',    target: 'db-1'  },
      { source: 'srv-2',    target: 'db-1'  },
    ],
  },

  {
    id: '4-2',
    tier: 4,
    order: 1,
    title: 'The Write Wall',
    narrative:
      'Your inventory service writes 3,000 items per second. ' +
      'Your SQL database is at 100% utilisation and dropping writes. ' +
      'Adding more connections just makes the contention worse.',
    objective:
      'Handle 3,000 write-heavy RPS under $0.50/hr. ' +
      'Consider whether a NoSQL store fits better than a relational database for this access pattern.',
    trafficConfig: {
      durationMs: 90_000,
      waypoints: presetToWaypoints('steady', 3000, 1, 90_000),
    },
    slaTargets: { p99LatencyMs: 50, errorRate: 0.001 },
    budgetPerHour: 0.50,
    allowedComponents: ['client', 'server', 'database', 'nosql', 'load-balancer'],
    conceptsTaught: ['NoSQL vs SQL', 'write throughput', 'provisioned capacity', 'key-value access patterns'],
    hints: [
      'SQL databases serialise writes through a single primary — there\'s a hard throughput ceiling.',
      'NoSQL (DynamoDB-like) shards writes across partitions — capacity scales with WCU allocation.',
      'Set WCU ≥ your expected write RPS. On-demand mode auto-scales but costs more per request.',
      'NoSQL works best for simple key lookups — complex joins belong in SQL.',
    ],
    starterNodes: [
      { id: 'client-1', type: 'client',   position: { x: 60,  y: 200 }, label: 'Inventory Client', config: { rps: 3000, preset: 'steady', peakMultiplier: 1 } },
      { id: 'srv-1',    type: 'server',   position: { x: 280, y: 200 }, label: 'Inventory Service', config: { instanceType: 'm5.large', instanceCount: 2, baseLatencyMs: 10 } },
      { id: 'db-1',     type: 'database', position: { x: 520, y: 200 }, label: 'Inventory DB',      config: { instanceType: 'db.t3.medium', readReplicas: 0, maxConnections: 300, multiAz: false } },
    ],
    starterEdges: [
      { source: 'client-1', target: 'srv-1' },
      { source: 'srv-1',    target: 'db-1'  },
    ],
  },

  {
    id: '4-3',
    tier: 4,
    order: 2,
    title: 'The Write-Ahead Log',
    narrative:
      'Your metrics pipeline ingests 10,000 events per second. ' +
      'You need every event persisted durably — even if a consumer crashes mid-processing. ' +
      'Your database can\'t absorb writes at this rate directly.',
    objective:
      'Route 10k events/sec through Kafka as a durable event bus. ' +
      'Configure enough partitions to absorb the load. ' +
      'Consumer processing is async — your SLA covers the producer (ingest) path only.',
    trafficConfig: {
      durationMs: 90_000,
      waypoints: presetToWaypoints('steady', 10_000, 1, 90_000),
    },
    slaTargets: { p99LatencyMs: 50, errorRate: 0.001 },
    budgetPerHour: 2.00,
    allowedComponents: ['client', 'server', 'database', 'kafka', 'queue', 'load-balancer'],
    conceptsTaught: ['Kafka as WAL', 'partitions and throughput', 'producer vs consumer', 'durable event log', 'async decoupling'],
    hints: [
      'Each Kafka partition handles up to 10,000 RPS — one partition is enough for 10k events/sec.',
      'Kafka is your terminal sink for the producer path. Consumers process independently.',
      'More partitions = more parallelism for consumers, but also more cost.',
      'Retention means events survive consumer crashes — consumers can replay from their last offset.',
    ],
    starterNodes: [
      { id: 'client-1', type: 'client',   position: { x: 60,  y: 200 }, label: 'Event Producers', config: { rps: 10_000, preset: 'steady', peakMultiplier: 1 } },
      { id: 'srv-1',    type: 'server',   position: { x: 280, y: 200 }, label: 'Ingest Service',   config: { instanceType: 'm5.xlarge', instanceCount: 2, baseLatencyMs: 5 } },
      { id: 'db-1',     type: 'database', position: { x: 520, y: 200 }, label: 'Metrics DB',       config: { instanceType: 'db.r5.large', readReplicas: 0, maxConnections: 500, multiAz: false } },
    ],
    starterEdges: [
      { source: 'client-1', target: 'srv-1' },
      { source: 'srv-1',    target: 'db-1'  },
    ],
  },

  {
    id: '4-4',
    tier: 4,
    order: 3,
    title: 'CQRS',
    narrative:
      'Your reporting service runs complex aggregation queries that lock tables for seconds. ' +
      'Your write service shares the same database — and now checkout is timing out during every report.',
    objective:
      'Separate the read and write paths so heavy queries can\'t interfere with writes. ' +
      'Writes must stay under 50ms p99. Reads can be slower — up to 500ms is acceptable.',
    trafficConfig: {
      durationMs: 90_000,
      waypoints: presetToWaypoints('steady', 3300, 1, 90_000),
    },
    slaTargets: { p99LatencyMs: 80, errorRate: 0.005 },
    budgetPerHour: 1.50,
    allowedComponents: ['client', 'server', 'database', 'cache', 'nosql', 'kafka', 'load-balancer'],
    conceptsTaught: ['CQRS', 'read/write separation', 'query interference', 'eventual consistency on read side'],
    hints: [
      'Both clients hit the same App Server → same DB. 3,300 RPS total saturates the DB.',
      'Route the Write Client path to a lean write DB. Route the Read Client path through a cache or separate read store.',
      'A Cache in front of the read DB absorbs repeated report queries cheaply.',
      'Kafka between the write and read paths enables async propagation (true CQRS) for bonus score.',
    ],
    starterNodes: [
      { id: 'client-write', type: 'client',   position: { x: 60,  y: 120 }, label: 'Write Client (checkout)',  config: { rps: 300,  preset: 'steady', peakMultiplier: 1 } },
      { id: 'client-read',  type: 'client',   position: { x: 60,  y: 300 }, label: 'Read Client (reporting)',  config: { rps: 3000, preset: 'steady', peakMultiplier: 1 } },
      { id: 'srv-1',        type: 'server',   position: { x: 300, y: 200 }, label: 'App Server',               config: { instanceType: 'm5.xlarge', instanceCount: 2, baseLatencyMs: 20 } },
      { id: 'db-1',         type: 'database', position: { x: 540, y: 200 }, label: 'Shared DB',                config: { instanceType: 'db.t3.medium', readReplicas: 0, maxConnections: 300, multiAz: false } },
    ],
    starterEdges: [
      { source: 'client-write', target: 'srv-1' },
      { source: 'client-read',  target: 'srv-1' },
      { source: 'srv-1',        target: 'db-1'  },
    ],
  },

  {
    id: '4-5',
    tier: 4,
    order: 4,
    title: 'CAP Theorem',
    narrative:
      'You\'re building a distributed likes counter. Your primary database is in us-east-1 and ' +
      'a replica syncs to eu-west-1. A network partition severs the link between them for two minutes. ' +
      'The business question: do you keep accepting writes on both sides (availability), ' +
      'or stop writes on the replica until the partition heals (consistency)?',
    objective:
      'Survive a 2-minute network partition (simulated as replica node failure) without violating your SLA. ' +
      'You choose the tradeoff: a consistent CP architecture (primary-only writes during partition) ' +
      'or an available AP architecture (NoSQL with eventual consistency). Both pass — but choose deliberately.',
    trafficConfig: {
      durationMs: 180_000,
      waypoints: presetToWaypoints('steady', 2000, 1, 180_000),
    },
    slaTargets: { p99LatencyMs: 200, errorRate: 0.05 },
    budgetPerHour: 1.00,
    allowedComponents: ['client', 'server', 'database', 'nosql', 'cache', 'load-balancer'],
    conceptsTaught: ['CAP theorem', 'consistency vs availability', 'network partitions', 'eventual consistency', 'CP vs AP tradeoff'],
    hints: [
      'CAP theorem: during a network partition you must choose Consistency (CP) or Availability (AP).',
      'CP approach: use Multi-AZ on a single primary DB. When the replica is unreachable, writes go to the primary only — consistent but the replica\'s region is degraded.',
      'AP approach: replace the DB with a NoSQL store (globalTables = 2). Both regions keep accepting writes during the partition — available but potentially inconsistent until healed.',
      'The error rate SLA is lenient (5%) to allow for either choice — but your architecture must survive the full 3-minute simulation.',
      'NoSQL on-demand mode never rejects writes due to capacity — it\'s inherently AP-leaning.',
    ],
    starterNodes: [
      { id: 'client-1',  type: 'client',   position: { x: 60,  y: 200 }, label: 'Users',              config: { rps: 2000, preset: 'steady', peakMultiplier: 1 } },
      { id: 'srv-1',     type: 'server',   position: { x: 280, y: 200 }, label: 'App Server',          config: { instanceType: 'm5.large', instanceCount: 2, baseLatencyMs: 20 } },
      { id: 'db-primary',type: 'database', position: { x: 520, y: 120 }, label: 'DB Primary (us-east)',config: { instanceType: 'db.r5.large', readReplicas: 0, maxConnections: 500, multiAz: false } },
      { id: 'db-replica',type: 'database', position: { x: 520, y: 300 }, label: 'DB Replica (eu-west)',config: { instanceType: 'db.t3.medium', readReplicas: 0, maxConnections: 300, multiAz: false } },
    ],
    starterEdges: [
      { source: 'client-1',   target: 'srv-1'      },
      { source: 'srv-1',      target: 'db-primary' },
      { source: 'srv-1',      target: 'db-replica' },
    ],
    chaosSchedule: [
      makeChaosEvent('db-replica', 'node-failure', 60_000, 120_000),
    ],
  },

  // ── Tier 5: Global Systems ──────────────────────────────────────────────────

  {
    id: '5-1',
    tier: 5,
    order: 0,
    title: 'Multi-Region Active-Active',
    narrative:
      'Your platform now serves users in both the US and Europe. ' +
      'EU users are experiencing 300ms+ latency because all your infrastructure is in us-east-1. ' +
      'Then at t=3min, a full region failure takes down your us-east deployment. ' +
      'You need global coverage, low latency everywhere, and survival when an entire region drops.',
    objective:
      'Serve 10,000 RPS globally with p99 < 150ms. Survive a full us-east region failure at t=180s. ' +
      'Use a CDN with multiple PoPs to serve users from nearby edges, and a globally replicated ' +
      'data store so the EU region can take over when us-east goes down.',
    trafficConfig: {
      durationMs: 300_000,
      waypoints: presetToWaypoints('steady', 10_000, 1, 300_000),
    },
    slaTargets: { p99LatencyMs: 150, errorRate: 0.01 },
    budgetPerHour: 5.00,
    allowedComponents: ['client', 'server', 'database', 'cache', 'load-balancer', 'cdn', 'nosql', 'k8s-fleet', 'api-gateway'],
    conceptsTaught: ['multi-region active-active', 'global routing via CDN', 'cross-region data replication', 'regional failover', 'latency vs consistency tradeoff'],
    hints: [
      'A CDN with multiple regions (PoPs) routes users to the nearest edge — this is your GeoDNS equivalent.',
      'Set CDN regions ≥ 4 and a high hit rate to keep most traffic at the edge (< 50ms globally).',
      'Cache misses and API calls still need to reach a backend. Use a K8s Fleet to auto-scale the origin.',
      'For the database, NoSQL with globalTables = 2 gives you active-active cross-region replication — if us-east fails, eu-west\'s replica keeps serving reads and writes.',
      'When the us-east fleet fails at t=180s, the CDN stops routing cache misses there. Your EU replica must handle all DB traffic for 60 seconds.',
    ],
    starterNodes: [
      { id: 'client-1', type: 'client',       position: { x: 60,  y: 200 }, label: 'Global Users',        config: { rps: 10_000, preset: 'steady', peakMultiplier: 1 } },
      { id: 'lb-1',     type: 'load-balancer',position: { x: 260, y: 200 }, label: 'Global LB',           config: { algorithm: 'round-robin' } },
      { id: 'fleet-us', type: 'k8s-fleet',    position: { x: 480, y: 120 }, label: 'App Fleet (us-east)', config: { instanceType: 'm5.large', minReplicas: 2, maxReplicas: 8, targetUtilization: 0.7 } },
      { id: 'fleet-eu', type: 'k8s-fleet',    position: { x: 480, y: 300 }, label: 'App Fleet (eu-west)', config: { instanceType: 'm5.large', minReplicas: 2, maxReplicas: 8, targetUtilization: 0.7 } },
      { id: 'db-1',     type: 'database',     position: { x: 700, y: 200 }, label: 'Primary DB (us-east)',config: { instanceType: 'db.r5.large', readReplicas: 0, maxConnections: 500, multiAz: false } },
    ],
    starterEdges: [
      { source: 'client-1', target: 'lb-1'     },
      { source: 'lb-1',     target: 'fleet-us' },
      { source: 'lb-1',     target: 'fleet-eu' },
      { source: 'fleet-us', target: 'db-1'     },
      { source: 'fleet-eu', target: 'db-1'     },
    ],
    chaosSchedule: [
      makeChaosEvent('fleet-us', 'node-failure', 180_000, 60_000),
      makeChaosEvent('db-1',     'node-failure', 180_000, 60_000),
    ],
  },

  {
    id: '5-2',
    tier: 5,
    order: 1,
    title: 'CDN Architecture',
    narrative:
      'Your streaming platform just hit 20,000 RPS. ' +
      '80% of that is static assets — videos, images, JS bundles — ' +
      'all hitting your origin servers directly. They\'re overwhelmed and bleeding money.',
    objective:
      'Serve 20,000 RPS within budget. Use a CDN to offload static content to the edge. ' +
      'Your origin only needs to handle cache misses and API calls.',
    trafficConfig: {
      durationMs: 90_000,
      waypoints: presetToWaypoints('steady', 20_000, 1, 90_000),
    },
    slaTargets: { p99LatencyMs: 200, errorRate: 0.005 },
    budgetPerHour: 1.50,
    allowedComponents: ['client', 'server', 'database', 'cache', 'load-balancer', 'cdn', 'object-storage'],
    conceptsTaught: ['CDN offloading', 'origin shield', 'static vs dynamic content', 'object storage as origin', 'egress cost'],
    hints: [
      '20k RPS → 40 m5.large servers to handle raw. That\'s $3.84/hr — way over budget.',
      'A CDN with 80% hit rate reduces origin traffic to 4,000 RPS.',
      'Route static content (CDN → Object Storage) and API traffic (CDN miss → App Server → DB) separately.',
      'Object Storage handles unlimited throughput at ~50ms — perfect for large files.',
    ],
    starterNodes: [
      { id: 'client-1', type: 'client', position: { x: 60,  y: 200 }, label: 'Users', config: { rps: 20_000, preset: 'steady', peakMultiplier: 1 } },
      { id: 'lb-1',     type: 'load-balancer', position: { x: 280, y: 200 }, label: 'LB', config: { algorithm: 'round-robin' } },
      { id: 'srv-1',    type: 'server',   position: { x: 480, y: 120 }, label: 'App Server 1', config: { instanceType: 'm5.large', instanceCount: 1, baseLatencyMs: 20 } },
      { id: 'srv-2',    type: 'server',   position: { x: 480, y: 280 }, label: 'App Server 2', config: { instanceType: 'm5.large', instanceCount: 1, baseLatencyMs: 20 } },
      { id: 'db-1',     type: 'database', position: { x: 700, y: 200 }, label: 'DB',           config: { instanceType: 'db.t3.small', readReplicas: 0, maxConnections: 150, multiAz: false } },
    ],
    starterEdges: [
      { source: 'client-1', target: 'lb-1'  },
      { source: 'lb-1',     target: 'srv-1' },
      { source: 'lb-1',     target: 'srv-2' },
      { source: 'srv-1',    target: 'db-1'  },
      { source: 'srv-2',    target: 'db-1'  },
    ],
  },

  {
    id: '5-3',
    tier: 5,
    order: 2,
    title: 'Incident Replay',
    narrative:
      'A single misconfigured deploy just took down three critical services simultaneously. ' +
      'The post-mortem identified every single point of failure. ' +
      'Now redesign the architecture so the same blast radius is impossible.',
    objective:
      'Survive three simultaneous failures: app server crash, database failure, and a downstream ' +
      'service latency spike — all at t=60s. Keep errors under 5% throughout.',
    trafficConfig: {
      durationMs: 180_000,
      waypoints: presetToWaypoints('steady', 2000, 1, 180_000),
    },
    slaTargets: { p99LatencyMs: 500, errorRate: 0.05 },
    budgetPerHour: 5.00,
    allowedComponents: ['client', 'server', 'database', 'cache', 'load-balancer', 'api-gateway', 'k8s-fleet', 'kafka', 'cdn', 'nosql', 'object-storage'],
    conceptsTaught: ['blast radius reduction', 'defense in depth', 'simultaneous failures', 'multi-layer redundancy'],
    hints: [
      'Three things fail at once: the app server, the database, and a downstream gateway.',
      'No single node should be a SPOF. Use a load balancer with multiple servers.',
      'Enable Multi-AZ on the database — node-failure on a Multi-AZ DB is just elevated latency.',
      'An API Gateway with circuit breaker isolates the downstream latency spike from propagating.',
    ],
    starterNodes: [
      { id: 'client-1', type: 'client',      position: { x: 60,  y: 200 }, label: 'Users',          config: { rps: 2000, preset: 'steady', peakMultiplier: 1 } },
      { id: 'gw-1',     type: 'api-gateway', position: { x: 260, y: 200 }, label: 'API Gateway',     config: { maxRps: 5000, timeoutMs: 3000, circuitBreakerEnabled: false } },
      { id: 'srv-1',    type: 'server',      position: { x: 480, y: 200 }, label: 'App Server',      config: { instanceType: 'm5.large', instanceCount: 1, baseLatencyMs: 20 } },
      { id: 'db-1',     type: 'database',    position: { x: 700, y: 120 }, label: 'Database',        config: { instanceType: 'db.t3.medium', readReplicas: 0, maxConnections: 300, multiAz: false } },
      { id: 'svc-down', type: 'api-gateway', position: { x: 700, y: 300 }, label: 'Downstream Svc',  config: { maxRps: 5000, timeoutMs: 3000, circuitBreakerEnabled: false } },
    ],
    starterEdges: [
      { source: 'client-1', target: 'gw-1'     },
      { source: 'gw-1',     target: 'srv-1'    },
      { source: 'srv-1',    target: 'db-1'     },
      { source: 'srv-1',    target: 'svc-down' },
    ],
    chaosSchedule: [
      makeChaosEvent('srv-1',    'node-failure',   60_000, 120_000),
      makeChaosEvent('db-1',     'node-failure',   60_000, 120_000),
      makeChaosEvent('svc-down', 'latency-spike',  60_000, 120_000, 50),
    ],
  },

  {
    id: '5-4',
    tier: 5,
    order: 3,
    title: 'The Final Boss',
    narrative:
      'You\'re the architect of a real-time multiplayer game backend. ' +
      '50,000 concurrent players. Sub-100ms latency globally. 99.99% uptime. $10/hr budget. ' +
      'No hints. No guided callouts. Everything you\'ve learned across the previous 27 levels applies here. ' +
      'At t=90s a traffic surge doubles your load. At t=150s two app servers crash simultaneously. ' +
      'At t=210s your cache gets flushed cold. Survive all three.',
    objective:
      'Handle 50,000 RPS with p99 < 100ms and error rate < 0.5%, under $10/hr budget. ' +
      'Survive three consecutive chaos events without violating SLA.',
    trafficConfig: {
      durationMs: 300_000,
      waypoints: presetToWaypoints('steady', 50_000, 1, 300_000),
    },
    slaTargets: { p99LatencyMs: 100, errorRate: 0.005 },
    budgetPerHour: 10.00,
    allowedComponents: 'all',
    conceptsTaught: [
      'systems thinking at scale',
      'defence in depth',
      'multi-layer caching',
      'autoscaling under burst',
      'chaos resilience',
    ],
    hints: [],
    starterNodes: [
      { id: 'client-1', type: 'client', position: { x: 60, y: 250 }, label: 'Global Players', config: { rps: 50_000, preset: 'steady', peakMultiplier: 2 } },
    ],
    starterEdges: [],
    chaosSchedule: [
      makeChaosEvent('client-1', 'traffic-surge',  90_000,  30_000, 2),
      makeChaosEvent('client-1', 'traffic-surge', 210_000,  15_000, 1.5),
    ],
  },
]

/** Fast lookup by challenge ID. */
export const CHALLENGE_MAP = new Map(CHALLENGES.map((c) => [c.id, c]))
