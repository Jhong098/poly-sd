import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { EvalResult } from '@/lib/challenges/types'

// ── Hoisted spies (must be available when vi.mock() factories run) ─────────────

const {
  mockAuth,
  mockGetOrCreateProfile,
  mockCompletionSingle,
  mockUpsert,
  mockProfileSingle,
  mockUpdateEq,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockGetOrCreateProfile: vi.fn(),
  mockCompletionSingle: vi.fn(),
  mockUpsert: vi.fn(),
  mockProfileSingle: vi.fn(),
  mockUpdateEq: vi.fn(),
}))

// ── Module mocks ───────────────────────────────────────────────────────────────

vi.mock('@clerk/nextjs/server', () => ({ auth: mockAuth }))
vi.mock('@/lib/actions/profile', () => ({ getOrCreateProfile: mockGetOrCreateProfile }))
vi.mock('@/lib/challenges/definitions', () => ({
  CHALLENGE_MAP: new Map([['ch-1', { id: 'ch-1', tier: 1 }]]),
}))
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => {
    // Each table needs a fluent chain. Methods return `this` so they can be
    // chained arbitrarily; leaf methods resolve with the configured values.
    const completionsChain: Record<string, unknown> = {
      select: () => completionsChain,
      eq: () => completionsChain,
      single: mockCompletionSingle,
      upsert: mockUpsert,
    }
    const profileChain: Record<string, unknown> = {
      select: () => profileChain,
      eq: () => profileChain,
      single: mockProfileSingle,
      update: () => ({ eq: mockUpdateEq }),
    }
    return {
      from: (table: string) =>
        table === 'profiles' ? profileChain : completionsChain,
    }
  },
}))

import { recordCompletion } from '@/lib/actions/completions'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeResult(passed: boolean, total: number): EvalResult {
  return {
    passed,
    passedLatency: passed,
    passedErrors: passed,
    passedBudget: passed,
    metrics: { p99LatencyMs: 100, errorRate: 0.001, costPerHour: 0.5, componentCount: 3 },
    scores: { performance: 80, cost: 70, simplicity: 90, resilience: 0, total },
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('recordCompletion — fail then succeed (issue #1)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ userId: 'user-123' })
    mockGetOrCreateProfile.mockResolvedValue(undefined)
    mockUpsert.mockResolvedValue({ error: null })
    mockUpdateEq.mockResolvedValue({ error: null })
    mockProfileSingle.mockResolvedValue({ data: { xp: 0 } })
  })

  it('persists successful attempt even when prior failure had a higher score', async () => {
    // Reproduce issue #1: failed attempt scores 80, passing attempt scores 75.
    // The old code skipped upsert when existingScore >= newScore, regardless of
    // whether the existing record had passed. This meant a successful attempt
    // after a high-scoring failure was silently dropped.
    mockCompletionSingle.mockResolvedValue({
      data: { id: 'row-1', score: 80, passed: false },
    })

    await recordCompletion('ch-1', makeResult(true, 75), [], [])

    expect(mockUpsert).toHaveBeenCalledOnce()
    const [payload] = mockUpsert.mock.calls[0] as [Record<string, unknown>][]
    expect(payload.passed).toBe(true)
    expect(payload.score).toBe(75)
  })

  it('persists successful attempt when prior failure had a lower score', async () => {
    mockCompletionSingle.mockResolvedValue({
      data: { id: 'row-1', score: 40, passed: false },
    })

    await recordCompletion('ch-1', makeResult(true, 75), [], [])

    expect(mockUpsert).toHaveBeenCalledOnce()
    const [payload] = mockUpsert.mock.calls[0] as [Record<string, unknown>][]
    expect(payload.passed).toBe(true)
  })

  it('does not overwrite a passed record with a lower-scoring pass', async () => {
    mockCompletionSingle.mockResolvedValue({
      data: { id: 'row-1', score: 90, passed: true },
    })

    await recordCompletion('ch-1', makeResult(true, 75), [], [])

    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('overwrites a passed record when a new pass has a higher score', async () => {
    mockCompletionSingle.mockResolvedValue({
      data: { id: 'row-1', score: 60, passed: true },
    })

    await recordCompletion('ch-1', makeResult(true, 80), [], [])

    expect(mockUpsert).toHaveBeenCalledOnce()
    const [payload] = mockUpsert.mock.calls[0] as [Record<string, unknown>][]
    expect(payload.score).toBe(80)
  })

  it('awards XP on first pass after a prior failure', async () => {
    mockCompletionSingle.mockResolvedValue({
      data: { id: 'row-1', score: 80, passed: false },
    })

    await recordCompletion('ch-1', makeResult(true, 75), [], [])

    // XP should have been updated (tier 1, score 75 → 75 base + 15 bonus = 90)
    expect(mockUpdateEq).toHaveBeenCalledOnce()
  })

  it('does not persist for guest users (no userId)', async () => {
    mockAuth.mockResolvedValue({ userId: null })

    await recordCompletion('ch-1', makeResult(true, 75), [], [])

    expect(mockUpsert).not.toHaveBeenCalled()
  })
})
