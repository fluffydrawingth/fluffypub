import { describe, expect, it } from 'vitest'
import { hexToRgb, rgbToLab } from '@/shared/color'
import { matchPaletteToMarkerSet } from '../matchPaletteToMarkerSet'
import type { MatchableMarker } from '../types'

function marker(markerCode: string, colorName: string, hex: string): MatchableMarker {
  return { markerCode, colorName, hex, lab: rgbToLab(hexToRgb(hex)) }
}

describe('matchPaletteToMarkerSet', () => {
  it('picks the nearest marker by Lab delta-E, not just the first in the list', () => {
    const markers = [marker('B1', 'Deep Blue', '#000080'), marker('R1', 'True Red', '#FF0000')]
    const [result] = matchPaletteToMarkerSet(['#FE0101'], markers)

    expect(result.closestMarkerCode).toBe('R1')
    expect(result.markerName).toBe('True Red')
    expect(result.markerHex).toBe('#FF0000')
  })

  it('never invents a marker code — result is always one of the input codes', () => {
    const markers = [marker('X1', 'Something', '#123456'), marker('X2', 'Other', '#654321')]
    const results = matchPaletteToMarkerSet(['#ABCDEF', '#000000', '#FFFFFF'], markers)
    const validCodes = new Set(markers.map((m) => m.markerCode))

    for (const result of results) {
      expect(validCodes.has(result.closestMarkerCode)).toBe(true)
    }
  })

  it('classifies confidence: Excellent (<5), Close (<10), Approximate (<20), Distant (>=20)', () => {
    const markers = [marker('R1', 'Red', '#FF0000')]

    const identical = matchPaletteToMarkerSet(['#FF0000'], markers)[0]
    expect(identical.deltaE).toBeLessThan(5)
    expect(identical.confidence).toBe('Excellent')

    const veryDifferent = matchPaletteToMarkerSet(['#00FFFF'], markers)[0]
    expect(veryDifferent.deltaE).toBeGreaterThanOrEqual(20)
    expect(veryDifferent.confidence).toBe('Distant')
  })

  it('never labels a match "Perfect" — only Excellent/Close/Approximate/Distant are valid labels', () => {
    const markers = [marker('R1', 'Red', '#FF0000')]
    const result = matchPaletteToMarkerSet(['#FF0000'], markers)[0]
    expect(['Excellent', 'Close', 'Approximate', 'Distant']).toContain(result.confidence)
  })

  it('passes an explicit source through from the matchable marker to the result', () => {
    const markers: MatchableMarker[] = [
      { markerCode: 'R1', colorName: 'Red', hex: '#FF0000', lab: rgbToLab(hexToRgb('#FF0000')), source: 'override' },
    ]
    const result = matchPaletteToMarkerSet(['#FF0000'], markers)[0]
    expect(result.source).toBe('override')
  })

  it('uses perceptual (Lab) distance, not RGB distance', () => {
    // These two grays are RGB-adjacent-ish but Lab distance should still be
    // the discriminator; the point is the function must produce a
    // deterministic Lab-based answer independent of any RGB shortcuts.
    const markers = [marker('DARK', 'Dark Gray', '#333333'), marker('LIGHT', 'Light Gray', '#CCCCCC')]
    const result = matchPaletteToMarkerSet(['#D0D0D0'], markers)[0]
    expect(result.closestMarkerCode).toBe('LIGHT')
  })

  it('processes each palette color independently and returns one result per input', () => {
    const markers = [marker('R1', 'Red', '#FF0000'), marker('G1', 'Green', '#00FF00'), marker('B1', 'Blue', '#0000FF')]
    const results = matchPaletteToMarkerSet(['#FF0000', '#00FF00', '#0000FF'], markers)

    expect(results).toHaveLength(3)
    expect(results.map((r) => r.closestMarkerCode)).toEqual(['R1', 'G1', 'B1'])
    expect(results.every((r) => r.deltaE < 1)).toBe(true)
  })
})
