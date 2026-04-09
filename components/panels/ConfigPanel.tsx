'use client'

import { useArchitectureStore } from '@/lib/store/architectureStore'
import { useSimStore } from '@/lib/store/simStore'
import {
  type ClientConfig,
  type ServerConfig,
  type DatabaseConfig,
  type CacheConfig,
  type LoadBalancerConfig,
  type TrafficPreset,
  SERVER_INSTANCES,
  DATABASE_INSTANCES,
  CACHE_INSTANCES,
  LB_COST_PER_HOUR,
  COMPONENT_META,
} from '@/lib/components/definitions'
import { ArrowRight } from 'lucide-react'

// ── Shared primitives ────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">{children}</p>
}

function Select({ value, onChange, options }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full bg-gray-800 border border-gray-700 rounded-md px-2.5 py-1.5 text-[12px] text-gray-200 focus:outline-none focus:border-gray-500">
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function NumberInput({ value, onChange, min, max, step = 1 }: {
  value: number; onChange: (v: number) => void; min: number; max: number; step?: number
}) {
  return (
    <input type="number" value={value} min={min} max={max} step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full bg-gray-800 border border-gray-700 rounded-md px-2.5 py-1.5 text-[12px] text-gray-200 focus:outline-none focus:border-gray-500" />
  )
}

function Slider({ value, onChange, min, max, step, format }: {
  value: number; onChange: (v: number) => void; min: number; max: number; step: number; format: (v: number) => string
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span className="text-[11px] text-gray-600">{format(min)}</span>
        <span className="text-[12px] font-mono text-gray-200">{format(value)}</span>
        <span className="text-[11px] text-gray-600">{format(max)}</span>
      </div>
      <input type="range" value={value} min={min} max={max} step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-500 h-1.5 rounded-full bg-gray-700 appearance-none cursor-pointer" />
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? 'bg-blue-500' : 'bg-gray-700'}`}>
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-1'}`} />
    </button>
  )
}

function Divider() { return <div className="h-px bg-gray-800 my-1" /> }

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[11px]">
      <span className="text-gray-500">{label}</span>
      <span className="font-mono text-gray-300">{value}</span>
    </div>
  )
}

// ── Per-component editors ────────────────────────────────────────────────────

function ClientConfigEditor({ config, patch }: { config: ClientConfig; patch: (p: Partial<ClientConfig>) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Base RPS</Label>
        <NumberInput value={config.rps} onChange={(v) => patch({ rps: Math.max(1, v) })} min={1} max={1_000_000} />
      </div>
      <div>
        <Label>Traffic Pattern</Label>
        <Select
          value={config.preset}
          onChange={(v) => patch({ preset: v as TrafficPreset })}
          options={[
            { value: 'steady', label: 'Steady — constant RPS' },
            { value: 'spike',  label: 'Spike — burst at midpoint' },
            { value: 'ramp',   label: 'Ramp — linear increase' },
          ]}
        />
      </div>
      {config.preset !== 'steady' && (
        <div>
          <Label>Peak Multiplier</Label>
          <Slider value={config.peakMultiplier} onChange={(v) => patch({ peakMultiplier: v })}
            min={2} max={20} step={0.5} format={(v) => `${v}×`} />
          <p className="text-[11px] text-gray-600 mt-1">Peak: {(config.rps * config.peakMultiplier).toLocaleString()} RPS</p>
        </div>
      )}
    </div>
  )
}

function ServerConfigEditor({ config, patch }: { config: ServerConfig; patch: (p: Partial<ServerConfig>) => void }) {
  const inst = SERVER_INSTANCES[config.instanceType]
  return (
    <div className="space-y-4">
      <div>
        <Label>Instance Type</Label>
        <Select value={config.instanceType} onChange={(v) => patch({ instanceType: v as ServerConfig['instanceType'] })}
          options={Object.entries(SERVER_INSTANCES).map(([k, v]) => ({ value: k, label: `${v.label} — ${v.maxRps} RPS · $${v.costPerHour}/hr` }))} />
      </div>
      <div><Label>Instance Count</Label>
        <NumberInput value={config.instanceCount} onChange={(v) => patch({ instanceCount: v })} min={1} max={50} /></div>
      <div><Label>Base Latency</Label>
        <Slider value={config.baseLatencyMs} onChange={(v) => patch({ baseLatencyMs: v })} min={5} max={500} step={5} format={(v) => `${v}ms`} /></div>
      <Divider />
      <Stat label="Total max RPS" value={(inst.maxRps * config.instanceCount).toLocaleString()} />
      <Stat label="Cost per hour" value={`$${(inst.costPerHour * config.instanceCount).toFixed(3)}`} />
    </div>
  )
}

