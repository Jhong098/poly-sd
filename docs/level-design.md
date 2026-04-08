# Level Design

## Design Principles

1. **One concept per level.** Each level introduces exactly one new idea. Players shouldn't need to learn caching and load balancing simultaneously.
2. **Fail first, fix second.** The starter architecture (or empty canvas) always fails. Players discover why, then fix it.
3. **Multiple valid solutions.** The sim accepts any architecture that meets SLA. An over-provisioned brute-force solution scores lower on cost and simplicity but still passes.
4. **Scaffolded difficulty.** Early levels restrict the component palette. Later levels open everything.
5. **Chaos is mandatory from Tier 3.** Every Tier 3+ level has at least one chaos event that must be survived.

---

## Campaign Structure

```
Tier 1: Foundations         (4 levels) — Server, DB, Cache basics
Tier 2: Scale Out           (5 levels) — LB, API Gateway, Queue
Tier 3: Resilience          (6 levels) — HA, autoscaling, circuit breakers
Tier 4: Distributed Data    (5 levels) — Replication, consistency, Kafka
Tier 5: Global Systems      (4 levels) — Multi-region, CDN, GeoDNS
```

Tutorial (4 levels) runs before Tier 1 and cannot be skipped on first visit.

---

## Tutorial

### T-0: Welcome to the Canvas

**Narrative**: "A startup just launched. They have one server. Fifty users show up."

**Pre-placed**: Client → Server

**Task**: Click Run. Watch it work. No win condition — just observe.

**Teaches**: How to run a simulation. What the metrics mean. What packets look like.

---

### T-1: The First Bottleneck

**Narrative**: "Great launch. Word spread. Now 500 users are hitting your single server."

**Pre-placed**: Client → Server (t3.small, max 100 RPS)
**Traffic**: Steady 500 RPS

**Task**: Run the simulation. Watch it fail (queue backs up, errors spike). Fix it.

**Hint**: "Your server can only handle 100 requests per second. You need more capacity."

**Valid solutions**: Upgrade instance type OR add more instances (both work, scored differently).

**Teaches**: Server saturation, horizontal vs vertical scaling, the cost tradeoff.

---

### T-2: The Database Load

**Narrative**: "You've scaled your servers. But now your database is the bottleneck."

**Pre-placed**: Client → Load Balancer → [Server × 3] → Database
**Traffic**: Steady 300 RPS (servers fine, DB at 90% ρ)

**Task**: Reduce database load without changing the database instance.

**Hint**: "Most reads don't need fresh data. What if you cached the results?"

**Valid solutions**: Add Redis cache between servers and DB.

**Teaches**: Cache as a database shield. What hit rate means. Importance of cache placement.

---

### T-3: Your First Outage

**Narrative**: "It's 2am. Your single server just died."

**Pre-placed**: Client → Server → Database (single-AZ, no redundancy)
**Traffic**: Steady 200 RPS
**Chaos**: NODE_FAILURE on Server at t=60s

**Task**: Redesign so the system survives a server failure without downtime.

**Teaches**: Redundancy, load balancers with health checks, failing gracefully vs catastrophically.

---

## Tier 1: Foundations

### 1-1: Read-Heavy Blog

**Narrative**: "You're running a tech blog. 1,000 RPS, 90% of it reads."

**SLA**: p99 < 100ms, error rate < 0.1%
**Budget**: $0.50/hr
**Traffic**: Steady 1,000 RPS
**Palette**: Server, Database, Cache, Load Balancer
**Chaos**: None

**Concept taught**: Cache hit rate dramatically changes the DB load curve. Players learn that sizing the DB for full RPS without cache is wasteful.

**Minimum viable solution**: LB → 2× Server → Cache (80% hit) → DB (t3.small handles remaining 200 RPS easily)

**Common mistake**: Sizing DB for full 1,000 RPS (expensive and unnecessary), or not caching reads.

---

