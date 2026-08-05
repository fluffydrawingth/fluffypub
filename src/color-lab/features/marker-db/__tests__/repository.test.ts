import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryStorage } from '@/shared/storage'
import { LocalJsonMarkerRepository } from '../repository/LocalJsonMarkerRepository'

function makeRepository() {
  return new LocalJsonMarkerRepository(createMemoryStorage())
}

describe('LocalJsonMarkerRepository — brand/series CRUD', () => {
  it('creates, lists, updates, and deletes a brand', async () => {
    const repo = makeRepository()
    const brand = await repo.createBrand({ name: 'Foxfeel' })
    expect(brand.id).toBeTruthy()
    expect(await repo.listBrands()).toHaveLength(1)

    const updated = await repo.updateBrand(brand.id, { name: 'Foxfeel Renamed' })
    expect(updated.name).toBe('Foxfeel Renamed')

    await repo.deleteBrand(brand.id)
    expect(await repo.listBrands()).toHaveLength(0)
  })

  it('cascades brand deletion to series/references/commercial sets', async () => {
    const repo = makeRepository()
    const brand = await repo.createBrand({ name: 'Ohuhu' })
    const series = await repo.createSeries({ brandId: brand.id, name: 'Honolulu' })
    const reference = await repo.createReference({
      brandId: brand.id,
      seriesId: series.id,
      canonicalCode: 'R1',
      colorName: 'Red',
      approximateHex: '#FF0000',
    })
    await repo.createCommercialSet({
      brandId: brand.id,
      seriesId: series.id,
      name: '48-color',
      markerReferenceIds: [reference.id],
    })

    await repo.deleteBrand(brand.id)

    expect(await repo.listSeries()).toHaveLength(0)
    expect(await repo.listReferences()).toHaveLength(0)
    expect(await repo.listCommercialSets()).toHaveLength(0)
  })
})

describe('LocalJsonMarkerRepository — reference library', () => {
  it('computes rgb and lab automatically from approximateHex', async () => {
    const repo = makeRepository()
    const brand = await repo.createBrand({ name: 'Ohuhu' })

    const reference = await repo.createReference({
      brandId: brand.id,
      canonicalCode: 'B1',
      colorName: 'Sky Blue',
      approximateHex: '#3264DC',
    })

    expect(reference.rgb).toEqual({ r: 0x32, g: 0x64, b: 0xdc })
    expect(reference.lab.l).toBeGreaterThan(0)
    expect(reference.lab.l).toBeLessThan(100)
    expect(reference.status).toBe('active')
  })

  it('rejects an invalid hex value', async () => {
    const repo = makeRepository()
    const brand = await repo.createBrand({ name: 'Ohuhu' })

    await expect(
      repo.createReference({
        brandId: brand.id,
        canonicalCode: 'B1',
        colorName: 'Sky Blue',
        approximateHex: 'not-a-hex',
      }),
    ).rejects.toThrow()
  })

  it('filters by search across code, name, and alias codes', async () => {
    const repo = makeRepository()
    const brand = await repo.createBrand({ name: 'Ohuhu' })
    await repo.createReference({
      brandId: brand.id,
      canonicalCode: 'RV260',
      colorName: 'Sweetness',
      approximateHex: '#FF0000',
      aliases: [{ code: '26', type: 'legacy', label: 'Old code' }],
    })
    await repo.createReference({
      brandId: brand.id,
      canonicalCode: 'B1',
      colorName: 'Sky Blue',
      approximateHex: '#0000FF',
    })

    expect(await repo.listReferences({ search: 'sweetness' })).toHaveLength(1)
    expect(await repo.listReferences({ search: '26' })).toHaveLength(1)
    expect(await repo.listReferences({ search: 'nonexistent' })).toHaveLength(0)
  })

  it('finds a reference by canonical code or any alias, case-insensitive', async () => {
    const repo = makeRepository()
    const brand = await repo.createBrand({ name: 'Ohuhu' })
    const reference = await repo.createReference({
      brandId: brand.id,
      canonicalCode: 'RV260',
      colorName: 'Sweetness',
      approximateHex: '#E9B8C8',
      aliases: [
        { code: '26', type: 'legacy', label: 'Old code' },
        { code: 'RV-260', type: 'alternate', label: 'Alternate code' },
      ],
    })

    expect((await repo.findReferenceByAnyCode(brand.id, undefined, 'rv260'))?.id).toBe(reference.id)
    expect((await repo.findReferenceByAnyCode(brand.id, undefined, '26'))?.id).toBe(reference.id)
    expect((await repo.findReferenceByAnyCode(brand.id, undefined, 'RV-260'))?.id).toBe(reference.id)
    expect(await repo.findReferenceByAnyCode(brand.id, undefined, 'nope')).toBeNull()
  })
})

describe('LocalJsonMarkerRepository — commercial sets', () => {
  it('adds references without duplicating membership', async () => {
    const repo = makeRepository()
    const brand = await repo.createBrand({ name: 'Ohuhu' })
    const reference = await repo.createReference({
      brandId: brand.id,
      canonicalCode: 'R1',
      colorName: 'Red',
      approximateHex: '#FF0000',
    })
    const commercialSet = await repo.createCommercialSet({ brandId: brand.id, name: 'Pastel 48' })

    await repo.addReferencesToCommercialSet(commercialSet.id, [reference.id])
    await repo.addReferencesToCommercialSet(commercialSet.id, [reference.id])

    const updated = await repo.getCommercialSet(commercialSet.id)
    expect(updated!.markerReferenceIds).toEqual([reference.id])
  })
})