function DatabaseConfigEditor({ config, patch }: { config: DatabaseConfig; patch: (p: Partial<DatabaseConfig>) => void }) {
  const inst = DATABASE_INSTANCES[config.instanceType]
  const cost = inst.costPerHour * (1 + config.readReplicas) * (config.multiAz ? 2 : 1)
  return (
    <div className="space-y-4">
      <div><Label>Instance Type</Label>
        <Select value={config.instanceType} onChange={(v) => patch({ instanceType: v as DatabaseConfig['instanceType'] })}
          options={Object.entries(DATABASE_INSTANCES).map(([k, v]) => ({ value: k, label: `${v.label} — $${v.costPerHour}/hr` }))} /></div>
      <div><Label>Read Replicas</Label>
        <NumberInput value={config.readReplicas} onChange={(v) => patch({ readReplicas: v })} min={0} max={5} /></div>
      <div><Label>Max Connections</Label>
        <NumberInput value={config.maxConnections} onChange={(v) => patch({ maxConnections: v })} min={20} max={5000} step={10} /></div>
      <div>
        <Label>Multi-AZ</Label>
        <div className="flex items-center gap-2 mt-1">
          <Toggle checked={config.multiAz} onChange={(v) => patch({ multiAz: v })} />
          <span className="text-[12px] text-gray-400">{config.multiAz ? 'Enabled' : 'Disabled'}</span>
        </div>
      </div>
      <Divider />
      <Stat label="Max RPS (est)" value={(config.maxConnections * 5).toLocaleString()} />
      <Stat label="Cost per hour" value={`$${cost.toFixed(3)}`} />
    </div>
  )
}

function CacheConfigEditor({ config, patch }: { config: CacheConfig; patch: (p: Partial<CacheConfig>) => void }) {
  const inst = CACHE_INSTANCES[config.instanceType]
  return (
    <div className="space-y-4">
      <div><Label>Instance Type</Label>
        <Select value={config.instanceType} onChange={(v) => patch({ instanceType: v as CacheConfig['instanceType'] })}
          options={Object.entries(CACHE_INSTANCES).map(([k, v]) => ({ value: k, label: `${v.label} — ${v.memoryGb}GB · $${v.costPerHour}/hr` }))} /></div>
      <div><Label>Cache Hit Rate</Label>
        <Slider value={config.hitRate} onChange={(v) => patch({ hitRate: v })} min={0} max={0.99} step={0.01} format={(v) => `${(v * 100).toFixed(0)}%`} /></div>
      <div><Label>TTL (seconds)</Label>
        <NumberInput value={config.ttlSeconds} onChange={(v) => patch({ ttlSeconds: v })} min={0} max={86400} step={30} /></div>
      <Divider />
      <Stat label="Memory" value={`${inst.memoryGb} GB`} />
      <Stat label="Cost per hour" value={`$${inst.costPerHour.toFixed(3)}`} />
    </div>
  )
}

function LoadBalancerConfigEditor({ config, patch }: { config: LoadBalancerConfig; patch: (p: Partial<LoadBalancerConfig>) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Algorithm</Label>
        <Select
          value={config.algorithm}
          onChange={(v) => patch({ algorithm: v as LoadBalancerConfig['algorithm'] })}
          options={[
            { value: 'round-robin',       label: 'Round Robin — equal distribution' },
            { value: 'least-connections', label: 'Least Connections — adaptive' },
            { value: 'ip-hash',           label: 'IP Hash — session affinity' },
          ]}
        />
        <p className="text-[11px] text-gray-600 mt-1.5">
          In Phase 2, traffic split is controlled by edge weights regardless of algorithm.
        </p>
      </div>
      <Divider />
      <Stat label="Max RPS" value="100,000" />
      <Stat label="Cost per hour" value={`$${LB_COST_PER_HOUR.toFixed(3)}`} />
    </div>
  )
}

// ── Edge config panel ─────────────────────────────────────────────────────────

