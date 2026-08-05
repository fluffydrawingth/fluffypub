import {
  deltaEOk,
  oklabToRgb,
  pickPerceptuallySpacedWithTrace,
  rgbToHex,
  type OklabColor,
  type RgbColor,
} from '@/shared/color'
import { weightedKMeans, type WeightedPoint } from './kMeans'
import type { ModePreset } from './modePresets'
import type { WeightingContext } from './weighting'
import type {
  CandidateDebugInfo,
  ColorCount,
  ExtractedColor,
  ExtractionDebugInfo,
} from './types'

const MAX_CANDIDATE_K = 16
const CANDIDATE_K_MULTIPLIER = 3

interface ScoredCandidate {
  centroid: OklabColor
  hex: string
  rgb: RgbColor
  /** Fraction (0-1) of total weighted sample mass. */
  population: number
  /** Raw OKLab chroma of the centroid. */
  chroma: number
  /** Raw OKLab distance from the detected paper/background reference. */
  contrast: number
  /** Normalized 0-1ish combined "visually important despite area" measure. */
  salience: number
  score: number
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function hueAngleDeg(candidate: ScoredCandidate): number {
  return ((Math.atan2(candidate.centroid.b, candidate.centroid.a) * 180) / Math.PI + 360) % 360
}

function hueDistanceDeg(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360
  return Math.min(diff, 360 - diff)
}

/** Same-hue colors further apart than this in OKLab lightness are different visual colors (pastel pink vs. vivid red). */
const FAMILY_LIGHTNESS_THRESHOLD = 0.18

/**
 * Groups candidates into visual color families: chromatic candidates within
 * `hueThreshold` degrees AND similar lightness of a family's founder join
 * that family — hue alone would merge pastel pink with vivid red, which are
 * different colors to someone coloring. All neutrals share one family.
 * Candidates arrive per-family sorted by score, so the first member wins.
 */
function groupIntoFamilies(
  candidates: ScoredCandidate[],
  hueThreshold: number,
  neutralChromaFloor: number,
): { winners: ScoredCandidate[]; reserves: ScoredCandidate[] } {
  const sorted = [...candidates].sort((a, b) => b.score - a.score)
  const founders: { hue: number; lightness: number }[] = []
  let hasNeutralFamily = false
  const winners: ScoredCandidate[] = []
  const reserves: ScoredCandidate[] = []

  for (const candidate of sorted) {
    const isNeutral = candidate.chroma < neutralChromaFloor
    if (isNeutral) {
      if (hasNeutralFamily) reserves.push(candidate)
      else {
        hasNeutralFamily = true
        winners.push(candidate)
      }
      continue
    }
    const hue = hueAngleDeg(candidate)
    const lightness = candidate.centroid.l
    const inExistingFamily = founders.some(
      (f) =>
        hueDistanceDeg(f.hue, hue) <= hueThreshold &&
        Math.abs(f.lightness - lightness) < FAMILY_LIGHTNESS_THRESHOLD,
    )
    if (inExistingFamily) {
      reserves.push(candidate)
    } else {
      founders.push({ hue, lightness })
      winners.push(candidate)
    }
  }

  return { winners, reserves }
}

function toDebugEntry(
  candidate: ScoredCandidate,
  selected: boolean,
  rejectedReason?: CandidateDebugInfo['rejectedReason'],
): CandidateDebugInfo {
  return {
    hex: candidate.hex,
    population: candidate.population,
    chroma: candidate.chroma,
    contrast: candidate.contrast,
    salience: candidate.salience,
    score: candidate.score,
    selected,
    rejectedReason,
  }
}

export function selectPalette(
  points: WeightedPoint[],
  context: WeightingContext,
  preset: ModePreset,
  colorCount: ColorCount,
  includeNeutrals: boolean,
  seed: number,
): { colors: ExtractedColor[]; debug: Omit<ExtractionDebugInfo, 'sampledPixelCount'> } {
  const candidateK = Math.min(MAX_CANDIDATE_K, Math.max(colorCount, colorCount * CANDIDATE_K_MULTIPLIER))
  const clusters = weightedKMeans(points, candidateK, seed)
  const totalPopulation = clusters.reduce((sum, c) => sum + c.population, 0) || 1

  const rawChroma = clusters.map((c) => Math.sqrt(c.centroid.a ** 2 + c.centroid.b ** 2))

  // A photo can have two backgrounds at once — the paper AND the desk around
  // it. The paper reference comes from the weighting context; the secondary
  // reference is the largest low-chroma cluster (a warm wood desk carries
  // some chroma, so it isn't the paper but is still background). Contrast is
  // the distance to the *nearest* background, so neither gets rewarded for
  // merely differing from the other.
  const lowChromaThreshold = context.chromaNormalizer * 0.8
  const secondaryBackground = clusters
    .filter((_, i) => rawChroma[i] < lowChromaThreshold)
    .reduce<(typeof clusters)[number] | null>(
      (best, cluster) => (best === null || cluster.population > best.population ? cluster : best),
      null,
    )
  const rawContrast = clusters.map((c) =>
    Math.min(
      deltaEOk(c.centroid, context.paperReference),
      secondaryBackground ? deltaEOk(c.centroid, secondaryBackground.centroid) : Infinity,
    ),
  )

  const maxChroma = Math.max(...rawChroma, 1e-6)
  const maxContrast = Math.max(...rawContrast, 1e-6)

  const scored: ScoredCandidate[] = clusters.map((cluster, i) => {
    const population = cluster.population / totalPopulation
    const normChroma = rawChroma[i] / maxChroma
    const normContrast = rawContrast[i] / maxContrast
    // Rewards small-but-colorful accent regions over pure single-pixel noise.
    const areaBonus = population < 0.002 ? 0 : 1 + clamp01(1 - population) * 0.5
    const salience = normChroma * normContrast * areaBonus
    const rgb = oklabToRgb(cluster.centroid)

    const score =
      preset.scoreWeights.population * population +
      preset.scoreWeights.chroma * normChroma +
      preset.scoreWeights.contrast * normContrast +
      preset.scoreWeights.salience * salience

    return {
      centroid: cluster.centroid,
      hex: rgbToHex(rgb),
      rgb,
      population,
      chroma: rawChroma[i],
      contrast: rawContrast[i],
      salience,
      score,
    }
  })

  const populationEligible = scored.filter((c) => c.population >= preset.populationFloor)
  const rejectedForPopulation = scored.filter((c) => c.population < preset.populationFloor)

  // Adaptive neutral threshold: soft pastel artwork has genuinely low chroma
  // everywhere, so a fixed floor would classify pastel blue/mint as "neutral"
  // and filter them out. Scale the floor down with the image's own chroma
  // ceiling (context.chromaNormalizer is the sample's 90th-percentile chroma).
  const neutralFloor = Math.min(preset.neutralChromaFloor, context.chromaNormalizer * 0.55)

  // Soft-pastel palettes also live closer together in OKLab (mint vs powder
  // blue), so the required spacing shrinks with the image's chroma ceiling —
  // otherwise a genuinely distinct pastel gets spacing-rejected and a
  // background cluster fills its slot.
  const minDistance =
    preset.minPerceptualDistance *
    Math.min(1, Math.max(0.5, context.chromaNormalizer / 0.12))

  let selectionPool = populationEligible
  let rejectedForNeutral: ScoredCandidate[] = []

  if (!includeNeutrals) {
    const nonNeutral = populationEligible.filter((c) => c.chroma >= neutralFloor)
    if (nonNeutral.length >= colorCount) {
      rejectedForNeutral = populationEligible.filter((c) => c.chroma < neutralFloor)
      selectionPool = nonNeutral
    }
    // Not enough colorful candidates to fill the palette: fall back to the full
    // population-eligible pool rather than returning fewer colors than requested.
  }

  // Color families: several shades of the same visual color (four beiges,
  // two pinks) compete for one slot. Stage 1 selects among family winners
  // only, so every distinct visual color gets a slot before any family
  // doubles up; stage 2 fills any remaining slots from the reserves. This
  // also prevents the spacing relaxation from packing the palette with
  // high-scoring near-duplicates while distinct low-scoring colors (a
  // legitimate background white with includeNeutrals on) wait unpicked.
  const { winners: familyWinners, reserves: familyReserves } = groupIntoFamilies(
    selectionPool,
    preset.familyHueThreshold,
    neutralFloor,
  )

  const stage1 = pickPerceptuallySpacedWithTrace(
    familyWinners.map((c) => ({ item: c, color: c.centroid, score: c.score })),
    colorCount,
    minDistance,
  )

  let selected = stage1.selected
  let reserveTrace: { item: ScoredCandidate; accepted: boolean }[] = []
  if (selected.length < colorCount) {
    const stage2 = pickPerceptuallySpacedWithTrace(
      familyReserves.map((c) => ({ item: c, color: c.centroid, score: c.score })),
      colorCount - selected.length,
      minDistance,
      0.8,
      selected.map((c) => c.centroid),
    )
    selected = [...selected, ...stage2.selected]
    reserveTrace = stage2.trace
  } else {
    reserveTrace = familyReserves.map((item) => ({ item, accepted: false }))
  }

  const candidates: CandidateDebugInfo[] = [
    ...rejectedForPopulation.map((c) => toDebugEntry(c, false, 'below-population-floor')),
    ...rejectedForNeutral.map((c) => toDebugEntry(c, false, 'neutral-filtered')),
    ...stage1.trace.map((t) =>
      toDebugEntry(t.item, t.accepted, t.accepted ? undefined : 'too-close-to-selected'),
    ),
    ...reserveTrace.map((t) =>
      toDebugEntry(t.item, t.accepted, t.accepted ? undefined : 'same-color-family'),
    ),
  ]

  const finalSelection: ExtractedColor[] = selected
    .map((c) => ({
      hueAngle: Math.atan2(c.centroid.b, c.centroid.a),
      hex: c.hex,
      rgb: c.rgb,
      population: c.population,
    }))
    .sort((a, b) => a.hueAngle - b.hueAngle)
    .map(({ hex, rgb, population }) => ({ hex, rgb, population }))

  return { colors: finalSelection, debug: { candidates, finalSelection } }
}
