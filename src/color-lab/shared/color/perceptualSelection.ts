import { deltaEOk } from './deltaE'
import type { OklabColor } from './types'

export interface SpacingCandidate<T> {
  item: T
  color: OklabColor
  score: number
}

export interface SpacingTraceEntry<T> {
  item: T
  accepted: boolean
  reason?: 'selected' | 'too-close-to-selected'
}

export interface SpacingResult<T> {
  selected: T[]
  trace: SpacingTraceEntry<T>[]
}

/**
 * Greedily picks `count` highest-scoring candidates such that no two selected
 * colors are closer than `minDistance` in OKLab. If the pool is exhausted
 * before reaching `count`, the threshold is relaxed (`* relaxFactor`) and
 * retried, so exactly `count` items are returned whenever
 * `candidates.length >= count` — but the best-spaced combination is always
 * tried first.
 *
 * `preselected` colors count against the distance check but occupy no slots —
 * used for staged selection (e.g. fill remaining slots from a reserve pool
 * while respecting what an earlier stage already picked).
 */
export function pickPerceptuallySpacedWithTrace<T>(
  candidates: SpacingCandidate<T>[],
  count: number,
  minDistance: number,
  relaxFactor = 0.8,
  preselected: OklabColor[] = [],
): SpacingResult<T> {
  const sorted = [...candidates].sort((a, b) => b.score - a.score)
  let threshold = minDistance

  for (let attempt = 0; attempt < 12; attempt++) {
    const selected: SpacingCandidate<T>[] = []
    const trace: SpacingTraceEntry<T>[] = []

    for (const candidate of sorted) {
      const tooClose =
        selected.some((s) => deltaEOk(s.color, candidate.color) < threshold) ||
        preselected.some((p) => deltaEOk(p, candidate.color) < threshold)
      if (tooClose) {
        trace.push({ item: candidate.item, accepted: false, reason: 'too-close-to-selected' })
        continue
      }
      selected.push(candidate)
      trace.push({ item: candidate.item, accepted: true, reason: 'selected' })
      if (selected.length === count) break
    }

    if (selected.length === count || threshold === 0) {
      return { selected: selected.map((s) => s.item), trace }
    }

    threshold *= relaxFactor
    if (threshold < 1e-4) threshold = 0
  }

  // Fallback: threshold relaxed to 0 and still short (fewer candidates than count).
  return {
    selected: sorted.slice(0, count).map((s) => s.item),
    trace: sorted.map((s, i) => ({ item: s.item, accepted: i < count, reason: 'selected' })),
  }
}

export function pickPerceptuallySpaced<T>(
  candidates: SpacingCandidate<T>[],
  count: number,
  minDistance: number,
  relaxFactor = 0.8,
): T[] {
  return pickPerceptuallySpacedWithTrace(candidates, count, minDistance, relaxFactor).selected
}
