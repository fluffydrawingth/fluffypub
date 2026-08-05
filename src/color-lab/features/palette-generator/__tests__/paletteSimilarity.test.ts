import { describe, expect, it } from 'vitest'
import { generatePalette } from '../generatePalette'
import { isTooSimilar, paletteSimilarity } from '../paletteSimilarity'

describe('paletteSimilarity', () => {
  it('is zero for a palette compared to itself', () => {
    const palette = generatePalette({ mood: 'sweet', harmony: 'auto', size: 6, seed: 1 })
    expect(paletteSimilarity(palette, palette)).toBeCloseTo(0, 5)
  })

  it('is low for the same family regenerated with a nearby seed', () => {
    const a = generatePalette({ mood: 'sweet', harmony: 'auto', size: 6, seed: 1, familyId: 'strawberry-cream' })
    const b = generatePalette({ mood: 'sweet', harmony: 'auto', size: 6, seed: 2, familyId: 'strawberry-cream' })
    const distinctFamily = generatePalette({
      mood: 'sweet',
      harmony: 'auto',
      size: 6,
      seed: 1,
      familyId: 'chocolate-cherry',
    })
    // Same family, different seed, should read as more similar than two different families.
    expect(paletteSimilarity(a, b)).toBeLessThan(paletteSimilarity(a, distinctFamily))
  })

  it('is higher for palettes from very different moods', () => {
    const bright = generatePalette({ mood: 'bright', harmony: 'auto', size: 6, seed: 1 })
    const winter = generatePalette({ mood: 'winter', harmony: 'auto', size: 6, seed: 1 })
    const brightAgain = generatePalette({ mood: 'bright', harmony: 'auto', size: 6, seed: 1 })
    expect(paletteSimilarity(bright, brightAgain)).toBeLessThan(paletteSimilarity(bright, winter))
  })

  it('returns Infinity when either palette is empty', () => {
    const palette = generatePalette({ mood: 'cozy', harmony: 'auto', size: 4, seed: 1 })
    expect(paletteSimilarity([], palette)).toBe(Number.POSITIVE_INFINITY)
    expect(paletteSimilarity(palette, [])).toBe(Number.POSITIVE_INFINITY)
  })
})

describe('isTooSimilar', () => {
  it('is true when a candidate matches a recent palette exactly', () => {
    const palette = generatePalette({ mood: 'earthy', harmony: 'auto', size: 5, seed: 1 })
    expect(isTooSimilar(palette, [palette], 0.05)).toBe(true)
  })

  it('is false when no recent palette is close', () => {
    const candidate = generatePalette({ mood: 'bright', harmony: 'auto', size: 6, seed: 1 })
    const recent = [generatePalette({ mood: 'winter', harmony: 'auto', size: 6, seed: 1 })]
    expect(isTooSimilar(candidate, recent, 0.05)).toBe(false)
  })

  it('is false against an empty history', () => {
    const candidate = generatePalette({ mood: 'retro', harmony: 'auto', size: 5, seed: 1 })
    expect(isTooSimilar(candidate, [], 0.05)).toBe(false)
  })
})
