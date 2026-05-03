'use client'

import { useArchitectureStore } from '@/lib/store/architectureStore'
import { useShallow } from 'zustand/react/shallow'
import { useSimStore } from '@/lib/store/simStore'
import {
  type ClientConfig,
  type ServerConfig,
  type DatabaseConfig,
  type CacheConfig,
  type LoadBalancerConfig,
  type QueueConfig,
  type ApiGatewayConfig,
  type K8sFleetConfig,
  type KafkaConfig,
  type CdnConfig,
  type NoSqlConfig,
  type ObjectStorageConfig,
  type TrafficPreset,
  SERVER_INSTANCES,
  DATABASE_INSTANCES,
  CACHE_INSTANCES,
  LB_COST_PER_HOUR,
  QUEUE_COST_PER_HOUR,
  GATEWAY_COST_PER_HOUR,
  K8S_INSTANCES,
  KAFKA_COST_PER_PARTITION_HOUR,
  KAFKA_MAX_RPS_PER_PARTITION,
  CDN_COST_PER_REGION_HOUR,
  NOSQL_RCU_COST_PER_HOUR,
  NOSQL_WCU_COST_PER_HOUR,
  NOSQL_ON_DEMAND_COST_PER_RPS_HOUR,
  OBJECT_STORAGE_COST_PER_HOUR,
  COMPONENT_META,
} from '@/lib/components/definitions'
import { ArrowRight, Trash2 } from 'lucide-react'

// ── Shared primitives ────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold text-ink-3 uppercase tracking-widest mb-1">{children}</p>
}

