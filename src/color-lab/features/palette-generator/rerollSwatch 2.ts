import { COLOR_COUNT_OPTIONS, deltaEOk, rgbToOklab, type ColorCount, type PaletteColor } from '@/shared/color'
import { generateFromFamily } from './generatePalette'
import type { PaletteFamily } from './moodProfiles'

const REROLL_MIN_DISTANCE = 0.02
const REROLL_ATTEMPTS = 5
/** Large prime offset so successive attempt seeds don't correlate — same convention as paletteVariety.ts. */
const SEED_STRIDE = 104729

/**
 * Replaces a single swatch in-place: regenerates the whole family at the
 * palette's current size so the replacement stays consistent with the
 * other anchors' role assignment, keeping only the color at `index`.
 * Retries a few seeds and picks the one furthest from the swatches being
 * kept, so a reroll never lands on a near-duplicate. Used by both
 * palette-generator and random-palette's "adjust colors" panel — see
 * docs/architecture.md.
 */
export function rerollSwatch(
  family: PaletteFamily,
  palette: PaletteColor[],
  index: number,
  baseSeed: number,
): PaletteColor {
  const size = palette.length
  if (!COLOR_COUNT_OPTIONS.includes(size as ColorCount)) return palette[index]

  const others = palette.filter((_, i) => i !== index)
  let best: PaletteColor | null = null
  let bestMinDistance = -Infinity

  for (let attempt = 0; attempt < REROLL_ATTEMPTS; attempt++) {
    const candidates = generateFromFamily(family, { size: size as ColorCount, seed: baseSeed + attempt * SEED_STRIDE })
    const candidate = candidates[index]
    if (!candidate) continue
    if (others.length === 0) return candidate

    const minDistance = Math.min(
      ...others.map((o) => deltaEOk(rgbToOklab(candidate.rgb), rgbToOklab(o.rgb))),
    )
    if (minDistance > REROLL_MIN_DISTANCE) return candidate
    if (minDistance > bestMinDistance) {
      bestMinDistance = minDistance
      best = candidate
    }
  }

  return best ?? palette[index]
}
