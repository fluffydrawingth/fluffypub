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
  /**
   * Display label of the marker set this marker was resolved from (e.g.
   * "Ohuhu · Honolulu · Pastel Colors 48") — set by the caller that pools
   * markers from possibly several sets (see marker-matcher's
   * matchAgainstSets), so a match result can say which physical set to
   * reach for, not just a bare code. Undefined when the caller only has
   * one unlabeled marker list and pooling isn't a concern.
   */
  setLabel?: string
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
  /** See {@link MatchableMarker.setLabel}. */
  setLabel?: string
}
