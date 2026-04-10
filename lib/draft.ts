import type { ComponentNode, ComponentEdge } from '@/lib/store/architectureStore'

type LocalDraft = {
  nodes: ComponentNode[]
  edges: ComponentEdge[]
  savedAt: string  // ISO string
}

function draftKey(userId: string, challengeId: string) {
  return `draft:${userId}:${challengeId}`
}

export function readLocalDraft(userId: string, challengeId: string): LocalDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(userId, challengeId))
    return raw ? (JSON.parse(raw) as LocalDraft) : null
  } catch {
    return null
  }
}

export function writeLocalDraft(
  userId: string,
  challengeId: string,
  nodes: ComponentNode[],
  edges: ComponentEdge[],
): void {
  try {
    const draft: LocalDraft = { nodes, edges, savedAt: new Date().toISOString() }
    localStorage.setItem(draftKey(userId, challengeId), JSON.stringify(draft))
  } catch {
    // Storage quota exceeded or SSR — ignore
  }
}

export function clearLocalDraft(userId: string, challengeId: string): void {
  try {
    localStorage.removeItem(draftKey(userId, challengeId))
  } catch {
    // ignore
  }
}
