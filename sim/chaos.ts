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
