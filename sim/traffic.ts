import type { TrafficConfig, TrafficWaypoint } from './types'
import type { TrafficPreset } from '@/lib/components/definitions'

/**
 * Sample the global traffic curve at a given sim time.
 * Linearly interpolates between waypoints.
 */
export function sampleTraffic(config: TrafficConfig, simTimeMs: number): number {
  return sampleWaypoints(config.waypoints, simTimeMs)
}

/** Linear interpolation between sorted waypoints. */
export function sampleWaypoints(waypoints: TrafficWaypoint[], simTimeMs: number): number {
  if (waypoints.length === 0) return 0
  if (waypoints.length === 1) return waypoints[0].rps

  const sorted = [...waypoints].sort((a, b) => a.timeMs - b.timeMs)

  if (simTimeMs <= sorted[0].timeMs) return sorted[0].rps
  if (simTimeMs >= sorted[sorted.length - 1].timeMs) return sorted[sorted.length - 1].rps

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i], b = sorted[i + 1]
    if (simTimeMs >= a.timeMs && simTimeMs <= b.timeMs) {
      const t = (simTimeMs - a.timeMs) / (b.timeMs - a.timeMs)
      return a.rps + (b.rps - a.rps) * t
    }
  }

  return sorted[sorted.length - 1].rps
}

/**
 * Sample a client node's traffic using its preset config.
 * Called by the engine per client node per tick.
 */
export function sampleClientPreset(
  preset: TrafficPreset,
  baseRps: number,
  peakMultiplier: number,
  durationMs: number,
  simTimeMs: number,
): number {
  const peak = baseRps * peakMultiplier
  const t = simTimeMs / durationMs

  switch (preset) {
    case 'steady':
      return baseRps
    case 'spike': {
      if (t < 0.38 || t > 0.62) return baseRps
      const spikeT = (t - 0.38) / 0.24
      return baseRps + (peak - baseRps) * Math.sin(spikeT * Math.PI)
    }
    case 'ramp':
      return baseRps + (peak - baseRps) * Math.min(t, 1)
  }
}
