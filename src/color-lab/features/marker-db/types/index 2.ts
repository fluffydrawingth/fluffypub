import type { HexColor, LabColor, RgbColor } from '@/shared/color'

export interface MarkerBrand {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface MarkerSeries {
  id: string
  brandId: string
  name: string
  createdAt: string
  updatedAt: string
}

/** Where a marker's hex value came from — never AI-generated. */
export type MarkerSourceType = 'official' | 'community' | 'estimated' | 'user'

export type AliasType = 'legacy' | 'current' | 'alternate'

/** A brand can print more than one code for the same marker over time (or across packaging) — never assumed to be exactly one old + one new. */
export interface MarkerAlias {
  code: string
  type: AliasType
  label: string
}

export type ReferenceStatus = 'active' | 'discontinued' | 'unverified'

/**
 * Read-only reference data describing what a brand publishes for one
 * physical marker. Populated only by the reference importer or the
 * dev-only admin screen — never edited directly by a normal user, never
 * invented by AI. See docs/marker-database.md.
 */
export interface MarkerReference {
  id: string
  brandId: string
  seriesId?: string
  canonicalCode: string
  colorName: string
  approximateHex: HexColor
  /** Computed automatically from approximateHex — never entered manually. */
  rgb: RgbColor
  lab: LabColor
  aliases: MarkerAlias[]
  sourceName?: string
  sourceReference?: string
  sourceVersion?: string
  status: ReferenceStatus
  createdAt: string
  updatedAt: string
}

/** A named bundle a brand sells, e.g. "Honolulu Pastel Colors 48" — a set of reference marker ids, never a duplicate of the markers themselves. */
export interface MarkerCommercialSet {
  id: string
  brandId: string
  seriesId?: string
  name: string
  markerReferenceIds: string[]
  createdAt: string
  updatedAt: string
}

/** A marker the user has that isn't in any reference library (off-brand, hand-mixed, discontinued, etc). */
export interface CustomMarker {
  id: string
  markerCode: string
  colorName: string
  hex: HexColor
  rgb: RgbColor
  lab: LabColor
  notes?: string
  createdAt: string
  updatedAt: string
}

/** The user's own physical marker doesn't quite match the published reference hex. */
export interface SwatchOverride {
  markerReferenceId: string
  hex: HexColor
  rgb: RgbColor
  lab: LabColor
  notes?: string
  updatedAt: string
}

/**
 * What a person actually owns. Optionally linked to a MarkerCommercialSet
 * (bought as a named set); tracks which reference markers are owned,
 * personal hex overrides, and fully custom markers. See
 * docs/marker-database.md.
 */
export interface UserMarkerSet {
  id: string
  referenceSetId?: string
  customName: string
  /** How many markers the physical set contains — drives "x / N owned" for reference-linked sets. */
  plannedCount?: number
  sourceType?: MarkerSourceType
  sourceReference?: string
  notes?: string
  ownedMarkerReferenceIds: string[]
  customMarkers: CustomMarker[]
  swatchOverrides: SwatchOverride[]
  createdAt: string
  updatedAt: string
}

export interface CreateMarkerBrandInput {
  name: string
}

export interface CreateMarkerSeriesInput {
  brandId: string
  name: string
}

export interface CreateMarkerReferenceInput {
  brandId: string
  seriesId?: string
  canonicalCode: string
  colorName: string
  approximateHex: HexColor
  aliases?: MarkerAlias[]
  sourceName?: string
  sourceReference?: string
  sourceVersion?: string
  status?: ReferenceStatus
}

export type UpdateMarkerReferenceInput = Partial<Omit<CreateMarkerReferenceInput, 'brandId' | 'seriesId'>>

export interface CreateMarkerCommercialSetInput {
  brandId: string
  seriesId?: string
  name: string
  markerReferenceIds?: string[]
}

export type UpdateMarkerCommercialSetInput = Partial<
  Omit<CreateMarkerCommercialSetInput, 'brandId' | 'seriesId'>
>

export interface CreateUserMarkerSetInput {
  referenceSetId?: string
  customName: string
  plannedCount?: number
  sourceType?: MarkerSourceType
  sourceReference?: string
  notes?: string
  /** Reference markers owned at creation time — defaults to all of the linked commercial set's markers. */
  ownedMarkerReferenceIds?: string[]
}

export type UpdateUserMarkerSetInput = Partial<
  Omit<CreateUserMarkerSetInput, 'referenceSetId' | 'ownedMarkerReferenceIds'>
>

export interface CreateCustomMarkerInput {
  markerCode: string
  colorName: string
  hex: HexColor
  notes?: string
}

export type UpdateCustomMarkerInput = Partial<CreateCustomMarkerInput>

export interface MarkerReferenceFilter {
  brandId?: string
  seriesId?: string
  search?: string
}

export interface SeriesFilter {
  brandId?: string
}

export interface CommercialSetFilter {
  brandId?: string
  seriesId?: string
}
