import type { ColorCount, PaletteColor } from '@/shared/color'
import type { PaletteFamily } from '@/features/palette-generator'

export type ColorIntensity = 'soft' | 'balanced' | 'vibrant'
export type Temperature = 'any' | 'warm' | 'cool'
export type ContrastLevel = 'gentle' | 'mixed' | 'bold'

export const COLOR_INTENSITIES: ColorIntensity[] = ['soft', 'balanced', 'vibrant']
export const TEMPERATURES: Temperature[] = ['any', 'warm', 'cool']
export const CONTRAST_LEVELS: ContrastLevel[] = ['gentle', 'mixed', 'bold']

/**
 * A curated random-palette style, shaped exactly like a mood's
 * `PaletteFamily` (anchors, hue windows, chroma/lightness ranges, default
 * harmony) so it can run through the same `generateFromFamily` engine — see
 * docs/random-palette.md.
 */
export interface RandomArchetype extends PaletteFamily {
  /** If true, the archetype's hues are rotated by a random amount each generation — it defines a *relationship* (analogous, triadic, ...) at any position on the wheel, not a fixed identity like "Sunset" or "Ocean". */
  rotatable: boolean
  /** Baseline chroma character before the user's intensity dial scales it. */
  intensityBaseline: ColorIntensity
  /** Documentation of how likely this archetype is to keep a neutral anchor when the user allows neutrals — informational, actual inclusion is controlled by the `includeNeutral` option. */
  neutralProbability: number
}

export interface RandomPaletteOptions {
  size: ColorCount
  intensity: ColorIntensity
  temperature: Temperature
  contrast: ContrastLevel
  includeNeutral: boolean
  seed: number
  /** Archetype ids to downweight during random selection, so Regenerate avoids repeating a recent archetype. */
  recentArchetypeIds?: string[]
}

export type RandomGeneratedColor = PaletteColor

export interface RandomPaletteResult {
  colors: RandomGeneratedColor[]
  archetypeId: string
  archetypeLabel: string
}
