import type { HexColor, LabColor } from '@/shared/color'

/** Which hex a matchable marker's color actually came from — see docs/algorithms.md priority order. */
export type MatchSource = 'override' | 'custom' | 'reference'

/**
 * Structurally compatible with marker-db's resolved marker shapes —
 * deliberately not imported from there, so color-engine has no dependency
 * on marker-db's storage layer. Callers resolve a marker set to its member
 * markers themselves (e.g. via the repository) and pass the resolved list in.
 */
export interface MatchableMarker {
  markerCode: string
  colorName: string
  hex: HexColor
  lab: LabColor
  source?: MatchSource
}

export type MatchConfidence = 'Excellent' | 'Close' | 'Approximate' | 'Distant'

export interface MarkerMatchResult {
  requestedHex: HexColor
  closestMarkerCode: string
  markerName: string
  markerHex: HexColor
  deltaE: number
  confidence: MatchConfidence
  source?: MatchSource
}
