import type { MarkerRepository } from '../repository/MarkerRepository'
import type { AliasType, MarkerAlias } from '../types'
import { isValidHex } from '../validation/hexValidation'
import { parseCsvRecords } from './csvParser'

export type ReferenceImportStatus = 'new' | 'duplicate' | 'conflict' | 'error'

/** One physical marker's worth of rows collapsed into a group — the first row sets its core fields, every row with an alias_code contributes an alias. */
export interface ReferenceImportGroup {
  key: string
  rowIndexes: number[]
  brand: string
  series?: string
  canonicalCode: string
  colorName: string
  hex: string
  aliases: MarkerAlias[]
  commercialSets: string[]
  sourceName?: string
  sourceReference?: string
  sourceVersion?: string
  status: ReferenceImportStatus
  errors: string[]
  /** Set when status is 'duplicate' or 'conflict'. */
  existingReferenceId?: string
}

export interface ReferenceImportPreview {
  groups: ReferenceImportGroup[]
  newCount: number
  duplicateCount: number
  conflictCount: number
  errorCount: number
}

export type ConflictPolicy = 'skip' | 'update'

const ALIAS_LABELS: Record<AliasType, string> = {
  legacy: 'Old code',
  current: 'New code',
  alternate: 'Alternate code',
}

function normalizeAliasType(value: string): AliasType {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'legacy' || normalized === 'current' || normalized === 'alternate') return normalized
  return 'alternate'
}

/**
 * Groups raw CSV rows by brand+series+canonical_code — multiple rows with
 * the same key are alias rows for one marker, not separate markers. See
 * docs/marker-database.md.
 */
function groupRecords(records: Record<string, string>[]): ReferenceImportGroup[] {
  const groups = new Map<string, ReferenceImportGroup>()

  records.forEach((record, index) => {
    const brand = (record.brand ?? '').trim()
    const series = (record.series ?? '').trim() || undefined
    const canonicalCode = (record.canonical_code ?? '').trim()
    const key = `${brand.toLowerCase()}::${(series ?? '').toLowerCase()}::${canonicalCode.toLowerCase()}`

    let group = groups.get(key)
    if (!group) {
      const errors: string[] = []
      const hex = (record.hex ?? '').trim()
      if (!brand) errors.push('Missing brand')
      if (!canonicalCode) errors.push('Missing canonical_code')
      if (!hex) errors.push('Missing hex')
      else if (!isValidHex(hex)) errors.push(`Invalid hex format: "${hex}"`)

      group = {
        key,
        rowIndexes: [],
        brand,
        series,
        canonicalCode,
        colorName: (record.color_name ?? '').trim(),
        hex,
        aliases: [],
        commercialSets: [],
        sourceName: (record.source_name ?? '').trim() || undefined,
        sourceReference: (record.source_reference ?? '').trim() || undefined,
        sourceVersion: (record.source_version ?? '').trim() || undefined,
        status: 'new',
        errors,
      }
      groups.set(key, group)
    }

    group.rowIndexes.push(index)

    const aliasCode = (record.alias_code ?? '').trim()
    if (aliasCode && !group.aliases.some((a) => a.code.toLowerCase() === aliasCode.toLowerCase())) {
      const type = normalizeAliasType(record.alias_type ?? '')
      group.aliases.push({ code: aliasCode, type, label: ALIAS_LABELS[type] })
    }

    const commercialSet = (record.commercial_set ?? '').trim()
    if (commercialSet && !group.commercialSets.some((s) => s.toLowerCase() === commercialSet.toLowerCase())) {
      group.commercialSets.push(commercialSet)
    }
  })

  return Array.from(groups.values())
}

/**
 * Resolves each group's status against already-saved data. A group whose
 * brand/series doesn't exist yet is always 'new' (it can't already exist
 * under a brand that isn't there). Otherwise a canonical-code match with
 * agreeing hex/name is 'duplicate' (safe no-op or refresh); a match with
 * disagreeing hex or name is 'conflict' — never silently overwritten.
 */
