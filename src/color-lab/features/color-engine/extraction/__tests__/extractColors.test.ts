import { describe, expect, it } from 'vitest'
import { deltaEOk, hexToRgb, rgbToOklab, type RgbColor } from '@/shared/color'
import { extractPaletteFromPixels } from '../extractColors'
import { MODE_PRESETS } from '../modePresets'

function clampByte(value: number): number {
  return Math.min(255, Math.max(0, value))
}

/** Deterministic per-pixel jitter so a "region" isn't literally one repeated pixel. */
function region(base: RgbColor, count: number): RgbColor[] {
  return Array.from({ length: count }, (_, i) => {
    const d = (offset: number) => ((((i + offset) * 37) % 9) - 4)
    return {
      r: clampByte(base.r + d(0)),
      g: clampByte(base.g + d(1)),
      b: clampByte(base.b + d(2)),
    }
  })
}

function closestDistance(paletteHexes: string[], reference: RgbColor): number {
  const refLab = rgbToOklab(reference)
  return Math.min(...paletteHexes.map((hex) => deltaEOk(rgbToOklab(hexToRgb(hex)), refLab)))
}

function minChroma(paletteHexes: string[]): number {
  return Math.min(
    ...paletteHexes.map((hex) => {
      const lab = rgbToOklab(hexToRgb(hex))
      return Math.sqrt(lab.a * lab.a + lab.b * lab.b)
    }),
  )
}

const CLOSE_MATCH = 0.1
const CLEARLY_ABSENT = 0.15

