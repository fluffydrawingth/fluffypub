import { linearToSrgb, srgbToLinear } from './rgb'
import type { OklabColor, RgbColor } from './types'

// Björn Ottosson's OKLab: https://bottosson.github.io/posts/oklab/
export function rgbToOklab({ r, g, b }: RgbColor): OklabColor {
  const rl = srgbToLinear(r)
  const gl = srgbToLinear(g)
  const bl = srgbToLinear(b)

  const l = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl
  const m = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl
  const s = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl

  const l_ = Math.cbrt(l)
  const m_ = Math.cbrt(m)
  const s_ = Math.cbrt(s)

  return {
    l: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  }
}

export interface LinearRgb {
  r: number
  g: number
  b: number
}

/** Linear sRGB, *not* clamped to [0,1] — callers that need gamut checks (e.g. OKLCH chroma clamping) use this before rounding/clamping to bytes. */
export function oklabToLinearRgb({ l, a, b }: OklabColor): LinearRgb {
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b
  const s_ = l - 0.0894841775 * a - 1.291485548 * b

  const l3 = l_ ** 3
  const m3 = m_ ** 3
  const s3 = s_ ** 3

  return {
    r: 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    g: -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    b: -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  }
}

export function oklabToRgb(oklab: OklabColor): RgbColor {
  const { r, g, b } = oklabToLinearRgb(oklab)
  return { r: linearToSrgb(r), g: linearToSrgb(g), b: linearToSrgb(b) }
}
