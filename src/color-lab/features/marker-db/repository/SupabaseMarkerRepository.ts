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

function authHeaders(): Record<string, string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('fluffy_token') : null
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

/**
 * Fluffy Pub-specific: same read-mutate-write shape as
 * `LocalJsonMarkerRepository`, but the whole-blob read/write goes to
 * `/api/color-lab?resource=markers` (Supabase-backed, admin-gated on
 * write) instead of `localStorage` — so the reference library and
 * marker sets an admin uploads are real, shared, site-wide data. See
 * docs/integration-with-fluffypub.md ("Storage adapter replacement") in
 * fluffy-color-lab, and the migration at
 * fluffypub/scripts/migrate_color_lab.sql.
 *
 * One row in Supabase holds the whole blob (mirrors the localStorage
 * shape exactly) rather than a normalized per-entity schema — there is
 * exactly one admin managing this data, so a last-write-wins whole-blob
 * replace is simpler and lower-risk than a full relational rewrite, while
 * still being durable, shared Supabase data instead of per-browser
 * storage.
 */
export class SupabaseMarkerRepository implements MarkerRepository {
  private readonly endpoint = '/api/color-lab?resource=markers'

  private async read(): Promise<MarkerDbData> {
    // Network failures (API unreachable, offline) degrade to an empty set
    // rather than throwing — matching bounds are just unavailable, never
    // a crash. Real fetch errors reject the promise, not just non-ok
    // responses, so this needs a try/catch, not only an `!res.ok` check.
    let data: Partial<MarkerDbData> | null
    try {
      const res = await fetch(this.endpoint)
      if (!res.ok) return emptyData()
      data = (await res.json()) as Partial<MarkerDbData> | null
    } catch {
      return emptyData()
    }
    if (!data || typeof data !== 'object') return emptyData()
    return {
      schemaVersion: MARKER_DB_SCHEMA_VERSION,
      brands: data.brands ?? [],
      series: data.series ?? [],
      references: data.references ?? [],
      commercialSets: data.commercialSets ?? [],
      userSets: data.userSets ?? [],
    }
  }

