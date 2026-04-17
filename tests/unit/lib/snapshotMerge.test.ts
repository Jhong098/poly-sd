import { mergeSnapshotMap } from '@/lib/store/snapshotMerge'

type FlatEntry = Record<string, unknown> & { id: string }

describe('mergeSnapshotMap', () => {
  it('reuses the same reference when values have not changed', () => {
    const prev = { 'node-1': { id: 'node-1', inputRps: 100, outputRps: 95 } }
    const next = [{ id: 'node-1', inputRps: 100, outputRps: 95 }]

    const result = mergeSnapshotMap(prev, next)

    expect(result['node-1']).toBe(prev['node-1'])
  })

  it('uses a new reference when a value has changed', () => {
    const prev = { 'node-1': { id: 'node-1', inputRps: 100, outputRps: 95 } }
    const next = [{ id: 'node-1', inputRps: 200, outputRps: 190 }]

    const result = mergeSnapshotMap(prev, next)

    expect(result['node-1']).not.toBe(prev['node-1'])
    expect(result['node-1'].inputRps).toBe(200)
  })

  it('uses new entry reference when id is not in previous state', () => {
    const prev: Record<string, FlatEntry> = {}
    const next = [{ id: 'node-1', inputRps: 100, outputRps: 95 }]

    const result = mergeSnapshotMap(prev, next)

    expect(result['node-1']).toBe(next[0])
  })

  it('handles optional fields: reuses reference when optional field is absent in both', () => {
    const prev = { 'node-1': { id: 'node-1', inputRps: 100, replicaCount: undefined } }
    const next = [{ id: 'node-1', inputRps: 100, replicaCount: undefined }]

    const result = mergeSnapshotMap(prev, next)

    expect(result['node-1']).toBe(prev['node-1'])
  })

  it('uses new reference when optional field changes from absent to present', () => {
    const prev = { 'node-1': { id: 'node-1', inputRps: 100, replicaCount: undefined } }
    const next = [{ id: 'node-1', inputRps: 100, replicaCount: 3 }]

    const result = mergeSnapshotMap(prev, next)

    expect(result['node-1']).not.toBe(prev['node-1'])
    expect(result['node-1'].replicaCount).toBe(3)
  })

  it('handles mixed unchanged and changed entries independently', () => {
    const prev = {
      'node-1': { id: 'node-1', inputRps: 100 },
      'node-2': { id: 'node-2', inputRps: 50 },
    }
    const next = [
      { id: 'node-1', inputRps: 100 }, // unchanged
      { id: 'node-2', inputRps: 75 },  // changed
    ]

    const result = mergeSnapshotMap(prev, next)

    expect(result['node-1']).toBe(prev['node-1'])
    expect(result['node-2']).not.toBe(prev['node-2'])
    expect(result['node-2'].inputRps).toBe(75)
  })
})
