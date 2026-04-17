# Performance Improvements

Audit date: 2026-04-16

Items marked ✅ are completed. Remaining items are grouped by priority.

---

## Critical — Simulation Hot Path

### ✅ 1. Topological sort recomputed every tick
`resolveGraph` called `topologicalSort(graph)` every tick, and `computeCriticalPath` called it a second time. Fixed by computing once via `prepareGraph()` at engine start.

### ✅ 2. O(n) node lookups inside the main loop
`graph.nodes.find()` linear scan ran for every node per tick. Fixed by building a `Map<string, SimNode>` in `prepareGraph()`.

### ✅ 3. O(V × E) edge filtering per tick
**File:** `sim/graph.ts` (previously lines 47, 67 — now resolved by `prepareGraph`)
*This was fixed as part of #1/#2. Marking for completeness.*

### ✅ 4. Static sets recomputed every tick
**File:** `sim/graph.ts`
`targetIds`, `hasClients`, `fallbackIngressIds`, `egressIds` were recomputed every tick.
*Fixed as part of `prepareGraph()`. Marking for completeness.*

### ✅ 5. Topological sort has O(n²) remaining-node check
**File:** `sim/graph.ts:207` — `topologicalSort()`
```ts
const remaining = graph.nodes.map((n) => n.id).filter((id) => !result.includes(id))
```
`result.includes()` is O(n) per call → O(n²) total. Use a `Set` of visited IDs instead.

### ✅ 6. Topological sort creates new arrays per edge
**File:** `sim/graph.ts:193`
```ts
adj[e.source] = [...(adj[e.source] ?? []), e.target]
```
Spread creates a new array for every edge. Use `push()` instead.

### 7. Traffic waypoints sorted every tick
**File:** `sim/traffic.ts:18`
```ts
const sorted = [...waypoints].sort((a, b) => a.timeMs - b.timeMs)
```
Waypoints are static during simulation. Sort once at engine start and reuse, or pre-sort in `TrafficConfig`.

### ✅ 8. Chaos events scanned O(nodes × events) per tick
**File:** `sim/engine.ts:58-62`
```ts
for (const node of graph.nodes) {
  const evt = eventForNode(chaosPool, node.id, simTimeMs)
```
`eventForNode` → `activeEvents` filters ALL events, then filters by nodeId. O(nodes × chaosPoolSize) per tick.
**Fix:** Filter active events once per tick, build a `nodeId → event` map, pass it in. (The engine already builds `chaosMap` — the inefficiency is inside `eventForNode` calling `activeEvents` redundantly for each node.)
*Fixed — `buildChaosMap` in `sim/chaos.ts` does a single O(E) pass. Engine now calls `buildChaosMap(chaosPool, simTimeMs)` instead of the per-node loop.*

---

## High — React Rendering (unnecessary re-renders at ~20fps during simulation)

### ✅ 9. Every BaseNode re-renders on every tick
**File:** `components/nodes/BaseNode.tsx:68`
```ts
const simSnap = useSimStore((s) => s.nodeSnapshots[id])
```
`nodeSnapshots` is a brand new object every tick (rebuilt in `simStore.ts:104-106`), so this selector returns a new reference every time even if values are identical.
**Fix:** Use `zustand/shallow` comparison, or only update entries whose values actually changed in the store's TICK handler.
*Fixed by #19 — `mergeSnapshotMap` reuses existing references for unchanged entries.*

### ✅ 10. Every AnimatedEdge re-renders on every tick
**File:** `components/canvas/edges/AnimatedEdge.tsx:20`
Same root cause as #9: `s.edgeSnapshots[id]` returns a new object every tick.
*Fixed by #19 — same `mergeSnapshotMap` fix covers edges.*

### 11. MetricsPanel re-renders and recomputes sparklines every tick
**File:** `components/panels/MetricsPanel.tsx:65`
```ts
const history = useSimStore((s) => s.history)
```
History changes every tick. On each render, four `.map()` calls extract sparkline data.
**Fix:** Memoize sparkline data arrays with `useMemo`.

### 12. GameCanvas subscribes to entire architecture store
**File:** `components/canvas/GameCanvas.tsx:76`
```ts
const { nodes, edges, onNodesChange, ... } = useArchitectureStore()
```
Subscribes to all state including `selectedNodeId`/`selectedEdgeId`. Re-renders on every selection change even though it doesn't use selection state.
**Fix:** Use individual selectors: `useArchitectureStore((s) => s.nodes)`, etc.

### 13. TopBar subscribes to entire simStore
**File:** `components/canvas/TopBar.tsx:243`
```ts
const { status, speed, trafficConfig, history, nodeSnapshots, ... } = useSimStore()
```
Re-renders on every tick because `history` and `nodeSnapshots` change.
**Fix:** Use individual selectors. Only subscribe to `history`/`nodeSnapshots` in subcomponents that need them.

### 14. ConfigPanel subscribes to entire architecture store
**File:** `components/panels/ConfigPanel.tsx:517`
```ts
const { nodes, selectedNodeId, selectedEdgeId, ... } = useArchitectureStore()
```
Re-renders on every node drag (position change) even when it only cares about the selected node's config.

