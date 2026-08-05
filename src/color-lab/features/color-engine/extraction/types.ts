import type { ColorCount, PaletteColor } from '@/shared/color'

export type ExtractedColor = PaletteColor

// Re-exported for backward compatibility — canonical definition lives in
// shared/color since both extraction and palette-generator need it.
export type { ColorCount } from '@/shared/color'
export { COLOR_COUNT_OPTIONS } from '@/shared/color'

/**
 * User-facing extraction styles. Presented as Artwork Colors / Full Image /
 * Soft Palette / Vibrant Palette — no technical names in the UI.
 */
export type ExtractionMode = 'artwork' | 'full-image' | 'soft' | 'vibrant'

/** Region of an image in natural-image pixel coordinates. */
export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

export interface ExtractionOptions {
  colorCount: ColorCount
  mode: ExtractionMode
  /** When false (default in Artwork/Vibrant), low-chroma candidates are filtered out. */
  includeNeutrals: boolean
  seed: number
  /** Analyze only this region of the image. Null/undefined = full image. */
  crop?: CropRect | null
}

export type RejectionReason =
  | 'below-population-floor'
  | 'too-close-to-selected'
  | 'neutral-filtered'
  | 'same-color-family'

export interface CandidateDebugInfo {
  hex: string
  population: number
  chroma: number
  contrast: number
  salience: number
  score: number
  selected: boolean
  rejectedReason?: RejectionReason
}

export interface ExtractionDebugInfo {
  sampledPixelCount: number
  candidates: CandidateDebugInfo[]
  finalSelection: ExtractedColor[]
}

export interface ExtractionResult {
  colors: ExtractedColor[]
  debug: ExtractionDebugInfo
}
