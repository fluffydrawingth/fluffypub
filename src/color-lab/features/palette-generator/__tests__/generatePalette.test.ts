import { describe, expect, it } from 'vitest'
import { deltaEOk, rgbToOklab, rgbToOklch } from '@/shared/color'
import { generatePalette } from '../generatePalette'
import { isHueInAnyWindow, isHueInWindow, MOOD_PROFILES } from '../moodProfiles'
import { MOODS, type Mood } from '../types'

const SEEDS = [7, 123, 9999]
const SIZES = [5, 8] as const

/** Chroma below which a color reads as neutral — hue checks don't apply. */
const NEUTRAL_CHROMA = 0.04
/** Wrapping warm hue range: magenta-red through yellow-green. */
const WARM_WINDOW = { start: 330, end: 130 }

/** All palettes for a mood, pinned family-by-family so bounds can be checked per family. */
function familyPalettes(mood: Mood, familyId: string) {
  return SEEDS.flatMap((seed) =>
    SIZES.map((size) => generatePalette({ mood, harmony: 'auto', size, seed, familyId })),
  )
}

describe('generatePalette — determinism', () => {
  it('is identical for the same seed and varies across regenerate seeds', () => {
    const options = { mood: 'cozy' as const, harmony: 'auto' as const, size: 6 as const, seed: 7 }
    expect(generatePalette(options).map((c) => c.hex)).toEqual(
      generatePalette(options).map((c) => c.hex),
    )
    const other = generatePalette({ ...options, seed: 12345 })
    expect(other).toHaveLength(6)
  })

  it.each([4, 5, 6, 8] as const)('returns exactly %d valid hex colors', (size) => {
    const palette = generatePalette({ mood: 'bright', harmony: 'auto', size, seed: 1 })
    expect(palette).toHaveLength(size)
    for (const color of palette) expect(color.hex).toMatch(/^#[0-9A-F]{6}$/)
  })

  it('pins a specific family via familyId instead of picking randomly', () => {
    const family = MOOD_PROFILES.sweet.families[2]
    const a = generatePalette({ mood: 'sweet', harmony: 'auto', size: 6, seed: 7, familyId: family.id })
    const b = generatePalette({ mood: 'sweet', harmony: 'auto', size: 6, seed: 7, familyId: family.id })
    expect(a.map((c) => c.hex)).toEqual(b.map((c) => c.hex))
  })
})

describe.each(MOODS)('generatePalette — mood rules: %s', (mood) => {
  const profile = MOOD_PROFILES[mood]

  describe.each(profile.families.map((f) => f.id))('family: %s', (familyId) => {
    const family = profile.families.find((f) => f.id === familyId)!

    it('keeps lightness and chroma inside the family bounds', () => {
      for (const palette of familyPalettes(mood, familyId)) {
        for (const color of palette) {
          const oklch = rgbToOklch(color.rgb)
          expect(oklch.l).toBeGreaterThanOrEqual(family.lightnessRange[0] - 0.03)
          expect(oklch.l).toBeLessThanOrEqual(family.lightnessRange[1] + 0.03)
          // Gamut clamping can only lower chroma, so only the ceiling is hard.
          expect(oklch.c).toBeLessThanOrEqual(family.chromaRange[1] + 0.01)
        }
      }
    })

    it('keeps every chromatic color inside the family hue windows', () => {
      for (const palette of familyPalettes(mood, familyId)) {
        for (const color of palette) {
          const oklch = rgbToOklch(color.rgb)
          if (oklch.c < NEUTRAL_CHROMA) continue
          expect(isHueInAnyWindow(oklch.h, family.hueWindows)).toBe(true)
        }
      }
    })

    it('never produces a color inside a forbidden zone above its chroma cap', () => {
      for (const palette of familyPalettes(mood, familyId)) {
        for (const color of palette) {
          const oklch = rgbToOklch(color.rgb)
          for (const zone of family.forbidden) {
            const inZone = isHueInWindow(oklch.h, { start: zone.start, end: zone.end })
            if (inZone) expect(oklch.c).toBeLessThanOrEqual(zone.minChroma + 0.012)
          }
        }
      }
    })

    it('has no near-duplicate colors', () => {
      for (const palette of familyPalettes(mood, familyId)) {
        const oklabs = palette.map((c) => rgbToOklab(c.rgb))
        for (let i = 0; i < oklabs.length; i++) {
          for (let j = i + 1; j < oklabs.length; j++) {
            expect(deltaEOk(oklabs[i], oklabs[j])).toBeGreaterThan(0.015)
          }
        }
      }
    })

    it('produces only valid hex colors', () => {
      for (const palette of familyPalettes(mood, familyId)) {
        for (const color of palette) expect(color.hex).toMatch(/^#[0-9A-F]{6}$/)
      }
    })

    if (family.warmth !== 'mixed') {
      it(`leans ${family.warmth}`, () => {
        for (const palette of familyPalettes(mood, familyId)) {
          const chromatic = palette
            .map((c) => rgbToOklch(c.rgb))
            .filter((c) => c.c >= NEUTRAL_CHROMA)
          if (chromatic.length === 0) continue
          const warmCount = chromatic.filter((c) => isHueInWindow(c.h, WARM_WINDOW)).length
          const warmFraction = warmCount / chromatic.length
          if (family.warmth === 'warm') expect(warmFraction).toBeGreaterThanOrEqual(0.5)
          else expect(warmFraction).toBeLessThanOrEqual(0.5)
        }
      })
    }
  })
})

describe('generatePalette — mood personality (not generic rainbows)', () => {
  it('cozy contains no vivid cyan/blue/purple in any family', () => {
    for (const family of MOOD_PROFILES.cozy.families) {
      for (const palette of familyPalettes('cozy', family.id)) {
        for (const color of palette) {
          const oklch = rgbToOklch(color.rgb)
          const inCoolZone = isHueInWindow(oklch.h, { start: 185, end: 320 })
          if (inCoolZone) expect(oklch.c).toBeLessThanOrEqual(0.072)
        }
      }
    }
  })

  it('cozy at size >= 5 includes a light neutral and a dark anchor (useful roles)', () => {
    const palette = generatePalette({
      mood: 'cozy',
      harmony: 'auto',
      size: 6,
      seed: 7,
      familyId: 'dusty-rose-cottage',
    })
    const oklchs = palette.map((c) => rgbToOklch(c.rgb))
    expect(oklchs.some((c) => c.l >= 0.82 && c.c <= 0.06)).toBe(true)
    expect(oklchs.some((c) => c.l <= 0.5)).toBe(true)
  })

  it('winter avoids warm yellows/greens in every family', () => {
    for (const family of MOOD_PROFILES.winter.families) {
      for (const palette of familyPalettes('winter', family.id)) {
        for (const color of palette) {
          const oklch = rgbToOklch(color.rgb)
          if (isHueInWindow(oklch.h, { start: 40, end: 150 })) {
            expect(oklch.c).toBeLessThanOrEqual(0.072)
          }
        }
      }
    }
  })

  it('retro avoids vivid purple in every family', () => {
    for (const family of MOOD_PROFILES.retro.families) {
      for (const palette of familyPalettes('retro', family.id)) {
        for (const color of palette) {
          const oklch = rgbToOklch(color.rgb)
          if (isHueInWindow(oklch.h, { start: 280, end: 340 })) {
            expect(oklch.c).toBeLessThanOrEqual(0.082)
          }
        }
      }
    }
  })
})

describe('generatePalette — harmony operates inside the family', () => {
  it('monochrome stays on one hue family', () => {
    const palette = generatePalette({ mood: 'earthy', harmony: 'monochrome', size: 6, seed: 3 })
    const hues = palette.map((c) => rgbToOklch(c.rgb)).filter((c) => c.c >= NEUTRAL_CHROMA)
    for (let i = 1; i < hues.length; i++) {
      const diff = Math.abs(hues[0].h - hues[i].h) % 360
      expect(Math.min(diff, 360 - diff)).toBeLessThan(30)
    }
  })

  it('explicit harmonies still respect the pinned family hue windows', () => {
    const family = MOOD_PROFILES.cozy.families[0]
    for (const harmony of ['complementary', 'triadic', 'analogous'] as const) {
      const palette = generatePalette({
        mood: 'cozy',
        harmony,
        size: 6,
        seed: 11,
        familyId: family.id,
      })
      for (const color of palette) {
        const oklch = rgbToOklch(color.rgb)
        if (oklch.c < NEUTRAL_CHROMA) continue
        expect(isHueInAnyWindow(oklch.h, family.hueWindows)).toBe(true)
      }
    }
  })
})

describe('generatePalette — starting color', () => {
  it('is clamped into the family space rather than overriding it', () => {
    const family = MOOD_PROFILES.cozy.families[0]
    // Vivid cyan into cozy: hue must move into the family's windows, chroma capped.
    const palette = generatePalette({
      mood: 'cozy',
      harmony: 'auto',
      size: 5,
      seed: 7,
      familyId: family.id,
      startColor: '#00FFFF',
    })
    for (const color of palette) {
      const oklch = rgbToOklch(color.rgb)
      if (oklch.c < NEUTRAL_CHROMA) continue
      expect(isHueInAnyWindow(oklch.h, family.hueWindows)).toBe(true)
    }
  })

  it('anchors the palette near the starting color when it fits the mood', () => {
    const palette = generatePalette({
      mood: 'sweet',
      harmony: 'auto',
      size: 5,
      seed: 7,
      familyId: 'strawberry-cream',
      startColor: '#E58BA0',
    })
    const target = rgbToOklab({ r: 229, g: 139, b: 160 })
    const nearest = Math.min(...palette.map((c) => deltaEOk(rgbToOklab(c.rgb), target)))
    expect(nearest).toBeLessThan(0.09)
  })
})