describe('extractPaletteFromPixels — Artwork mode', () => {
  it('excludes a large white paper background and keeps saturated accent shapes', () => {
    const white: RgbColor = { r: 255, g: 255, b: 255 }
    const red: RgbColor = { r: 220, g: 40, b: 60 }
    const blue: RgbColor = { r: 50, g: 100, b: 220 }
    const yellow: RgbColor = { r: 230, g: 200, b: 40 }
    const green: RgbColor = { r: 60, g: 180, b: 90 }

    const pixels = [
      ...region(white, 1700),
      ...region(red, 80),
      ...region(blue, 80),
      ...region(yellow, 80),
      ...region(green, 80),
    ]

    const { colors } = extractPaletteFromPixels(pixels, { colorCount: 4, mode: 'artwork' })
    const hexes = colors.map((c) => c.hex)

    expect(colors).toHaveLength(4)
    expect(closestDistance(hexes, white)).toBeGreaterThan(CLEARLY_ABSENT)
    for (const accent of [red, blue, yellow, green]) {
      expect(closestDistance(hexes, accent)).toBeLessThan(CLOSE_MATCH)
    }
  })

  it('preserves light-but-colorful pastel artwork instead of treating it as background', () => {
    const paper: RgbColor = { r: 250, g: 248, b: 244 }
    const pastelPink: RgbColor = { r: 255, g: 200, b: 210 }
    const pastelBlue: RgbColor = { r: 190, g: 220, b: 255 }
    const pastelYellow: RgbColor = { r: 255, g: 240, b: 190 }
    const pastelGreen: RgbColor = { r: 200, g: 235, b: 205 }

    const pixels = [
      ...region(paper, 900),
      ...region(pastelPink, 150),
      ...region(pastelBlue, 150),
      ...region(pastelYellow, 150),
      ...region(pastelGreen, 150),
    ]

    const { colors } = extractPaletteFromPixels(pixels, { colorCount: 4, mode: 'artwork' })
    const hexes = colors.map((c) => c.hex)

    expect(colors).toHaveLength(4)
    for (const pastel of [pastelPink, pastelBlue, pastelYellow, pastelGreen]) {
      expect(closestDistance(hexes, pastel)).toBeLessThan(CLOSE_MATCH)
    }
  })

  it('keeps very soft pastels on a dark desk photo — the neutral threshold must adapt', () => {
    // Soft pastels sit below the fixed vivid-artwork neutral floor; a
    // non-adaptive threshold filtered pastel blue/mint out as "neutrals".
    const darkDesk: RgbColor = { r: 62, g: 48, b: 44 }
    const paper: RgbColor = { r: 249, g: 246, b: 241 }
    const grayOutline: RgbColor = { r: 120, g: 115, b: 112 }
    const softPink: RgbColor = { r: 250, g: 200, b: 214 }
    const softBlue: RgbColor = { r: 198, g: 224, b: 250 }
    const softMint: RgbColor = { r: 208, g: 236, b: 212 }
    const softButter: RgbColor = { r: 250, g: 240, b: 190 }

    const pixels = [
      ...region(darkDesk, 1100),
      ...region(paper, 700),
      ...region(grayOutline, 120),
      ...region(softPink, 120),
      ...region(softBlue, 120),
      ...region(softMint, 120),
      ...region(softButter, 120),
    ]

    const { colors } = extractPaletteFromPixels(pixels, { colorCount: 4, mode: 'artwork' })
    const hexes = colors.map((c) => c.hex)

    for (const pastel of [softPink, softBlue, softMint, softButter]) {
      expect(closestDistance(hexes, pastel)).toBeLessThan(CLOSE_MATCH)
    }
    expect(closestDistance(hexes, darkDesk)).toBeGreaterThan(CLEARLY_ABSENT)
    expect(closestDistance(hexes, grayOutline)).toBeGreaterThan(CLEARLY_ABSENT)
  })

  it('handles dark artwork: keeps bright accents, excludes the dark background', () => {
    const darkBg: RgbColor = { r: 20, g: 20, b: 25 }
    const brightRed: RgbColor = { r: 230, g: 50, b: 60 }
    const cyan: RgbColor = { r: 50, g: 200, b: 210 }
    const magenta: RgbColor = { r: 210, g: 60, b: 200 }
    const brightYellow: RgbColor = { r: 230, g: 210, b: 60 }

    const pixels = [
      ...region(darkBg, 1600),
      ...region(brightRed, 100),
      ...region(cyan, 100),
      ...region(magenta, 100),
      ...region(brightYellow, 100),
    ]

    const { colors } = extractPaletteFromPixels(pixels, { colorCount: 4, mode: 'artwork' })
    const hexes = colors.map((c) => c.hex)

    expect(colors).toHaveLength(4)
    expect(closestDistance(hexes, darkBg)).toBeGreaterThan(CLEARLY_ABSENT)
    for (const accent of [brightRed, cyan, magenta, brightYellow]) {
      expect(closestDistance(hexes, accent)).toBeLessThan(CLOSE_MATCH)
    }
  })

  it('handles a photo-like image with a large neutral (gray) background', () => {
    const neutralGray: RgbColor = { r: 150, g: 148, b: 145 }
    const shirtRed: RgbColor = { r: 200, g: 50, b: 55 }
    const eyeBlue: RgbColor = { r: 60, g: 110, b: 200 }
    const scarfYellow: RgbColor = { r: 220, g: 190, b: 50 }
    const jacketGreen: RgbColor = { r: 70, g: 150, b: 90 }

    const pixels = [
      ...region(neutralGray, 1500),
      ...region(shirtRed, 150),
      ...region(eyeBlue, 150),
      ...region(scarfYellow, 150),
      ...region(jacketGreen, 150),
    ]

    const { colors } = extractPaletteFromPixels(pixels, { colorCount: 4, mode: 'artwork' })
    const hexes = colors.map((c) => c.hex)

    expect(colors).toHaveLength(4)
    // The background is gray (chroma ~0); a real "excluded" assertion checks
    // no selected color is itself near-neutral, rather than distance to one
    // specific gray value (a legitimately muted accent could coincidentally
    // sit close to that single point without actually being the background).
    expect(minChroma(hexes)).toBeGreaterThan(MODE_PRESETS.artwork.neutralChromaFloor)
    expect(closestDistance(hexes, shirtRed)).toBeLessThan(CLOSE_MATCH)
  })

  it('surfaces small bright accent colors even when most of the image is muted/neutral', () => {
    const mutedTan: RgbColor = { r: 200, g: 190, b: 175 }
    const mutedGray: RgbColor = { r: 170, g: 168, b: 165 }
    const tinyRed: RgbColor = { r: 225, g: 40, b: 50 }
    const tinyBlue: RgbColor = { r: 40, g: 90, b: 225 }

    const pixels = [
      ...region(mutedTan, 900),
      ...region(mutedGray, 900),
      ...region(tinyRed, 40),
      ...region(tinyBlue, 40),
    ]

    const { colors } = extractPaletteFromPixels(pixels, { colorCount: 4, mode: 'artwork' })
    const hexes = colors.map((c) => c.hex)

    expect(closestDistance(hexes, tinyRed)).toBeLessThan(CLOSE_MATCH)
    expect(closestDistance(hexes, tinyBlue)).toBeLessThan(CLOSE_MATCH)
  })

  it('never returns two colors closer than the mode minimum perceptual distance', () => {
    const white: RgbColor = { r: 255, g: 255, b: 255 }
    const red: RgbColor = { r: 220, g: 40, b: 60 }
    const blue: RgbColor = { r: 50, g: 100, b: 220 }
    const yellow: RgbColor = { r: 230, g: 200, b: 40 }
    const green: RgbColor = { r: 60, g: 180, b: 90 }

    const pixels = [
      ...region(white, 1700),
      ...region(red, 80),
      ...region(blue, 80),
      ...region(yellow, 80),
      ...region(green, 80),
    ]

    const { colors } = extractPaletteFromPixels(pixels, { colorCount: 4, mode: 'artwork' })
    const oklabs = colors.map((c) => rgbToOklab(c.rgb))
    const minDist = MODE_PRESETS.artwork.minPerceptualDistance

    for (let i = 0; i < oklabs.length; i++) {
      for (let j = i + 1; j < oklabs.length; j++) {
        expect(deltaEOk(oklabs[i], oklabs[j])).toBeGreaterThanOrEqual(minDist * 0.99)
      }
    }
  })
})

