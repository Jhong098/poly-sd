/** XP awarded per challenge completion. */
const TIER_BASE_XP: Record<number, number> = {
  0: 25,   // Tutorial
  1: 75,   // Tier 1
  2: 150,  // Tier 2
  3: 250,  // Tier 3
  4: 400,  // Tier 4
  5: 600,  // Tier 5
}

/** Extra XP for high scores. */
function scoreBonus(score: number): number {
  if (score >= 90) return 30
  if (score >= 75) return 15
  if (score >= 50) return 5
  return 0
}

export function xpForCompletion(tier: number, score: number): number {
  const base = TIER_BASE_XP[tier] ?? 50
  return base + scoreBonus(score)
}

// ── Architect Level ───────────────────────────────────────────────────────────

const LEVEL_THRESHOLDS = [
  { level: 1, xp: 0,    title: 'Junior Engineer' },
  { level: 2, xp: 100,  title: 'Software Engineer' },
  { level: 3, xp: 300,  title: 'Senior Engineer' },
  { level: 4, xp: 700,  title: 'Staff Engineer' },
  { level: 5, xp: 1400, title: 'Principal Engineer' },
  { level: 6, xp: 2500, title: 'Distinguished Engineer' },
]

export type ArchitectLevel = {
  level: number
  title: string
  currentXp: number
  nextLevelXp: number | null  // null = max level
  progress: number            // 0–1 fraction toward next level
}

export function computeLevel(totalXp: number): ArchitectLevel {
  let current = LEVEL_THRESHOLDS[0]
  for (const threshold of LEVEL_THRESHOLDS) {
    if (totalXp >= threshold.xp) current = threshold
    else break
  }

  const idx = LEVEL_THRESHOLDS.indexOf(current)
  const next = LEVEL_THRESHOLDS[idx + 1] ?? null

  const rangeStart = current.xp
  const rangeEnd = next?.xp ?? rangeStart + 1000
  const progress = Math.min((totalXp - rangeStart) / (rangeEnd - rangeStart), 1)

  return {
    level: current.level,
    title: current.title,
    currentXp: totalXp,
    nextLevelXp: next?.xp ?? null,
    progress,
  }
}
