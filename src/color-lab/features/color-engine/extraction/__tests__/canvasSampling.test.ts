import { describe, expect, it } from 'vitest'
import { clampCrop } from '../canvasSampling'

describe('clampCrop', () => {
  it('leaves a crop that is already fully inside the image unchanged', () => {
    expect(clampCrop({ x: 10, y: 20, width: 100, height: 50 }, 400, 300)).toEqual({
      x: 10,
      y: 20,
      width: 100,
      height: 50,
    })
  })

  it('clamps a crop whose origin is outside the image back into bounds', () => {
    const result = clampCrop({ x: 500, y: 400, width: 100, height: 50 }, 400, 300)
    expect(result.x).toBeLessThan(400)
    expect(result.y).toBeLessThan(300)
  })

  it('clamps a crop that overhangs the right/bottom edge so it never exceeds the image', () => {
    const result = clampCrop({ x: 350, y: 280, width: 200, height: 200 }, 400, 300)
    expect(result.x + result.width).toBeLessThanOrEqual(400)
    expect(result.y + result.height).toBeLessThanOrEqual(300)
  })

  it('never produces a zero or negative-size crop', () => {
    const result = clampCrop({ x: 399, y: 299, width: 500, height: 500 }, 400, 300)
    expect(result.width).toBeGreaterThan(0)
    expect(result.height).toBeGreaterThan(0)
  })

  it('clamps negative origins to zero', () => {
    const result = clampCrop({ x: -50, y: -20, width: 100, height: 100 }, 400, 300)
    expect(result.x).toBe(0)
    expect(result.y).toBe(0)
  })
})
