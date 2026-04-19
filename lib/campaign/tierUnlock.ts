import type { Challenge } from '@/lib/challenges/types'

/**
 * Returns the set of tier IDs that are currently unlocked.
 * Tier 0 is always unlocked. Each subsequent tier unlocks only when every
 * challenge in the previous tier has been passed. The chain breaks at the
 * first locked tier so no gaps can form.
 */
export function computeUnlockedTiers(
  challenges: Challenge[],
  completionMap: Map<string, { passed: boolean }>,
  maxTier = 5,
): Set<number> {
  const unlocked = new Set<number>([0])
  for (let t = 1; t <= maxTier; t++) {
    const prevChallenges = challenges.filter((c) => c.tier === t - 1)
    const allPrevPassed = prevChallenges.length > 0 && prevChallenges.every((c) => completionMap.get(c.id)?.passed)
    if (allPrevPassed) unlocked.add(t)
    else break
  }
  return unlocked
}