  private async write(data: MarkerDbData): Promise<void> {
    const res = await fetch(this.endpoint, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `Failed to save marker data (${res.status})`)
    }
  }

  private requireUserSet(data: MarkerDbData, id: string): UserMarkerSet {
    const userSet = data.userSets.find((s) => s.id === id)
    if (!userSet) throw new Error(`User marker set not found: ${id}`)
    return userSet
  }

  // ---- Brands ----

  async listBrands(): Promise<MarkerBrand[]> {
    return (await this.read()).brands
  }

  async getBrand(id: string): Promise<MarkerBrand | null> {
    return (await this.read()).brands.find((b) => b.id === id) ?? null
  }

  async createBrand(input: CreateMarkerBrandInput): Promise<MarkerBrand> {
    const data = await this.read()
    const brand: MarkerBrand = { id: generateId(), name: input.name, createdAt: now(), updatedAt: now() }
    data.brands.push(brand)
    await this.write(data)
    return brand
  }

  async updateBrand(id: string, patch: Partial<CreateMarkerBrandInput>): Promise<MarkerBrand> {
    const data = await this.read()
    const brand = data.brands.find((b) => b.id === id)
    if (!brand) throw new Error(`Brand not found: ${id}`)
    Object.assign(brand, patch, { updatedAt: now() })
    await this.write(data)
    return brand
  }

  async deleteBrand(id: string): Promise<void> {
    const data = await this.read()
    data.brands = data.brands.filter((b) => b.id !== id)
    data.series = data.series.filter((s) => s.brandId !== id)
    data.references = data.references.filter((r) => r.brandId !== id)
    data.commercialSets = data.commercialSets.filter((s) => s.brandId !== id)
    await this.write(data)
  }

  // ---- Series ----

  async listSeries(filter?: SeriesFilter): Promise<MarkerSeries[]> {
    const series = (await this.read()).series
    return filter?.brandId ? series.filter((s) => s.brandId === filter.brandId) : series
  }

  async getSeries(id: string): Promise<MarkerSeries | null> {
    return (await this.read()).series.find((s) => s.id === id) ?? null
  }

  async createSeries(input: CreateMarkerSeriesInput): Promise<MarkerSeries> {
    const data = await this.read()
    const series: MarkerSeries = {
      id: generateId(),
      brandId: input.brandId,
      name: input.name,
      createdAt: now(),
      updatedAt: now(),
    }
    data.series.push(series)
    await this.write(data)
    return series
  }

  async updateSeries(id: string, patch: Partial<CreateMarkerSeriesInput>): Promise<MarkerSeries> {
    const data = await this.read()
    const series = data.series.find((s) => s.id === id)
    if (!series) throw new Error(`Series not found: ${id}`)
    Object.assign(series, patch, { updatedAt: now() })
    await this.write(data)
    return series
  }

  async deleteSeries(id: string): Promise<void> {
    const data = await this.read()
    data.series = data.series.filter((s) => s.id !== id)
    data.references = data.references.filter((r) => r.seriesId !== id)
    data.commercialSets = data.commercialSets.filter((s) => s.seriesId !== id)
    await this.write(data)
  }

  // ---- Reference library ----

  async listReferences(filter?: MarkerReferenceFilter): Promise<MarkerReference[]> {
    let references = (await this.read()).references
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
    return (await this.read()).references.find((r) => r.id === id) ?? null
  }

  async findReferenceByAnyCode(
    brandId: string,
    seriesId: string | undefined,
    code: string,
  ): Promise<MarkerReference | null> {
    const target = code.trim().toLowerCase()
    if (!target) return null
    const references = (await this.read()).references.filter(
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
    const data = await this.read()
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
    await this.write(data)
    return reference
  }

  async updateReference(id: string, patch: UpdateMarkerReferenceInput): Promise<MarkerReference> {
    const data = await this.read()
    const reference = data.references.find((r) => r.id === id)
    if (!reference) throw new Error(`Reference not found: ${id}`)
    if (patch.approximateHex && !isValidHex(patch.approximateHex)) {
      throw new Error(`Invalid hex value: ${patch.approximateHex}`)
    }
    Object.assign(reference, patch, { updatedAt: now() })
    if (patch.approximateHex) Object.assign(reference, hexFields(patch.approximateHex))
    await this.write(data)
    return reference
  }

  async deleteReference(id: string): Promise<void> {
    const data = await this.read()
    data.references = data.references.filter((r) => r.id !== id)
    for (const set of data.commercialSets) {
      set.markerReferenceIds = set.markerReferenceIds.filter((refId) => refId !== id)
    }
    for (const userSet of data.userSets) {
      userSet.ownedMarkerReferenceIds = userSet.ownedMarkerReferenceIds.filter((refId) => refId !== id)
      userSet.swatchOverrides = userSet.swatchOverrides.filter((o) => o.markerReferenceId !== id)
    }
    await this.write(data)
  }

  // ---- Commercial sets ----

  async listCommercialSets(filter?: CommercialSetFilter): Promise<MarkerCommercialSet[]> {
    let sets = (await this.read()).commercialSets
    if (filter?.brandId) sets = sets.filter((s) => s.brandId === filter.brandId)
    if (filter?.seriesId) sets = sets.filter((s) => s.seriesId === filter.seriesId)
    return sets
  }

  async getCommercialSet(id: string): Promise<MarkerCommercialSet | null> {
    return (await this.read()).commercialSets.find((s) => s.id === id) ?? null
  }

  async createCommercialSet(input: CreateMarkerCommercialSetInput): Promise<MarkerCommercialSet> {
    const data = await this.read()
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
    await this.write(data)
    return set
  }

  async updateCommercialSet(id: string, patch: UpdateMarkerCommercialSetInput): Promise<MarkerCommercialSet> {
    const data = await this.read()
    const set = data.commercialSets.find((s) => s.id === id)
    if (!set) throw new Error(`Commercial set not found: ${id}`)
    Object.assign(set, patch, { updatedAt: now() })
    await this.write(data)
    return set
  }

  async deleteCommercialSet(id: string): Promise<void> {
    const data = await this.read()
    data.commercialSets = data.commercialSets.filter((s) => s.id !== id)
    await this.write(data)
  }

  async addReferencesToCommercialSet(
    commercialSetId: string,
    markerReferenceIds: string[],
  ): Promise<MarkerCommercialSet> {
    const data = await this.read()
    const set = data.commercialSets.find((s) => s.id === commercialSetId)
    if (!set) throw new Error(`Commercial set not found: ${commercialSetId}`)
    for (const refId of markerReferenceIds) {
      if (!set.markerReferenceIds.includes(refId)) set.markerReferenceIds.push(refId)
    }
    set.updatedAt = now()
    await this.write(data)
    return set
  }

  // ---- User-owned sets ----

  async listUserSets(): Promise<UserMarkerSet[]> {
    return (await this.read()).userSets
  }

  async getUserSet(id: string): Promise<UserMarkerSet | null> {
    return (await this.read()).userSets.find((s) => s.id === id) ?? null
  }

  async createUserSet(input: CreateUserMarkerSetInput): Promise<UserMarkerSet> {
    const data = await this.read()

    let ownedMarkerReferenceIds = input.ownedMarkerReferenceIds ?? []
    if (input.referenceSetId && !input.ownedMarkerReferenceIds) {
      const commercialSet = data.commercialSets.find((s) => s.id === input.referenceSetId)
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
    await this.write(data)
    return userSet
  }

  async updateUserSet(id: string, patch: UpdateUserMarkerSetInput): Promise<UserMarkerSet> {
    const data = await this.read()
    const userSet = this.requireUserSet(data, id)
    Object.assign(userSet, patch, { updatedAt: now() })
    await this.write(data)
    return userSet
  }

  async deleteUserSet(id: string): Promise<void> {
    const data = await this.read()
    data.userSets = data.userSets.filter((s) => s.id !== id)
    await this.write(data)
  }

  async setReferenceOwned(userSetId: string, markerReferenceId: string, owned: boolean): Promise<UserMarkerSet> {
    const data = await this.read()
    const userSet = this.requireUserSet(data, userSetId)
    const isOwned = userSet.ownedMarkerReferenceIds.includes(markerReferenceId)
    if (owned && !isOwned) userSet.ownedMarkerReferenceIds.push(markerReferenceId)
    if (!owned && isOwned) {
      userSet.ownedMarkerReferenceIds = userSet.ownedMarkerReferenceIds.filter(
        (id) => id !== markerReferenceId,
      )
    }
    userSet.updatedAt = now()
    await this.write(data)
    return userSet
  }

  async setSwatchOverride(
    userSetId: string,
    markerReferenceId: string,
    hex: HexColor | null,
    notes?: string,
  ): Promise<UserMarkerSet> {
    const data = await this.read()
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
    await this.write(data)
    return userSet
  }

  async addCustomMarker(userSetId: string, input: CreateCustomMarkerInput): Promise<UserMarkerSet> {
    if (!isValidHex(input.hex)) throw new Error(`Invalid hex value: ${input.hex}`)
    const data = await this.read()
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
    await this.write(data)
    return userSet
  }

  async addCustomMarkers(userSetId: string, inputs: CreateCustomMarkerInput[]): Promise<UserMarkerSet> {
    for (const input of inputs) {
      if (!isValidHex(input.hex)) throw new Error(`Invalid hex value: ${input.hex}`)
    }
    const data = await this.read()
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
    await this.write(data)
    return userSet
  }

  async updateCustomMarker(
    userSetId: string,
    customMarkerId: string,
    patch: UpdateCustomMarkerInput,
  ): Promise<UserMarkerSet> {
    const data = await this.read()
    const userSet = this.requireUserSet(data, userSetId)
    const marker = userSet.customMarkers.find((m) => m.id === customMarkerId)
    if (!marker) throw new Error(`Custom marker not found: ${customMarkerId}`)
    if (patch.hex && !isValidHex(patch.hex)) throw new Error(`Invalid hex value: ${patch.hex}`)
    Object.assign(marker, patch, { updatedAt: now() })
    if (patch.hex) Object.assign(marker, hexFields(patch.hex))
    userSet.updatedAt = now()
    await this.write(data)
    return userSet
  }

  async removeCustomMarker(userSetId: string, customMarkerId: string): Promise<UserMarkerSet> {
    const data = await this.read()
    const userSet = this.requireUserSet(data, userSetId)
    userSet.customMarkers = userSet.customMarkers.filter((m) => m.id !== customMarkerId)
    userSet.updatedAt = now()
    await this.write(data)
    return userSet
  }

  async exportAll(): Promise<MarkerDbExport> {
    const { schemaVersion: _schemaVersion, ...rest } = await this.read()
    return rest
  }

  async importAll(incoming: MarkerDbExport): Promise<void> {
    const data = await this.read()
    data.brands = upsertById(data.brands, incoming.brands)
    data.series = upsertById(data.series, incoming.series)
    data.references = upsertById(data.references, incoming.references)
    data.commercialSets = upsertById(data.commercialSets, incoming.commercialSets)
    data.userSets = upsertById(data.userSets, incoming.userSets)
    await this.write(data)
  }
}

function upsertById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const byId = new Map(existing.map((item) => [item.id, item]))
  for (const item of incoming) byId.set(item.id, item)
  return Array.from(byId.values())
}
