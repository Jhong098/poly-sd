// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'

// ── Hoisted spies ──────────────────────────────────────────────────────────────

const { mockWriteLocalDraft, mockSubscribe } = vi.hoisted(() => ({
  mockWriteLocalDraft: vi.fn(),
  mockSubscribe: vi.fn(),
}))

// ── Module mocks ───────────────────────────────────────────────────────────────

vi.mock('@/lib/draft', () => ({ writeLocalDraft: mockWriteLocalDraft }))

vi.mock('@/lib/store/architectureStore', () => ({
  useArchitectureStore: { subscribe: mockSubscribe },
}))

import { DraftSaver } from '@/components/canvas/DraftSaver'

// ── Helpers ────────────────────────────────────────────────────────────────────

function renderDraftSaver() {
  return render(<DraftSaver challengeId="ch-1" userId="user-123" />)
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('DraftSaver', () => {
  let unsubscribe: ReturnType<typeof vi.fn>
  let capturedCallback: (state: { nodes: unknown[]; edges: unknown[] }) => void

  beforeEach(() => {
    vi.useFakeTimers()
    unsubscribe = vi.fn()
    mockSubscribe.mockImplementation((cb: typeof capturedCallback) => {
      capturedCallback = cb
      return unsubscribe
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('subscribes to the architecture store on mount', () => {
    renderDraftSaver()
    expect(mockSubscribe).toHaveBeenCalledOnce()
  })

  it('calls writeLocalDraft after 1500 ms debounce when store changes', () => {
    renderDraftSaver()
    const state = { nodes: [{ id: 'n1' }], edges: [] }

    act(() => { capturedCallback(state) })
    expect(mockWriteLocalDraft).not.toHaveBeenCalled()

    act(() => { vi.advanceTimersByTime(1500) })
    expect(mockWriteLocalDraft).toHaveBeenCalledOnce()
    expect(mockWriteLocalDraft).toHaveBeenCalledWith('user-123', 'ch-1', state.nodes, state.edges)
  })

  it('resets the timer on rapid successive changes (trailing debounce)', () => {
    renderDraftSaver()
    const state1 = { nodes: [{ id: 'n1' }], edges: [] }
    const state2 = { nodes: [{ id: 'n1' }, { id: 'n2' }], edges: [] }

    act(() => {
      capturedCallback(state1)
      vi.advanceTimersByTime(500)
      capturedCallback(state2)
      vi.advanceTimersByTime(500)
    })
    // Neither 500ms window has elapsed since the last call
    expect(mockWriteLocalDraft).not.toHaveBeenCalled()

    act(() => { vi.advanceTimersByTime(1000) })
    expect(mockWriteLocalDraft).toHaveBeenCalledOnce()
    expect(mockWriteLocalDraft).toHaveBeenCalledWith('user-123', 'ch-1', state2.nodes, state2.edges)
  })

  it('unsubscribes and cancels the pending timer on unmount', () => {
    const { unmount } = renderDraftSaver()
    act(() => { capturedCallback({ nodes: [], edges: [] }) })

    unmount()
    act(() => { vi.advanceTimersByTime(1500) })

    expect(unsubscribe).toHaveBeenCalledOnce()
    expect(mockWriteLocalDraft).not.toHaveBeenCalled()
  })
})
