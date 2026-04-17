import type { ChaosEvent, ChaosType } from './types'

/** Returns the subset of events that are active at simTimeMs. */
export function activeEvents(events: ChaosEvent[], simTimeMs: number): ChaosEvent[] {
  return events.filter(
    (e) => simTimeMs >= e.startSimMs && simTimeMs < e.startSimMs + e.durationMs,
  )
}

/** Find the single most severe active event for a node. */
export function eventForNode(
  events: ChaosEvent[],
  nodeId: string,
  simTimeMs: number,
): ChaosEvent | undefined {
  const active = activeEvents(events, simTimeMs).filter((e) => e.nodeId === nodeId)
  if (active.length === 0) return undefined
  // node-failure takes precedence over everything
  return active.find((e) => e.type === 'node-failure') ?? active[0]
}

/**
 * Build a nodeId → event map for all active events at simTimeMs in a single
 * O(E) pass. Replaces the previous O(nodes × E) pattern of calling
 * eventForNode (which called activeEvents) once per node.
 * node-failure takes precedence over all other event types for the same node.
 */
export function buildChaosMap(
  events: ChaosEvent[],
  simTimeMs: number,
): Record<string, ChaosEvent> {
  const map: Record<string, ChaosEvent> = {}
  for (const evt of events) {
    if (simTimeMs < evt.startSimMs || simTimeMs >= evt.startSimMs + evt.durationMs) continue
    const existing = map[evt.nodeId]
    if (!existing || evt.type === 'node-failure') map[evt.nodeId] = evt
  }
  return map
}

/** Build a ChaosEvent with a generated id. */
export function makeChaosEvent(
  nodeId: string,
  type: ChaosType,
  startSimMs: number,
  durationMs: number,
  magnitude = 5,
): ChaosEvent {
  return { id: `${nodeId}-${type}-${startSimMs}`, nodeId, type, startSimMs, durationMs, magnitude }
}
