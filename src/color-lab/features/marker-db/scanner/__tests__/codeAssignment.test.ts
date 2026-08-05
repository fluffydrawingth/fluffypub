import { describe, expect, it } from 'vitest'
import type { CustomMarker, MarkerReference } from '../../types'
import { assignCodesFromExistingSet, assignCodesFromPastedList } from '../codeAssignment'

function reference(id: string, canonicalCode: string, createdAt: string): MarkerReference {
  return {
    id,
    brandId: 'brand-1',
    canonicalCode,
    colorName: '',
    approximateHex: '#000000',
    rgb: { r: 0, g: 0, b: 0 },
    lab: { l: 0, a: 0, b: 0 },
    aliases: [],
    status: 'active',
    createdAt,
    updatedAt: createdAt,
  }
}

function customMarker(id: string, markerCode: string, createdAt: string): CustomMarker {
  return {
    id,
    markerCode,
    colorName: '',
    hex: '#000000',
    rgb: { r: 0, g: 0, b: 0 },
    lab: { l: 0, a: 0, b: 0 },
    createdAt,
    updatedAt: createdAt,
  }
}

describe('assignCodesFromPastedList', () => {
  it('splits by newline and assigns in reading order', () => {
    expect(assignCodesFromPastedList('R29\nRV260\nBG49', 3)).toEqual(['R29', 'RV260', 'BG49'])
  })

  it('splits by comma too', () => {
    expect(assignCodesFromPastedList('R29, RV260, BG49', 3)).toEqual(['R29', 'RV260', 'BG49'])
  })

  it('pads missing codes with empty strings rather than guessing', () => {
    expect(assignCodesFromPastedList('R29\nRV260', 4)).toEqual(['R29', 'RV260', '', ''])
  })

  it('ignores blank lines', () => {
    expect(assignCodesFromPastedList('R29\n\nRV260\n', 2)).toEqual(['R29', 'RV260'])
  })
})

describe('assignCodesFromExistingSet', () => {
  it('reuses codes from owned references and custom markers, oldest first', () => {
    const references = [reference('r-c', 'BG49', '2024-01-03'), reference('r-a', 'R29', '2024-01-01')]
    const customMarkers = [customMarker('c-b', 'RV260', '2024-01-02')]
    expect(assignCodesFromExistingSet(references, customMarkers, 3)).toEqual(['R29', 'RV260', 'BG49'])
  })

  it('pads with empty strings when there are more cells than existing markers', () => {
    const references = [reference('r-a', 'R29', '2024-01-01')]
    expect(assignCodesFromExistingSet(references, [], 3)).toEqual(['R29', '', ''])
  })

  it('returns all empty strings when the set has no owned references or custom markers', () => {
    expect(assignCodesFromExistingSet([], [], 2)).toEqual(['', ''])
  })
})
