import { describe, expect, it } from 'vitest'
import { createMemoryStorage } from '@/shared/storage'
import { LocalJsonMarkerRepository } from '../repository/LocalJsonMarkerRepository'
import {
  commitSetCsvImport,
  exportCustomMarkersToCsv,
  parseSetJsonRecords,
  previewSetCsvImport,
  setImportCsvTemplate,
} from '../services/setImportExport'
import type { MarkerReference } from '../types'

async function makeUserSet() {
  const repo = new LocalJsonMarkerRepository(createMemoryStorage())
  const userSet = await repo.createUserSet({
    customName: 'Pastel Colors 48',
    plannedCount: 48,
    sourceType: 'official',
    sourceReference: 'official chart',
  })
  return { repo, userSet }
}

async function ownedReferencesFor(repo: LocalJsonMarkerRepository, userSetId: string): Promise<MarkerReference[]> {
  const userSet = await repo.getUserSet(userSetId)
  const resolved = await Promise.all(
    (userSet?.ownedMarkerReferenceIds ?? []).map((id) => repo.getReference(id)),
  )
  return resolved.filter((r): r is MarkerReference => r !== null)
}

describe('set-scoped CSV import (custom markers)', () => {
  it('imports simple columns as custom markers, inheriting set provenance', async () => {
    const { repo, userSet } = await makeUserSet()
    const csv = ['marker_code,color_name,hex,notes', 'R1,Cherry Red,#FF0000,warm', 'B2,Sky Blue,#3264DC,'].join('\n')

    const preview = await previewSetCsvImport(csv, userSet, repo)
    expect(preview.newCount).toBe(2)
    expect(preview.duplicateCount).toBe(0)
    expect(preview.errorCount).toBe(0)

    const result = await commitSetCsvImport(preview, userSet, repo)
    expect(result.created).toBe(2)
    expect(result.updated).toBe(0)
    expect(result.skipped).toBe(0)

    const updated = await repo.getUserSet(userSet.id)
    expect(updated!.customMarkers).toHaveLength(2)
    expect(updated!.customMarkers[0].markerCode).toBe('R1')
  })

  it('classifies missing code, bad hex, and in-file duplicates as errors', async () => {
    const { repo, userSet } = await makeUserSet()

    const csv = [
      'marker_code,color_name,hex,notes',
      ',No Code,#FF0000,',
      'G1,Bad Hex,notahex,',
      'B2,Blue,#0000FF,',
      'B2,Blue Again,#0000EE,',
    ].join('\n')

    const preview = await previewSetCsvImport(csv, userSet, repo)
    expect(preview.newCount).toBe(1)
    expect(preview.errorCount).toBe(3)
    expect(preview.rows[0].status).toBe('error')
    expect(preview.rows[0].errors).toContain('Missing marker_code')
    expect(preview.rows[1].status).toBe('error')
    expect(preview.rows[1].errors.some((e) => e.includes('Invalid hex'))).toBe(true)
    expect(preview.rows[2].status).toBe('new')
    expect(preview.rows[3].status).toBe('error')
    expect(preview.rows[3].errors.some((e) => e.includes('in this file'))).toBe(true)

    const result = await commitSetCsvImport(preview, userSet, repo)
    expect(result.created).toBe(1)
    expect(result.skipped).toBe(3)
  })

  it('classifies a code matching an existing custom marker as duplicate and skips it by default', async () => {
    const { repo, userSet } = await makeUserSet()
    await repo.addCustomMarker(userSet.id, { markerCode: 'R1', colorName: 'Already here', hex: '#AA0000' })
    const withCustom = (await repo.getUserSet(userSet.id))!

    const csv = ['marker_code,color_name,hex,notes', 'R1,Updated Name,#FF0001,'].join('\n')
    const preview = await previewSetCsvImport(csv, withCustom, repo)

    expect(preview.duplicateCount).toBe(1)
    expect(preview.errorCount).toBe(0)
    expect(preview.rows[0].status).toBe('duplicate')
    expect(preview.rows[0].duplicateTarget).toBe('custom')

    const skipResult = await commitSetCsvImport(preview, withCustom, repo, 'skip')
    expect(skipResult.created).toBe(0)
    expect(skipResult.updated).toBe(0)
    expect(skipResult.skipped).toBe(1)
    const afterSkip = await repo.getUserSet(userSet.id)
    expect(afterSkip!.customMarkers[0].colorName).toBe('Already here')
  })

  it('updates the existing custom marker when the duplicate policy is "update"', async () => {
    const { repo, userSet } = await makeUserSet()
    await repo.addCustomMarker(userSet.id, { markerCode: 'R1', colorName: 'Already here', hex: '#AA0000' })
    const withCustom = (await repo.getUserSet(userSet.id))!

    const csv = ['marker_code,color_name,hex,notes', 'R1,Updated Name,#FF0001,rescanned'].join('\n')
    const preview = await previewSetCsvImport(csv, withCustom, repo)

    const result = await commitSetCsvImport(preview, withCustom, repo, 'update')
    expect(result.updated).toBe(1)
    expect(result.created).toBe(0)

    const afterUpdate = await repo.getUserSet(userSet.id)
    expect(afterUpdate!.customMarkers[0].colorName).toBe('Updated Name')
    expect(afterUpdate!.customMarkers[0].hex).toBe('#FF0001')
    expect(afterUpdate!.customMarkers).toHaveLength(1) // still one, not a duplicate record
  })

  it('treats a code matching an owned reference as duplicate and writes a swatch override on update', async () => {
    const { repo, userSet } = await makeUserSet()
    const brand = await repo.createBrand({ name: 'Ohuhu' })
    const reference = await repo.createReference({
      brandId: brand.id,
      canonicalCode: 'RV260',
      colorName: 'Sweetness',
      approximateHex: '#E9B8C8',
    })
    await repo.setReferenceOwned(userSet.id, reference.id, true)
    const withOwned = (await repo.getUserSet(userSet.id))!

    const csv = ['marker_code,color_name,hex,notes', 'RV260,Sweetness (rescanned),#E5B0C2,'].join('\n')
    const owned = await ownedReferencesFor(repo, userSet.id)
    const preview = await previewSetCsvImport(csv, withOwned, repo)
    expect(preview.rows[0].status).toBe('duplicate')
    expect(preview.rows[0].duplicateTarget).toBe('reference')
    expect(owned).toHaveLength(1)

    await commitSetCsvImport(preview, withOwned, repo, 'update')
    const afterUpdate = await repo.getUserSet(userSet.id)
    expect(afterUpdate!.swatchOverrides).toHaveLength(1)
    expect(afterUpdate!.swatchOverrides[0].hex).toBe('#E5B0C2')
    expect(afterUpdate!.customMarkers).toHaveLength(0) // never mutates the reference itself as a custom marker
  })

  it('round-trips through custom-marker CSV export', async () => {
    const { repo, userSet } = await makeUserSet()
    const csv = ['marker_code,color_name,hex,notes', 'R1,Cherry Red,#FF0000,warm tone'].join('\n')
    await commitSetCsvImport(await previewSetCsvImport(csv, userSet, repo), userSet, repo)

    const updated = await repo.getUserSet(userSet.id)
    const exported = exportCustomMarkersToCsv(updated!.customMarkers)
    expect(exported).toContain('marker_code,color_name,hex,notes')
    expect(exported).toContain('R1,Cherry Red,#FF0000,warm tone')
  })

  it('provides a downloadable template with the documented example rows', () => {
    const template = setImportCsvTemplate()
    expect(template).toContain('marker_code,color_name,hex,notes')
    expect(template).toContain('R29,Cherry Red,#C73445,')
    expect(template).toContain('RV260,Sweetness,#E9B8C8,')
  })
})

describe('set-scoped JSON import parsing', () => {
  it('accepts an array of marker objects in either key style', () => {
    const records = parseSetJsonRecords(
      JSON.stringify([
        { marker_code: 'R1', color_name: 'Red', hex: '#FF0000' },
        { markerCode: 'B2', colorName: 'Blue', hex: '#0000FF', notes: 'cool' },
      ]),
    )
    expect(records).toEqual([
      { marker_code: 'R1', color_name: 'Red', hex: '#FF0000', notes: '' },
      { marker_code: 'B2', color_name: 'Blue', hex: '#0000FF', notes: 'cool' },
    ])
  })

  it('rejects non-array JSON', () => {
    expect(() => parseSetJsonRecords('{"not": "an array"}')).toThrow()
  })
})