describe('LocalJsonMarkerRepository — user-owned sets', () => {
  let repo: LocalJsonMarkerRepository
  let referenceAId: string
  let referenceBId: string
  let commercialSetId: string

  beforeEach(async () => {
    repo = makeRepository()
    const brand = await repo.createBrand({ name: 'Ohuhu' })
    const referenceA = await repo.createReference({
      brandId: brand.id,
      canonicalCode: 'R1',
      colorName: 'Red',
      approximateHex: '#FF0000',
    })
    const referenceB = await repo.createReference({
      brandId: brand.id,
      canonicalCode: 'B1',
      colorName: 'Blue',
      approximateHex: '#0000FF',
    })
    const commercialSet = await repo.createCommercialSet({
      brandId: brand.id,
      name: 'Starter Set',
      markerReferenceIds: [referenceA.id, referenceB.id],
    })

    referenceAId = referenceA.id
    referenceBId = referenceB.id
    commercialSetId = commercialSet.id
  })

  it('owns every reference marker by default when linked to a commercial set', async () => {
    const userSet = await repo.createUserSet({ referenceSetId: commercialSetId, customName: 'My Starter Set' })
    expect(userSet.ownedMarkerReferenceIds.sort()).toEqual([referenceAId, referenceBId].sort())
  })

  it('can be created with no reference link at all (a fully custom set)', async () => {
    const userSet = await repo.createUserSet({ customName: 'My hand-mixed markers' })
    expect(userSet.referenceSetId).toBeUndefined()
    expect(userSet.ownedMarkerReferenceIds).toEqual([])
  })

  it('toggles owned/not-owned for a reference marker', async () => {
    const userSet = await repo.createUserSet({ referenceSetId: commercialSetId, customName: 'Set' })
    await repo.setReferenceOwned(userSet.id, referenceAId, false)
    const updated = await repo.getUserSet(userSet.id)
    expect(updated!.ownedMarkerReferenceIds).toEqual([referenceBId])
  })

  it('sets and resets a personal swatch override', async () => {
    const userSet = await repo.createUserSet({ referenceSetId: commercialSetId, customName: 'Set' })
    await repo.setSwatchOverride(userSet.id, referenceAId, '#AA0000', 'runs darker in person')

    let updated = await repo.getUserSet(userSet.id)
    expect(updated!.swatchOverrides).toHaveLength(1)
    expect(updated!.swatchOverrides[0].hex).toBe('#AA0000')

    await repo.setSwatchOverride(userSet.id, referenceAId, null)
    updated = await repo.getUserSet(userSet.id)
    expect(updated!.swatchOverrides).toHaveLength(0)
  })

  it('adds, updates, and removes custom markers without touching reference data', async () => {
    const userSet = await repo.createUserSet({ customName: 'Custom set' })
    let updated = await repo.addCustomMarker(userSet.id, {
      markerCode: 'X1',
      colorName: 'Mystery',
      hex: '#123456',
    })
    expect(updated.customMarkers).toHaveLength(1)
    const customId = updated.customMarkers[0].id

    updated = await repo.updateCustomMarker(userSet.id, customId, { colorName: 'Renamed' })
    expect(updated.customMarkers[0].colorName).toBe('Renamed')

    updated = await repo.removeCustomMarker(userSet.id, customId)
    expect(updated.customMarkers).toHaveLength(0)

    expect(await repo.listReferences()).toHaveLength(2) // untouched
  })

  it('deleting a reference strips it from ownership and overrides, but never touches other user sets by name collision', async () => {
    const userSet = await repo.createUserSet({ referenceSetId: commercialSetId, customName: 'Set' })
    await repo.setSwatchOverride(userSet.id, referenceAId, '#AA0000')

    await repo.deleteReference(referenceAId)

    const updated = await repo.getUserSet(userSet.id)
    expect(updated!.ownedMarkerReferenceIds).toEqual([referenceBId])
    expect(updated!.swatchOverrides).toHaveLength(0)
  })
})

describe('LocalJsonMarkerRepository — JSON backup round-trip', () => {
  it('exports and re-imports without data loss', async () => {
    const repo = makeRepository()
    const brand = await repo.createBrand({ name: 'Ohuhu' })
    await repo.createReference({
      brandId: brand.id,
      canonicalCode: 'R1',
      colorName: 'Red',
      approximateHex: '#FF0000',
    })
    await repo.createUserSet({ customName: 'My set' })

    const exported = await repo.exportAll()

    const freshRepo = makeRepository()
    await freshRepo.importAll(exported)

    expect(await freshRepo.listBrands()).toHaveLength(1)
    expect(await freshRepo.listReferences()).toHaveLength(1)
    expect((await freshRepo.listReferences())[0].canonicalCode).toBe('R1')
    expect(await freshRepo.listUserSets()).toHaveLength(1)
  })
})
