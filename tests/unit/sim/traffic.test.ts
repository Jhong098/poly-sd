import { describe, it, expect } from 'vitest'
import { sampleWaypoints, sampleSortedWaypoints, sampleClientPreset } from '@/sim/traffic'

// ── sampleWaypoints ──────────────────────────────────────────────────────────

describe('sampleWaypoints', () => {
  it('returns 0 for empty waypoints', () => {
    expect(sampleWaypoints([], 0)).toBe(0)
    expect(sampleWaypoints([], 30_000)).toBe(0)
  })

  it('returns single waypoint rps regardless of time', () => {
    const wps = [{ timeMs: 5_000, rps: 100 }]
    expect(sampleWaypoints(wps, 0)).toBe(100)
    expect(sampleWaypoints(wps, 50_000)).toBe(100)
  })

  it('clamps to first waypoint when before start', () => {
    const wps = [{ timeMs: 5_000, rps: 100 }, { timeMs: 60_000, rps: 200 }]
    expect(sampleWaypoints(wps, 0)).toBe(100)
    expect(sampleWaypoints(wps, 1_000)).toBe(100)
  })

  it('clamps to last waypoint when after end', () => {
    const wps = [{ timeMs: 0, rps: 100 }, { timeMs: 60_000, rps: 200 }]
    expect(sampleWaypoints(wps, 90_000)).toBe(200)
  })

  it('linearly interpolates at the exact midpoint', () => {
    const wps = [{ timeMs: 0, rps: 100 }, { timeMs: 60_000, rps: 200 }]
    expect(sampleWaypoints(wps, 30_000)).toBeCloseTo(150, 5)
  })

  it('linearly interpolates at 25% through a segment', () => {
    const wps = [{ timeMs: 0, rps: 0 }, { timeMs: 40_000, rps: 400 }]
    expect(sampleWaypoints(wps, 10_000)).toBeCloseTo(100, 5)
  })

  it('handles unsorted waypoints (sorts before interpolating)', () => {
    const wps = [{ timeMs: 60_000, rps: 200 }, { timeMs: 0, rps: 100 }]
    expect(sampleWaypoints(wps, 30_000)).toBeCloseTo(150, 5)
  })

  it('picks the correct segment with three waypoints', () => {
    const wps = [
      { timeMs: 0,      rps: 0 },
      { timeMs: 30_000, rps: 300 },
      { timeMs: 60_000, rps: 0 },
    ]
    expect(sampleWaypoints(wps, 15_000)).toBeCloseTo(150, 5)  // first segment
    expect(sampleWaypoints(wps, 45_000)).toBeCloseTo(150, 5)  // second segment
  })
})

// ── sampleSortedWaypoints ─────────────────────────────────────────────────────

describe('sampleSortedWaypoints', () => {
  it('interpolates at the midpoint of a two-waypoint sorted array', () => {
    const wps = [{ timeMs: 0, rps: 100 }, { timeMs: 60_000, rps: 200 }]
    expect(sampleSortedWaypoints(wps, 30_000)).toBeCloseTo(150, 5)
  })

  it('clamps to first waypoint when before start', () => {
    const wps = [{ timeMs: 5_000, rps: 100 }, { timeMs: 60_000, rps: 200 }]
    expect(sampleSortedWaypoints(wps, 0)).toBe(100)
  })

  it('clamps to last waypoint when after end', () => {
    const wps = [{ timeMs: 0, rps: 100 }, { timeMs: 60_000, rps: 200 }]
    expect(sampleSortedWaypoints(wps, 90_000)).toBe(200)
  })

  it('picks the correct segment with three waypoints', () => {
    const wps = [
      { timeMs: 0,      rps: 0 },
      { timeMs: 30_000, rps: 300 },
      { timeMs: 60_000, rps: 0 },
    ]
    expect(sampleSortedWaypoints(wps, 15_000)).toBeCloseTo(150, 5)
    expect(sampleSortedWaypoints(wps, 45_000)).toBeCloseTo(150, 5)
  })
})

// ── sampleClientPreset ────────────────────────────────────────────────────────

describe('sampleClientPreset', () => {
  const BASE = 100
  const MULT = 5
  const DUR  = 60_000
  const PEAK = BASE * MULT  // 500

  describe('steady', () => {
    it('always returns baseRps at any time', () => {
      expect(sampleClientPreset('steady', BASE, MULT, DUR, 0)).toBe(BASE)
      expect(sampleClientPreset('steady', BASE, MULT, DUR, 30_000)).toBe(BASE)
      expect(sampleClientPreset('steady', BASE, MULT, DUR, DUR)).toBe(BASE)
    })
  })

  describe('spike', () => {
    it('returns baseRps before the spike window (t < 0.38)', () => {
      expect(sampleClientPreset('spike', BASE, MULT, DUR, 0)).toBe(BASE)
      expect(sampleClientPreset('spike', BASE, MULT, DUR, 20_000)).toBe(BASE)
    })

    it('returns baseRps after the spike window (t > 0.62)', () => {
      expect(sampleClientPreset('spike', BASE, MULT, DUR, 59_000)).toBe(BASE)
      expect(sampleClientPreset('spike', BASE, MULT, DUR, DUR)).toBe(BASE)
    })

    it('peaks near baseRps × peakMultiplier at t=0.5 (sin peak)', () => {
      // At t=0.5: spikeT = (0.5 - 0.38) / 0.24 = 0.5, sin(0.5π) = 1
      const val = sampleClientPreset('spike', BASE, MULT, DUR, 30_000)
      expect(val).toBeCloseTo(PEAK, 0)
    })
  })

  describe('ramp', () => {
    it('returns baseRps at t=0', () => {
      expect(sampleClientPreset('ramp', BASE, MULT, DUR, 0)).toBe(BASE)
    })

    it('returns peak at t=1 (full duration)', () => {
      expect(sampleClientPreset('ramp', BASE, MULT, DUR, DUR)).toBe(PEAK)
    })

    it('linearly scales at t=0.5', () => {
      // 100 + (500 - 100) * 0.5 = 300
      expect(sampleClientPreset('ramp', BASE, MULT, DUR, 30_000)).toBeCloseTo(300, 5)
    })
  })
})
