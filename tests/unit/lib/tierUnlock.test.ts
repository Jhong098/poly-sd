import { describe, it, expect } from 'vitest'
import { computeUnlockedTiers } from '@/lib/campaign/tierUnlock'
import type { Challenge } from '@/lib/challenges/types'

function makeChallenge(id: string, tier: 0 | 1 | 2 | 3 | 4 | 5): Challenge {
  return {
    id,
    tier,
    order: 0,
    title: id,
    narrative: '',
    objective: '',
    trafficConfig: { durationMs: 60_000, waypoints: [] },
    slaTargets: { p99LatencyMs: 200, errorRate: 0.01 },
    budgetPerHour: 1.0,
    allowedComponents: 'all',
    conceptsTaught: [],
    hints: [],
  }
}

const CHALLENGES: Challenge[] = [
  makeChallenge('t0-a', 0),
  makeChallenge('t0-b', 0),
  makeChallenge('t1-a', 1),
  makeChallenge('t1-b', 1),
  makeChallenge('t2-a', 2),
]

function passedMap(...ids: string[]): Map<string, { passed: boolean }> {
  return new Map(ids.map((id) => [id, { passed: true }]))
}

describe('computeUnlockedTiers', () => {
  it('always unlocks tier 0', () => {
    const result = computeUnlockedTiers(CHALLENGES, new Map())
    expect(result.has(0)).toBe(true)
  })

  it('locks tier 1 when no tier-0 challenges are passed', () => {
    const result = computeUnlockedTiers(CHALLENGES, new Map())
    expect(result.has(1)).toBe(false)
  })

  it('locks tier 1 when only some tier-0 challenges are passed', () => {
    const result = computeUnlockedTiers(CHALLENGES, passedMap('t0-a'))
    expect(result.has(1)).toBe(false)
  })

  it('unlocks tier 1 when all tier-0 challenges are passed', () => {
    const result = computeUnlockedTiers(CHALLENGES, passedMap('t0-a', 't0-b'))
    expect(result.has(1)).toBe(true)
  })

  it('locks tier 2 even when tier 1 passes if tier 0 is not fully passed', () => {
    const result = computeUnlockedTiers(CHALLENGES, passedMap('t1-a', 't1-b'))
    expect(result.has(1)).toBe(false)
    expect(result.has(2)).toBe(false)
  })

  it('locks tier 2 when tier 1 is not fully passed', () => {
    const result = computeUnlockedTiers(CHALLENGES, passedMap('t0-a', 't0-b', 't1-a'))
    expect(result.has(1)).toBe(true)
    expect(result.has(2)).toBe(false)
  })

  it('unlocks tier 2 when tiers 0 and 1 are fully passed', () => {
    const result = computeUnlockedTiers(CHALLENGES, passedMap('t0-a', 't0-b', 't1-a', 't1-b'))
    expect(result.has(2)).toBe(true)
  })

  it('does not skip tiers — tier 3 stays locked if tier 2 has no challenges passed', () => {
    const result = computeUnlockedTiers(CHALLENGES, passedMap('t0-a', 't0-b', 't1-a', 't1-b'))
    // tier 2 has challenges but none passed
    expect(result.has(3)).toBe(false)
  })

  it('returns only tier 0 for an empty challenge list', () => {
    const result = computeUnlockedTiers([], new Map())
    expect(result).toEqual(new Set([0]))
  })

  it('failed completions (passed: false) do not count toward unlock', () => {
    const map = new Map<string, { passed: boolean }>([
      ['t0-a', { passed: false }],
      ['t0-b', { passed: true }],
    ])
    const result = computeUnlockedTiers(CHALLENGES, map)
    expect(result.has(1)).toBe(false)
  })
})
