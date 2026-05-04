import { describe, it, expect } from 'vitest'
import { xpForCompletion, computeLevel } from '@/lib/xp'

// ── xpForCompletion ───────────────────────────────────────────────────────────

describe('xpForCompletion', () => {
  it('awards tier base + 0 bonus for score below 50', () => {
    expect(xpForCompletion(1, 40)).toBe(75)
  })

  it('awards tier base + 5 bonus for score in [50, 74]', () => {
    expect(xpForCompletion(1, 50)).toBe(80)
    expect(xpForCompletion(1, 74)).toBe(80)
  })

  it('awards tier base + 15 bonus for score in [75, 89]', () => {
    expect(xpForCompletion(1, 75)).toBe(90)
    expect(xpForCompletion(1, 89)).toBe(90)
  })

  it('awards tier base + 30 bonus for score >= 90', () => {
    expect(xpForCompletion(1, 90)).toBe(105)
    expect(xpForCompletion(1, 100)).toBe(105)
  })

  it('uses 50 XP base for unknown tiers', () => {
    expect(xpForCompletion(99, 0)).toBe(50)
  })

  it('uses correct base for each tier', () => {
    expect(xpForCompletion(0, 0)).toBe(25)
    expect(xpForCompletion(2, 0)).toBe(150)
    expect(xpForCompletion(3, 0)).toBe(250)
    expect(xpForCompletion(4, 0)).toBe(400)
    expect(xpForCompletion(5, 0)).toBe(600)
  })
})

// ── computeLevel ──────────────────────────────────────────────────────────────

describe('computeLevel', () => {
  it('returns Level 1 at 0 XP', () => {
    const r = computeLevel(0)
    expect(r.level).toBe(1)
    expect(r.title).toBe('Junior Engineer')
    expect(r.currentXp).toBe(0)
    expect(r.nextLevelXp).toBe(100)
    expect(r.progress).toBe(0)
  })

  it('returns Level 2 at exactly 100 XP', () => {
    const r = computeLevel(100)
    expect(r.level).toBe(2)
    expect(r.title).toBe('Software Engineer')
    expect(r.nextLevelXp).toBe(300)
    expect(r.progress).toBe(0)
  })

  it('computes fractional progress within a level band', () => {
    // Level 2: 100–300 XP. At 200 XP → 50% through.
    const r = computeLevel(200)
    expect(r.level).toBe(2)
    expect(r.progress).toBeCloseTo(0.5, 5)
  })

  it('returns Level 3 at 300 XP', () => {
    expect(computeLevel(300).level).toBe(3)
    expect(computeLevel(300).title).toBe('Senior Engineer')
  })

  it('returns Level 4 at 700 XP', () => {
    expect(computeLevel(700).level).toBe(4)
  })

  it('returns Level 5 at 1400 XP', () => {
    expect(computeLevel(1400).level).toBe(5)
  })

  it('returns max level (6) at 2500 XP with null nextLevelXp', () => {
    const r = computeLevel(2500)
    expect(r.level).toBe(6)
    expect(r.title).toBe('Distinguished Engineer')
    expect(r.nextLevelXp).toBeNull()
    expect(r.progress).toBe(0)
  })

  it('clamps progress to 1 at max level even with excess XP', () => {
    expect(computeLevel(99999).progress).toBe(1)
    expect(computeLevel(99999).nextLevelXp).toBeNull()
  })
})
