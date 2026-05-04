import { describe, it, expect } from 'vitest'
import { buildChaosMap, activeEvents, eventForNode, makeChaosEvent } from '@/sim/chaos'
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

// ── activeEvents ──────────────────────────────────────────────────────────────

describe('activeEvents', () => {
  it('returns empty array when events list is empty', () => {
    expect(activeEvents([], 500)).toEqual([])
  })

  it('returns only events active at simTimeMs', () => {
    const e1 = event('e1', 'n1', 'latency-spike', 0,    1000)
    const e2 = event('e2', 'n2', 'latency-spike', 2000, 1000)
    expect(activeEvents([e1, e2], 500)).toEqual([e1])
    expect(activeEvents([e1, e2], 2500)).toEqual([e2])
  })

  it('includes event starting exactly at simTimeMs', () => {
    const e = event('e1', 'n1', 'latency-spike', 1000, 500)
    expect(activeEvents([e], 1000)).toEqual([e])
  })

  it('excludes event whose end equals simTimeMs (half-open interval)', () => {
    const e = event('e1', 'n1', 'latency-spike', 0, 1000)
    expect(activeEvents([e], 1000)).toEqual([])
  })
})

// ── eventForNode ─────────────────────────────────────────────────────────────

describe('eventForNode', () => {
  it('returns undefined when no events are active', () => {
    const e = event('e1', 'n1', 'latency-spike', 0, 1000)
    expect(eventForNode([e], 'n1', 2000)).toBeUndefined()
  })

  it('returns undefined when active events do not target the node', () => {
    const e = event('e1', 'n2', 'latency-spike', 0, 1000)
    expect(eventForNode([e], 'n1', 500)).toBeUndefined()
  })

  it('returns the single active event for the node', () => {
    const e = event('e1', 'n1', 'latency-spike', 0, 1000)
    expect(eventForNode([e], 'n1', 500)).toBe(e)
  })

  it('prefers node-failure over other active events for the same node', () => {
    const spike   = event('e1', 'n1', 'latency-spike', 0, 1000)
    const failure = event('e2', 'n1', 'node-failure',  0, 1000)
    expect(eventForNode([spike, failure], 'n1', 500)).toBe(failure)
    // also when failure is listed first
    expect(eventForNode([failure, spike], 'n1', 500)).toBe(failure)
  })

  it('returns first non-failure event when no node-failure is present', () => {
    const spike = event('e1', 'n1', 'latency-spike', 0, 1000)
    const err   = event('e2', 'n1', 'error-rate',    0, 1000)
    expect(eventForNode([spike, err], 'n1', 500)).toBe(spike)
  })
})

// ── makeChaosEvent ────────────────────────────────────────────────────────────

describe('makeChaosEvent', () => {
  it('builds a ChaosEvent with the expected shape', () => {
    const e = makeChaosEvent('n1', 'node-failure', 5000, 2000)
    expect(e).toMatchObject({ nodeId: 'n1', type: 'node-failure', startSimMs: 5000, durationMs: 2000, magnitude: 5 })
  })

  it('generates a deterministic id from nodeId, type, and startSimMs', () => {
    expect(makeChaosEvent('n1', 'latency-spike', 1000, 500).id).toBe('n1-latency-spike-1000')
  })

  it('accepts a custom magnitude', () => {
    expect(makeChaosEvent('n1', 'node-failure', 0, 1000, 10).magnitude).toBe(10)
  })
})
