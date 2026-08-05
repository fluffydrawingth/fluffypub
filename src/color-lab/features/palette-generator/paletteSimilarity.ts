import { deltaEOk, rgbToOklab, rgbToOklch } from '@/shared/color'
import type { GeneratedColor } from './types'

/** Colors below this OKLCH chroma read as "neutral" for the role-pattern comparison — same convention used in tests. */
export const NEUTRAL_CHROMA = 0.04

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length
}

/** Max − min. Zero for a single value, which is fine — a 1-color "palette" has no spread to compare. */
function spread(values: number[]): number {
  return values.length === 0 ? 0 : Math.max(...values) - Math.min(...values)
}

function normalizeHue(hue: number): number {
  return ((hue % 360) + 360) % 360
}

function hueDistance(a: number, b: number): number {
  const diff = Math.abs(normalizeHue(a) - normalizeHue(b)) % 360
  return Math.min(diff, 360 - diff)
}

/** Greedy nearest-neighbor pairing — palettes are small (≤8 colors), so greedy is sufficient. */
function pairColors(a: GeneratedColor[], b: GeneratedColor[]): Array<[GeneratedColor, GeneratedColor]> {
  const remaining = [...b]
  const pairs: Array<[GeneratedColor, GeneratedColor]> = []
  for (const colorA of a) {
    if (remaining.length === 0) break
    let bestIndex = 0
    let bestDistance = Infinity
    remaining.forEach((colorB, index) => {
      const distance = deltaEOk(rgbToOklab(colorA.rgb), rgbToOklab(colorB.rgb))
      if (distance < bestDistance) {
        bestDistance = distance
        bestIndex = index
      }
    })
    pairs.push([colorA, remaining[bestIndex]])
    remaining.splice(bestIndex, 1)
  }
  return pairs
}

function hueProfileDistance(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return 0
  const length = Math.max(a.length, b.length)
  let total = 0
  for (let i = 0; i < length; i++) {
    const ha = a[Math.min(i, a.length - 1)]
    const hb = b[Math.min(i, b.length - 1)]
    total += hueDistance(ha, hb)
  }
  return total / length
}

/** Fraction of colors classified as "neutral" (chroma < NEUTRAL_CHROMA) — a cheap proxy for "how many accent vs. neutral roles this palette has," without needing the generator's internal role tags. */
function neutralFraction(colors: GeneratedColor[]): number {
  if (colors.length === 0) return 0
  const neutralCount = colors.filter((c) => rgbToOklch(c.rgb).c < NEUTRAL_CHROMA).length
  return neutralCount / colors.length
}

export interface SimilarityBreakdown {
  pairedDistance: number
  hueDistribution: number
  lightnessAvgDelta: number
  lightnessSpreadDelta: number
  chromaAvgDelta: number
  chromaSpreadDelta: number
  neutralPatternDelta: number
  score: number
}

/**
 * Composite similarity between two palettes — lower means more similar.
 * Explicitly compares hue distribution, average lightness, lightness
 * spread, average chroma, chroma spread, optimally-paired perceptual
 * (ΔE) distance, and a neutral/accent role-pattern proxy, so two
 * palettes that reuse the same colors in a different order — or that
 * differ only in which slots are neutral vs. chromatic — still register
 * as similar. See docs/algorithms.md.
 */
export function paletteSimilarityBreakdown(a: GeneratedColor[], b: GeneratedColor[]): SimilarityBreakdown {
  if (a.length === 0 || b.length === 0) {
    return {
      pairedDistance: Number.POSITIVE_INFINITY,
      hueDistribution: 0,
      lightnessAvgDelta: 0,
      lightnessSpreadDelta: 0,
      chromaAvgDelta: 0,
      chromaSpreadDelta: 0,
      neutralPatternDelta: 0,
      score: Number.POSITIVE_INFINITY,
    }
  }

  const pairs = pairColors(a, b)
  const pairedDistance = mean(pairs.map(([ca, cb]) => deltaEOk(rgbToOklab(ca.rgb), rgbToOklab(cb.rgb))))

  const lightnessA = a.map((c) => rgbToOklab(c.rgb).l)
  const lightnessB = b.map((c) => rgbToOklab(c.rgb).l)
  const lightnessAvgDelta = Math.abs(mean(lightnessA) - mean(lightnessB))
  const lightnessSpreadDelta = Math.abs(spread(lightnessA) - spread(lightnessB))

  const chromaA = a.map((c) => rgbToOklch(c.rgb).c)
  const chromaB = b.map((c) => rgbToOklch(c.rgb).c)
  const chromaAvgDelta = Math.abs(mean(chromaA) - mean(chromaB))
  const chromaSpreadDelta = Math.abs(spread(chromaA) - spread(chromaB))

  const hueA = a.map((c) => rgbToOklch(c.rgb).h)
  const hueB = b.map((c) => rgbToOklch(c.rgb).h)
  const hueDistribution = hueProfileDistance(hueA, hueB) / 360

  const neutralPatternDelta = Math.abs(neutralFraction(a) - neutralFraction(b))

  const score =
    pairedDistance * 0.4 +
    hueDistribution * 0.15 +
    lightnessAvgDelta * 0.12 +
    lightnessSpreadDelta * 0.08 +
    chromaAvgDelta * 0.1 +
    chromaSpreadDelta * 0.07 +
    neutralPatternDelta * 0.08

  return {
    pairedDistance,
    hueDistribution,
    lightnessAvgDelta,
    lightnessSpreadDelta,
    chromaAvgDelta,
    chromaSpreadDelta,
    neutralPatternDelta,
    score,
  }
}

/** Just the composite score — see `paletteSimilarityBreakdown` for the components (used by dev diagnostics). */
export function paletteSimilarity(a: GeneratedColor[], b: GeneratedColor[]): number {
  return paletteSimilarityBreakdown(a, b).score
}

/** True if `candidate` is too close to any palette in `recent` — used to make Regenerate avoid repeats. */
export function isTooSimilar(
  candidate: GeneratedColor[],
  recent: GeneratedColor[][],
  threshold: number,
): boolean {
  return recent.some((entry) => paletteSimilarity(candidate, entry) < threshold)
}
