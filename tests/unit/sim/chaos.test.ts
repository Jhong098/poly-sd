import { describe, it, expect } from 'vitest'
import { buildChaosMap } from '@/sim/chaos'
import type { ChaosEvent } from '@/sim/types'

function event(
  id: string,
  nodeId: string,
  type: ChaosEvent['type'],
  startSimMs: number,
  durationMs: number,
): ChaosEvent {
  return { id, nodeId, type, startSimMs, durationMs, magnitude: 5 }
}

describe('buildChaosMap', () => {
  it('returns empty map when no events are active', () => {
    const events = [event('e1', 'node-1', 'latency-spike', 0, 1000)]

    const result = buildChaosMap(events, 2000)

    expect(result).toEqual({})
  })

  it('maps an active event to its node', () => {
    const evt = event('e1', 'node-1', 'latency-spike', 0, 1000)

    const result = buildChaosMap([evt], 500)

    expect(result['node-1']).toBe(evt)
  })

  it('excludes events that have not yet started', () => {
    const events = [event('e1', 'node-1', 'latency-spike', 1000, 500)]

    const result = buildChaosMap(events, 500)

    expect(result['node-1']).toBeUndefined()
  })

  it('excludes events that have already ended', () => {
    const events = [event('e1', 'node-1', 'latency-spike', 0, 500)]

    const result = buildChaosMap(events, 500)

    expect(result['node-1']).toBeUndefined()
  })

  it('maps multiple nodes independently', () => {
    const e1 = event('e1', 'node-1', 'latency-spike', 0, 1000)
    const e2 = event('e2', 'node-2', 'error-rate', 0, 1000)

    const result = buildChaosMap([e1, e2], 500)

    expect(result['node-1']).toBe(e1)
    expect(result['node-2']).toBe(e2)
  })

  it('node-failure takes precedence over other active events for the same node', () => {
    const latency = event('e1', 'node-1', 'latency-spike', 0, 1000)
    const failure = event('e2', 'node-1', 'node-failure', 0, 1000)

    const result = buildChaosMap([latency, failure], 500)

    expect(result['node-1']).toBe(failure)
  })

  it('keeps first non-failure event when no node-failure is present', () => {
    const first  = event('e1', 'node-1', 'latency-spike', 0, 1000)
    const second = event('e2', 'node-1', 'error-rate',   0, 1000)

    const result = buildChaosMap([first, second], 500)

    expect(result['node-1']).toBe(first)
  })
})
