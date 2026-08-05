import { getDefaultStorage, type KeyValueStorage } from '@/shared/storage'
import { hexToRgb, rgbToLab, type HexColor } from '@/shared/color'
import { isValidHex } from '../validation/hexValidation'
import type {
  CommercialSetFilter,
  CreateCustomMarkerInput,
  CreateMarkerBrandInput,
  CreateMarkerCommercialSetInput,
  CreateMarkerReferenceInput,
  CreateMarkerSeriesInput,
  CreateUserMarkerSetInput,
  CustomMarker,
  MarkerBrand,
  MarkerCommercialSet,
  MarkerReference,
  MarkerReferenceFilter,
  MarkerSeries,
  SeriesFilter,
  SwatchOverride,
  UpdateCustomMarkerInput,
  UpdateMarkerCommercialSetInput,
  UpdateMarkerReferenceInput,
  UpdateUserMarkerSetInput,
  UserMarkerSet,
} from '../types'
import type { MarkerDbExport, MarkerRepository } from './MarkerRepository'

export const MARKER_DB_STORAGE_KEY = 'fluffy-color-lab:marker-db'
export const MARKER_DB_SCHEMA_VERSION = 1

interface MarkerDbData extends MarkerDbExport {
  schemaVersion: number
}

function emptyData(): MarkerDbData {
  return {
    schemaVersion: MARKER_DB_SCHEMA_VERSION,
    brands: [],
    series: [],
    references: [],
    commercialSets: [],
    userSets: [],
  }
}

function now(): string {
  return new Date().toISOString()
}

function generateId(): string {
  return crypto.randomUUID()
}

function hexFields(hex: HexColor) {
  const rgb = hexToRgb(hex)
  return { rgb, lab: rgbToLab(rgb) }
}

export class LocalJsonMarkerRepository implements MarkerRepository {
  private readonly storage: KeyValueStorage
  private readonly storageKey: string

  constructor(storage: KeyValueStorage = getDefaultStorage(), storageKey: string = MARKER_DB_STORAGE_KEY) {
    this.storage = storage
    this.storageKey = storageKey
  }

  private read(): MarkerDbData {
    const raw = this.storage.getItem(this.storageKey)
    if (!raw) return emptyData()
    try {
      const parsed = JSON.parse(raw) as Partial<MarkerDbData>
      // Pre-v1.0 data used a different (single-tier) shape — not recognized here,
      // see docs/v1-checklist.md "Known limitations".
      if (parsed.schemaVersion !== MARKER_DB_SCHEMA_VERSION) return emptyData()
      return {
        schemaVersion: MARKER_DB_SCHEMA_VERSION,
        brands: parsed.brands ?? [],
        series: parsed.series ?? [],
        references: parsed.references ?? [],
        commercialSets: parsed.commercialSets ?? [],
        userSets: parsed.userSets ?? [],
      }
    } catch {
      return emptyData()
    }
  }

  private write(data: MarkerDbData): void {
    this.storage.setItem(this.storageKey, JSON.stringify(data))
  }

  private requireUserSet(data: MarkerDbData, id: string): UserMarkerSet {
    const userSet = data.userSets.find((s) => s.id === id)
    if (!userSet) throw new Error(`User marker set not found: ${id}`)
    return userSet
  }

  // ---- Brands ----

  async listBrands(): Promise<MarkerBrand[]> {
    return this.read().brands
  }

  async getBrand(id: string): Promise<MarkerBrand | null> {
    return this.read().brands.find((b) => b.id === id) ?? null
  }

  async createBrand(input: CreateMarkerBrandInput): Promise<MarkerBrand> {
    const data = this.read()
    const brand: MarkerBrand = { id: generateId(), name: input.name, createdAt: now(), updatedAt: now() }
    data.brands.push(brand)
    this.write(data)
    return brand
  }

  async updateBrand(id: string, patch: Partial<CreateMarkerBrandInput>): Promise<MarkerBrand> {
    const data = this.read()
    const brand = data.brands.find((b) => b.id === id)
    if (!brand) throw new Error(`Brand not found: ${id}`)
    Object.assign(brand, patch, { updatedAt: now() })
    this.write(data)
    return brand
  }

  async deleteBrand(id: string): Promise<void> {
    const data = this.read()
    data.brands = data.brands.filter((b) => b.id !== id)
    data.series = data.series.filter((s) => s.brandId !== id)
    data.references = data.references.filter((r) => r.brandId !== id)
    data.commercialSets = data.commercialSets.filter((s) => s.brandId !== id)
    this.write(data)
  }

  // ---- Series ----

