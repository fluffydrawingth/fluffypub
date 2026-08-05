import { rgbToOklab, type OklabColor, type RgbColor } from '@/shared/color'
import type { ModePreset } from './modePresets'

export interface WeightedOklabPoint {
  color: OklabColor
  weight: number
}

export interface WeightingContext {
  /** Lightness of the detected background/paper region — may be light, mid, or dark. */
  backgroundL: number
  paperReference: OklabColor
  chromaNormalizer: number
}

export interface WeightedSample {
  points: WeightedOklabPoint[]
  context: WeightingContext
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0
  const index = clamp01(p) * (sortedValues.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sortedValues[lower]
  const t = index - lower
  return sortedValues[lower] * (1 - t) + sortedValues[upper] * t
}

const LIGHTNESS_MARGIN = 0.16
const MIN_CHROMA_NORMALIZER = 0.05
const LOW_CHROMA_PERCENTILE = 0.3
const HISTOGRAM_BINS = 24
const MIN_WEIGHT = 0.001
/** Below this OKLab lightness, low-chroma pixels are treated as outlines/shadows. */
const OUTLINE_LIGHTNESS = 0.38

/**
 * Background can be light paper, a mid-gray photo backdrop, or a dark
 * artwork background — "lightest part of the image" is not a safe
 * assumption. Instead, find the lightness value that's most *common* among
 * low-chroma pixels (a histogram mode), which correctly locates the
 * background region regardless of whether it's light or dark.
 */
function computeModalLightness(lightnessValues: number[]): number {
  if (lightnessValues.length === 0) return 0.5

  const counts = new Array(HISTOGRAM_BINS).fill(0)
  const sums = new Array(HISTOGRAM_BINS).fill(0)

  for (const l of lightnessValues) {
    const bin = Math.min(HISTOGRAM_BINS - 1, Math.floor(clamp01(l) * HISTOGRAM_BINS))
    counts[bin] += 1
    sums[bin] += l
  }

  let bestBin = 0
  for (let i = 1; i < HISTOGRAM_BINS; i++) {
    if (counts[i] > counts[bestBin]) bestBin = i
  }

  return counts[bestBin] > 0 ? sums[bestBin] / counts[bestBin] : 0.5
}

/**
 * Converts raw RGB samples to OKLab and assigns each a sampling weight
 * based on the *image's own* lightness/chroma distribution (not a fixed
 * RGB > 245 cutoff) plus the active mode's suppression/boost parameters.
 * See docs/algorithms.md for the reasoning.
 */
export function computeWeightedSample(pixels: RgbColor[], preset: ModePreset): WeightedSample {
  const oklab = pixels.map(rgbToOklab)
  const chromas = oklab.map((c) => Math.sqrt(c.a * c.a + c.b * c.b))
  const sortedChroma = [...chromas].sort((a, b) => a - b)

  const chromaNormalizer = Math.max(percentile(sortedChroma, 0.9), MIN_CHROMA_NORMALIZER)
  const lowChromaCutoff = Math.max(
    percentile(sortedChroma, LOW_CHROMA_PERCENTILE),
    MIN_CHROMA_NORMALIZER * 0.4,
  )

  const backgroundCandidateL = oklab
    .filter((_, i) => chromas[i] <= lowChromaCutoff)
    .map((c) => c.l)
  const backgroundL = computeModalLightness(
    backgroundCandidateL.length > 0 ? backgroundCandidateL : oklab.map((c) => c.l),
  )

  const points: WeightedOklabPoint[] = []
  let paperSum = { l: 0, a: 0, b: 0 }
  let paperCount = 0

  for (let i = 0; i < oklab.length; i++) {
    const color = oklab[i]
    const chroma = chromas[i]

    const closeness = clamp01(1 - Math.abs(color.l - backgroundL) / LIGHTNESS_MARGIN)
    const neutralScore = clamp01(1 - chroma / chromaNormalizer)
    const normalizedChroma = clamp01(chroma / chromaNormalizer)
    const backgroundFactor = closeness * neutralScore

    // Very dark + low-chroma = black outlines or cast shadows, not artwork
    // colors. The chroma term spares genuinely dark artwork colors (cocoa,
    // deep purple) which carry meaningful chroma.
    const darkScore = clamp01((OUTLINE_LIGHTNESS - color.l) / OUTLINE_LIGHTNESS)
    const outlineFactor = darkScore * clamp01(1 - chroma / (chromaNormalizer * 0.8))

    const weight = Math.max(
      MIN_WEIGHT,
      (1 - preset.paperSuppression * backgroundFactor) *
        (1 - preset.neutralSuppression * neutralScore * (1 - closeness)) *
        (1 - preset.darknessSuppression * outlineFactor) *
        (1 + preset.chromaBoost * normalizedChroma),
    )

    points.push({ color, weight })

    if (backgroundFactor > 0.5) {
      paperSum = { l: paperSum.l + color.l, a: paperSum.a + color.a, b: paperSum.b + color.b }
      paperCount += 1
    }
  }

  const paperReference: OklabColor =
    paperCount > 0
      ? { l: paperSum.l / paperCount, a: paperSum.a / paperCount, b: paperSum.b / paperCount }
      : { l: backgroundL, a: 0, b: 0 }

  return { points, context: { backgroundL, paperReference, chromaNormalizer } }
}
