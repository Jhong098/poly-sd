'use client'

import {
  BaseEdge,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react'
import { useSimStore } from '@/lib/store/simStore'

export function AnimatedEdge({
  id,
  sourceX, sourceY,
  targetX, targetY,
  sourcePosition, targetPosition,
  style,
  markerEnd,
}: EdgeProps) {
  const [edgePath] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition })
  const simStatus = useSimStore((s) => s.status)
  const snap = useSimStore((s) => s.edgeSnapshots[id])

  const isActive = simStatus === 'running'
  const throughput = snap?.throughputRps ?? 0
  const dropRate = snap?.dropRate ?? 0

  // Spawn 1–4 packets proportional to throughput (visual only — not 1:1 with actual RPS)
  const packetCount = isActive && throughput > 0 ? Math.min(Math.ceil(throughput / 80), 4) : 0

  // Color by health
  const packetColor =
    dropRate > 0.05 ? '#ef4444'
    : dropRate > 0.005 ? '#fbbf24'
    : '#00e5ff'

  // Edge stroke color matches packet health
  const edgeColor =
    dropRate > 0.05 ? '#ef444450'
    : dropRate > 0.005 ? '#fbbf2450'
    : isActive ? '#00e5ff30'
    : '#0d3d4e'

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{ stroke: edgeColor, strokeWidth: 2, ...style }}
        markerEnd={markerEnd}
      />

      {Array.from({ length: packetCount }).map((_, i) => {
        const dur = 1.0 + i * 0.25
        const begin = (i / Math.max(packetCount, 1)) * dur

        return (
          <circle key={i} r={3} fill={packetColor} opacity={0.85}>
            <animateMotion
              dur={`${dur}s`}
              begin={`${begin}s`}
              repeatCount="indefinite"
              path={edgePath}
            />
          </circle>
        )
      })}
    </>
  )
}
