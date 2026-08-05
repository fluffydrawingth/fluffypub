import { oklchToRgb, rgbToHex, rgbToOklch, type RgbColor } from '@/shared/color'
import { sampleImagePixels } from './canvasSampling'
import { selectPalette } from './candidateSelection'
import { MODE_PRESETS } from './modePresets'
import { computeWeightedSample } from './weighting'
import type { ExtractedColor, ExtractionOptions, ExtractionResult } from './types'

/** Fixed seed so the first extraction of a given image/mode is stable/reproducible. */
export const DEFAULT_EXTRACTION_SEED = 42

export const DEFAULT_EXTRACTION_COLOR_COUNT = 6
export const DEFAULT_EXTRACTION_MODE = 'artwork' as const

/**
 * Pure — no canvas/DOM. Takes already-sampled pixels so it can be unit
 * tested with synthetic data. See docs/algorithms.md.
 *
 * `includeNeutrals`'s default depends on whichever `mode` is in effect (each
 * mode has its own default), so it's resolved from the mode's preset rather
 * than baked into a single static defaults object.
 */
export function extractPaletteFromPixels(
  pixels: RgbColor[],
  options: Partial<ExtractionOptions> = {},
): ExtractionResult {
  const mode = options.mode ?? DEFAULT_EXTRACTION_MODE
  const preset = MODE_PRESETS[mode]
  const opts: ExtractionOptions = {
    colorCount: options.colorCount ?? DEFAULT_EXTRACTION_COLOR_COUNT,
    mode,
    includeNeutrals: options.includeNeutrals ?? preset.includeNeutralsDefault,
    seed: options.seed ?? DEFAULT_EXTRACTION_SEED,
  }

  if (pixels.length === 0) {
    return { colors: [], debug: { sampledPixelCount: 0, candidates: [], finalSelection: [] } }
  }

  const { points, context } = computeWeightedSample(pixels, preset)
  const { colors, debug } = selectPalette(
    points,
    context,
    preset,
    opts.colorCount,
    opts.includeNeutrals,
    opts.seed,
  )

  const finalColors = preset.softOutput ? colors.map(softenColor) : colors

  return { colors: finalColors, debug: { sampledPixelCount: pixels.length, ...debug } }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Soft Palette: keeps the extracted hue but raises lightness toward the
 * pastel range and reduces chroma (gamut-clamped by oklchToRgb), producing
 * a softer interpretation of the same artwork colors.
 */
function softenColor(color: ExtractedColor): ExtractedColor {
  const oklch = rgbToOklch(color.rgb)
  const rgb = oklchToRgb({
    l: clamp(0.5 * oklch.l + 0.5 * 0.86, 0.74, 0.93),
    c: clamp(oklch.c * 0.55, 0.03, 0.1),
    h: oklch.h,
  })
  return { rgb, hex: rgbToHex(rgb), population: color.population }
}

export function extractPalette(
  image: HTMLImageElement,
  options: Partial<ExtractionOptions> = {},
): ExtractionResult {
  return extractPaletteFromPixels(sampleImagePixels(image, { crop: options.crop }), options)
}
