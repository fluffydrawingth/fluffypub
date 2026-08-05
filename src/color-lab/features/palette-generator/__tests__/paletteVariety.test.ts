import { describe, expect, it } from 'vitest'
import { MOODS, type Mood } from '../types'
import { generateVariedPalette, SIMILARITY_THRESHOLD } from '../paletteVariety'
import { paletteSimilarity } from '../paletteSimilarity'
import type { PaletteHistoryEntry } from '../store/usePaletteHistoryStore'

const REGENERATE_ROUNDS = 8

function simulateRegenerateSequence(mood: Mood) {
  const history: PaletteHistoryEntry[] = []
  const results = []
  for (let i = 0; i < REGENERATE_ROUNDS; i++) {
    const seed = 1000 + i * 777
    const result = generateVariedPalette({ mood, harmony: 'auto', size: 6 }, seed, history)
    results.push(result)
    history.unshift({ colors: result.colors, familyId: result.familyId })
    if (history.length > 5) history.length = 5
  }
  return results
}

describe('generateVariedPalette', () => {
  it('returns a valid palette with a family id and label for every mood', () => {
    for (const mood of MOODS) {
      const result = generateVariedPalette({ mood, harmony: 'auto', size: 6 }, 42, [])
      expect(result.colors).toHaveLength(6)
      expect(result.familyId.length).toBeGreaterThan(0)
      expect(result.familyLabel.length).toBeGreaterThan(0)
    }
  })

  it('repeated regenerate visits more than one family', () => {
    const results = simulateRegenerateSequence('sweet')
    const distinctFamilies = new Set(results.map((r) => r.familyId))
    expect(distinctFamilies.size).toBeGreaterThan(1)
  })

  it('repeated regenerate keeps consecutive palettes above the similarity threshold on average', () => {
    const results = simulateRegenerateSequence('cozy')
    const distances = results.slice(1).map((result, i) => paletteSimilarity(result.colors, results[i].colors))
    const average = distances.reduce((sum, d) => sum + d, 0) / distances.length
    expect(average).toBeGreaterThanOrEqual(SIMILARITY_THRESHOLD)
  })

  it('never repeats the exact same palette against its own history', () => {
    const results = simulateRegenerateSequence('winter')
    for (let i = 1; i < results.length; i++) {
      const hexesNow = results[i].colors.map((c) => c.hex).join(',')
      const hexesPrev = results[i - 1].colors.map((c) => c.hex).join(',')
      expect(hexesNow).not.toBe(hexesPrev)
    }
  })

  it('still terminates and returns a valid palette when the family pool is tiny (forced similar history)', () => {
    // Pre-fill history with the same family repeatedly to stress the retry loop.
    const first = generateVariedPalette({ mood: 'dreamy', harmony: 'auto', size: 6 }, 1, [])
    const history: PaletteHistoryEntry[] = Array.from({ length: 5 }, () => ({
      colors: first.colors,
      familyId: first.familyId,
    }))
    const result = generateVariedPalette({ mood: 'dreamy', harmony: 'auto', size: 6 }, 2, history)
    expect(result.colors).toHaveLength(6)
    expect(result.familyId.length).toBeGreaterThan(0)
  })
})