describe('extractPaletteFromPixels — includeNeutrals toggle', () => {
  it('allows neutral/background colors back in when includeNeutrals is true', () => {
    const white: RgbColor = { r: 255, g: 255, b: 255 }
    const red: RgbColor = { r: 220, g: 40, b: 60 }

    const pixels = [...region(white, 1900), ...region(red, 100)]

    const { colors } = extractPaletteFromPixels(pixels, {
      colorCount: 4,
      mode: 'artwork',
      includeNeutrals: true,
    })
    const hexes = colors.map((c) => c.hex)

    expect(closestDistance(hexes, white)).toBeLessThan(CLOSE_MATCH)
  })
})

describe('extractPaletteFromPixels — determinism', () => {
  it('produces identical results for the same seed and different results across regenerate seeds', () => {
    const white: RgbColor = { r: 255, g: 255, b: 255 }
    const red: RgbColor = { r: 220, g: 40, b: 60 }
    const blue: RgbColor = { r: 50, g: 100, b: 220 }
    const yellow: RgbColor = { r: 230, g: 200, b: 40 }

    const pixels = [
      ...region(white, 1200),
      ...region(red, 100),
      ...region(blue, 100),
      ...region(yellow, 100),
    ]

    const first = extractPaletteFromPixels(pixels, { colorCount: 4, mode: 'artwork', seed: 42 })
    const again = extractPaletteFromPixels(pixels, { colorCount: 4, mode: 'artwork', seed: 42 })
    expect(first.colors.map((c) => c.hex)).toEqual(again.colors.map((c) => c.hex))

    const regenerated = extractPaletteFromPixels(pixels, {
      colorCount: 4,
      mode: 'artwork',
      seed: 99,
    })
    expect(regenerated.colors).toHaveLength(4)
  })
})

describe('extractPaletteFromPixels — Full Image style', () => {
  it('is population-driven and may surface the background when it truly dominates', () => {
    const white: RgbColor = { r: 255, g: 255, b: 255 }
    const red: RgbColor = { r: 220, g: 40, b: 60 }

    const pixels = [...region(white, 1900), ...region(red, 100)]
    const { colors } = extractPaletteFromPixels(pixels, { colorCount: 4, mode: 'full-image' })
    const hexes = colors.map((c) => c.hex)

    expect(closestDistance(hexes, white)).toBeLessThan(CLOSE_MATCH)
  })
})

