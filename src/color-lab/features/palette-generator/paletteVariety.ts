import { createSeededRandom } from '@/shared/lib/random'
import { generatePalette, selectFamily } from './generatePalette'
import { MOOD_PROFILES } from './moodProfiles'
import { isTooSimilar, paletteSimilarity } from './paletteSimilarity'
import type { PaletteHistoryEntry } from './store/usePaletteHistoryStore'
import type { GeneratedColor, PaletteGeneratorOptions } from './types'

/** Below this composite similarity score, a candidate is considered "too close" to a recent palette — see docs/algorithms.md for what feeds the score. */
export const SIMILARITY_THRESHOLD = 0.05
const MAX_VARIETY_ATTEMPTS = 8
/** Large prime offset so successive attempt seeds don't correlate. */
const SEED_STRIDE = 104729

/** Dev-only introspection into how a result was picked — never shown to normal users, see docs/algorithms.md. */
export interface VarietyDiagnostics {
  seed: number
  /** How many candidates were rejected as too similar before this one was accepted (0 = accepted on the first try). */
  retryCount: number
  /** This candidate's similarity score against its nearest recent palette (lower = more similar). `null` when there was no history to compare against. */
  similarityScore: number | null
  /** True if every attempt was rejected and the least-similar candidate seen was used as a fallback. */
  exhaustedRetries: boolean
}

export interface VariedPaletteResult {
  colors: GeneratedColor[]
  familyId: string
  familyLabel: string
  diagnostics: VarietyDiagnostics
}

/**
 * Generates a palette that (a) belongs to a family of the given mood and
 * (b) isn't too perceptually similar to any recently generated palette.
 * Each attempt re-seeds, which re-picks the family too (families recently
 * used are downweighted) — see docs/algorithms.md. Always terminates:
 * after MAX_VARIETY_ATTEMPTS, the least-similar candidate seen is returned.
 */
export function generateVariedPalette(
  baseOptions: Omit<PaletteGeneratorOptions, 'seed' | 'familyId' | 'recentFamilyIds'>,
  seedBase: number,
  recentPalettes: PaletteHistoryEntry[],
): VariedPaletteResult {
  const profile = MOOD_PROFILES[baseOptions.mood]
  const recentFamilyIds = recentPalettes.map((entry) => entry.familyId)
  const recentColorSets = recentPalettes.map((entry) => entry.colors)

  let best: { colors: GeneratedColor[]; familyId: string; familyLabel: string; seed: number; similarityScore: number } | null = null
  let bestMinDistance = -Infinity

  for (let attempt = 0; attempt < MAX_VARIETY_ATTEMPTS; attempt++) {
    const seed = seedBase + attempt * SEED_STRIDE
    const family = selectFamily(profile, createSeededRandom(seed), recentFamilyIds)
    const colors = generatePalette({ ...baseOptions, seed, familyId: family.id })

    if (recentColorSets.length === 0) {
      return {
        colors,
        familyId: family.id,
        familyLabel: family.label,
        diagnostics: { seed, retryCount: attempt, similarityScore: null, exhaustedRetries: false },
      }
    }

    const minDistance = Math.min(...recentColorSets.map((recent) => paletteSimilarity(colors, recent)))

    if (!isTooSimilar(colors, recentColorSets, SIMILARITY_THRESHOLD)) {
      return {
        colors,
        familyId: family.id,
        familyLabel: family.label,
        diagnostics: { seed, retryCount: attempt, similarityScore: minDistance, exhaustedRetries: false },
      }
    }

    if (minDistance > bestMinDistance) {
      bestMinDistance = minDistance
      best = { colors, familyId: family.id, familyLabel: family.label, seed, similarityScore: minDistance }
    }
  }

  if (best) {
    return {
      colors: best.colors,
      familyId: best.familyId,
      familyLabel: best.familyLabel,
      diagnostics: {
        seed: best.seed,
        retryCount: MAX_VARIETY_ATTEMPTS,
        similarityScore: best.similarityScore,
        exhaustedRetries: true,
      },
    }
  }

  const fallbackFamily = profile.families[0]
  return {
    colors: generatePalette({ ...baseOptions, seed: seedBase, familyId: fallbackFamily.id }),
    familyId: fallbackFamily.id,
    familyLabel: fallbackFamily.label,
    diagnostics: { seed: seedBase, retryCount: MAX_VARIETY_ATTEMPTS, similarityScore: null, exhaustedRetries: true },
  }
}
