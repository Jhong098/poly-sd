# Tech Architecture

## Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Next.js 14 (App Router) + TypeScript | Full-stack, Vercel-native, React ecosystem |
| Canvas | React Flow (xyflow) v12 | Purpose-built for node graph editors. Handles drag-drop, connections, custom nodes/edges, minimap, zoom/pan. Saves ~3 weeks of canvas plumbing. |
| Packet animation | SVG `animateMotion` → Pixi.js (if needed) | Start simple, upgrade when perf requires. See Animation section. |
| Simulation engine | TypeScript in Web Worker | Client-side (no server cost per sim), isolated from render thread |
| State management | Zustand | Lightweight, no boilerplate, ideal for game state |
| Styling | Tailwind CSS v4 | Rapid iteration |
| Real-time charts | uPlot | High-frequency metric updates (10fps sim snapshots) without React rerender cost |
| Auth | Clerk | Best developer experience, handles OAuth providers |
| Database | Supabase (Postgres) | Auth + DB + Storage + Realtime in one. Free tier covers early scale. |
| Deployment | Vercel | Zero config, global CDN, preview deployments |

---

## Repository Structure

```
poly-sd/
├── app/                          # Next.js App Router
│   ├── (game)/
│   │   ├── campaign/             # Level selection screen
│   │   ├── play/[levelId]/       # Main game canvas
│   │   └── sandbox/              # Sandbox mode
│   ├── (marketing)/
│   │   └── page.tsx              # Landing page
│   ├── api/
│   │   ├── architectures/        # Save/load/share
│   │   └── leaderboard/          # Score submission
│   └── layout.tsx
├── components/
│   ├── canvas/                   # React Flow canvas, palette, edges
│   ├── nodes/                    # Custom React Flow node renderers (one per component type)
│   ├── panels/                   # Config panel, metrics dashboard, challenge brief
│   └── ui/                       # Shared UI primitives
├── sim/
│   ├── worker.ts                 # Web Worker entry point
│   ├── engine.ts                 # Core simulation loop
│   ├── components/               # Per-component simulation logic
│   ├── graph.ts                  # Graph topology resolution
│   └── types.ts                  # Shared types (also used by UI)
├── lib/
│   ├── challenges/               # Level definitions (JSON/TS)
│   ├── store/                    # Zustand stores
│   └── supabase/                 # DB client + queries
├── docs/                         # Design documents (this folder)
└── public/
    └── assets/                   # Component icons, sounds
```

---

## Data Flow

```
User designs architecture on canvas
        │
        ▼
Zustand: architectureStore (graph state)
        │
        │  [User clicks Run]
        ▼
Serialize graph → postMessage to Web Worker
        │
        ▼
Web Worker: simulation engine runs
  - Resolves graph topology
  - Runs simulation ticks (10ms sim-time each)
  - Computes component state per tick
        │
        │  [Every 100ms real-time]
        ▼
postMessage snapshot back to main thread
        │
        ▼
Zustand: simStore receives snapshot
        │
        ├──► React Flow nodes: update visual state (colors, badges)
        ├──► uPlot charts: append new data points
        └──► Packet emitter: spawn animated SVG packets on edges
```

---

## Web Worker Message Protocol

```typescript
// Main → Worker
type WorkerInbound =
  | { type: 'START'; graph: SimGraph; traffic: TrafficConfig; duration: number }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'INJECT_FAULT'; nodeId: string; fault: FaultType }
  | { type: 'SET_SPEED'; multiplier: 1 | 5 | 10 }

// Worker → Main
type WorkerOutbound =
  | { type: 'SNAPSHOT'; simTime: number; nodes: NodeSnapshot[]; edges: EdgeSnapshot[] }
  | { type: 'EVENT'; simTime: number; event: SimEvent }
  | { type: 'COMPLETE'; result: SimResult }
```

```typescript
type NodeSnapshot = {
  id: string
  inputRPS: number
  outputRPS: number
  queueDepth: number        // 0.0–1.0 (fraction of max queue)
  latencyMs: number         // current avg processing latency
  errorRate: number         // 0.0–1.0
  costPerHour: number
  status: 'healthy' | 'warm' | 'hot' | 'saturated' | 'failed'
}

type EdgeSnapshot = {
  id: string
  throughputRPS: number
  latencyMs: number
  dropRate: number
}
```

---

## State Management

Three Zustand stores, kept separate to minimize unnecessary rerenders:

```typescript
// 1. Architecture state — the graph the user is designing
architectureStore: {
  nodes: CanvasNode[]         // React Flow nodes with component config
  edges: CanvasEdge[]         // React Flow edges with connection config
  selectedNodeId: string | null
  actions: {
    addNode, removeNode, updateNodeConfig,
    addEdge, removeEdge, updateEdge
  }
}

// 2. Simulation state — live snapshot from Web Worker
simStore: {
  status: 'idle' | 'running' | 'paused' | 'complete'
  simTime: number
  speed: 1 | 5 | 10
  nodeSnapshots: Map<string, NodeSnapshot>
  edgeSnapshots: Map<string, EdgeSnapshot>
  events: SimEvent[]
  result: SimResult | null
}

// 3. Challenge state — current level context
challengeStore: {
  challenge: Challenge | null
  completions: ChallengeCompletion[]
}
```

---

## Database Schema

```sql
-- Stored architectures (save slots + shared replays)
CREATE TABLE architectures (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users,
  challenge_id TEXT,                  -- null = sandbox
  name        TEXT,
  graph       JSONB NOT NULL,         -- React Flow nodes + edges + config
  is_public   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Challenge completion records
CREATE TABLE challenge_completions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users,
  challenge_id    TEXT NOT NULL,
  architecture_id UUID REFERENCES architectures,
  score_total     INTEGER,
  score_perf      INTEGER,
  score_resilience INTEGER,
  score_cost      INTEGER,
  score_simplicity INTEGER,
  sim_result      JSONB,              -- full sim result snapshot
  completed_at    TIMESTAMPTZ DEFAULT now()
);

-- User profile / progression
CREATE TABLE profiles (
  user_id     UUID PRIMARY KEY REFERENCES auth.users,
  xp          INTEGER DEFAULT 0,
  architect_level TEXT DEFAULT 'junior',
  updated_at  TIMESTAMPTZ DEFAULT now()
);
```

---

## Animation Strategy

### Phase 1 (MVP): SVG animateMotion

React Flow renders edges as SVG `<path>` elements. We overlay a second SVG layer and spawn `<circle>` elements with `<animateMotion>` keyed to each edge's path. Packet spawn rate is proportional to `throughputRPS`. Packet color reflects health.

```tsx
// Packet emitter — one instance per edge during simulation
function EdgePackets({ edgePath, throughputRPS, dropRate }: EdgePacketProps) {
  // Spawn packets at rate = min(throughputRPS / SCALE_FACTOR, MAX_PACKETS_PER_EDGE)
  // Each packet: animateMotion along edgePath, duration = edge latency
  // drop rate: some packets fade out mid-path
}
```

**Capacity**: Handles ~200 simultaneous packets smoothly at 60fps. Sufficient for levels with up to ~15 components.

### Phase 2 (if needed): Pixi.js overlay

If levels with 30+ components produce too many packet sprites for SVG:
- Mount a Pixi.js canvas behind the React Flow SVG layer
- Share the same coordinate space (React Flow's `useReactFlow().screenToFlowPosition`)
- Draw packets as WebGL sprites — handles 10K+ moving elements at 60fps
- React Flow canvas becomes transparent overlay for interaction only

---

## Challenge Definition Format

Challenges are TypeScript objects shipped with the app. No DB needed.

```typescript
type Challenge = {
  id: string
  tier: 1 | 2 | 3 | 4 | 5
  title: string
  description: string               // narrative framing
  systemDescription: string         // what the system needs to do
  trafficConfig: TrafficConfig      // shape, peak RPS, duration
  slaTargets: {
    p99LatencyMs: number
    errorRate: number               // max acceptable
    minUptimePct: number
  }
  budgetPerHour: number             // max $/hr
  allowedComponents: ComponentType[] | 'all'
  conceptsTaught: string[]          // for UI display
  hints: string[]                   // shown on request
  chaosEvents: ChaosEvent[]         // injected automatically at fixed sim times
  starterGraph?: { nodes, edges }   // optional pre-placed scaffold
}
```

---

## Deployment & Infrastructure

```
Vercel (frontend + API routes)
  └── CDN: static assets, challenge JSON, component icons
  └── Edge Functions: leaderboard reads (low latency globally)
  └── Serverless: auth callbacks, save/load API

Supabase
  └── Postgres: users, architectures, completions
  └── Auth: handled by Clerk (Supabase used for data only)
  └── Storage: architecture thumbnails (PNG exports)
```

### Environment variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
```

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Canvas FPS (idle) | 60fps |
| Canvas FPS (sim running, 15 nodes) | 60fps |
| Simulation tick rate | 100ms real-time (10fps snapshots) |
| Time to first simulation snapshot | < 100ms after clicking Run |
| Page load (LCP) | < 1.5s |
| Architecture save round-trip | < 500ms |