function EdgeConfigPanel({ edgeId }: { edgeId: string }) {
  const { nodes, edges, updateEdgeSplitWeight } = useArchitectureStore()
  const edgeSnap = useSimStore((s) => s.edgeSnapshots[edgeId])
  const edge = edges.find((e) => e.id === edgeId)
  if (!edge) return null

  const sourceNode = nodes.find((n) => n.id === edge.source)
  const targetNode = nodes.find((n) => n.id === edge.target)

  // Sibling edges (same source) — needed to show split as percentage
  const siblings = edges.filter((e) => e.source === edge.source)
  const totalWeight = siblings.reduce((s, e) => s + (e.data?.splitWeight ?? 1), 0)
  const myWeight = edge.data?.splitWeight ?? 1
  const pct = siblings.length > 1 ? ((myWeight / totalWeight) * 100).toFixed(0) : '100'

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 border-b border-gray-800/60">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Connection</p>
        <div className="flex items-center gap-1.5 mt-1.5 text-[13px] text-gray-300">
          <span className="font-medium truncate max-w-[80px]">{sourceNode?.data.label ?? edge.source}</span>
          <ArrowRight size={12} className="text-gray-600 flex-shrink-0" />
          <span className="font-medium truncate max-w-[80px]">{targetNode?.data.label ?? edge.target}</span>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 flex-1">
        {/* Split weight */}
        {siblings.length > 1 && (
          <div>
            <Label>Traffic Split Weight</Label>
            <NumberInput value={myWeight} onChange={(v) => updateEdgeSplitWeight(edgeId, v)} min={0.1} max={100} step={0.1} />
            <p className="text-[11px] text-gray-600 mt-1">
              {pct}% of traffic from {sourceNode?.data.label ?? 'source'}
            </p>
            <div className="mt-2 space-y-1">
              {siblings.map((sib) => {
                const sibWeight = sib.data?.splitWeight ?? 1
                const sibPct = ((sibWeight / totalWeight) * 100).toFixed(0)
                const sibTarget = nodes.find((n) => n.id === sib.target)
                return (
                  <div key={sib.id} className={`flex justify-between text-[11px] ${sib.id === edgeId ? 'text-gray-300' : 'text-gray-600'}`}>
                    <span>→ {sibTarget?.data.label ?? sib.target}</span>
                    <span className="font-mono">{sibPct}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {siblings.length === 1 && (
          <p className="text-[12px] text-gray-600">Add more connections from the same source to configure traffic split.</p>
        )}

        {/* Live metrics */}
        {edgeSnap && (
          <>
            <Divider />
            <Label>Live Metrics</Label>
            <Stat label="Throughput" value={`${Math.round(edgeSnap.throughputRps)} RPS`} />
            <Stat label="Latency" value={`${edgeSnap.latencyMs < 1 ? '<1' : Math.round(edgeSnap.latencyMs)}ms`} />
            {edgeSnap.dropRate > 0.001 && (
              <Stat label="Drop rate" value={`${(edgeSnap.dropRate * 100).toFixed(2)}%`} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Main panel ───────────────────────────────────────────────────────────────

export function ConfigPanel() {
  const { nodes, selectedNodeId, selectedEdgeId, updateNodeConfig, updateNodeLabel } = useArchitectureStore()
  const selectedNode = nodes.find((n) => n.id === selectedNodeId)

  // Edge selected
  if (selectedEdgeId && !selectedNodeId) {
    return (
      <aside className="w-64 flex-shrink-0 h-full bg-gray-900/80 border-l border-gray-800/60 overflow-y-auto">
        <EdgeConfigPanel edgeId={selectedEdgeId} />
      </aside>
    )
  }

  // Nothing selected
  if (!selectedNode) {
    return (
      <aside className="w-64 flex-shrink-0 h-full bg-gray-900/80 border-l border-gray-800/60 flex flex-col items-center justify-center">
        <div className="text-center px-6">
          <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center mx-auto mb-3">
            <span className="text-gray-600 text-xl">⚙️</span>
          </div>
          <p className="text-[12px] text-gray-600">Select a node or connection to configure it</p>
        </div>
      </aside>
    )
  }

  const { data } = selectedNode
  const nodeId = selectedNode.id
  const meta = COMPONENT_META[data.componentType]
  function patch(p: Partial<typeof data.config>) { updateNodeConfig(nodeId, p) }

  return (
    <aside className="w-64 flex-shrink-0 h-full bg-gray-900/80 border-l border-gray-800/60 flex flex-col overflow-y-auto">
      <div className="px-4 pt-4 pb-3 border-b border-gray-800/60">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{meta.label}</p>
        <input value={data.label} onChange={(e) => updateNodeLabel(selectedNode.id, e.target.value)}
          className="mt-1 w-full bg-transparent text-[14px] font-semibold text-gray-100 focus:outline-none border-b border-transparent focus:border-gray-600 pb-0.5" />
      </div>

      <div className="px-4 py-4 flex-1">
        {data.componentType === 'client'        && <ClientConfigEditor       config={data.config as ClientConfig}       patch={patch} />}
        {data.componentType === 'server'        && <ServerConfigEditor       config={data.config as ServerConfig}       patch={patch} />}
        {data.componentType === 'database'      && <DatabaseConfigEditor     config={data.config as DatabaseConfig}     patch={patch} />}
        {data.componentType === 'cache'         && <CacheConfigEditor        config={data.config as CacheConfig}        patch={patch} />}
        {data.componentType === 'load-balancer' && <LoadBalancerConfigEditor config={data.config as LoadBalancerConfig} patch={patch} />}
      </div>

      <div className="px-4 py-3 border-t border-gray-800/60">
        <p className="text-[11px] text-gray-600">{meta.description}</p>
      </div>
    </aside>
  )
}