  async listSeries(filter?: SeriesFilter): Promise<MarkerSeries[]> {
    const series = this.read().series
    return filter?.brandId ? series.filter((s) => s.brandId === filter.brandId) : series
  }

  async getSeries(id: string): Promise<MarkerSeries | null> {
    return this.read().series.find((s) => s.id === id) ?? null
  }

  async createSeries(input: CreateMarkerSeriesInput): Promise<MarkerSeries> {
    const data = this.read()
    const series: MarkerSeries = {
      id: generateId(),
      brandId: input.brandId,
      name: input.name,
      createdAt: now(),
      updatedAt: now(),
    }
    data.series.push(series)
    this.write(data)
    return series
  }

  async updateSeries(id: string, patch: Partial<CreateMarkerSeriesInput>): Promise<MarkerSeries> {
    const data = this.read()
    const series = data.series.find((s) => s.id === id)
    if (!series) throw new Error(`Series not found: ${id}`)
    Object.assign(series, patch, { updatedAt: now() })
    this.write(data)
    return series
  }

  async deleteSeries(id: string): Promise<void> {
    const data = this.read()
    data.series = data.series.filter((s) => s.id !== id)
    data.references = data.references.filter((r) => r.seriesId !== id)
    data.commercialSets = data.commercialSets.filter((s) => s.seriesId !== id)
    this.write(data)
  }

  // ---- Reference library ----

  async listReferences(filter?: MarkerReferenceFilter): Promise<MarkerReference[]> {
    let references = this.read().references
    if (filter?.brandId) references = references.filter((r) => r.brandId === filter.brandId)
    if (filter?.seriesId) references = references.filter((r) => r.seriesId === filter.seriesId)
    if (filter?.search) {
      const search = filter.search.toLowerCase()
      references = references.filter(
        (r) =>
          r.canonicalCode.toLowerCase().includes(search) ||
          r.colorName.toLowerCase().includes(search) ||
          r.aliases.some((a) => a.code.toLowerCase().includes(search)),
      )
    }
    return references
  }

  async getReference(id: string): Promise<MarkerReference | null> {
    return this.read().references.find((r) => r.id === id) ?? null
  }

  async findReferenceByAnyCode(
    brandId: string,
    seriesId: string | undefined,
    code: string,
  ): Promise<MarkerReference | null> {
    const target = code.trim().toLowerCase()
    if (!target) return null
    const references = this.read().references.filter(
      (r) => r.brandId === brandId && r.seriesId === seriesId,
    )
    return (
      references.find(
        (r) =>
          r.canonicalCode.toLowerCase() === target ||
          r.aliases.some((a) => a.code.toLowerCase() === target),
      ) ?? null
    )
  }

  async createReference(input: CreateMarkerReferenceInput): Promise<MarkerReference> {
    if (!isValidHex(input.approximateHex)) throw new Error(`Invalid hex value: ${input.approximateHex}`)
    const data = this.read()
    const reference: MarkerReference = {
      id: generateId(),
      brandId: input.brandId,
      seriesId: input.seriesId,
      canonicalCode: input.canonicalCode,
      colorName: input.colorName,
      approximateHex: input.approximateHex,
      ...hexFields(input.approximateHex),
      aliases: input.aliases ?? [],
      sourceName: input.sourceName,
      sourceReference: input.sourceReference,
      sourceVersion: input.sourceVersion,
      status: input.status ?? 'active',
      createdAt: now(),
      updatedAt: now(),
    }
    data.references.push(reference)
    this.write(data)
    return reference
  }

  async updateReference(id: string, patch: UpdateMarkerReferenceInput): Promise<MarkerReference> {
    const data = this.read()
    const reference = data.references.find((r) => r.id === id)
    if (!reference) throw new Error(`Reference not found: ${id}`)
    if (patch.approximateHex && !isValidHex(patch.approximateHex)) {
      throw new Error(`Invalid hex value: ${patch.approximateHex}`)
    }
    Object.assign(reference, patch, { updatedAt: now() })
    if (patch.approximateHex) Object.assign(reference, hexFields(patch.approximateHex))
    this.write(data)
    return reference
  }

  async deleteReference(id: string): Promise<void> {
    const data = this.read()
    data.references = data.references.filter((r) => r.id !== id)
    for (const set of data.commercialSets) {
      set.markerReferenceIds = set.markerReferenceIds.filter((refId) => refId !== id)
    }
    for (const userSet of data.userSets) {
      userSet.ownedMarkerReferenceIds = userSet.ownedMarkerReferenceIds.filter((refId) => refId !== id)
      userSet.swatchOverrides = userSet.swatchOverrides.filter((o) => o.markerReferenceId !== id)
    }
    this.write(data)
  }

