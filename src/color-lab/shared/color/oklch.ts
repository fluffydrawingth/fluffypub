import { oklabToLinearRgb, oklabToRgb, rgbToOklab } from './oklab'
import type { OklabColor, RgbColor } from './types'

export interface OklchColor {
  l: number
  c: number
  /** degrees, 0-360 */
  h: number
}

export function oklabToOklch({ l, a, b }: OklabColor): OklchColor {
  const c = Math.sqrt(a * a + b * b)
  const hRad = Math.atan2(b, a)
  const h = ((hRad * 180) / Math.PI + 360) % 360
  return { l, c, h }
}

export function oklchToOklab({ l, c, h }: OklchColor): OklabColor {
  const hRad = (h * Math.PI) / 180
  return { l, a: c * Math.cos(hRad), b: c * Math.sin(hRad) }
}

export function rgbToOklch(rgb: RgbColor): OklchColor {
  return oklabToOklch(rgbToOklab(rgb))
}

const GAMUT_EPSILON = 1e-4

function isInSrgbGamut(oklch: OklchColor): boolean {
  const { r, g, b } = oklabToLinearRgb(oklchToOklab(oklch))
  return (
    r >= -GAMUT_EPSILON &&
    r <= 1 + GAMUT_EPSILON &&
    g >= -GAMUT_EPSILON &&
    g <= 1 + GAMUT_EPSILON &&
    b >= -GAMUT_EPSILON &&
    b <= 1 + GAMUT_EPSILON
  )
}

/**
 * Reduces chroma (keeping lightness and hue fixed) until the color is
 * representable in sRGB, via binary search. Naively clamping each RGB
 * channel to [0,255] independently distorts hue/lightness unpredictably —
 * this keeps the color perceptually on-target, just less saturated.
 */
export function clampChromaToGamut(oklch: OklchColor): OklchColor {
  if (oklch.c <= 0 || isInSrgbGamut(oklch)) return oklch

  let lo = 0
  let hi = oklch.c
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    if (isInSrgbGamut({ ...oklch, c: mid })) lo = mid
    else hi = mid
  }
  return { ...oklch, c: lo }
}

/** Converts to sRGB, gamut-mapping chroma down first so out-of-gamut requests don't distort hue via naive channel clamping. */
export function oklchToRgb(oklch: OklchColor): RgbColor {
  return oklabToRgb(oklchToOklab(clampChromaToGamut(oklch)))
}
