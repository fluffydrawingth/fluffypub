import {
  deltaEOk,
  hexToRgb,
  oklchToRgb,
  rgbToHex,
  rgbToOklab,
  rgbToOklch,
  type ColorCount,
  type HexColor,
  type OklchColor,
  type RgbColor,
} from '@/shared/color'
import { createSeededRandom } from '@/shared/lib/random'
import {
  isHueInAnyWindow,
  isHueInWindow,
  MOOD_PROFILES,
  type ForbiddenZone,
  type HueWindow,
  type MoodAnchor,
  type MoodProfile,
  type PaletteFamily,
} from './moodProfiles'
import type { GeneratedColor, Harmony, PaletteGeneratorOptions } from './types'

/** Fixed seed so the first generation for a given input is stable/reproducible. */
export const DEFAULT_GENERATION_SEED = 7

/** Never let two generated colors land closer than this (quantized OKLab distance). */
const MIN_SLOT_DISTANCE = 0.03
const MAX_NUDGE_ATTEMPTS = 24

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function normalizeHue(hue: number): number {
  return ((hue % 360) + 360) % 360
}

function hueDistance(a: number, b: number): number {
  const diff = Math.abs(normalizeHue(a) - normalizeHue(b)) % 360
  return Math.min(diff, 360 - diff)
}

/** Clamps a hue into the window that contains (or is nearest to) it. */
function clampHueToWindows(hue: number, windows: HueWindow[]): number {
  const h = normalizeHue(hue)
  if (isHueInAnyWindow(h, windows)) return h
  let best = h
  let bestDist = Infinity
  for (const w of windows) {
    for (const edge of [w.start, w.end]) {
      const d = hueDistance(h, edge)
      if (d < bestDist) {
        bestDist = d
        best = edge
      }
    }
  }
  return best
}

function applyForbiddenZones(color: OklchColor, zones: ForbiddenZone[]): OklchColor {
  for (const zone of zones) {
    if (isHueInWindow(color.h, { start: zone.start, end: zone.end }) && color.c > zone.minChroma) {
      return { ...color, c: zone.minChroma }
    }
  }
  return color
}

function gaussian(distance: number, sigma: number): number {
  return Math.exp(-((distance / sigma) ** 2))
}

/** Harmony operates *inside* the mood: it reweights the mood's own anchors relative to the main hue; it can never introduce hues the mood forbids. */
function harmonyWeight(anchorHue: number, mainHue: number, harmony: Harmony): number {
  switch (harmony) {
    case 'balanced':
      return 1
    case 'analogous':
      return 0.15 + gaussian(hueDistance(anchorHue, mainHue), 55)
    case 'complementary':
      return (
        0.1 +
        Math.max(
          gaussian(hueDistance(anchorHue, mainHue), 40),
          gaussian(hueDistance(anchorHue, mainHue + 180), 50),
        )
      )
    case 'split-complementary':
      return (
        0.1 +
        Math.max(
          gaussian(hueDistance(anchorHue, mainHue), 35),
          gaussian(hueDistance(anchorHue, mainHue + 150), 40),
          gaussian(hueDistance(anchorHue, mainHue + 210), 40),
        )
      )
    case 'triadic':
      return (
        0.1 +
        Math.max(
          gaussian(hueDistance(anchorHue, mainHue), 35),
          gaussian(hueDistance(anchorHue, mainHue + 120), 40),
          gaussian(hueDistance(anchorHue, mainHue + 240), 40),
        )
      )
    case 'monochrome':
      // Monochrome is handled structurally (single anchor, lightness ladder).
      return 1
  }
}

interface Pick {
  color: OklchColor
  role: MoodAnchor['role']
}

