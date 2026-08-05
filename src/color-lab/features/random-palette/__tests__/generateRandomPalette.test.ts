import { describe, expect, it } from 'vitest'
import { rgbToOklch } from '@/shared/color'
import { generateVariedRandomPalette } from '../generateRandomPalette'
import { RANDOM_ARCHETYPES } from '../archetypes'
import type { RandomPaletteOptions } from '../types'

const ARCHETYPE_IDS = new Set(RANDOM_ARCHETYPES.map((a) => a.id))
const HEX_PATTERN = /^#[0-9a-f]{6}$/i

function baseOptions(overrides: Partial<RandomPaletteOptions> = {}): RandomPaletteOptions {
  return {
    size: 5,
    intensity: 'balanced',
    temperature: 'any',
    contrast: 'mixed',
    includeNeutral: true,
    seed: 1,
    ...overrides,
  }
}

describe('generateVariedRandomPalette', () => {
  it('always selects a real internal archetype, never unconstrained random hex', () => {
    for (let seed = 0; seed < 30; seed++) {
      const result = generateVariedRandomPalette(baseOptions({ seed }), [])
      expect(ARCHETYPE_IDS.has(result.archetypeId)).toBe(true)
    }
  })

  it('only produces valid, non-duplicate hex colors', () => {
    for (let seed = 0; seed < 20; seed++) {
      const result = generateVariedRandomPalette(baseOptions({ seed, size: 6 }), [])
      expect(result.colors).toHaveLength(6)
      for (const color of result.colors) {
        expect(color.hex).toMatch(HEX_PATTERN)
      }
      const hexes = new Set(result.colors.map((c) => c.hex))
      expect(hexes.size).toBe(result.colors.length)
    }
  })

  it('respects temperature: warm never resolves to a cool-only archetype', () => {
    for (let seed = 0; seed < 30; seed++) {
      const result = generateVariedRandomPalette(baseOptions({ seed, temperature: 'warm' }), [])
      expect(result.resolvedFamily.warmth).not.toBe('cool')
    }
  })

  it('respects temperature: cool never resolves to a warm-only archetype', () => {
    for (let seed = 0; seed < 30; seed++) {
      const result = generateVariedRandomPalette(baseOptions({ seed, temperature: 'cool' }), [])
      expect(result.resolvedFamily.warmth).not.toBe('warm')
    }
  })

  it('respects includeNeutral: false by dropping neutral anchors from the resolved family', () => {
    for (let seed = 0; seed < 15; seed++) {
      const result = generateVariedRandomPalette(baseOptions({ seed, includeNeutral: false }), [])
      expect(result.resolvedFamily.anchors.every((a) => !a.role.startsWith('neutral'))).toBe(true)
    }
  })

  it('respects intensity: vibrant produces higher average chroma than soft', () => {
    const averageChroma = (intensity: 'soft' | 'vibrant') => {
      let total = 0
      let count = 0
      for (let seed = 0; seed < 15; seed++) {
        const result = generateVariedRandomPalette(baseOptions({ seed, intensity }), [])
        for (const color of result.colors) {
          total += rgbToOklch(color.rgb).c
          count++
        }
      }
      return total / count
    }
    expect(averageChroma('vibrant')).toBeGreaterThan(averageChroma('soft'))
  })

  it('respects contrast: bold produces a wider lightness spread than gentle', () => {
    const averageSpread = (contrast: 'gentle' | 'bold') => {
      let total = 0
      let count = 0
      for (let seed = 0; seed < 15; seed++) {
        const result = generateVariedRandomPalette(baseOptions({ seed, contrast, size: 6 }), [])
        const lightnesses = result.colors.map((c) => rgbToOklch(c.rgb).l)
        total += Math.max(...lightnesses) - Math.min(...lightnesses)
        count++
      }
      return total / count
    }
    expect(averageSpread('bold')).toBeGreaterThan(averageSpread('gentle'))
  })
})
