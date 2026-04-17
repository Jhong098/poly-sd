/**
 * Merges a new array of snapshot entries into a previous map, reusing the
 * existing object reference when all values are identical. This keeps
 * selector-based subscribers (e.g. useSimStore(s => s.nodeSnapshots[id]))
 * stable across ticks where a node's data hasn't actually changed.
 */
export function mergeSnapshotMap<T extends Record<string, unknown> & { id: string }>(
  prev: Record<string, T>,
  next: T[]
): Record<string, T> {
  const result: Record<string, T> = {}
  for (const item of next) {
    const existing = prev[item.id]
    result[item.id] = existing !== undefined && shallowEqual(existing, item) ? existing : item
  }
  return result
}

function shallowEqual<T extends Record<string, unknown>>(a: T, b: T): boolean {
  const keysA = Object.keys(a) as (keyof T)[]
  if (keysA.length !== Object.keys(b).length) return false
  for (const key of keysA) {
    if (a[key] !== b[key]) return false
  }
  return true
}