function Select({ value, onChange, options }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full bg-surface border border-edge px-2.5 py-1.5 text-[12px] text-ink focus:outline-none focus:border-edge-strong">
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function NumberInput({ value, onChange, min, max, step = 1, 'data-testid': testId }: {
  value: number; onChange: (v: number) => void; min: number; max: number; step?: number
  'data-testid'?: string
}) {
  return (
    <input type="number" value={value} min={min} max={max} step={step}
      data-testid={testId}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full bg-surface border border-edge px-2.5 py-1.5 text-[12px] text-ink focus:outline-none focus:border-edge-strong" />
  )
}

function Slider({ value, onChange, min, max, step, format }: {
  value: number; onChange: (v: number) => void; min: number; max: number; step: number; format: (v: number) => string
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span className="text-[10px] text-ink-3">{format(min)}</span>
        <span className="text-[12px] font-semibold text-ink">{format(value)}</span>
        <span className="text-[10px] text-ink-3">{format(max)}</span>
      </div>
      <input type="range" value={value} min={min} max={max} step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 appearance-none cursor-pointer bg-edge accent-cyan" />
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center transition-colors ${checked ? 'bg-cyan' : 'bg-edge'}`}>
      <span className={`inline-block h-3.5 w-3.5 transform transition-transform ${checked ? 'translate-x-4 bg-base' : 'translate-x-1 bg-ink-3'}`} />
    </button>
  )
}

function Divider() { return <div className="h-px bg-edge-dim my-1" /> }

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[11px]">
      <span className="text-ink-3">{label}</span>
      <span className="font-semibold text-ink-2">{value}</span>
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
          <p className="text-[10px] text-ink-3 mt-1">// Peak: {(config.rps * config.peakMultiplier).toLocaleString()} RPS</p>
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
        <NumberInput value={config.instanceCount} onChange={(v) => patch({ instanceCount: v })} min={1} max={50} data-testid="config-instanceCount" /></div>
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
          <span className="text-[12px] text-ink-2">{config.multiAz ? 'Enabled' : 'Disabled'}</span>
        </div>
      </div>
      <Divider />
      <Stat label="Max RPS (est)" value={(config.maxConnections * 5 * (1 + config.readReplicas)).toLocaleString()} />
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

function QueueConfigEditor({ config, patch }: { config: QueueConfig; patch: (p: Partial<QueueConfig>) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Drain Rate (RPS)</Label>
        <NumberInput value={config.processingRatePerSec} onChange={(v) => patch({ processingRatePerSec: v })} min={1} max={10_000} step={50} />
        <p className="text-[10px] text-ink-3 mt-1">// Max RPS delivered to downstream consumer</p>
      </div>
      <div>
        <Label>Max Depth</Label>
        <NumberInput value={config.maxDepth} onChange={(v) => patch({ maxDepth: v })} min={100} max={1_000_000} step={1000} />
        <p className="text-[10px] text-ink-3 mt-1">// Requests beyond limit are dropped</p>
      </div>
      <Divider />
      <Stat label="Cost per hour" value={`$${QUEUE_COST_PER_HOUR.toFixed(3)}`} />
    </div>
  )
}

function ApiGatewayConfigEditor({ config, patch }: { config: ApiGatewayConfig; patch: (p: Partial<ApiGatewayConfig>) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Rate Limit (RPS)</Label>
        <NumberInput value={config.maxRps} onChange={(v) => patch({ maxRps: Math.max(1, v) })} min={1} max={100_000} step={100} />
        <p className="text-[10px] text-ink-3 mt-1">// Requests above limit get 429 errors</p>
      </div>
      <div>
        <Label>Upstream Timeout</Label>
        <Slider value={config.timeoutMs} onChange={(v) => patch({ timeoutMs: v })} min={100} max={30_000} step={100} format={(v) => `${v}ms`} />
      </div>
      <div>
        <Label>Circuit Breaker</Label>
        <div className="flex items-center gap-2 mt-1">
          <Toggle checked={config.circuitBreakerEnabled} onChange={(v) => patch({ circuitBreakerEnabled: v })} />
          <span className="text-[12px] text-ink-2">{config.circuitBreakerEnabled ? 'Enabled' : 'Disabled'}</span>
        </div>
        <p className="text-[10px] text-ink-3 mt-1.5">
          // When enabled: trips on latency spike → fast-fail (low latency, high err)
        </p>
      </div>
      <Divider />
      <Stat label="Cost per hour" value={`$${GATEWAY_COST_PER_HOUR.toFixed(3)}`} />
    </div>
  )
}

function K8sFleetConfigEditor({ config, patch }: { config: K8sFleetConfig; patch: (p: Partial<K8sFleetConfig>) => void }) {
  const inst = K8S_INSTANCES[config.instanceType]
  return (
    <div className="space-y-4">
      <div>
        <Label>Pod Size</Label>
        <Select value={config.instanceType} onChange={(v) => patch({ instanceType: v as K8sFleetConfig['instanceType'] })}
          options={Object.entries(K8S_INSTANCES).map(([k, v]) => ({ value: k, label: `${v.label} — ${v.maxRps} RPS · $${v.costPerHour}/hr` }))} />
      </div>
      <div>
        <Label>Min Replicas</Label>
        <NumberInput value={config.minReplicas} onChange={(v) => patch({ minReplicas: Math.max(1, v) })} min={1} max={config.maxReplicas} />
      </div>
      <div>
        <Label>Max Replicas</Label>
        <NumberInput value={config.maxReplicas} onChange={(v) => patch({ maxReplicas: Math.max(config.minReplicas, v) })} min={config.minReplicas} max={100} />
      </div>
      <div>
        <Label>HPA Target Utilization</Label>
        <Slider value={config.targetUtilization} onChange={(v) => patch({ targetUtilization: v })} min={0.3} max={0.95} step={0.05} format={(v) => `${(v * 100).toFixed(0)}%`} />
        <p className="text-[10px] text-ink-3 mt-1">// Scale out when pods exceed this threshold</p>
      </div>
      <Divider />
      <Stat label="Max capacity" value={`${(config.maxReplicas * inst.maxRps).toLocaleString()} RPS`} />
      <Stat label="Min cost" value={`$${(config.minReplicas * inst.costPerHour).toFixed(3)}/hr`} />
      <Stat label="Max cost" value={`$${(config.maxReplicas * inst.costPerHour).toFixed(3)}/hr`} />
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
        <p className="text-[10px] text-ink-3 mt-1.5">
          // Traffic split controlled by edge weights in Phase 2
        </p>
      </div>
      <Divider />
      <Stat label="Max RPS" value="100,000" />
      <Stat label="Cost per hour" value={`$${LB_COST_PER_HOUR.toFixed(3)}`} />
    </div>
  )
}

function KafkaConfigEditor({ config, patch }: { config: KafkaConfig; patch: (p: Partial<KafkaConfig>) => void }) {
  const maxRps = config.partitions * KAFKA_MAX_RPS_PER_PARTITION
  const costPerHour = config.partitions * KAFKA_COST_PER_PARTITION_HOUR
  return (
    <div className="space-y-4">
      <div>
        <Label>Partitions</Label>
        <NumberInput value={config.partitions} onChange={(v) => patch({ partitions: Math.max(1, v) })} min={1} max={128} />
        <p className="text-[10px] text-ink-3 mt-1">// Each partition handles up to {KAFKA_MAX_RPS_PER_PARTITION.toLocaleString()} RPS</p>
      </div>
      <div>
        <Label>Consumer Groups</Label>
        <NumberInput value={config.consumerGroups} onChange={(v) => patch({ consumerGroups: Math.max(1, v) })} min={1} max={20} />
        <p className="text-[10px] text-ink-3 mt-1">// Each group receives a full copy of the stream</p>
      </div>
      <div>
        <Label>Retention</Label>
        <Select
          value={String(config.retentionMs)}
          onChange={(v) => patch({ retentionMs: Number(v) })}
          options={[
            { value: '3600000',    label: '1 hour' },
            { value: '86400000',   label: '24 hours' },
            { value: '604800000',  label: '7 days (default)' },
            { value: '2592000000', label: '30 days' },
          ]}
        />
      </div>
      <Divider />
      <Stat label="Max throughput" value={`${maxRps.toLocaleString()} RPS`} />
      <Stat label="Cost per hour"  value={`$${costPerHour.toFixed(3)}`} />
    </div>
  )
}

function CdnConfigEditor({ config, patch }: { config: CdnConfig; patch: (p: Partial<CdnConfig>) => void }) {
  const costPerHour = config.regions * CDN_COST_PER_REGION_HOUR
  return (
    <div className="space-y-4">
      <div>
        <Label>Cache Hit Rate</Label>
        <Slider value={config.hitRate} onChange={(v) => patch({ hitRate: v })} min={0} max={0.99} step={0.01} format={(v) => `${(v * 100).toFixed(0)}%`} />
        <p className="text-[10px] text-ink-3 mt-1">// Requests above hit rate are forwarded to origin</p>
      </div>
      <div>
        <Label>Regions (PoPs)</Label>
        <NumberInput value={config.regions} onChange={(v) => patch({ regions: Math.max(1, v) })} min={1} max={20} />
      </div>
      <div>
        <Label>TTL (seconds)</Label>
        <NumberInput value={config.ttlSeconds} onChange={(v) => patch({ ttlSeconds: Math.max(1, v) })} min={1} max={86400} step={60} />
      </div>
      <Divider />
      <Stat label="Offload rate"  value={`${(config.hitRate * 100).toFixed(0)}% of requests`} />
      <Stat label="Cost per hour" value={`$${costPerHour.toFixed(3)}`} />
    </div>
  )
}

function NoSqlConfigEditor({ config, patch }: { config: NoSqlConfig; patch: (p: Partial<NoSqlConfig>) => void }) {
  const isOnDemand = config.capacityMode === 'on-demand'
  const costPerHour = isOnDemand
    ? NOSQL_ON_DEMAND_COST_PER_RPS_HOUR * 100
    : (config.rcuCapacity * NOSQL_RCU_COST_PER_HOUR + config.wcuCapacity * NOSQL_WCU_COST_PER_HOUR) * config.globalTables
  return (
    <div className="space-y-4">
      <div>
        <Label>Capacity Mode</Label>
        <Select
          value={config.capacityMode}
          onChange={(v) => patch({ capacityMode: v as NoSqlConfig['capacityMode'] })}
          options={[
            { value: 'provisioned', label: 'Provisioned — fixed RCU/WCU' },
            { value: 'on-demand',   label: 'On-Demand — auto-scale, higher cost' },
          ]}
        />
      </div>
      {!isOnDemand && (
        <>
          <div>
            <Label>Read Capacity (RCU/sec)</Label>
            <NumberInput value={config.rcuCapacity} onChange={(v) => patch({ rcuCapacity: Math.max(1, v) })} min={1} max={40_000} step={100} />
          </div>
          <div>
            <Label>Write Capacity (WCU/sec)</Label>
            <NumberInput value={config.wcuCapacity} onChange={(v) => patch({ wcuCapacity: Math.max(1, v) })} min={1} max={40_000} step={100} />
          </div>
        </>
      )}
      <div>
        <Label>Global Tables (Regions)</Label>
        <NumberInput value={config.globalTables} onChange={(v) => patch({ globalTables: Math.max(1, v) })} min={1} max={5} />
        <p className="text-[10px] text-ink-3 mt-1">// Data replicated across N regions</p>
      </div>
      <Divider />
      {!isOnDemand && (
        <Stat label="Max RPS (est)" value={(config.rcuCapacity + config.wcuCapacity).toLocaleString()} />
      )}
      <Stat label="Cost per hour" value={`$${costPerHour.toFixed(3)}`} />
    </div>
  )
}

function ObjectStorageConfigEditor({ config, patch }: { config: ObjectStorageConfig; patch: (p: Partial<ObjectStorageConfig>) => void }) {
  const costPerHour = config.replication === 'cross-region'
    ? OBJECT_STORAGE_COST_PER_HOUR * 2
    : OBJECT_STORAGE_COST_PER_HOUR
  return (
    <div className="space-y-4">
      <div>
        <Label>Storage Class</Label>
        <Select
          value={config.storageClass}
          onChange={(v) => patch({ storageClass: v as ObjectStorageConfig['storageClass'] })}
          options={[
            { value: 'standard',          label: 'Standard — frequent access' },
            { value: 'infrequent-access', label: 'Infrequent Access — lower cost' },
          ]}
        />
      </div>
      <div>
        <Label>Replication</Label>
        <Select
          value={config.replication}
          onChange={(v) => patch({ replication: v as ObjectStorageConfig['replication'] })}
          options={[
            { value: 'none',         label: 'Single-Region' },
            { value: 'cross-region', label: 'Cross-Region — 2× cost, higher durability' },
          ]}
        />
      </div>
      <Divider />
      <Stat label="Latency"      value="~50ms first byte" />
      <Stat label="Throughput"   value="Effectively unlimited" />
      <Stat label="Cost per hour" value={`$${costPerHour.toFixed(3)}`} />
    </div>
  )
}

// ── Edge config panel ────────────────────────────────────────────────────────

function EdgeConfigPanel({ edgeId }: { edgeId: string }) {
  const { nodes, edges, updateEdgeSplitWeight, removeEdge } = useArchitectureStore()
  const edgeSnap = useSimStore((s) => s.edgeSnapshots[edgeId])
  const edge = edges.find((e) => e.id === edgeId)
  if (!edge) return null

  const sourceNode = nodes.find((n) => n.id === edge.source)
  const targetNode = nodes.find((n) => n.id === edge.target)

  const siblings = edges.filter((e) => e.source === edge.source)
  const totalWeight = siblings.reduce((s, e) => s + (e.data?.splitWeight ?? 1), 0)
  const myWeight = edge.data?.splitWeight ?? 1
  const pct = siblings.length > 1 ? ((myWeight / totalWeight) * 100).toFixed(0) : '100'

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 border-b border-edge-dim">
        <p className="text-[10px] font-bold text-cyan uppercase tracking-widest">// Connection</p>
        <div className="flex items-center gap-1.5 mt-1.5 text-[13px] text-ink">
          <span className="font-semibold truncate max-w-[80px]">{sourceNode?.data.label ?? edge.source}</span>
          <ArrowRight size={12} className="text-ink-3 flex-shrink-0" />
          <span className="font-semibold truncate max-w-[80px]">{targetNode?.data.label ?? edge.target}</span>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 flex-1">
        {siblings.length > 1 && (
          <div>
            <Label>Traffic Split Weight</Label>
            <NumberInput value={myWeight} onChange={(v) => updateEdgeSplitWeight(edgeId, v)} min={0.1} max={100} step={0.1} />
            <p className="text-[10px] text-ink-3 mt-1">
              // {pct}% of traffic from {sourceNode?.data.label ?? 'source'}
            </p>
            <div className="mt-2 space-y-1">
              {siblings.map((sib) => {
                const sibWeight = sib.data?.splitWeight ?? 1
                const sibPct = ((sibWeight / totalWeight) * 100).toFixed(0)
                const sibTarget = nodes.find((n) => n.id === sib.target)
                return (
                  <div key={sib.id} className={`flex justify-between text-[11px] ${sib.id === edgeId ? 'text-ink' : 'text-ink-3'}`}>
                    <span>→ {sibTarget?.data.label ?? sib.target}</span>
                    <span className="font-semibold">{sibPct}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {siblings.length === 1 && (
          <p className="text-[11px] text-ink-3">// Add more connections from the same source to configure traffic split</p>
        )}

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
        <Divider />
        <button
          onClick={() => removeEdge(edgeId)}
          className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
        >
          <Trash2 size={13} />
          Remove connection
        </button>
      </div>
    </div>
  )
}

// ── Main panel ───────────────────────────────────────────────────────────────

export function ConfigPanel({ variant = 'panel' }: { variant?: 'panel' | 'content' } = {}) {
  const selectedNodeId = useArchitectureStore((s) => s.selectedNodeId)
  const selectedEdgeId = useArchitectureStore((s) => s.selectedEdgeId)
  const updateNodeConfig = useArchitectureStore((s) => s.updateNodeConfig)
  const updateNodeLabel = useArchitectureStore((s) => s.updateNodeLabel)
  const removeNode = useArchitectureStore((s) => s.removeNode)
  // useShallow: ignore position changes — only re-render when the selected
  // node's data (config/label) changes, not when the user drags it.
  const selectedNode = useArchitectureStore(
    useShallow((s) => {
      const node = s.nodes.find((n) => n.id === s.selectedNodeId)
      if (!node) return null
      return { id: node.id, data: node.data }
    }),
  )

  if (selectedEdgeId && !selectedNodeId) {
    if (variant === 'content') return <div className="overflow-y-auto flex-1"><EdgeConfigPanel edgeId={selectedEdgeId} /></div>
    return (
      <aside data-testid="config-panel" className="w-64 flex-shrink-0 h-full bg-raised border-l border-edge hidden md:block overflow-y-auto">
        <EdgeConfigPanel edgeId={selectedEdgeId} />
      </aside>
    )
  }

  if (!selectedNode) {
    if (variant === 'content') return null
    return (
      <aside data-testid="config-panel" className="w-64 flex-shrink-0 h-full bg-raised border-l border-edge hidden md:flex flex-col items-center justify-center">
        <div className="text-center px-6">
          <p className="text-[10px] text-ink-3 uppercase tracking-widest mb-1">// Config</p>
          <p className="text-[11px] text-ink-3">Select a node or connection</p>
        </div>
      </aside>
    )
  }

  const { data } = selectedNode
  const nodeId = selectedNode.id
  const meta = COMPONENT_META[data.componentType]
  function patch(p: Partial<typeof data.config>) { updateNodeConfig(nodeId, p) }

  const editorSwitch = (
    <>
      {data.componentType === 'client'        && <ClientConfigEditor       config={data.config as ClientConfig}       patch={patch} />}
      {data.componentType === 'server'        && <ServerConfigEditor       config={data.config as ServerConfig}       patch={patch} />}
      {data.componentType === 'database'      && <DatabaseConfigEditor     config={data.config as DatabaseConfig}     patch={patch} />}
      {data.componentType === 'cache'         && <CacheConfigEditor        config={data.config as CacheConfig}        patch={patch} />}
      {data.componentType === 'load-balancer' && <LoadBalancerConfigEditor config={data.config as LoadBalancerConfig} patch={patch} />}
      {data.componentType === 'queue'         && <QueueConfigEditor        config={data.config as QueueConfig}        patch={patch} />}
      {data.componentType === 'api-gateway'   && <ApiGatewayConfigEditor   config={data.config as ApiGatewayConfig}   patch={patch} />}
      {data.componentType === 'k8s-fleet'     && <K8sFleetConfigEditor     config={data.config as K8sFleetConfig}     patch={patch} />}
      {data.componentType === 'kafka'          && <KafkaConfigEditor         config={data.config as KafkaConfig}         patch={patch} />}
      {data.componentType === 'cdn'            && <CdnConfigEditor           config={data.config as CdnConfig}           patch={patch} />}
      {data.componentType === 'nosql'          && <NoSqlConfigEditor         config={data.config as NoSqlConfig}         patch={patch} />}
      {data.componentType === 'object-storage' && <ObjectStorageConfigEditor config={data.config as ObjectStorageConfig} patch={patch} />}
    </>
  )

  const nodeConfigBody = (
    <>
      <div className="px-4 pt-4 pb-3 border-b border-edge-dim">
        <p className="text-[10px] font-bold text-cyan uppercase tracking-widest">// {meta.label}</p>
        <input value={data.label} onChange={(e) => updateNodeLabel(selectedNode.id, e.target.value)}
          className="mt-1 w-full bg-transparent text-[14px] font-semibold text-ink focus:outline-none border-b border-transparent focus:border-edge-strong pb-0.5" />
      </div>
      <div className="px-4 py-4 flex-1">
        {editorSwitch}
      </div>
      <div className="px-4 py-3 border-t border-edge-dim">
        <p className="text-[10px] text-ink-3">{meta.description}</p>
      </div>
      <div className="px-4 py-3 border-t border-edge-dim">
        <button onClick={() => removeNode(nodeId)} className="flex items-center gap-1.5 text-[11px] text-err hover:text-err/80 transition-colors">
          <Trash2 size={12} /> Delete node
        </button>
      </div>
    </>
  )

  if (variant === 'content') {
    return <div className="flex flex-col overflow-y-auto flex-1">{nodeConfigBody}</div>
  }

  return (
    <aside data-testid="config-panel" className="w-64 flex-shrink-0 h-full bg-raised border-l border-edge hidden md:flex flex-col overflow-y-auto">
      {nodeConfigBody}
    </aside>
  )
}
