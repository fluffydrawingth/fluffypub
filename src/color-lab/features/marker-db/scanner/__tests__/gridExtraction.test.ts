import { describe, expect, it } from 'vitest'
import { computeCellRects, extractCellColor, extractGridColors } from '../gridExtraction'

/** Builds a flat RGBA buffer for a solid-color width x height image. */
function solidImage(width: number, height: number, rgb: { r: number; g: number; b: number }): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    pixels[i * 4] = rgb.r
    pixels[i * 4 + 1] = rgb.g
    pixels[i * 4 + 2] = rgb.b
    pixels[i * 4 + 3] = 255
  }
  return pixels
}

function paintRect(
  pixels: Uint8ClampedArray,
  imageWidth: number,
  rect: { x: number; y: number; width: number; height: number },
  rgb: { r: number; g: number; b: number },
) {
  for (let y = rect.y; y < rect.y + rect.height; y++) {
    for (let x = rect.x; x < rect.x + rect.width; x++) {
      const i = (y * imageWidth + x) * 4
      pixels[i] = rgb.r
      pixels[i + 1] = rgb.g
      pixels[i + 2] = rgb.b
      pixels[i + 3] = 255
    }
  }
}

describe('computeCellRects', () => {
  it('divides the image into rows x cols cells in row-major order', () => {
    const rects = computeCellRects(40, 20, 2, 4)
    expect(rects).toHaveLength(8)
    expect(rects[0]).toEqual({ x: 0, y: 0, width: 10, height: 10 })
    expect(rects[3]).toEqual({ x: 30, y: 0, width: 10, height: 10 })
    expect(rects[4]).toEqual({ x: 0, y: 10, width: 10, height: 10 })
  })
})

describe('extractCellColor', () => {
  it('returns the solid color of a uniform cell', () => {
    const width = 40
    const height = 40
    const pixels = solidImage(width, height, { r: 200, g: 40, b: 80 })
    const color = extractCellColor(pixels, width, { x: 0, y: 0, width: 20, height: 20 })
    expect(color).toEqual({ r: 200, g: 40, b: 80 })
  })

  it('ignores a border ring of a different color (grid lines / handwriting)', () => {
    const width = 40
    const height = 40
    const pixels = solidImage(width, height, { r: 0, g: 0, b: 0 })
    paintRect(pixels, width, { x: 0, y: 0, width: 20, height: 20 }, { r: 220, g: 180, b: 60 })
    // Overwrite a 2px border inside the cell with black "grid line" pixels.
    for (let x = 0; x < 20; x++) {
      pixels[x * 4] = 0
      pixels[x * 4 + 1] = 0
      pixels[x * 4 + 2] = 0
    }
    const color = extractCellColor(pixels, width, { x: 0, y: 0, width: 20, height: 20 })
    expect(color).toEqual({ r: 220, g: 180, b: 60 })
  })

  it('resists a small cluster of glare pixels via trimmed mean', () => {
    const width = 20
    const height = 20
    const pixels = solidImage(width, height, { r: 100, g: 100, b: 100 })
    // Center region is 5..15 x 5..15 (100 px). Paint a handful of near-white
    // glare pixels inside it — trimming should absorb them.
    for (let i = 0; i < 8; i++) {
      const x = 6 + i
      const y = 6
      const idx = (y * width + x) * 4
      pixels[idx] = 255
      pixels[idx + 1] = 255
      pixels[idx + 2] = 255
    }
    const color = extractCellColor(pixels, width, { x: 0, y: 0, width, height })
    expect(color.r).toBeLessThan(150)
    expect(color.g).toBeLessThan(150)
    expect(color.b).toBeLessThan(150)
  })
})

describe('extractGridColors', () => {
  it('extracts one representative color per cell across a full grid', () => {
    const width = 40
    const height = 20
    const pixels = solidImage(width, height, { r: 0, g: 0, b: 0 })
    const colors = [
      { r: 255, g: 0, b: 0 },
      { r: 0, g: 255, b: 0 },
      { r: 0, g: 0, b: 255 },
      { r: 255, g: 255, b: 0 },
    ]
    const rects = computeCellRects(width, height, 1, 4)
    rects.forEach((rect, i) => paintRect(pixels, width, rect, colors[i]))

    const result = extractGridColors(pixels, width, height, 1, 4)
    expect(result).toEqual(colors)
  })
})