export async function previewReferenceImport(
  csvText: string,
  repository: MarkerRepository,
): Promise<ReferenceImportPreview> {
  const records = parseCsvRecords(csvText)
  const groups = groupRecords(records)
  const brands = await repository.listBrands()
  const allSeries = await repository.listSeries()

  for (const group of groups) {
    if (group.errors.length > 0) {
      group.status = 'error'
      continue
    }

    const brand = brands.find((b) => b.name.toLowerCase() === group.brand.toLowerCase())
    const series = group.series
      ? allSeries.find((s) => s.brandId === brand?.id && s.name.toLowerCase() === group.series!.toLowerCase())
      : undefined

    if (!brand || (group.series && !series)) {
      group.status = 'new'
      continue
    }

    const existing = await repository.findReferenceByAnyCode(brand.id, series?.id, group.canonicalCode)
    if (!existing) {
      group.status = 'new'
      continue
    }

    const agrees =
      existing.approximateHex.toLowerCase() === group.hex.toLowerCase() &&
      existing.colorName.trim().toLowerCase() === group.colorName.trim().toLowerCase()
    group.status = agrees ? 'duplicate' : 'conflict'
    group.existingReferenceId = existing.id
  }

  return {
    groups,
    newCount: groups.filter((g) => g.status === 'new').length,
    duplicateCount: groups.filter((g) => g.status === 'duplicate').length,
    conflictCount: groups.filter((g) => g.status === 'conflict').length,
    errorCount: groups.filter((g) => g.status === 'error').length,
  }
}

/**
 * Writes 'new' groups as new references. 'conflict' groups are skipped or
 * updated per `conflictPolicy` (default 'skip'); 'duplicate' groups are
 * left as-is. Commercial set membership is wired for every non-error
 * group regardless of conflict resolution — which box a marker ships in
 * is independent of whether its color data agrees with what's on file.
 */
export async function commitReferenceImport(
  preview: ReferenceImportPreview,
  repository: MarkerRepository,
  conflictPolicy: ConflictPolicy = 'skip',
): Promise<{ created: number; updated: number; skipped: number }> {
  let created = 0
  let updated = 0
  let skipped = 0

  for (const group of preview.groups) {
    if (group.status === 'error') {
      skipped += 1
      continue
    }

    const brands = await repository.listBrands()
    let brand = brands.find((b) => b.name.toLowerCase() === group.brand.toLowerCase())
    if (!brand) brand = await repository.createBrand({ name: group.brand })

    let seriesId: string | undefined
    if (group.series) {
      const seriesList = await repository.listSeries({ brandId: brand.id })
      let series = seriesList.find((s) => s.name.toLowerCase() === group.series!.toLowerCase())
      if (!series) series = await repository.createSeries({ brandId: brand.id, name: group.series })
      seriesId = series.id
    }

    let referenceId = group.existingReferenceId
    if (group.status === 'new') {
      const reference = await repository.createReference({
        brandId: brand.id,
        seriesId,
        canonicalCode: group.canonicalCode,
        colorName: group.colorName,
        approximateHex: group.hex,
        aliases: group.aliases,
        sourceName: group.sourceName,
        sourceReference: group.sourceReference,
        sourceVersion: group.sourceVersion,
      })
      referenceId = reference.id
      created += 1
    } else if (group.status === 'conflict') {
      if (conflictPolicy === 'update' && referenceId) {
        await repository.updateReference(referenceId, {
          colorName: group.colorName,
          approximateHex: group.hex,
          aliases: group.aliases,
          sourceName: group.sourceName,
          sourceReference: group.sourceReference,
          sourceVersion: group.sourceVersion,
        })
        updated += 1
      } else {
        skipped += 1
      }
    }

    if (referenceId && group.commercialSets.length > 0) {
      const commercialSets = await repository.listCommercialSets({ brandId: brand.id, seriesId })
      for (const setName of group.commercialSets) {
        let commercialSet = commercialSets.find((s) => s.name.toLowerCase() === setName.toLowerCase())
        if (!commercialSet) {
          commercialSet = await repository.createCommercialSet({ brandId: brand.id, seriesId, name: setName })
          commercialSets.push(commercialSet)
        }
        await repository.addReferencesToCommercialSet(commercialSet.id, [referenceId])
      }
    }
  }

  return { created, updated, skipped }
}