### 1-2: The Thundering Herd

**Narrative**: "Your blog got on Hacker News. Traffic spiked to 5,000 RPS. Your cache just got flushed."

**SLA**: p99 < 200ms, error rate < 1% (more lenient — this is a tough spike)
**Budget**: $1.50/hr
**Traffic**: 500 RPS baseline → spike to 5,000 at t=60s → settle to 1,000 at t=120s
**Chaos**: CACHE_FLUSH at t=60s (coincides with spike — thundering herd)
**Palette**: Same as 1-1

**Concept taught**: Thundering herd problem. Short TTL caches don't protect against spike + cold start. Solutions: longer TTL, staggered expiry, cache warming, origin shield.

**Minimum viable solution**: Multiple cache nodes with staggered TTL OR origin shield to absorb cache miss burst.

---

### 1-3: Write-Heavy Workload

**Narrative**: "You're building a metrics ingestion service. 2,000 RPS of writes. Reads are rare."

**SLA**: p99 < 50ms on writes, error rate < 0.01%, no data loss
**Budget**: $2.00/hr
**Traffic**: Steady 2,000 RPS (90% writes)
**Chaos**: None
**Palette**: Server, Database (with replica), Message Queue

**Concept taught**: Caching doesn't help writes. Write-heavy loads need write throughput (better DB, queue for async writes, or batching).

**Minimum viable solution**: Server → Queue → DB Writer consumer. Queue absorbs bursts. DB write throughput is the constraint.

**Note**: This is the first time Queue appears. Players learn that async writes can improve throughput at the cost of write latency.

---

### 1-4: The Budget Constraint

**Narrative**: "Your startup is running low on runway. You need to hit the same SLA as last time but under $0.30/hr."

**SLA**: p99 < 200ms, error rate < 0.5%
**Budget**: $0.30/hr (tight)
**Traffic**: Steady 500 RPS
**Palette**: All Tier 1 components

**Concept taught**: Engineering is about tradeoffs. You can meet the SLA multiple ways; the budget forces the minimal solution.

**Teaches**: Right-sizing instances, cache as a cost-reduction tool, avoiding over-engineering.

---

## Tier 2: Scale Out

### 2-1: Flash Sale

**Narrative**: "You're running an e-commerce platform. Normal traffic: 500 RPS. Black Friday: 10,000 RPS for 30 minutes, then back to normal."

**SLA**: p99 < 300ms (lenient for spike), error rate < 2% during spike, < 0.1% otherwise
**Budget**: $3.00/hr average (not during spike)
**Traffic**: 500 RPS → 10,000 RPS (t=120s to t=300s) → 500 RPS
**Chaos**: TRAFFIC_SPIKE additional 2× at t=180s (peak of flash sale)
**Palette**: Tier 1 + API Gateway, K8s Fleet

**Concept taught**: Autoscaling for bursty traffic. Scale-out lag means you need some headroom. Queue-based load leveling can smooth the spike.

**Common mistake**: Provisioning for peak at all times (fails budget), or not autoscaling (fails spike SLA).

---

### 2-2: Rate Limiting

**Narrative**: "You're running a public API. A bot is hammering you with 5,000 RPS. Real users: 200 RPS."

**SLA**: p99 < 100ms for legitimate users, error rate for legitimate users < 0.1%
**Budget**: $1.00/hr
**Traffic**: 5,200 RPS total (5,000 malicious bot, 200 legitimate)
**Palette**: Tier 1 + API Gateway

**Concept taught**: Rate limiting at the gateway protects backend from abuse. Key insight: rate limiting by IP/API key preserves capacity for legitimate users.

**Note**: The challenge graph distinguishes two client streams. Bot client and user client are separate source nodes. Players must rate-limit bot without impacting user.

---

### 2-3: Async Decoupling

**Narrative**: "You're processing user-uploaded images. Each job takes 2 seconds. You get 100 uploads/second."