function jitterAnchor(
  anchorSpec: MoodAnchor,
  family: PaletteFamily,
  random: () => number,
): OklchColor {
  const h = clampHueToWindows(anchorSpec.h + (random() * 2 - 1) * anchorSpec.jitterH, family.hueWindows)
  const c = clamp(
    anchorSpec.c + (random() * 2 - 1) * anchorSpec.jitterC,
    family.chromaRange[0],
    family.chromaRange[1],
  )
  const l = clamp(
    anchorSpec.l + (random() * 2 - 1) * anchorSpec.jitterL,
    family.lightnessRange[0],
    family.lightnessRange[1],
  )
  return applyForbiddenZones({ h, c, l }, family.forbidden)
}

function weightedPickIndex(weights: number[], random: () => number): number {
  const total = weights.reduce((sum, w) => sum + w, 0)
  if (total <= 0) return Math.floor(random() * weights.length)
  let target = random() * total
  for (let i = 0; i < weights.length; i++) {
    target -= weights[i]
    if (target <= 0) return i
  }
  return weights.length - 1
}

/** Picks a family for a mood, downweighting recently-used ones so Regenerate varies which sub-personality is used. */
export function selectFamily(
  profile: MoodProfile,
  random: () => number,
  recentFamilyIds: string[] = [],
): PaletteFamily {
  const { families } = profile
  const weights = families.map((f) => (recentFamilyIds.includes(f.id) ? 0.12 : 1))
  return families[weightedPickIndex(weights, random)]
}

/** Clamps an arbitrary starting color into the family's space so the family always wins over the input. */
function clampToMood(rgb: RgbColor, family: PaletteFamily): OklchColor {
  const oklch = rgbToOklch(rgb)
  return applyForbiddenZones(
    {
      h: clampHueToWindows(oklch.h, family.hueWindows),
      c: clamp(oklch.c, family.chromaRange[0], family.chromaRange[1]),
      l: clamp(oklch.l, family.lightnessRange[0], family.lightnessRange[1]),
    },
    family.forbidden,
  )
}

/**
 * Deterministic, no AI. A mood is split into several families (each its own
 * curated anchor set) — one is selected first, then generation runs exactly
 * as before but scoped to that family instead of a single flat profile:
 * colors come from the family's curated anchors (never generic
 * evenly-spaced hues); harmony only reweights anchors relative to the main
 * hue, inside the family's space. See docs/algorithms.md.
 */
export interface GenerateFromFamilyOptions {
  startColor?: HexColor
  size: ColorCount
  seed: number
  harmony?: Harmony | 'auto'
}

/**
 * The shared generation engine: picks OKLCH colors from one `PaletteFamily`'s
 * curated anchors (mood sub-style or random-palette archetype — the engine
 * doesn't know or care which). `generatePalette` (mood-first) and
 * `generateRandomPalette` (`src/features/random-palette/`) both call this
 * after resolving their own family. See docs/algorithms.md.
 */
