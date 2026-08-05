import type { MarkerRepository } from '../repository/MarkerRepository'
import type { CreateCustomMarkerInput, CustomMarker, MarkerReference, UserMarkerSet } from '../types'
import { isValidHex } from '../validation/hexValidation'
import { parseCsvRecords, toCsvText } from './csvParser'

export type ImportRowStatus = 'new' | 'duplicate' | 'error'
/** What a 'duplicate' row would update — a custom marker already in the set, or an owned reference marker's hex. */
export type DuplicateTarget = 'custom' | 'reference'

/** Set-scoped import row: adds/updates custom markers (or overrides an owned reference) in one user set. */
export interface SetImportRow {
  rowIndex: number
  markerCode: string
  colorName: string
  hex: string
  notes?: string
  status: ImportRowStatus
  errors: string[]
  duplicateTarget?: DuplicateTarget
  /** Set when duplicateTarget === 'custom'. */
  existingCustomMarkerId?: string
  /** Set when duplicateTarget === 'reference'. */
  existingReferenceId?: string
}

export interface SetImportPreview {
  rows: SetImportRow[]
  newCount: number
  duplicateCount: number
  errorCount: number
}

export type DuplicatePolicy = 'skip' | 'update'

const SET_CSV_HEADER = ['marker_code', 'color_name', 'hex', 'notes']

const CSV_TEMPLATE = toCsvText(SET_CSV_HEADER, [
  ['R29', 'Cherry Red', '#C73445', ''],
  ['RV260', 'Sweetness', '#E9B8C8', ''],
])

export function setImportCsvTemplate(): string {
  return CSV_TEMPLATE
}

/**
 * Validates simple-column rows (`marker_code, color_name, hex, notes`)
 * against a user's marker set. A code that matches an existing custom
 * marker, or the canonical/alias code of an owned reference marker,
 * counts as 'duplicate' — not an error; the caller picks a batch-level
 * DuplicatePolicy at commit time. See docs/marker-database.md.
 */
export function validateSetImportRows(
  records: Record<string, string>[],
  userSet: UserMarkerSet,
  ownedReferences: MarkerReference[],
): SetImportPreview {
  const seenCodes = new Set<string>()
  const customByCode = new Map(userSet.customMarkers.map((m) => [m.markerCode.toLowerCase(), m] as const))
  const referenceByCode = new Map<string, MarkerReference>()
  for (const reference of ownedReferences) {
    referenceByCode.set(reference.canonicalCode.toLowerCase(), reference)
    for (const alias of reference.aliases) referenceByCode.set(alias.code.toLowerCase(), reference)
  }

  const rows: SetImportRow[] = records.map((record, index) => {
    const errors: string[] = []
    const markerCode = (record.marker_code ?? '').trim()
    const colorName = (record.color_name ?? '').trim()
    const hex = (record.hex ?? '').trim()
    const notes = (record.notes ?? '').trim() || undefined

    if (!markerCode) errors.push('Missing marker_code')
    if (!hex) errors.push('Missing hex')
    else if (!isValidHex(hex)) errors.push(`Invalid hex format: "${hex}"`)

    const key = markerCode.toLowerCase()
    if (markerCode && seenCodes.has(key)) errors.push(`Duplicate marker_code "${markerCode}" in this file`)
    seenCodes.add(key)

    const existingCustom = markerCode ? customByCode.get(key) : undefined
    const existingReference = !existingCustom && markerCode ? referenceByCode.get(key) : undefined

    let status: ImportRowStatus = 'new'
    if (errors.length > 0) status = 'error'
    else if (existingCustom || existingReference) status = 'duplicate'

    return {
      rowIndex: index,
      markerCode,
      colorName,
      hex,
      notes,
      status,
      errors,
      duplicateTarget: existingCustom ? 'custom' : existingReference ? 'reference' : undefined,
      existingCustomMarkerId: existingCustom?.id,
      existingReferenceId: existingReference?.id,
    }
  })

  return {
    rows,
    newCount: rows.filter((r) => r.status === 'new').length,
    duplicateCount: rows.filter((r) => r.status === 'duplicate').length,
    errorCount: rows.filter((r) => r.status === 'error').length,
  }
}

