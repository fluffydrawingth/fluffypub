import type { CustomMarker, MarkerReference } from '../types'

/** Splits a pasted list (one per line or comma-separated) and assigns codes in reading order. Never guesses. */
export function assignCodesFromPastedList(text: string, count: number): string[] {
  const codes = text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  return Array.from({ length: count }, (_, i) => codes[i] ?? '')
}

/** Reuses codes already associated with this user set — owned references' canonical codes plus custom markers' codes, oldest first — for rescanning hex values against known codes. */
export function assignCodesFromExistingSet(
  ownedReferences: MarkerReference[],
  customMarkers: CustomMarker[],
  count: number,
): string[] {
  const entries = [
    ...ownedReferences.map((r) => ({ code: r.canonicalCode, sortKey: r.createdAt })),
    ...customMarkers.map((m) => ({ code: m.markerCode, sortKey: m.createdAt })),
  ].sort((a, b) => a.sortKey.localeCompare(b.sortKey))
  return Array.from({ length: count }, (_, i) => entries[i]?.code ?? '')
}
