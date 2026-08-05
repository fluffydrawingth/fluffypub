import { rgbToOklab } from '@/shared/color'
import type { CropRect } from './types'

const ANALYSIS_MAX_DIM = 140
const PADDING_FRACTION = 0.05
/** Suggestions covering more than this fraction of the image are treated as "full image". */
const FULL_IMAGE_AREA = 0.85
const MIN_SIDE_FRACTION = 0.15
/**
 * Chroma floor bounds: pixels below the floor carry no artwork signal (desk
 * wood, paper, shadows). The floor adapts to the image — soft pastel artwork
 * has genuinely low chroma, so a fixed vivid-artwork floor would blind the
 * suggestion to it.
 */
const CHROMA_FLOOR_MAX = 0.065
const CHROMA_FLOOR_MIN = 0.025
/** A marginal bin counts as "occupied" above this fraction of the peak bin. */
const RUN_THRESHOLD = 0.04
/**
 * Occupied runs separated by less than this fraction of the axis are merged.
 * Big enough to bridge the white gutters between artwork elements (a 2x2
 * grid of drawings), small enough to keep marker pens lying next to the
 * paper (~15%+ away) out of the box.
 */
const RUN_MERGE_GAP = 0.12

interface Run {
  start: number
  end: number
  mass: number
}

/**
 * Finds the dominant contiguous run of mass along one axis: bins above a
 * small threshold form runs, nearby runs merge, and the run with the most
 * total mass wins. Spatially separate colorful objects (marker pens on the
 * desk next to the artwork) form their own runs and get dropped.
 */
function dominantRun(marginal: number[]): Run | null {
  const peak = Math.max(...marginal)
  if (peak <= 0) return null
  const threshold = peak * RUN_THRESHOLD

  const runs: Run[] = []
  let current: Run | null = null
  for (let i = 0; i < marginal.length; i++) {
    if (marginal[i] > threshold) {
      if (!current) current = { start: i, end: i, mass: 0 }
      current.end = i
      current.mass += marginal[i]
    } else if (current) {
      runs.push(current)
      current = null
    }
  }
  if (current) runs.push(current)
  if (runs.length === 0) return null

  const mergeGap = Math.max(2, Math.round(marginal.length * RUN_MERGE_GAP))
  const merged: Run[] = [runs[0]]
  for (let i = 1; i < runs.length; i++) {
    const last = merged[merged.length - 1]
    if (runs[i].start - last.end <= mergeGap) {
      last.end = runs[i].end
      last.mass += runs[i].mass
    } else {
      merged.push(runs[i])
    }
  }

  return merged.reduce((best, run) => (run.mass > best.mass ? run : best))
}

/**
 * Suggests the likely artwork region of an uploaded photo. Colorful pixels
 * are where the artwork is: low-chroma pixels (desk, paper, shadows) are
 * ignored entirely, and the box is the dominant contiguous chroma-mass run
 * along each axis, padded slightly. Returns null when the whole image looks
 * like artwork (nothing to crop away) or there's no chroma signal at all.
 */
export function suggestArtworkCrop(image: HTMLImageElement): CropRect | null {
  const naturalWidth = image.naturalWidth || image.width
  const naturalHeight = image.naturalHeight || image.height
  const scale = Math.min(1, ANALYSIS_MAX_DIM / Math.max(naturalWidth, naturalHeight))
  const width = Math.max(1, Math.round(naturalWidth * scale))
  const height = Math.max(1, Math.round(naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null

  ctx.drawImage(image, 0, 0, width, height)
  const { data } = ctx.getImageData(0, 0, width, height)

  // First pass: chroma per pixel, so the floor can adapt to this image.
  const chromas = new Float32Array(width * height)
  for (let i = 0; i < width * height; i++) {
    const o = rgbToOklab({ r: data[i * 4], g: data[i * 4 + 1], b: data[i * 4 + 2] })
    chromas[i] = Math.sqrt(o.a * o.a + o.b * o.b)
  }
  // In a photo of artwork on a desk, background (desk + paper) dominates the
  // pixel count, so the 85th-percentile chroma sits at background level and
  // the artwork occupies the top slice. A floor just above p85 excludes the
  // background in both regimes: vivid artwork on a warm wood desk (desk
  // chroma ~0.06) and soft pastels on a dark desk (desk chroma ~0.02).
  const sortedChroma = Float32Array.from(chromas).sort()
  const p85 = sortedChroma[Math.floor(sortedChroma.length * 0.85)]
  const chromaFloor = Math.max(CHROMA_FLOOR_MIN, Math.min(CHROMA_FLOOR_MAX, p85 * 1.15))

  const colMass = new Array(width).fill(0)
  const rowMass = new Array(height).fill(0)
  let anySignal = false
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const chroma = chromas[y * width + x]
      if (chroma < chromaFloor) continue
      const w = (chroma - chromaFloor) ** 2
      colMass[x] += w
      rowMass[y] += w
      anySignal = true
    }
  }
  if (!anySignal) return null

  const xRun = dominantRun(colMass)
  const yRun = dominantRun(rowMass)
  if (!xRun || !yRun) return null

  const padX = Math.round(width * PADDING_FRACTION)
  const padY = Math.round(height * PADDING_FRACTION)
  const left = Math.max(0, xRun.start - padX)
  const top = Math.max(0, yRun.start - padY)
  const right = Math.min(width - 1, xRun.end + padX)
  const bottom = Math.min(height - 1, yRun.end + padY)

  const boxWidth = Math.max(right - left + 1, Math.round(width * MIN_SIDE_FRACTION))
  const boxHeight = Math.max(bottom - top + 1, Math.round(height * MIN_SIDE_FRACTION))

  if ((boxWidth * boxHeight) / (width * height) > FULL_IMAGE_AREA) return null

  const toNatural = 1 / scale
  return {
    x: Math.round(left * toNatural),
    y: Math.round(top * toNatural),
    width: Math.min(naturalWidth, Math.round(boxWidth * toNatural)),
    height: Math.min(naturalHeight, Math.round(boxHeight * toNatural)),
  }
}
