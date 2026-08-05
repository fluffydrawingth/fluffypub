import type { HexColor } from '@/shared/color'
import type {
  CommercialSetFilter,
  CreateCustomMarkerInput,
  CreateMarkerBrandInput,
  CreateMarkerCommercialSetInput,
  CreateMarkerReferenceInput,
  CreateMarkerSeriesInput,
  CreateUserMarkerSetInput,
  MarkerBrand,
  MarkerCommercialSet,
  MarkerReference,
  MarkerReferenceFilter,
  MarkerSeries,
  SeriesFilter,
  UpdateCustomMarkerInput,
  UpdateMarkerCommercialSetInput,
  UpdateMarkerReferenceInput,
  UpdateUserMarkerSetInput,
  UserMarkerSet,
} from '../types'

export interface MarkerDbExport {
  brands: MarkerBrand[]
  series: MarkerSeries[]
  references: MarkerReference[]
  commercialSets: MarkerCommercialSet[]
  userSets: UserMarkerSet[]
}

/**
 * Storage-agnostic contract. `LocalJsonMarkerRepository` is the only
 * implementation today; a future `SupabaseMarkerRepository` implementing
 * the same interface would require no changes to services/components/UI.
 * See docs/marker-database.md for the two-tier reference-library +
 * user-set model this interface serves.
 */
export interface MarkerRepository {
  listBrands(): Promise<MarkerBrand[]>
  getBrand(id: string): Promise<MarkerBrand | null>
  createBrand(input: CreateMarkerBrandInput): Promise<MarkerBrand>
  updateBrand(id: string, patch: Partial<CreateMarkerBrandInput>): Promise<MarkerBrand>
  deleteBrand(id: string): Promise<void>

  listSeries(filter?: SeriesFilter): Promise<MarkerSeries[]>
  getSeries(id: string): Promise<MarkerSeries | null>
  createSeries(input: CreateMarkerSeriesInput): Promise<MarkerSeries>
  updateSeries(id: string, patch: Partial<CreateMarkerSeriesInput>): Promise<MarkerSeries>
  deleteSeries(id: string): Promise<void>

  // ---- Reference library (read-only for normal users; written by the importer/admin screen) ----

  listReferences(filter?: MarkerReferenceFilter): Promise<MarkerReference[]>
  getReference(id: string): Promise<MarkerReference | null>
  /** Matches canonical code OR any alias code, case-insensitive, scoped to brand(+series). Never guesses. */
  findReferenceByAnyCode(
    brandId: string,
    seriesId: string | undefined,
    code: string,
  ): Promise<MarkerReference | null>
  createReference(input: CreateMarkerReferenceInput): Promise<MarkerReference>
  updateReference(id: string, patch: UpdateMarkerReferenceInput): Promise<MarkerReference>
  deleteReference(id: string): Promise<void>

  // ---- Commercial sets (what a brand sells as a bundle) ----

  listCommercialSets(filter?: CommercialSetFilter): Promise<MarkerCommercialSet[]>
  getCommercialSet(id: string): Promise<MarkerCommercialSet | null>
  createCommercialSet(input: CreateMarkerCommercialSetInput): Promise<MarkerCommercialSet>
  updateCommercialSet(id: string, patch: UpdateMarkerCommercialSetInput): Promise<MarkerCommercialSet>
  deleteCommercialSet(id: string): Promise<void>
  /** Adds reference ids to a commercial set's membership (dedup — a marker is never duplicated). */
  addReferencesToCommercialSet(commercialSetId: string, markerReferenceIds: string[]): Promise<MarkerCommercialSet>

  // ---- User-owned sets ----

  listUserSets(): Promise<UserMarkerSet[]>
  getUserSet(id: string): Promise<UserMarkerSet | null>
  createUserSet(input: CreateUserMarkerSetInput): Promise<UserMarkerSet>
  updateUserSet(id: string, patch: UpdateUserMarkerSetInput): Promise<UserMarkerSet>
  deleteUserSet(id: string): Promise<void>

  /** Marks a reference marker owned/not-owned within a user set. */
  setReferenceOwned(userSetId: string, markerReferenceId: string, owned: boolean): Promise<UserMarkerSet>
  /** Sets (hex given) or clears (hex null — "reset to reference") a personal swatch override. */
  setSwatchOverride(
    userSetId: string,
    markerReferenceId: string,
    hex: HexColor | null,
    notes?: string,
  ): Promise<UserMarkerSet>

  addCustomMarker(userSetId: string, input: CreateCustomMarkerInput): Promise<UserMarkerSet>
  /** Same as calling `addCustomMarker` once per input, but as a single read-modify-write — for bulk CSV/JSON imports, so N rows costs one round trip instead of N. */
  addCustomMarkers(userSetId: string, inputs: CreateCustomMarkerInput[]): Promise<UserMarkerSet>
  updateCustomMarker(
    userSetId: string,
    customMarkerId: string,
    patch: UpdateCustomMarkerInput,
  ): Promise<UserMarkerSet>
  removeCustomMarker(userSetId: string, customMarkerId: string): Promise<UserMarkerSet>

  exportAll(): Promise<MarkerDbExport>
  /** Upserts by id (adds new records, replaces existing ones with matching ids) — used for JSON backup/restore. */
  importAll(data: MarkerDbExport): Promise<void>
}
