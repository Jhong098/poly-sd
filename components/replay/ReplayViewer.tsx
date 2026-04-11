'use client'

import { useState } from 'react'
import { ReactFlow, Background, Controls, MiniMap, BackgroundVariant, ReactFlowProvider } from '@xyflow/react'
import { Trophy, XCircle, CheckCircle2, ArrowLeft, ChevronRight, Share2, Check, Download } from 'lucide-react'
import type { ReplayRow } from '@/lib/actions/replays'
import { exportArchitecturePng } from '@/lib/exportPng'
import type { Challenge } from '@/lib/challenges/types'
import type { ComponentNode, ComponentEdge } from '@/lib/store/architectureStore'
import { ClientNode }       from '@/components/nodes/ClientNode'
import { ServerNode }       from '@/components/nodes/ServerNode'
import { DatabaseNode }     from '@/components/nodes/DatabaseNode'
import { CacheNode }        from '@/components/nodes/CacheNode'
import { LoadBalancerNode } from '@/components/nodes/LoadBalancerNode'
import { QueueNode }        from '@/components/nodes/QueueNode'
import { ApiGatewayNode }   from '@/components/nodes/ApiGatewayNode'
import { K8sFleetNode }     from '@/components/nodes/K8sFleetNode'
import { KafkaNode }        from '@/components/nodes/KafkaNode'
import { CdnNode }          from '@/components/nodes/CdnNode'
import { AnimatedEdge }     from '@/components/canvas/edges/AnimatedEdge'

const NODE_TYPES = {
  client:          ClientNode,
  server:          ServerNode,
  database:        DatabaseNode,
  cache:           CacheNode,
  'load-balancer': LoadBalancerNode,
  queue:           QueueNode,
  'api-gateway':   ApiGatewayNode,
  'k8s-fleet':     K8sFleetNode,
  kafka:           KafkaNode,
  cdn:             CdnNode,
}

const EDGE_TYPES = { default: AnimatedEdge }

function nodeColor(node: ComponentNode): string {
  const map: Record<string, string> = {
    client: '#00e5ff', server: '#00bfa5', database: '#a78bfa',
    cache: '#fbbf24', 'load-balancer': '#38bdf8', queue: '#fb923c',
  }
  return map[node.data.componentType] ?? '#0d3d4e'
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-[11px] text-ink-3">{label}</span>
        <span className="text-[12px] font-semibold text-ink">{value}</span>
      </div>
      <div className="h-1.5 bg-surface overflow-hidden">
        <div className="h-full" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  )
}

function MetricRow({ label, value, passed }: { label: string; value: string; passed: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-1.5">
        {passed
          ? <CheckCircle2 size={13} className="text-ok" />
          : <XCircle size={13} className="text-err" />
        }
        <span className="text-[12px] text-ink-2">{label}</span>
      </div>
      <span className={`text-[12px] font-semibold ${passed ? 'text-ok' : 'text-err'}`}>{value}</span>
    </div>
  )
}

