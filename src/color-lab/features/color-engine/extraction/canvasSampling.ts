import type { RgbColor } from '@/shared/color'
import type { CropRect } from './types'

export interface SamplingOptions {
  /** Longest edge to downscale the (cropped) image to before sampling, for performance. */
  maxDimension: number
  /** Pixels with alpha below this (0-255) are ignored entirely. */
  alphaThreshold: number
  /** Region of the image (natural-image pixel coordinates) to analyze. Omit for the full image. */
  crop?: CropRect | null
}

export const DEFAULT_SAMPLING_OPTIONS: SamplingOptions = {
  maxDimension: 200,
  alphaThreshold: 10,
}

/** Exported for unit testing — keeps an out-of-bounds crop rect inside the actual image. */
export function clampCrop(crop: CropRect, imageWidth: number, imageHeight: number): CropRect {
  const x = Math.max(0, Math.min(crop.x, imageWidth - 1))
  const y = Math.max(0, Math.min(crop.y, imageHeight - 1))
  return {
    x,
    y,
    width: Math.max(1, Math.min(crop.width, imageWidth - x)),
    height: Math.max(1, Math.min(crop.height, imageHeight - y)),
  }
}

/**
 * Raw pixel sampling only — alpha filtering and crop application are the
 * only things that require canvas access. Paper/neutral weighting is
 * mode-dependent and lives in `weighting.ts`, applied after sampling so it
 * can be unit tested without a real image.
 */
export function sampleImagePixels(
  image: HTMLImageElement,
  options: Partial<SamplingOptions> = {},
): RgbColor[] {
  const opts = { ...DEFAULT_SAMPLING_OPTIONS, ...options }
  const source = opts.crop
    ? clampCrop(opts.crop, image.naturalWidth || image.width, image.naturalHeight || image.height)
    : { x: 0, y: 0, width: image.naturalWidth || image.width, height: image.naturalHeight || image.height }

  const scale = Math.min(1, opts.maxDimension / Math.max(source.width, source.height))
  const width = Math.max(1, Math.round(source.width * scale))
  const height = Math.max(1, Math.round(source.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Could not create 2D canvas context for sampling')

  ctx.drawImage(image, source.x, source.y, source.width, source.height, 0, 0, width, height)
  const { data } = ctx.getImageData(0, 0, width, height)

  const pixels: RgbColor[] = []

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]
    if (a < opts.alphaThreshold) continue
    pixels.push({ r: data[i], g: data[i + 1], b: data[i + 2] })
  }

  return pixels
}
