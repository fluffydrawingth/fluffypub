import { linearToSrgb, srgbToLinear } from './rgb'
import type { LabColor, RgbColor } from './types'

// D65 reference white
const XN = 0.95047
const YN = 1.0
const ZN = 1.08883

const DELTA = 6 / 29

function fLab(t: number): number {
  return t > DELTA ** 3 ? Math.cbrt(t) : t / (3 * DELTA ** 2) + 4 / 29
}

function fLabInverse(t: number): number {
  return t > DELTA ? t ** 3 : 3 * DELTA ** 2 * (t - 4 / 29)
}

export function rgbToLab({ r, g, b }: RgbColor): LabColor {
  const rl = srgbToLinear(r)
  const gl = srgbToLinear(g)
  const bl = srgbToLinear(b)

  const x = 0.4124564 * rl + 0.3575761 * gl + 0.1804375 * bl
  const y = 0.2126729 * rl + 0.7151522 * gl + 0.072175 * bl
  const z = 0.0193339 * rl + 0.119192 * gl + 0.9503041 * bl

  const fx = fLab(x / XN)
  const fy = fLab(y / YN)
  const fz = fLab(z / ZN)

  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  }
}

export function labToRgb({ l, a, b }: LabColor): RgbColor {
  const fy = (l + 16) / 116
  const fx = fy + a / 500
  const fz = fy - b / 200

  const x = XN * fLabInverse(fx)
  const y = YN * fLabInverse(fy)
  const z = ZN * fLabInverse(fz)

  const rl = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z
  const gl = -0.969266 * x + 1.8760108 * y + 0.041556 * z
  const bl = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z

  return {
    r: linearToSrgb(rl),
    g: linearToSrgb(gl),
    b: linearToSrgb(bl),
  }
}