export function ReplayViewer({ replay, challenge }: { replay: ReplayRow; challenge: Challenge | null }) {
  const { architecture, eval_result: result, score, created_at } = replay
  const nodes = architecture.nodes as ComponentNode[]
  const edges = architecture.edges as ComponentEdge[]
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'error'>('idle')
  const [exporting, setExporting] = useState(false)

  const date = new Date(created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  function handleExport() {
    setExporting(true)
    const filename = challenge ? `${challenge.id}-architecture` : 'architecture'
    exportArchitecturePng(filename).finally(() => setExporting(false))
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href)
      .then(() => {
        setShareState('copied')
        setTimeout(() => setShareState('idle'), 2500)
      })
      .catch(() => setShareState('error'))
  }

return (
    <ReactFlowProvider>
      <div className="flex flex-col h-full w-full overflow-hidden bg-base">
        {/* Top bar */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-edge bg-raised shrink-0">
          <a
            href={challenge ? `/play/${challenge.id}` : '/sandbox'}
            className="flex items-center gap-1.5 text-[11px] text-ink-3 hover:text-ink transition-colors"
          >
            <ArrowLeft size={13} />
            {challenge ? 'Play this challenge' : 'Sandbox'}
          </a>
          <div className="h-4 w-px bg-edge" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-ink truncate">
              {challenge ? challenge.title : 'Sandbox Replay'}
            </p>
            <p className="text-[10px] text-ink-3">{date}</p>
          </div>
          <div className="flex items-center gap-2">
            {result.passed
              ? <Trophy size={16} className="text-ok" />
              : <XCircle size={16} className="text-err" />
            }
            <div className="text-right">
              <p className="text-[20px] font-bold text-ink leading-none">{score}</p>
              <p className="text-[10px] text-ink-3 uppercase tracking-widest">Score</p>
            </div>
          </div>
          {challenge && (
            <a
              href={`/play/${challenge.id}`}
              className="flex items-center gap-1.5 px-3 py-2 bg-cyan/10 hover:bg-cyan/20 border border-cyan/30 text-cyan text-[11px] font-bold uppercase tracking-wider transition-colors"
            >
              Try it <ChevronRight size={12} />
            </a>
          )}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 border border-edge bg-surface hover:bg-overlay text-ink-2 text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            <Download size={12} /> {exporting ? 'Exporting…' : 'PNG'}
          </button>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-2 border border-edge bg-surface hover:bg-overlay text-ink-2 text-[11px] font-bold uppercase tracking-wider transition-colors"
          >
            {shareState === 'copied'
              ? <><Check size={12} className="text-ok" /> Copied</>
              : <><Share2 size={12} /> Share</>
            }
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Canvas */}
          <div className="flex-1 relative overflow-hidden">
            <ReactFlow
              nodes={nodes}
              edges={edges as never}
              nodeTypes={NODE_TYPES}
              edgeTypes={EDGE_TYPES}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              panOnDrag={true}
              zoomOnScroll={true}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              minZoom={0.2}
              maxZoom={2}
              proOptions={{ hideAttribution: true }}
            >
              <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#0a2d3a" />
              <Controls showInteractive={false} />
              <MiniMap
                nodeColor={nodeColor as never}
                maskColor="rgba(2,11,15,0.8)"
                style={{ width: 160, height: 100 }}
              />
            </ReactFlow>
          </div>

          {/* Side panel */}
          <div className="w-[260px] shrink-0 border-l border-edge bg-raised overflow-y-auto">
            {/* Challenge brief */}
            {challenge && (
              <div className="px-4 py-4 border-b border-edge-dim">
                <p className="text-[10px] font-bold text-cyan uppercase tracking-widest mb-2">// Challenge</p>
                <p className="text-[12px] text-ink font-semibold mb-1">{challenge.title}</p>
                <p className="text-[11px] text-ink-3 leading-relaxed">{challenge.objective}</p>
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[10px] text-ink-3">p99 target</span>
                    <span className="text-[10px] text-ink-2">{challenge.slaTargets.p99LatencyMs}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-ink-3">error rate</span>
                    <span className="text-[10px] text-ink-2">{(challenge.slaTargets.errorRate * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-ink-3">budget</span>
                    <span className="text-[10px] text-ink-2">${challenge.budgetPerHour.toFixed(2)}/hr</span>
                  </div>
                </div>
              </div>
            )}

            {/* Metrics */}
            <div className="px-4 py-4 border-b border-edge-dim">
              <p className="text-[10px] font-bold text-cyan uppercase tracking-widest mb-2">// Results</p>
              <MetricRow
                label="p99 Latency"
                value={`${Math.round(result.metrics.p99LatencyMs)}ms${challenge ? `  ≤ ${challenge.slaTargets.p99LatencyMs}ms` : ''}`}
                passed={result.passedLatency}
              />
              <MetricRow
                label="Error Rate"
                value={`${(result.metrics.errorRate * 100).toFixed(2)}%${challenge ? `  ≤ ${(challenge.slaTargets.errorRate * 100).toFixed(1)}%` : ''}`}
                passed={result.passedErrors}
              />
              <MetricRow
                label="Cost / hr"
                value={`$${result.metrics.costPerHour.toFixed(3)}${challenge ? `  ≤ $${challenge.budgetPerHour.toFixed(2)}` : ''}`}
                passed={result.passedBudget}
              />
            </div>

            {/* Score breakdown (only if passed) */}
            {result.passed && (
              <div className="px-4 py-4 space-y-3">
                <p className="text-[10px] font-bold text-cyan uppercase tracking-widest">// Score</p>
                <ScoreBar label="Performance" value={result.scores.performance} color="var(--color-cyan)" />
                <ScoreBar label="Cost"        value={result.scores.cost}        color="var(--color-ok)" />
                <ScoreBar label="Simplicity"  value={result.scores.simplicity}  color="var(--color-node-db)" />
                {result.scores.resilience > 0 && (
                  <ScoreBar label="Resilience" value={result.scores.resilience} color="var(--color-err)" />
                )}
                <div className="pt-2 border-t border-edge-dim flex justify-between items-baseline">
                  <span className="text-[11px] text-ink-3 uppercase tracking-widest">Total</span>
                  <span className="text-[24px] font-bold text-ink">{result.scores.total}</span>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </ReactFlowProvider>
  )
}