export function generateFromFamily(
  family: PaletteFamily,
  options: GenerateFromFamilyOptions,
): GeneratedColor[] {
  const { startColor, size, seed } = options
  const random = createSeededRandom(seed)
  const harmony: Harmony = !options.harmony || options.harmony === 'auto' ? family.defaultHarmony : options.harmony

  const picks: Pick[] = []

  // 1. Main pick: the starting color (clamped into the family) or a main anchor.
  const mainAnchors = family.anchors.filter((a) => a.role === 'main')
  const mainAnchor = mainAnchors[Math.floor(random() * mainAnchors.length)] ?? family.anchors[0]
  const mainColor = startColor
    ? clampToMood(hexToRgb(startColor), family)
    : jitterAnchor(mainAnchor, family, random)
  picks.push({ color: mainColor, role: 'main' })

  if (harmony === 'monochrome') {
    // Lightness ladder on the main hue; contrast level sets the spread.
    const spread = family.contrast === 'high' ? 1 : family.contrast === 'medium' ? 0.8 : 0.6
    const [lMin, lMax] = family.lightnessRange
    const center = (lMin + lMax) / 2
    const half = ((lMax - lMin) / 2) * spread
    for (let i = 1; i < size; i++) {
      const t = size > 1 ? i / (size - 1) : 0.5
      const l = clamp(center - half + 2 * half * t, lMin, lMax)
      const c = clamp(
        mainColor.c * (0.75 + random() * 0.5),
        family.chromaRange[0],
        family.chromaRange[1],
      )
      picks.push({
        color: applyForbiddenZones({ h: mainColor.h, c, l }, family.forbidden),
        role: 'support',
      })
    }
  } else {
    // 2. Role coverage: an accent always; both neutrals once there's room.
    const pool = family.anchors.filter((a) => a !== mainAnchor || startColor)
    const required: MoodAnchor['role'][] = ['accent']
    if (size >= 5) required.push('neutral-light', 'neutral-dark')

    const used = new Set<MoodAnchor>()
    if (!startColor) used.add(mainAnchor)

    for (const role of required) {
      if (picks.length >= size) break
      const candidates = pool.filter((a) => a.role === role && !used.has(a))
      if (candidates.length === 0) continue
      const weights = candidates.map((a) =>
        a.role.startsWith('neutral') ? 1 : harmonyWeight(a.h, mainColor.h, harmony),
      )
      const pick = candidates[weightedPickIndex(weights, random)]
      used.add(pick)
      picks.push({ color: jitterAnchor(pick, family, random), role: pick.role })
    }

    // 3. Fill remaining slots from the anchor pool, harmony-weighted; reuse
    // anchors (with fresh jitter) once every anchor has appeared.
    while (picks.length < size) {
      let candidates = family.anchors.filter((a) => !used.has(a))
      if (candidates.length === 0) {
        candidates = family.anchors.filter((a) => !a.role.startsWith('neutral'))
      }
      const weights = candidates.map((a) =>
        a.role.startsWith('neutral') ? 0.7 : harmonyWeight(a.h, mainColor.h, harmony),
      )
      const pick = candidates[weightedPickIndex(weights, random)]
      used.add(pick)
      picks.push({ color: jitterAnchor(pick, family, random), role: pick.role })
    }
  }

  // 4. Convert (gamut-clamped) and de-duplicate on the quantized output.
  const results: { rgb: RgbColor; role: Pick['role'] }[] = []
  for (const pick of picks) {
    let color = pick.color
    let rgb = oklchToRgb(color)
    let attempts = 0
    while (
      attempts < MAX_NUDGE_ATTEMPTS &&
      results.some((r) => deltaEOk(rgbToOklab(r.rgb), rgbToOklab(rgb)) < MIN_SLOT_DISTANCE)
    ) {
      attempts += 1
      const direction = attempts % 2 === 0 ? 1 : -1
      const magnitude = 0.012 * Math.ceil(attempts / 2)
      color = {
        ...color,
        l: clamp(color.l + direction * magnitude, family.lightnessRange[0], family.lightnessRange[1]),
      }
      rgb = oklchToRgb(color)
    }
    results.push({ rgb, role: pick.role })
  }

  // 5. Light-to-dark reads as a cohesive strip.
  return results
    .map(({ rgb }) => ({ rgb, lightness: rgbToOklab(rgb).l }))
    .sort((a, b) => b.lightness - a.lightness)
    .map(({ rgb }) => ({ rgb, hex: rgbToHex(rgb) }))
}

/**
 * Mood-first entry point: resolves `mood` to a `MoodProfile`, picks (or
 * pins) one of its families, then delegates to the shared
 * `generateFromFamily` engine.
 */
export function generatePalette(options: PaletteGeneratorOptions): GeneratedColor[] {
  const { startColor, mood, size, seed } = options
  const profile = MOOD_PROFILES[mood]
  const random = createSeededRandom(seed)
  const family =
    (options.familyId && profile.families.find((f) => f.id === options.familyId)) ||
    selectFamily(profile, random, options.recentFamilyIds)
  return generateFromFamily(family, { startColor, size, seed, harmony: options.harmony })
}