  // ---- Commercial sets ----

  async listCommercialSets(filter?: CommercialSetFilter): Promise<MarkerCommercialSet[]> {
    let sets = this.read().commercialSets
    if (filter?.brandId) sets = sets.filter((s) => s.brandId === filter.brandId)
    if (filter?.seriesId) sets = sets.filter((s) => s.seriesId === filter.seriesId)
    return sets
  }

  async getCommercialSet(id: string): Promise<MarkerCommercialSet | null> {
    return this.read().commercialSets.find((s) => s.id === id) ?? null
  }

  async createCommercialSet(input: CreateMarkerCommercialSetInput): Promise<MarkerCommercialSet> {
    const data = this.read()
    const set: MarkerCommercialSet = {
      id: generateId(),
      brandId: input.brandId,
      seriesId: input.seriesId,
      name: input.name,
      markerReferenceIds: input.markerReferenceIds ?? [],
      createdAt: now(),
      updatedAt: now(),
    }
    data.commercialSets.push(set)
    this.write(data)
    return set
  }

  async updateCommercialSet(id: string, patch: UpdateMarkerCommercialSetInput): Promise<MarkerCommercialSet> {
    const data = this.read()
    const set = data.commercialSets.find((s) => s.id === id)
    if (!set) throw new Error(`Commercial set not found: ${id}`)
    Object.assign(set, patch, { updatedAt: now() })
    this.write(data)
    return set
  }

  async deleteCommercialSet(id: string): Promise<void> {
    const data = this.read()
    data.commercialSets = data.commercialSets.filter((s) => s.id !== id)
    this.write(data)
  }

  async addReferencesToCommercialSet(
    commercialSetId: string,
    markerReferenceIds: string[],
  ): Promise<MarkerCommercialSet> {
    const data = this.read()
    const set = data.commercialSets.find((s) => s.id === commercialSetId)
    if (!set) throw new Error(`Commercial set not found: ${commercialSetId}`)
    for (const refId of markerReferenceIds) {
      if (!set.markerReferenceIds.includes(refId)) set.markerReferenceIds.push(refId)
    }
    set.updatedAt = now()
    this.write(data)
    return set
  }

  // ---- User-owned sets ----

  async listUserSets(): Promise<UserMarkerSet[]> {
    return this.read().userSets
  }

  async getUserSet(id: string): Promise<UserMarkerSet | null> {
    return this.read().userSets.find((s) => s.id === id) ?? null
  }

  async createUserSet(input: CreateUserMarkerSetInput): Promise<UserMarkerSet> {
    const data = this.read()

    let ownedMarkerReferenceIds = input.ownedMarkerReferenceIds ?? []
    if (input.referenceSetId && !input.ownedMarkerReferenceIds) {
      const commercialSet = data.commercialSets.find((s) => s.id === input.referenceSetId)
      // Default: owning the named set means owning every marker in it.
      ownedMarkerReferenceIds = commercialSet?.markerReferenceIds ?? []
    }

    const userSet: UserMarkerSet = {
      id: generateId(),
      referenceSetId: input.referenceSetId,
      customName: input.customName,
      plannedCount: input.plannedCount,
      sourceType: input.sourceType,
      sourceReference: input.sourceReference,
      notes: input.notes,
      ownedMarkerReferenceIds,
      customMarkers: [],
      swatchOverrides: [],
      createdAt: now(),
      updatedAt: now(),
    }
    data.userSets.push(userSet)
    this.write(data)
    return userSet
  }

  async updateUserSet(id: string, patch: UpdateUserMarkerSetInput): Promise<UserMarkerSet> {
    const data = this.read()
    const userSet = this.requireUserSet(data, id)
    Object.assign(userSet, patch, { updatedAt: now() })
    this.write(data)
    return userSet
  }

  async deleteUserSet(id: string): Promise<void> {
    const data = this.read()
    data.userSets = data.userSets.filter((s) => s.id !== id)
    this.write(data)
  }

  async setReferenceOwned(userSetId: string, markerReferenceId: string, owned: boolean): Promise<UserMarkerSet> {
    const data = this.read()
    const userSet = this.requireUserSet(data, userSetId)
    const isOwned = userSet.ownedMarkerReferenceIds.includes(markerReferenceId)
    if (owned && !isOwned) userSet.ownedMarkerReferenceIds.push(markerReferenceId)
    if (!owned && isOwned) {
      userSet.ownedMarkerReferenceIds = userSet.ownedMarkerReferenceIds.filter(
        (id) => id !== markerReferenceId,
      )
    }
    userSet.updatedAt = now()
    this.write(data)
    return userSet
  }

