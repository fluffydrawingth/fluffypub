import { describe, expect, it } from 'vitest'
import { deltaEOk, rgbToOklab, rgbToOklch } from '@/shared/color'
import { generateFromFamily, isHueInAnyWindow } from '@/features/palette-generator'
import { RANDOM_ARCHETYPES, rotateArchetype } from '../archetypes'

const NEUTRAL_CHROMA = 0.04
const SIZES = [4, 5, 6, 8] as const
const SEEDS = [1, 2, 3, 4, 5]

describe('RANDOM_ARCHETYPES', () => {
  it('has 18 archetypes with unique ids', () => {
    expect(RANDOM_ARCHETYPES).toHaveLength(18)
    expect(new Set(RANDOM_ARCHETYPES.map((a) => a.id)).size).toBe(18)
  })

  for (const archetype of RANDOM_ARCHETYPES) {
    describe(`archetype: ${archetype.id}`, () => {
      for (const size of SIZES) {
        for (const seed of SEEDS) {
          it(`generates ${size} valid, non-duplicate colors inside its hue windows (seed ${seed})`, () => {
            const colors = generateFromFamily(archetype, { size, seed })
            expect(colors).toHaveLength(size)

            const oklabs = colors.map((c) => rgbToOklab(c.rgb))
            for (let i = 0; i < oklabs.length; i++) {
              for (let j = i + 1; j < oklabs.length; j++) {
                expect(deltaEOk(oklabs[i], oklabs[j])).toBeGreaterThan(0.015)
              }
            }

            for (const color of colors) {
              expect(color.hex).toMatch(/^#[0-9a-f]{6}$/i)
              const oklch = rgbToOklch(color.rgb)
              if (oklch.c < NEUTRAL_CHROMA) continue
              expect(isHueInAnyWindow(oklch.h, archetype.hueWindows)).toBe(true)
            }
          })
        }
      }
    })
  }

  it('rotating a rotatable archetype shifts every anchor and window hue by the same amount', () => {
    const archetype = RANDOM_ARCHETYPES.find((a) => a.rotatable)
    if (!archetype) throw new Error('expected at least one rotatable archetype')
    const rotated = rotateArchetype(archetype, 90)
    expect(rotated.anchors[0].h).toBe((archetype.anchors[0].h + 90) % 360)
    expect(rotated.hueWindows[0].start).toBe((archetype.hueWindows[0].start + 90) % 360)
  })

  it('generating a rotated archetype still keeps chromatic colors inside its (rotated) windows', () => {
    const archetype = RANDOM_ARCHETYPES.find((a) => a.rotatable)
    if (!archetype) throw new Error('expected at least one rotatable archetype')
    for (const degrees of [0, 45, 90, 135, 180, 225, 270, 315]) {
      const rotated = rotateArchetype(archetype, degrees)
      const colors = generateFromFamily(rotated, { size: 6, seed: 42 })
      for (const color of colors) {
        const oklch = rgbToOklch(color.rgb)
        if (oklch.c < NEUTRAL_CHROMA) continue
        expect(isHueInAnyWindow(oklch.h, rotated.hueWindows)).toBe(true)
      }
    }
  })
})
