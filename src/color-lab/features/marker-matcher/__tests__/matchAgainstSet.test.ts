import { describe, expect, it } from 'vitest'
import { LocalJsonMarkerRepository } from '@/features/marker-db'
import { createMemoryStorage } from '@/shared/storage'
import { listAvailableMarkerSets, matchAgainstSet } from '../matchAgainstSet'

function makeRepo() {
  return new LocalJsonMarkerRepository(createMemoryStorage())
}

async function makeRepoWithUserSet() {
  const repo = makeRepo()
  const brand = await repo.createBrand({ name: 'Ohuhu' })
  const series = await repo.createSeries({ brandId: brand.id, name: 'Honolulu' })
  const referenceA = await repo.createReference({
    brandId: brand.id,
    seriesId: series.id,
    canonicalCode: 'R1',
    colorName: 'True Red',
    approximateHex: '#FF0000',
  })
  const referenceB = await repo.createReference({
    brandId: brand.id,
    seriesId: series.id,
    canonicalCode: 'B1',
    colorName: 'True Blue',
    approximateHex: '#0000FF',
  })
  const commercialSet = await repo.createCommercialSet({
    brandId: brand.id,
    seriesId: series.id,
    name: 'Pastel Colors 48',
    markerReferenceIds: [referenceA.id, referenceB.id],
  })
  const userSet = await repo.createUserSet({ referenceSetId: commercialSet.id, customName: 'Pastel Colors 48' })
  return { repo, brand, series, referenceA, referenceB, commercialSet, userSet }
}

describe('matchAgainstSet', () => {
  it('resolves owned reference markers and matches by Lab delta-E', async () => {
    const { repo, userSet } = await makeRepoWithUserSet()
    const results = await matchAgainstSet(['#FE0101', '#0102FE'], userSet.id, repo)

    expect(results).toHaveLength(2)
    expect(results[0].closestMarkerCode).toBe('R1')
    expect(results[0].source).toBe('reference')
    expect(results[1].closestMarkerCode).toBe('B1')
  })

  it('classifies an exact match as Excellent and a very different color as Distant', async () => {
    // Full ΔE threshold coverage (Excellent/Close/Approximate/Distant) lives
    // in color-engine/marker-matching's own tests — this just checks the
    // labels reach the UI-facing result unchanged.
    const { repo, userSet } = await makeRepoWithUserSet()

    const exactMatch = await matchAgainstSet(['#FF0000'], userSet.id, repo)
    expect(exactMatch[0].confidence).toBe('Excellent')

    const farMatch = await matchAgainstSet(['#00FFFF'], userSet.id, repo)
    expect(farMatch[0].confidence).toBe('Distant')
  })

  it('prefers a personal swatch override over the reference hex', async () => {
    const { repo, userSet, referenceA } = await makeRepoWithUserSet()
    // Override "True Red" with a hex that's actually much closer to green.
    await repo.setSwatchOverride(userSet.id, referenceA.id, '#00FF00')

    const results = await matchAgainstSet(['#00FF01'], userSet.id, repo)
    expect(results[0].closestMarkerCode).toBe('R1')
    expect(results[0].markerHex).toBe('#00FF00')
    expect(results[0].source).toBe('override')
    expect(results[0].confidence).toBe('Excellent')
  })

  it('matches custom markers using their own stored hex', async () => {
    const repo = makeRepo()
    const userSet = await repo.createUserSet({ customName: 'Custom only' })
    await repo.addCustomMarker(userSet.id, { markerCode: 'X1', colorName: 'Mystery', hex: '#ABCDEF' })

    const results = await matchAgainstSet(['#ABCDEE'], userSet.id, repo)
    expect(results[0].closestMarkerCode).toBe('X1')
    expect(results[0].source).toBe('custom')
  })

  it('produces a stable result for the same input', async () => {
    const { repo, userSet } = await makeRepoWithUserSet()
    const first = await matchAgainstSet(['#FE0101'], userSet.id, repo)
    const second = await matchAgainstSet(['#FE0101'], userSet.id, repo)
    expect(first).toEqual(second)
  })

  it('returns an empty array when the set has no owned or custom markers', async () => {
    const repo = makeRepo()
    const userSet = await repo.createUserSet({ customName: 'Empty' })
    const results = await matchAgainstSet(['#FF0000'], userSet.id, repo)
    expect(results).toEqual([])
  })

  it('returns an empty array when the palette is empty', async () => {
    const { repo, userSet } = await makeRepoWithUserSet()
    expect(await matchAgainstSet([], userSet.id, repo)).toEqual([])
  })

  it('returns an empty array for a set id that does not exist', async () => {
    const repo = makeRepo()
    expect(await matchAgainstSet(['#FF0000'], 'nonexistent', repo)).toEqual([])
  })
})

describe('listAvailableMarkerSets', () => {
  it('only lists user sets with at least one color, labeled brand · series · set', async () => {
    const { repo, userSet } = await makeRepoWithUserSet()
    const emptyUserSet = await repo.createUserSet({ customName: 'Empty Set' })

    const options = await listAvailableMarkerSets(repo)
    expect(options).toHaveLength(1)
    expect(options[0].setId).toBe(userSet.id)
    expect(options[0].label).toBe('Ohuhu · Honolulu · Pastel Colors 48')
    expect(options[0].availableCount).toBe(2)
    expect(options.some((o) => o.setId === emptyUserSet.id)).toBe(false)
  })

  it('omits the series segment when a commercial set has none', async () => {
    const repo = makeRepo()
    const brand = await repo.createBrand({ name: 'Foxfeel' })
    const reference = await repo.createReference({
      brandId: brand.id,
      canonicalCode: 'C1',
      colorName: 'Cyan',
      approximateHex: '#00FFFF',
    })
    const commercialSet = await repo.createCommercialSet({
      brandId: brand.id,
      name: '210 Colors',
      markerReferenceIds: [reference.id],
    })
    const userSet = await repo.createUserSet({ referenceSetId: commercialSet.id, customName: '210 Colors' })

    const options = await listAvailableMarkerSets(repo)
    expect(options.find((o) => o.setId === userSet.id)?.label).toBe('Foxfeel · 210 Colors')
  })

  it('labels a fully custom set (no reference link) with just its name', async () => {
    const repo = makeRepo()
    const userSet = await repo.createUserSet({ customName: 'My hand-mixed markers' })
    await repo.addCustomMarker(userSet.id, { markerCode: 'X1', colorName: 'Mystery', hex: '#ABCDEF' })

    const options = await listAvailableMarkerSets(repo)
    expect(options.find((o) => o.setId === userSet.id)?.label).toBe('My hand-mixed markers')
  })
})