describe('extractPaletteFromPixels — outline/shadow suppression (Artwork style)', () => {
  it('excludes black outlines and gray cast shadows around a photographed drawing', () => {
    const paper: RgbColor = { r: 250, g: 247, b: 240 }
    const blackOutline: RgbColor = { r: 30, g: 28, b: 30 }
    const castShadow: RgbColor = { r: 105, g: 100, b: 95 }
    const pink: RgbColor = { r: 247, g: 170, b: 190 }
    const red: RgbColor = { r: 220, g: 50, b: 70 }
    const yellow: RgbColor = { r: 250, g: 205, b: 60 }
    const green: RgbColor = { r: 100, g: 170, b: 95 }

    const pixels = [
      ...region(paper, 1200),
      ...region(blackOutline, 320),
      ...region(castShadow, 380),
      ...region(pink, 90),
      ...region(red, 60),
      ...region(yellow, 90),
      ...region(green, 90),
    ]

    const { colors } = extractPaletteFromPixels(pixels, { colorCount: 4, mode: 'artwork' })
    const hexes = colors.map((c) => c.hex)

    expect(closestDistance(hexes, blackOutline)).toBeGreaterThan(CLEARLY_ABSENT)
    expect(closestDistance(hexes, castShadow)).toBeGreaterThan(CLEARLY_ABSENT)
    for (const accent of [pink, red, yellow, green]) {
      expect(closestDistance(hexes, accent)).toBeLessThan(CLOSE_MATCH)
    }
  })
})

describe('extractPaletteFromPixels — color families (Artwork style)', () => {
  it('does not spend multiple slots on shades of the same visual color', () => {
    const white: RgbColor = { r: 255, g: 255, b: 255 }
    const pinkLight: RgbColor = { r: 250, g: 175, b: 195 }
    const pinkDark: RgbColor = { r: 235, g: 120, b: 150 }
    const blue: RgbColor = { r: 60, g: 110, b: 220 }
    const yellow: RgbColor = { r: 245, g: 205, b: 60 }
    const green: RgbColor = { r: 90, g: 175, b: 100 }

    const pixels = [
      ...region(white, 1200),
      ...region(pinkLight, 260),
      ...region(pinkDark, 240),
      ...region(blue, 110),
      ...region(yellow, 110),
      ...region(green, 110),
    ]

    const { colors } = extractPaletteFromPixels(pixels, { colorCount: 4, mode: 'artwork' })
    const hexes = colors.map((c) => c.hex)

    // Exactly one slot from the pink family, leaving room for all three
    // distinct accent hues.
    const pinkish = hexes.filter(
      (hex) =>
        Math.min(
          deltaEOk(rgbToOklab(hexToRgb(hex)), rgbToOklab(pinkLight)),
          deltaEOk(rgbToOklab(hexToRgb(hex)), rgbToOklab(pinkDark)),
        ) < CLOSE_MATCH,
    )
    expect(pinkish.length).toBe(1)
    for (const accent of [blue, yellow, green]) {
      expect(closestDistance(hexes, accent)).toBeLessThan(CLOSE_MATCH)
    }
  })
})

describe('extractPaletteFromPixels — Soft Palette style', () => {
  it('returns a pastel interpretation: same hues, raised lightness, capped chroma', () => {
    const white: RgbColor = { r: 255, g: 255, b: 255 }
    const red: RgbColor = { r: 220, g: 40, b: 60 }
    const blue: RgbColor = { r: 50, g: 100, b: 220 }
    const green: RgbColor = { r: 60, g: 180, b: 90 }
    const yellow: RgbColor = { r: 230, g: 200, b: 40 }

    const pixels = [
      ...region(white, 1400),
      ...region(red, 100),
      ...region(blue, 100),
      ...region(green, 100),
      ...region(yellow, 100),
    ]

    const { colors } = extractPaletteFromPixels(pixels, { colorCount: 4, mode: 'soft' })

    for (const color of colors) {
      const oklab = rgbToOklab(color.rgb)
      const chroma = Math.sqrt(oklab.a * oklab.a + oklab.b * oklab.b)
      expect(oklab.l).toBeGreaterThanOrEqual(0.7)
      expect(chroma).toBeLessThanOrEqual(0.12)
    }
  })
})