**SLA**: All uploads acknowledged within 200ms, jobs processed within 30s, no job loss
**Budget**: $2.00/hr
**Traffic**: Steady 100 uploads/sec
**Palette**: Tier 1 + Queue, K8s Fleet

**Concept taught**: Async decoupling. The upload endpoint acknowledges quickly (enqueue only). Workers process at their own rate. Queue depth is the buffer. Players learn queue dwell time = depth / consumer rate.

**Common mistake**: Synchronous processing (upload endpoint waits 2s — terrible UX, can't handle 100 RPS with reasonable instance count).

---

### 2-4: The Circuit Breaker

**Narrative**: "Your payment service calls a third-party fraud detection API. That API sometimes goes slow, cascading failure across your checkout flow."

**Pre-placed**: Client → Checkout Service → Fraud Detection API (external, slow)
**SLA**: p99 < 500ms for checkout, error rate < 1%
**Traffic**: Steady 200 RPS checkout
**Chaos**: LATENCY_INJECTION on Fraud Detection edge at t=60s (adds 2000ms latency for 60s)
**Palette**: API Gateway (with circuit breaker)

**Concept taught**: Circuit breaker pattern. Without it: latency injection causes checkout to hang (2s p99, timeouts cascade). With it: circuit opens, checkout returns fast (with degraded fraud check) for the duration.

---

### 2-5: Session Stickiness

**Narrative**: "Your app stores session state in-process. A load balancer routes users to different servers on each request."

**Pre-placed**: Client → LB (round-robin) → [Server × 3] (in-process sessions)
**SLA**: Zero session errors (302 redirects / 401s from session miss)
**Traffic**: 1,000 RPS, 500 concurrent users
**Palette**: Tier 2 + Redis (as session store)

**Concept taught**: Stateful vs stateless services. Two valid solutions: (1) LB sticky sessions (IP hash) — simple but unequal distribution, (2) External session store (Redis) — stateless servers, any server handles any request. Players discover the tradeoffs.

---

## Tier 3: Resilience

### 3-1: Database HA

**Narrative**: "Your production database failed at 3am. You had no replica. Recovery took 45 minutes."

**Pre-placed**: Client → Server → DB (no replica, no Multi-AZ)
**SLA**: p99 < 200ms, uptime > 99.9% (≥ 43s downtime budget per simulated day)
**Traffic**: Steady 500 RPS
**Chaos**: NODE_FAILURE on DB at t=120s for 300s (simulates unrecoverable primary failure without Multi-AZ)

**Concept taught**: Single points of failure. Multi-AZ for automatic failover (~30s). Read replicas don't help with primary failure (promote takes time). Uptime SLA math: 99.9% = 8.7hrs/year.

---

### 3-2: Autoscale Tuning

**Narrative**: "Your autoscaler keeps over-reacting. It scales out before it needs to, then scales in too fast, causing oscillation."

**Pre-placed**: Client → K8s Fleet (min: 2, max: 20, target CPU: 70%, cooldown: 10s)
**Traffic**: Sinusoidal (day/night pattern) + 3× spike events
**SLA**: p99 < 300ms, error rate < 0.5%, cost < $1.50/hr average

**Concept taught**: Autoscaler tuning — target CPU %, cooldown periods. Under-aggressive: misses spikes, latency spike. Over-aggressive: oscillation, cost overrun. Players must find the right balance.

**Note**: This level is about parameter tuning, not component selection. Teaches that configuration is engineering.

---

### 3-3: The Cascade

**Narrative**: "One service timing out brings down your entire platform."

**Pre-placed**: Client → Frontend → [Auth Service, Product Service → Inventory Service → Database]
**SLA**: Error rate < 1% during Inventory Service slowdown
**Chaos**: LATENCY_INJECTION on Inventory Service at t=60s (3000ms for 60s)
**Palette**: API Gateway (circuit breaker), Service Mesh

**Concept taught**: Cascading failures. Without bulkheads/circuit breakers, a slow Inventory service causes Product service threads to back up, which causes Frontend threads to back up. The whole system stops for a problem in one non-critical service. Solution: timeouts + circuit breakers + bulkheads.

---

### 3-4: Multi-AZ Deployment

**Narrative**: "AWS us-east-1a just had a full AZ outage. All your instances are in 1a."

**SLA**: Uptime > 99.95% during AZ failure
**Traffic**: Steady 2,000 RPS
**Chaos**: NODE_FAILURE simulating full AZ (all nodes tagged AZ=1a fail simultaneously at t=60s for 120s)
**Palette**: Full Tier 3

**Concept taught**: Multi-AZ architecture. Must spread instances, DB replicas, and cache across AZs. A single AZ failure should be invisible to users. Players discover which components have AZ settings.

---

### 3-5: Graceful Degradation

**Narrative**: "Your recommendation service is non-critical. When it goes down, you don't want to take down the whole product page with it."

**SLA**: Product page p99 < 200ms even when Recommendation Service fails. Degraded (no recs) is acceptable.
**Chaos**: NODE_FAILURE on Recommendation Service at t=30s (permanent for sim duration)

**Concept taught**: Graceful degradation. Non-critical features should fail independently. Solutions: circuit breaker that returns cached/empty response, timeout + fallback, feature flags.

---

### 3-6: The Retry Storm

**Narrative**: "You added retries everywhere. Your service hiccuped for 10 seconds. Now it's been down for 5 minutes."

**Pre-placed**: Client → API Gateway (retry: 3×) → Service Mesh (retry: 3×) → K8s Fleet → DB
**SLA**: Recovery within 60s of DB hiccup
**Chaos**: LATENCY_INJECTION on DB at t=60s for 10s (slight slowdown)

**Concept taught**: Retry amplification. A small hiccup × multiple retry layers = massive traffic amplification = permanent saturation = outage. Solutions: retry budget at gateway, jitter, exponential backoff, remove redundant retry layers.

---

## Tier 4: Distributed Data

### 4-1: Read Replicas & Lag

**Narrative**: "Your social feed reads are overwhelming your primary database."

**SLA**: p99 < 100ms on reads, write consistency (no stale reads > 200ms old)
**Traffic**: 5,000 RPS (95% reads, 5% writes)
**Palette**: Full + Read Replicas

**Concept taught**: Read replicas for read scaling. Replica lag means reads may return slightly stale data. Players configure replica count and learn the lag tradeoff.

---

### 4-2: Sharding

**Narrative**: "Your database is approaching its maximum storage capacity and write throughput."

**SLA**: p99 < 100ms on writes, no data loss
**Traffic**: 3,000 RPS writes
**Palette**: Full + NoSQL (DynamoDB sharded)

**Concept taught**: Horizontal database sharding. Consistent hashing for key distribution. Hot partition problem (bad key choice). NoSQL vs SQL for write throughput.

---

### 4-3: The Write-Ahead Log

**Narrative**: "Your event processing system needs to guarantee that every event is processed exactly once, even if a consumer crashes mid-processing."

**SLA**: Zero message loss, exactly-once semantics
**Traffic**: 10,000 events/sec
**Palette**: Full + Kafka

**Concept taught**: Kafka's durability model. Replication factor for durability. Consumer offset commits. At-least-once vs exactly-once processing. WAL pattern.

---

### 4-4: CQRS

**Narrative**: "Your inventory query API returns complex aggregated reports. These queries kill your write database."

**Pre-placed**: Client → [Write Service → DB Primary, Read Service → same DB]
**SLA**: Write p99 < 50ms, Read p99 < 500ms (reports are slow, that's ok), no interference
**Palette**: Full + Kafka + Read-optimized DB

**Concept taught**: CQRS (Command Query Responsibility Segregation). Separate write path and read path. Kafka as event log to propagate writes to read-optimized store (e.g., Elasticsearch for full-text, DynamoDB for key-value reads). Eventual consistency on read side.

---

### 4-5: CAP Theorem (the hard level)

**Narrative**: "You're building a distributed counter (likes, votes). A network partition splits your two database nodes."

**SLA**: Players must choose: consistency (CP) or availability (AP). Both are valid — but they must justify their choice.
**Chaos**: NETWORK_PARTITION between DB Node A and Node B at t=60s for 120s

**Concept taught**: CAP theorem. This is the most conceptual level. Both solutions pass (if correctly implemented), but the scoring reflection explains what each choice means. CP: writes fail during partition (consistent but unavailable). AP: writes succeed on both sides (available but potentially inconsistent, requires conflict resolution on heal).

**Note**: This is the only level with no single "correct" architecture. The post-level debrief explains the tradeoff in depth.

---

## Tier 5: Global Systems

### 5-1: Multi-Region Active-Active

**Narrative**: "Your platform now serves US and EU users. EU users are getting 300ms latency. Also, if us-east goes down, the site goes down."

**SLA**: p99 < 100ms globally, uptime > 99.99% (4-nines), no data loss
**Traffic**: 50% US, 50% EU, total 10,000 RPS
**Chaos**: Full region failure (all us-east components) at t=180s for 60s
**Palette**: Full + GeoDNS + Global LB

**Concept taught**: Multi-region active-active architecture. GeoDNS routing. Cross-region DB replication (and its latency). DNS TTL affects failover speed. Data sovereignty considerations.

---

### 5-2: CDN Architecture

**Narrative**: "You serve a streaming platform. 80% of traffic is video served from S3. Users worldwide are getting slow load times."

**SLA**: p99 < 50ms for cached content, cache hit rate > 85%, origin cost < $0.10/hr
**Traffic**: 50,000 RPS (80% video, 20% API)
**Palette**: Full + CDN + Object Storage

**Concept taught**: CDN as origin shield. Multi-layer caching (CDN edge → origin shield → S3). Cache invalidation. What's cacheable (static) vs not (personalized API). Egress cost optimization.

---

### 5-3: Incident Replay — The 2021 Outage

**Narrative**: "Reconstruct a simplified version of a major cloud outage. A single misconfigured network ACL brought down dependent services across an entire region for 7 hours. Design a system that survives it."

**Pre-placed**: Vulnerable architecture (all-in-one-region, cascading dependencies)
**Task**: Identify all single points of failure and redesign.

**Concept taught**: Defense in depth. Blast radius reduction. Dependency isolation. This level is about reading an architecture diagram and finding the weaknesses before running the sim.

---

### 5-4: The Final Boss

**Narrative**: "Design a real-time multiplayer game backend. 100,000 concurrent players. < 50ms p99 latency globally. 99.99% uptime. Zero data loss. $10/hr budget."

**SLA**: All of the above
**Traffic**: 100,000 concurrent connections, 500,000 RPS, global
**Chaos**: Multiple simultaneous events (AZ failure + traffic spike + cache flush)
**Palette**: All components

**Concept taught**: Systems thinking at scale. Everything learned in the previous 23 levels applies. No guidance, no hints. This is the exam.

---

## Scoring Reference by Level

| Level | Min pass | 3-star target |
|-------|----------|---------------|
| T-0 to T-3 (Tutorial) | Complete | N/A |
| 1-1 to 1-4 | Pass all conditions | Score > 80 |
| 2-1 to 2-5 | Pass all conditions | Score > 75 |
| 3-1 to 3-6 | Pass all conditions | Score > 70 |
| 4-1 to 4-5 | Pass all conditions | Score > 70 |
| 5-1 to 5-4 | Pass all conditions | Score > 65 |

Star ratings per level:
- 1 star: Pass (all SLA conditions met)
- 2 stars: Score > threshold
- 3 stars: Score > threshold AND cost within 20% of optimal
