import { matchPaletteToMarkerSet, type MarkerMatchResult, type MatchableMarker } from '@/features/color-engine'
import type { MarkerReference, MarkerRepository, UserMarkerSet } from '@/features/marker-db'
import type { HexColor } from '@/shared/color'
import type { MarkerSetOption } from './types'

/**
 * Resolves a user's marker set into matchable markers, one per owned
 * reference (or custom marker), preferring — in order — a personal swatch
 * override, then the marker's own stored hex (custom markers only have
 * this), then the reference library's approximate hex. See
 * docs/algorithms.md.
 */
async function resolveMatchableMarkers(
  userSet: UserMarkerSet,
  repository: MarkerRepository,
): Promise<MatchableMarker[]> {
  const overrideByReference = new Map(userSet.swatchOverrides.map((o) => [o.markerReferenceId, o] as const))

  const ownedReferences = (
    await Promise.all(userSet.ownedMarkerReferenceIds.map((id) => repository.getReference(id)))
  ).filter((reference): reference is MarkerReference => reference !== null)

  const referenceMatchers: MatchableMarker[] = ownedReferences.map((reference) => {
    const override = overrideByReference.get(reference.id)
    if (override) {
      return {
        markerCode: reference.canonicalCode,
        colorName: reference.colorName,
        hex: override.hex,
        lab: override.lab,
        source: 'override',
      }
    }
    return {
      markerCode: reference.canonicalCode,
      colorName: reference.colorName,
      hex: reference.approximateHex,
      lab: reference.lab,
      source: 'reference',
    }
  })

  const customMatchers: MatchableMarker[] = userSet.customMarkers.map((marker) => ({
    markerCode: marker.markerCode,
    colorName: marker.colorName,
    hex: marker.hex,
    lab: marker.lab,
    source: 'custom',
  }))

  return [...referenceMatchers, ...customMatchers]
}

/**
 * The one place that imports both `color-engine/marker-matching` (pure,
 * no storage dependency) and `marker-db` (storage, no palette concept) —
 * resolves a user's marker set to its member markers and calls the pure
 * matcher, so matching logic exists exactly once for both palette flows.
 */
export async function matchAgainstSet(
  paletteHexes: HexColor[],
  userSetId: string,
  repository: MarkerRepository,
): Promise<MarkerMatchResult[]> {
  const userSet = await repository.getUserSet(userSetId)
  if (!userSet) return []

  const matchable = await resolveMatchableMarkers(userSet, repository)
  if (matchable.length === 0 || paletteHexes.length === 0) return []
  return matchPaletteToMarkerSet(paletteHexes, matchable)
}

/** User-owned sets with at least one resolvable color, labeled "Brand · Series · Set name" for the selector. */
export async function listAvailableMarkerSets(repository: MarkerRepository): Promise<MarkerSetOption[]> {
  const [brands, series, commercialSets, userSets] = await Promise.all([
    repository.listBrands(),
    repository.listSeries(),
    repository.listCommercialSets(),
    repository.listUserSets(),
  ])

  const brandName = (id: string) => brands.find((b) => b.id === id)?.name ?? ''
  const seriesName = (id?: string) => (id ? (series.find((s) => s.id === id)?.name ?? '') : '')

  const options: MarkerSetOption[] = []
  for (const userSet of userSets) {
    const availableCount = userSet.ownedMarkerReferenceIds.length + userSet.customMarkers.length
    if (availableCount === 0) continue

    const commercialSet = userSet.referenceSetId
      ? commercialSets.find((s) => s.id === userSet.referenceSetId)
      : undefined
    const label = commercialSet
      ? [brandName(commercialSet.brandId), seriesName(commercialSet.seriesId), userSet.customName]
          .filter(Boolean)
          .join(' · ')
      : userSet.customName

    options.push({ setId: userSet.id, label, availableCount })
  }
  return options
}
