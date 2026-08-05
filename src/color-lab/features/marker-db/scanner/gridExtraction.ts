import type { RgbColor } from '@/shared/color'

/** Fraction of samples dropped at each end of a channel's sorted values before averaging. */
const TRIM_FRACTION = 0.15
/** Fraction of each cell's edge skipped on every side — avoids borders, grid lines, and glare. */
const CELL_INSET = 0.25

export interface CellRect {
  x: number
  y: number
  width: number
  height: number
}

/** Cell rects in row-major order (row 0 left-to-right, then row 1, ...) — the order codes get assigned in. */
export function computeCellRects(width: number, height: number, rows: number, cols: number): CellRect[] {
  const cellWidth = width / cols
  const cellHeight = height / rows
  const rects: CellRect[] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      rects.push({
        x: Math.round(col * cellWidth),
        y: Math.round(row * cellHeight),
        width: Math.round(cellWidth),
        height: Math.round(cellHeight),
      })
    }
  }
  return rects
}

function trimmedMean(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const trim = Math.floor(sorted.length * TRIM_FRACTION)
  const kept = trim * 2 < sorted.length ? sorted.slice(trim, sorted.length - trim) : sorted
  return kept.reduce((sum, v) => sum + v, 0) / kept.length
}

/**
 * Representative color of one cell: samples only its center region (skipping
 * swatch borders, grid lines, handwriting, and edge glare) and takes a
 * per-channel trimmed mean, which is more robust to a stray glare pixel or
 * shadow corner than a single spatial median pixel.
 */
export function extractCellColor(pixels: Uint8ClampedArray, imageWidth: number, cell: CellRect): RgbColor {
  const insetX = cell.width * CELL_INSET
  const insetY = cell.height * CELL_INSET
  const x0 = Math.round(cell.x + insetX)
  const y0 = Math.round(cell.y + insetY)
  const x1 = Math.max(x0 + 1, Math.round(cell.x + cell.width - insetX))
  const y1 = Math.max(y0 + 1, Math.round(cell.y + cell.height - insetY))

  const reds: number[] = []
  const greens: number[] = []
  const blues: number[] = []
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * imageWidth + x) * 4
      reds.push(pixels[i])
      greens.push(pixels[i + 1])
      blues.push(pixels[i + 2])
    }
  }

  return {
    r: Math.round(trimmedMean(reds)),
    g: Math.round(trimmedMean(greens)),
    b: Math.round(trimmedMean(blues)),
  }
}

/** One representative RgbColor per cell, in row-major order — never a guess at marker codes. */
export function extractGridColors(
  pixels: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  rows: number,
  cols: number,
): RgbColor[] {
  return computeCellRects(imageWidth, imageHeight, rows, cols).map((cell) =>
    extractCellColor(pixels, imageWidth, cell),
  )
}