### 15. BaseNode subscribes to entire architecture store for removeNode
**File:** `components/nodes/BaseNode.tsx:67`
```ts
const { removeNode } = useArchitectureStore()
```
Subscribes to all changes. Should be `useArchitectureStore((s) => s.removeNode)`.

---

## Medium — Worker Communication & State

### 16. Full snapshot serialized via postMessage every tick
**File:** `sim/worker.ts:22`
Structured cloning of all node + edge snapshots at 10fps. For 20 nodes/edges, ~40 objects cloned every 50ms.
**Fix:** Consider `Transferable` (ArrayBuffer) for the hot path, or only send deltas.

### 17. New Worker created on every simulation start
**File:** `lib/store/simStore.ts:98`
```ts
const worker = new Worker(new URL('@/sim/worker.ts', import.meta.url), { type: 'module' })
```
Worker creation involves parsing/compiling/instantiating. Previous worker is terminated first.
**Fix:** Keep a persistent worker. Send STOP then START to reuse it.

### 18. History array rebuilt every tick via spread
**File:** `lib/store/simStore.ts:112`
```ts
history: [...s.history.slice(-(MAX_HISTORY - 1)), snapshot]
```
Creates a new 60-element array every tick. A ring buffer would avoid allocation.

### ✅ 19. nodeSnapshots/edgeSnapshots maps rebuilt from scratch every tick
**File:** `lib/store/simStore.ts:104-106`
```ts
for (const n of snapshot.nodes) nodeSnapshots[n.id] = n
for (const ed of snapshot.edges) edgeSnapshots[ed.id] = ed
```
New objects created every tick. This is the root cause of #9 and #10.
**Fix:** Only update entries that actually changed, or reuse the same reference if values match.
*Fixed — `mergeSnapshotMap` in `lib/store/snapshotMerge.ts` handles this. TICK handler now calls `mergeSnapshotMap(s.nodeSnapshots, snapshot.nodes)` inside `set()` so previous state is accessible.*

---

## Medium — Bundle & Loading

### 20. Landing page is entirely a client component
**File:** `app/page.tsx:1` — `'use client'`
The entire landing page is client-rendered because of `useAuth()`. Only the CTA buttons need auth state.
**Fix:** Make the page a server component. Extract auth-dependent buttons into a small `'use client'` child.

### 21. `html-to-image` in main bundle
**File:** `package.json:18`
Only needed for screenshot/publishing flows but listed as a regular dependency.
**Fix:** Dynamic import: `import('html-to-image')` only where used.

### 22. Duplicate NODE_TYPES/nodeColor in GameCanvas and ReplayViewer
**Files:** `components/canvas/GameCanvas.tsx:34-47`, `components/replay/ReplayViewer.tsx:23-47`
Identical maps defined in both files.
**Fix:** Extract to a shared module.

### 23. No `generateStaticParams` for challenge pages
**File:** `app/play/[levelId]/page.tsx`
25 built-in challenges have static IDs known at build time, but every visit is dynamically rendered.
**Fix:** Export `generateStaticParams` returning all challenge IDs.

### 24. Empty next.config.ts — no production optimizations
**File:** `next.config.ts`
No caching headers, no CSS optimization, no compression config.

### 25. React Flow loaded eagerly on all canvas routes
`@xyflow/react` is ~100KB+ gzipped. Loaded immediately on `/play`, `/sandbox`, `/replay`.
**Fix:** Wrap in `dynamic(() => import(...), { ssr: false })`.

---

## Low — Minor Optimizations

### 26. `transition-all` on BaseNode
**File:** `components/nodes/BaseNode.tsx:101`
```ts
transition-all duration-200
```
Transitions all CSS properties. Use specific transitions (`transition-[border-color,opacity]`).

### 27. Local draft effect runs on every node position change
**File:** `components/canvas/ChallengeLayout.tsx:35-45`
Debounce timer resets on every pixel of a node drag. Effect body is cheap but runs very frequently.

### 28. `checkCanPublish()` API call in TopBar on mount
**File:** `components/canvas/TopBar.tsx:246-248`
Server action fires on every canvas mount for signed-in non-challenge users, even if Publish is never clicked.
**Fix:** Lazy-load this check only when the simulation completes.

### 29. Leaderboard in ResultsModal fetches on mount
**File:** `components/overlays/ResultsModal.tsx:50-55`
`getLeaderboard()` fires immediately when the Leaderboard component mounts, before the user scrolls to it.

### 30. Supabase admin client created per server action
**Files:** `lib/actions/completions.ts:34`, `lib/actions/replays.ts`, etc.
Each server action creates a new `createAdminClient()`.
**Fix:** Use React's `cache()` to share within a request.

### 31. `recordCompletion` has 4 sequential DB round-trips
**File:** `lib/actions/completions.ts:37-78`
Select existing → Upsert completion → Select profile XP → Update XP.
**Fix:** Combine into a Supabase RPC/transaction.

### 32. ChallengeLayout subscribes to full nodes/edges for draft saving
**File:** `components/canvas/ChallengeLayout.tsx:24-25`
Re-renders the entire layout on every node change. Only the draft-saving effect needs these.
**Fix:** Move draft-saving logic into a separate render-less component.

### 33. No React.memo on node components
The 12 node components are re-rendered by React Flow whenever any node changes. `React.memo` with stable data references would let unchanged nodes skip re-renders.
