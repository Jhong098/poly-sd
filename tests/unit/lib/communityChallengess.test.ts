import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted spies ──────────────────────────────────────────────────────────────

const { mockAuth, mockQueryResult } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  // Controls what the awaited query chain resolves to
  mockQueryResult: vi.fn(),
}))

// ── Module mocks ───────────────────────────────────────────────────────────────

vi.mock('@clerk/nextjs/server', () => ({ auth: mockAuth }))
vi.mock('@/lib/config', () => ({ TUTORIAL_CHALLENGE_IDS: ['T-0', 'T-1', 'T-2', 'T-3'] }))

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from: () => {
      // Build a fluent chain where every method returns a thenable.
      // The thenable delegates to mockQueryResult so tests can control the result.
      const chain = {
        select:  () => chain,
        eq:      () => chain,
        in:      () => chain,
        order:   () => chain,
        range:   () => chain,
        single:  mockQueryResult,
        then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
          mockQueryResult().then(resolve, reject),
      }
      return chain
    },
    rpc: vi.fn().mockResolvedValue({ error: null }),
  }),
}))

import { getMyAuthoredChallenges, getCommunityChallengeTitles } from '@/lib/actions/community-challenges'

// ── Tests — getMyAuthoredChallenges ───────────────────────────────────────────

describe('getMyAuthoredChallenges', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ userId: 'user-abc' })
    mockQueryResult.mockResolvedValue({ data: [], error: null })
  })

  it('returns empty array when not authenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null })
    expect(await getMyAuthoredChallenges()).toEqual([])
  })

  it('returns authored challenges with correct shape', async () => {
    mockQueryResult.mockResolvedValue({
      data: [
        { id: 'uuid-1', title: 'My First Challenge', tier: 1, attempt_count: 10, pass_count: 5, upvote_count: 3, status: 'published', published_at: '2026-04-01T00:00:00Z' },
        { id: 'uuid-2', title: 'Hard One', tier: 3, attempt_count: 2, pass_count: 0, upvote_count: 0, status: 'published', published_at: '2026-03-15T00:00:00Z' },
      ],
      error: null,
    })
    const result = await getMyAuthoredChallenges()
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ id: 'uuid-1', title: 'My First Challenge', attempt_count: 10, pass_count: 5, upvote_count: 3 })
    expect(result[1]).toMatchObject({ id: 'uuid-2', title: 'Hard One' })
  })

  it('returns empty array when user has no authored challenges', async () => {
    mockQueryResult.mockResolvedValue({ data: [], error: null })
    expect(await getMyAuthoredChallenges()).toEqual([])
  })

  it('returns empty array on DB error', async () => {
    mockQueryResult.mockResolvedValue({ data: null, error: { message: 'DB error' } })
    expect(await getMyAuthoredChallenges()).toEqual([])
  })
})

// ── Tests — getCommunityChallengeTitles ───────────────────────────────────────

describe('getCommunityChallengeTitles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockQueryResult.mockResolvedValue({ data: [], error: null })
  })

  it('returns empty map for empty input without hitting the DB', async () => {
    const result = await getCommunityChallengeTitles([])
    expect(result).toEqual({})
    expect(mockQueryResult).not.toHaveBeenCalled()
  })

  it('maps UUIDs to titles', async () => {
    mockQueryResult.mockResolvedValue({
      data: [{ id: 'uuid-1', title: 'First' }, { id: 'uuid-2', title: 'Second' }],
      error: null,
    })
    const result = await getCommunityChallengeTitles(['uuid-1', 'uuid-2'])
    expect(result).toEqual({ 'uuid-1': 'First', 'uuid-2': 'Second' })
  })

  it('returns empty map on DB error', async () => {
    mockQueryResult.mockResolvedValue({ data: null, error: { message: 'fail' } })
    expect(await getCommunityChallengeTitles(['uuid-1'])).toEqual({})
  })
})