  async setSwatchOverride(
    userSetId: string,
    markerReferenceId: string,
    hex: HexColor | null,
    notes?: string,
  ): Promise<UserMarkerSet> {
    const data = this.read()
    const userSet = this.requireUserSet(data, userSetId)

    if (hex === null) {
      userSet.swatchOverrides = userSet.swatchOverrides.filter((o) => o.markerReferenceId !== markerReferenceId)
    } else {
      if (!isValidHex(hex)) throw new Error(`Invalid hex value: ${hex}`)
      const override: SwatchOverride = {
        markerReferenceId,
        hex,
        ...hexFields(hex),
        notes,
        updatedAt: now(),
      }
      const existingIndex = userSet.swatchOverrides.findIndex((o) => o.markerReferenceId === markerReferenceId)
      if (existingIndex >= 0) userSet.swatchOverrides[existingIndex] = override
      else userSet.swatchOverrides.push(override)
    }

    userSet.updatedAt = now()
    this.write(data)
    return userSet
  }

  async addCustomMarker(userSetId: string, input: CreateCustomMarkerInput): Promise<UserMarkerSet> {
    if (!isValidHex(input.hex)) throw new Error(`Invalid hex value: ${input.hex}`)
    const data = this.read()
    const userSet = this.requireUserSet(data, userSetId)
    const marker: CustomMarker = {
      id: generateId(),
      markerCode: input.markerCode,
      colorName: input.colorName,
      hex: input.hex,
      ...hexFields(input.hex),
      notes: input.notes,
      createdAt: now(),
      updatedAt: now(),
    }
    userSet.customMarkers.push(marker)
    userSet.updatedAt = now()
    this.write(data)
    return userSet
  }

  async addCustomMarkers(userSetId: string, inputs: CreateCustomMarkerInput[]): Promise<UserMarkerSet> {
    for (const input of inputs) {
      if (!isValidHex(input.hex)) throw new Error(`Invalid hex value: ${input.hex}`)
    }
    const data = this.read()
    const userSet = this.requireUserSet(data, userSetId)
    for (const input of inputs) {
      const marker: CustomMarker = {
        id: generateId(),
        markerCode: input.markerCode,
        colorName: input.colorName,
        hex: input.hex,
        ...hexFields(input.hex),
        notes: input.notes,
        createdAt: now(),
        updatedAt: now(),
      }
      userSet.customMarkers.push(marker)
    }
    userSet.updatedAt = now()
    this.write(data)
    return userSet
  }

  async updateCustomMarker(
    userSetId: string,
    customMarkerId: string,
    patch: UpdateCustomMarkerInput,
  ): Promise<UserMarkerSet> {
    const data = this.read()
    const userSet = this.requireUserSet(data, userSetId)
    const marker = userSet.customMarkers.find((m) => m.id === customMarkerId)
    if (!marker) throw new Error(`Custom marker not found: ${customMarkerId}`)
    if (patch.hex && !isValidHex(patch.hex)) throw new Error(`Invalid hex value: ${patch.hex}`)
    Object.assign(marker, patch, { updatedAt: now() })
    if (patch.hex) Object.assign(marker, hexFields(patch.hex))
    userSet.updatedAt = now()
    this.write(data)
    return userSet
  }

  async removeCustomMarker(userSetId: string, customMarkerId: string): Promise<UserMarkerSet> {
    const data = this.read()
    const userSet = this.requireUserSet(data, userSetId)
    userSet.customMarkers = userSet.customMarkers.filter((m) => m.id !== customMarkerId)
    userSet.updatedAt = now()
    this.write(data)
    return userSet
  }

  async exportAll(): Promise<MarkerDbExport> {
    const { schemaVersion: _schemaVersion, ...rest } = this.read()
    return rest
  }

  async importAll(incoming: MarkerDbExport): Promise<void> {
    const data = this.read()
    data.brands = upsertById(data.brands, incoming.brands)
    data.series = upsertById(data.series, incoming.series)
    data.references = upsertById(data.references, incoming.references)
    data.commercialSets = upsertById(data.commercialSets, incoming.commercialSets)
    data.userSets = upsertById(data.userSets, incoming.userSets)
    this.write(data)
  }
}

function upsertById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const byId = new Map(existing.map((item) => [item.id, item]))
  for (const item of incoming) byId.set(item.id, item)
  return Array.from(byId.values())
}
