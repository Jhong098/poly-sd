# Tech Architecture

## Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Next.js 16.2.2 (App Router) + TypeScript + React 19 | Full-stack, Vercel-native, React ecosystem |
| Canvas | React Flow (xyflow) v12 | Purpose-built for node graph editors. Handles drag-drop, connections, custom nodes/edges, minimap, zoom/pan. Saves ~3 weeks of canvas plumbing. |
| Packet animation | SVG `animateMotion` → Pixi.js (if needed) | Start simple, upgrade when perf requires. See Animation section. |
| Simulation engine | TypeScript in Web Worker | Client-side (no server cost per sim), isolated from render thread |
| State management | Zustand | Lightweight, no boilerplate, ideal for game state |
| Styling | Tailwind CSS v4 | Rapid iteration |
| Real-time charts | Custom SVG sparklines | Inline SVG polylines per metric; lightweight, no extra dependency |
| Auth | Clerk | Best developer experience, handles OAuth providers |
| Database | Supabase (Postgres) | Auth + DB + Storage + Realtime in one. Free tier covers early scale. |
| Deployment | Vercel | Zero config, global CDN, preview deployments |

---

## Repository Structure

```
poly-sd/
├── app/                          # Next.js App Router
│   ├── campaign/                 # Level selection / campaign map
│   ├── play/[levelId]/           # Main game canvas
│   ├── sandbox/                  # Sandbox mode (all components unlocked)
│   ├── replay/[id]/              # Public replay viewer
│   ├── leaderboard/[challengeId]/# Per-level leaderboard
│   ├── challenge/[id]/solutions/ # Post-completion solution comparison
│   ├── profile/                  # XP, architect level, completion history
│   ├── sign-in/ sign-up/         # Clerk auth pages
│   ├── page.tsx                  # Landing page
│   └── layout.tsx
├── components/
│   ├── canvas/                   # React Flow canvas, palette, top bar
│   ├── nodes/                    # Custom node renderers (one per component type)
│   ├── panels/                   # ChallengeBriefPanel, ConfigPanel, MetricsPanel, ResultsModal
│   ├── overlays/                 # ResultsModal, TutorialCallout
│   └── nav/                      # SiteNav
├── sim/
│   ├── worker.ts                 # Web Worker entry point
│   ├── engine.ts                 # Core simulation loop
│   ├── components/               # Per-component simulation logic
│   ├── graph.ts                  # Graph topology resolution
│   ├── chaos.ts                  # Chaos event helpers
│   ├── traffic.ts                # Traffic curve generation
│   └── types.ts                  # Shared types (also used by UI)
├── lib/
│   ├── challenges/               # Level definitions (definitions.ts, evaluator.ts, types.ts)
│   ├── store/                    # Zustand stores (architectureStore, simStore, challengeStore)
│   ├── supabase/                 # DB client + server actions
│   ├── draft.ts                  # Draft save/load logic
│   ├── xp.ts                     # XP calculation
│   └── components/               # Shared React components
├── supabase/
│   └── schema.sql                # Postgres schema (profiles, completions, replays)
├── docs/                         # Design documents (this folder)
└── public/                       # Static assets
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
-- User profile / progression (user_id = Clerk userId, e.g. "user_2abc...")
CREATE TABLE profiles (
  id          TEXT PRIMARY KEY,       -- Clerk userId
  email       TEXT,
  username    TEXT,
  xp          INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Saved architectures (sandbox save slots)
CREATE TABLE architectures (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'Untitled',
  nodes       JSONB NOT NULL DEFAULT '[]',  -- React Flow nodes
  edges       JSONB NOT NULL DEFAULT '[]',  -- React Flow edges
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Challenge completion records — one row per (user, challenge), upserted to keep best score
CREATE TABLE challenge_completions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id          TEXT NOT NULL,
  passed                BOOLEAN NOT NULL,
  score                 INTEGER NOT NULL DEFAULT 0,
  metrics               JSONB NOT NULL DEFAULT '{}',  -- p99, error rate, cost, etc.
  architecture_snapshot JSONB,
  completed_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_challenge UNIQUE (user_id, challenge_id)
);

-- Shared replays — one row per share link
CREATE TABLE replays (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT REFERENCES profiles(id) ON DELETE SET NULL,  -- null = guest
  challenge_id TEXT,                 -- null = sandbox share
  architecture JSONB NOT NULL DEFAULT '{}',
  eval_result  JSONB NOT NULL DEFAULT '{}',
  score        INTEGER NOT NULL DEFAULT 0,
  is_public    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
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
