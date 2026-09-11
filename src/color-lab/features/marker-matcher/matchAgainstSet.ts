import { matchPaletteToMarkerSet, type MarkerMatchResult, type MatchableMarker } from '@/features/color-engine'
import type {
  MarkerBrand,
  MarkerCommercialSet,
  MarkerReference,
  MarkerRepository,
  MarkerSeries,
  UserMarkerSet,
} from '@/features/marker-db'
import type { HexColor } from '@/shared/color'
import type { MarkerSetOption } from './types'

/**
 * "Brand · Series · Set name" (or just the custom name for a set with no
 * commercial reference) — the one place this label is built, shared by
 * the selector (listAvailableMarkerSets) and match results
 * (resolveMatchableMarkers's setLabel), so a matched marker can say which
 * physical set to reach for using the exact same label the picker showed.
 */
function labelForUserSet(
  userSet: UserMarkerSet,
  commercialSets: MarkerCommercialSet[],
  brands: MarkerBrand[],
  series: MarkerSeries[],
): string {
  const brandName = (id: string) => brands.find((b) => b.id === id)?.name ?? ''
  const seriesName = (id?: string) => (id ? (series.find((s) => s.id === id)?.name ?? '') : '')

  const commercialSet = userSet.referenceSetId
    ? commercialSets.find((s) => s.id === userSet.referenceSetId)
    : undefined
  return commercialSet
    ? [brandName(commercialSet.brandId), seriesName(commercialSet.seriesId), userSet.customName]
        .filter(Boolean)
        .join(' · ')
    : userSet.customName
}

/**
 * Resolves a user's marker set into matchable markers, one per owned
 * reference (or custom marker), preferring — in order — a personal swatch
 * override, then the marker's own stored hex (custom markers only have
 * this), then the reference library's approximate hex. See
 * docs/algorithms.md. `setLabel` is stamped onto every resolved marker so
 * a pooled match result (see matchAgainstSets) can still say which set it
 * came from.
 */
async function resolveMatchableMarkers(
  userSet: UserMarkerSet,
  setLabel: string,
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
        setLabel,
      }
    }
    return {
      markerCode: reference.canonicalCode,
      colorName: reference.colorName,
      hex: reference.approximateHex,
      lab: reference.lab,
      source: 'reference',
      setLabel,
    }
  })

  const customMatchers: MatchableMarker[] = userSet.customMarkers.map((marker) => ({
    markerCode: marker.markerCode,
    colorName: marker.colorName,
    hex: marker.hex,
    lab: marker.lab,
    source: 'custom',
    setLabel,
  }))

  return [...referenceMatchers, ...customMatchers]
}

/**
 * The one place that imports both `color-engine/marker-matching` (pure,
 * no storage dependency) and `marker-db` (storage, no palette concept) —
 * resolves one or more of a user's marker sets to their member markers
 * and calls the pure matcher once against the pooled list, so matching
 * logic exists exactly once for both palette flows. Pooling (rather than
 * matching each set separately and picking the best per-set result) is
 * the same problem either way — the pure matcher is already just "find
 * the closest marker in this list" — so someone who owns several sets
 * gets one combined "closest marker you actually own, across everything
 * selected" answer instead of a result to sort through per set.
 */
export async function matchAgainstSets(
  paletteHexes: HexColor[],
  userSetIds: string[],
  repository: MarkerRepository,
): Promise<MarkerMatchResult[]> {
  const [userSets, brands, series, commercialSets] = await Promise.all([
    Promise.all(userSetIds.map((id) => repository.getUserSet(id))).then((sets) =>
      sets.filter((set): set is UserMarkerSet => set !== null),
    ),
    repository.listBrands(),
    repository.listSeries(),
    repository.listCommercialSets(),
  ])
  const matchable = (
    await Promise.all(
      userSets.map((set) => resolveMatchableMarkers(set, labelForUserSet(set, commercialSets, brands, series), repository)),
    )
  ).flat()
  if (matchable.length === 0 || paletteHexes.length === 0) return []
  return matchPaletteToMarkerSet(paletteHexes, matchable)
}

/** Single-set convenience wrapper around {@link matchAgainstSets} — kept for callers matching against exactly one set. */
export async function matchAgainstSet(
  paletteHexes: HexColor[],
  userSetId: string,
  repository: MarkerRepository,
): Promise<MarkerMatchResult[]> {
  return matchAgainstSets(paletteHexes, [userSetId], repository)
}

/** User-owned sets with at least one resolvable color, labeled "Brand · Series · Set name" for the selector. */
export async function listAvailableMarkerSets(repository: MarkerRepository): Promise<MarkerSetOption[]> {
  const [brands, series, commercialSets, userSets] = await Promise.all([
    repository.listBrands(),
    repository.listSeries(),
    repository.listCommercialSets(),
    repository.listUserSets(),
  ])

  const options: MarkerSetOption[] = []
  for (const userSet of userSets) {
    const availableCount = userSet.ownedMarkerReferenceIds.length + userSet.customMarkers.length
    if (availableCount === 0) continue

    options.push({
      setId: userSet.id,
      label: labelForUserSet(userSet, commercialSets, brands, series),
      availableCount,
    })
  }
  return options
}
