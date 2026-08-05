import { deltaE76, hexToRgb, rgbToLab } from '@/shared/color'
import type { MarkerMatchResult, MatchableMarker, MatchConfidence } from './types'

// Conservative thresholds (ΔE76) — documented in docs/algorithms.md. No
// "Perfect" label: physical ink, paper, lighting, and screens mean an exact
// digital match never guarantees an exact physical one.
const EXCELLENT_THRESHOLD = 5
const CLOSE_THRESHOLD = 10
const APPROXIMATE_THRESHOLD = 20

function classifyConfidence(deltaE: number): MatchConfidence {
  if (deltaE < EXCELLENT_THRESHOLD) return 'Excellent'
  if (deltaE < CLOSE_THRESHOLD) return 'Close'
  if (deltaE < APPROXIMATE_THRESHOLD) return 'Approximate'
  return 'Distant'
}

/**
 * For each palette color, finds the nearest marker by CIE Lab delta-E
 * (deltaE76) — plain RGB distance is not used, since it doesn't correspond
 * to perceived color difference. Never invents a marker code: the result is
 * always one of the codes already present in `markers`. See
 * docs/algorithms.md and docs/marker-database.md.
 */
export function matchPaletteToMarkerSet(
  paletteHexes: string[],
  markers: MatchableMarker[],
): MarkerMatchResult[] {
  return paletteHexes.map((requestedHex) => {
    const requestedLab = rgbToLab(hexToRgb(requestedHex))

    let closest: MatchableMarker | null = null
    let closestDistance = Infinity

    for (const marker of markers) {
      const distance = deltaE76(requestedLab, marker.lab)
      if (distance < closestDistance) {
        closestDistance = distance
        closest = marker
      }
    }

    if (!closest) {
      throw new Error('matchPaletteToMarkerSet: markers list is empty')
    }

    return {
      requestedHex,
      closestMarkerCode: closest.markerCode,
      markerName: closest.colorName,
      markerHex: closest.hex,
      deltaE: closestDistance,
      confidence: classifyConfidence(closestDistance),
      source: closest.source,
    }
  })
}
