import {
  generateFromFamily,
  isTooSimilar,
  paletteSimilarity,
  SIMILARITY_THRESHOLD,
  type PaletteFamily,
} from '@/features/palette-generator'
import { createSeededRandom } from '@/shared/lib/random'
import { RANDOM_ARCHETYPES, rotateArchetype } from './archetypes'
import type {
  ColorIntensity,
  ContrastLevel,
  RandomArchetype,
  RandomGeneratedColor,
  RandomPaletteOptions,
  RandomPaletteResult,
  Temperature,
} from './types'

const MAX_VARIETY_ATTEMPTS = 8
/** Large prime offset so successive attempt seeds don't correlate — same convention as palette-generator. */
const SEED_STRIDE = 104729

const INTENSITY_CHROMA_MULTIPLIER: Record<ColorIntensity, number> = {
  soft: 0.6,
  balanced: 1,
  vibrant: 1.4,
}

const CONTRAST_SPREAD_MULTIPLIER: Record<ContrastLevel, number> = {
  gentle: 0.6,
  mixed: 1,
  bold: 1.3,
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function matchesTemperature(archetype: RandomArchetype, temperature: Temperature): boolean {
  if (temperature === 'any') return true
  return archetype.warmth === temperature || archetype.warmth === 'mixed'
}

/** Applies the intensity/contrast/includeNeutral dials to an archetype before generation — never mutates the shared archetype list. */
function applyDials(
  archetype: RandomArchetype,
  intensity: ColorIntensity,
  contrast: ContrastLevel,
  includeNeutral: boolean,
): PaletteFamily {
  const chromaMultiplier = INTENSITY_CHROMA_MULTIPLIER[intensity]
  const chromaRange: [number, number] = [
    clamp(archetype.chromaRange[0] * chromaMultiplier, 0.003, 0.3),
    clamp(archetype.chromaRange[1] * chromaMultiplier, 0.003, 0.3),
  ]

  const spreadMultiplier = CONTRAST_SPREAD_MULTIPLIER[contrast]
  const [lMin, lMax] = archetype.lightnessRange
  const center = (lMin + lMax) / 2
  const half = ((lMax - lMin) / 2) * spreadMultiplier
  const lightnessRange: [number, number] = [clamp(center - half, 0.04, 0.98), clamp(center + half, 0.04, 0.98)]

  const anchors = includeNeutral
    ? archetype.anchors
    : archetype.anchors.filter((a) => !a.role.startsWith('neutral'))

  return {
    ...archetype,
    anchors: anchors.length > 0 ? anchors : archetype.anchors,
    chromaRange,
    lightnessRange,
  }
}

function pickArchetype(
  candidates: RandomArchetype[],
  random: () => number,
  recentArchetypeIds: string[],
): RandomArchetype {
  const weights = candidates.map((a) => (recentArchetypeIds.includes(a.id) ? 0.12 : 1))
  const total = weights.reduce((sum, w) => sum + w, 0)
  let target = random() * total
  for (let i = 0; i < candidates.length; i++) {
    target -= weights[i]
    if (target <= 0) return candidates[i]
  }
  return candidates[candidates.length - 1]
}

export interface RandomVarietyDiagnostics {
  seed: number
  retryCount: number
  similarityScore: number | null
  exhaustedRetries: boolean
}

export interface GenerateRandomVariedResult extends RandomPaletteResult {
  diagnostics: RandomVarietyDiagnostics
  /** The dial-applied, rotation-applied family actually used — pass to `rerollSwatch` to keep a re-rolled swatch consistent with the rest of the palette. */
  resolvedFamily: PaletteFamily
}

/**
 * Picks an archetype (filtered by temperature, downweighted by recency),
 * applies the intensity/contrast/neutral dials, rotates it if it's a
 * `rotatable` relationship archetype, then delegates to the shared
 * `generateFromFamily` engine — retrying against recent history exactly
 * like `generateVariedPalette` does for mood-based generation. See
 * docs/random-palette.md.
 */
export function generateVariedRandomPalette(
  options: RandomPaletteOptions,
  recentPalettes: { colors: RandomGeneratedColor[]; familyId: string }[],
): GenerateRandomVariedResult {
  const { size, intensity, temperature, contrast, includeNeutral, seed: seedBase } = options
  const recentArchetypeIds = recentPalettes.map((entry) => entry.familyId)
  const recentColorSets = recentPalettes.map((entry) => entry.colors)
  const pool = RANDOM_ARCHETYPES.filter((a) => matchesTemperature(a, temperature))
  const candidates = pool.length > 0 ? pool : RANDOM_ARCHETYPES

  let best: {
    colors: RandomGeneratedColor[]
    archetype: RandomArchetype
    family: PaletteFamily
    seed: number
    similarityScore: number
  } | null = null
  let bestMinDistance = -Infinity

  for (let attempt = 0; attempt < MAX_VARIETY_ATTEMPTS; attempt++) {
    const seed = seedBase + attempt * SEED_STRIDE
    const random = createSeededRandom(seed)
    let archetype = pickArchetype(candidates, random, recentArchetypeIds)
    if (archetype.rotatable) archetype = rotateArchetype(archetype, Math.floor(random() * 360))

    const family = applyDials(archetype, intensity, contrast, includeNeutral)
    const colors = generateFromFamily(family, { size, seed })

    if (recentColorSets.length === 0) {
      return {
        colors,
        archetypeId: archetype.id,
        archetypeLabel: archetype.label,
        diagnostics: { seed, retryCount: attempt, similarityScore: null, exhaustedRetries: false },
        resolvedFamily: family,
      }
    }

    const minDistance = Math.min(...recentColorSets.map((recent) => paletteSimilarity(colors, recent)))

    if (!isTooSimilar(colors, recentColorSets, SIMILARITY_THRESHOLD)) {
      return {
        colors,
        archetypeId: archetype.id,
        archetypeLabel: archetype.label,
        diagnostics: { seed, retryCount: attempt, similarityScore: minDistance, exhaustedRetries: false },
        resolvedFamily: family,
      }
    }

    if (minDistance > bestMinDistance) {
      bestMinDistance = minDistance
      best = { colors, archetype, family, seed, similarityScore: minDistance }
    }
  }

  if (best) {
    return {
      colors: best.colors,
      archetypeId: best.archetype.id,
      archetypeLabel: best.archetype.label,
      diagnostics: {
        seed: best.seed,
        retryCount: MAX_VARIETY_ATTEMPTS,
        similarityScore: best.similarityScore,
        exhaustedRetries: true,
      },
      resolvedFamily: best.family,
    }
  }

  const fallback = candidates[0]
  const fallbackFamily = applyDials(fallback, intensity, contrast, includeNeutral)
  return {
    colors: generateFromFamily(fallbackFamily, { size, seed: seedBase }),
    archetypeId: fallback.id,
    archetypeLabel: fallback.label,
    diagnostics: { seed: seedBase, retryCount: MAX_VARIETY_ATTEMPTS, similarityScore: null, exhaustedRetries: true },
    resolvedFamily: fallbackFamily,
  }
}