export async function previewSetCsvImport(
  csvText: string,
  userSet: UserMarkerSet,
  repository: MarkerRepository,
): Promise<SetImportPreview> {
  const records = parseCsvRecords(csvText)
  const ownedReferences = await resolveOwnedReferences(userSet, repository)
  return validateSetImportRows(records, userSet, ownedReferences)
}

async function resolveOwnedReferences(
  userSet: UserMarkerSet,
  repository: MarkerRepository,
): Promise<MarkerReference[]> {
  const owned = await Promise.all(userSet.ownedMarkerReferenceIds.map((id) => repository.getReference(id)))
  return owned.filter((r): r is MarkerReference => r !== null)
}

/**
 * Writes 'new' rows as new custom markers — batched into a single
 * `addCustomMarkers` call rather than one `addCustomMarker` per row, so an
 * N-row import costs one round trip instead of N. That matters a lot for a
 * network-backed repository (each round trip is a full read-modify-write);
 * for a 48-row import at N separate calls, any single dropped/slow request
 * would silently break the rest of the batch with no visible error. See
 * MarkerRepository.addCustomMarkers.
 *
 * 'duplicate' rows are skipped or updated according to `duplicatePolicy`
 * (default 'skip') — updating a reference-matched row writes a swatch
 * override, never mutates the reference itself. These stay per-row calls
 * since duplicates are typically a small minority of an import. 'error'
 * rows are always skipped.
 */
export async function commitSetCsvImport(
  preview: SetImportPreview,
  userSet: UserMarkerSet,
  repository: MarkerRepository,
  duplicatePolicy: DuplicatePolicy = 'skip',
): Promise<{ created: number; updated: number; skipped: number }> {
  let updated = 0
  let skipped = 0
  const newInputs: CreateCustomMarkerInput[] = []

  for (const row of preview.rows) {
    if (row.status === 'error') {
      skipped += 1
      continue
    }

    if (row.status === 'duplicate') {
      if (duplicatePolicy !== 'update') {
        skipped += 1
        continue
      }
      if (row.duplicateTarget === 'custom' && row.existingCustomMarkerId) {
        await repository.updateCustomMarker(userSet.id, row.existingCustomMarkerId, {
          colorName: row.colorName,
          hex: row.hex,
          notes: row.notes,
        })
      } else if (row.duplicateTarget === 'reference' && row.existingReferenceId) {
        await repository.setSwatchOverride(userSet.id, row.existingReferenceId, row.hex, row.notes)
      }
      updated += 1
      continue
    }

    newInputs.push({
      markerCode: row.markerCode,
      colorName: row.colorName,
      hex: row.hex,
      notes: row.notes,
    })
  }

  if (newInputs.length > 0) {
    await repository.addCustomMarkers(userSet.id, newInputs)
  }

  return { created: newInputs.length, updated, skipped }
}

/** JSON import for a set: an array of { marker_code, color_name, hex, notes }. */
export function parseSetJsonRecords(jsonText: string): Record<string, string>[] {
  const parsed = JSON.parse(jsonText)
  if (!Array.isArray(parsed)) throw new Error('Expected a JSON array of markers')
  return parsed.map((entry) => ({
    marker_code: String(entry.marker_code ?? entry.markerCode ?? ''),
    color_name: String(entry.color_name ?? entry.colorName ?? ''),
    hex: String(entry.hex ?? ''),
    notes: String(entry.notes ?? ''),
  }))
}

export function exportCustomMarkersToCsv(markers: CustomMarker[]): string {
  const rows = markers.map((m) => [m.markerCode, m.colorName, m.hex, m.notes ?? ''])
  return toCsvText(SET_CSV_HEADER, rows)
}
