import { describe, expect, it } from 'vitest'
import { createMemoryStorage } from '@/shared/storage'
import { LocalJsonCuratedPaletteRepository } from '../repository/LocalJsonCuratedPaletteRepository'
import { resolveBilingualText } from '../resolveBilingualText'

function makeRepository() {
  return new LocalJsonCuratedPaletteRepository(createMemoryStorage())
}

describe('LocalJsonCuratedPaletteRepository', () => {
  it('creates a palette as a draft with a derived slug and color count', async () => {
    const repo = makeRepository()
    const palette = await repo.create({ titleEn: 'Berry Dessert', slug: '', colors: ['#FF0000', '#00FF00'] })

    expect(palette.status).toBe('draft')
    expect(palette.slug).toBe('berry-dessert')
    expect(palette.colorCount).toBe(2)
    expect(await repo.list()).toHaveLength(1)
  })

  it('respects an explicit slug over the derived one', async () => {
    const repo = makeRepository()
    const palette = await repo.create({ titleEn: 'Berry Dessert', slug: 'custom-slug', colors: [] })
    expect(palette.slug).toBe('custom-slug')
  })

  it('edits fields and keeps colorCount in sync with colors', async () => {
    const repo = makeRepository()
    const palette = await repo.create({ titleEn: 'Original', slug: '', colors: ['#FF0000'] })

    const updated = await repo.update(palette.id, {
      titleEn: 'Renamed',
      colors: ['#FF0000', '#00FF00', '#0000FF'],
    })

    expect(updated.titleEn).toBe('Renamed')
    expect(updated.colorCount).toBe(3)
    expect(updated.colors).toEqual(['#FF0000', '#00FF00', '#0000FF'])
  })

  it('reorders colors via a plain array replacement', async () => {
    const repo = makeRepository()
    const palette = await repo.create({ titleEn: 'Reorder me', slug: '', colors: ['#111111', '#222222', '#333333'] })

    const reordered = await repo.update(palette.id, { colors: ['#333333', '#111111', '#222222'] })
    expect(reordered.colors).toEqual(['#333333', '#111111', '#222222'])
  })

  it('duplicates a palette as a new draft copy', async () => {
    const repo = makeRepository()
    const original = await repo.create({ titleEn: 'Original', slug: 'original', colors: ['#FF0000'] })
    await repo.update(original.id, { status: 'published' })

    const copy = await repo.duplicate(original.id)

    expect(copy.id).not.toBe(original.id)
    expect(copy.titleEn).toBe('Original (copy)')
    expect(copy.colors).toEqual(original.colors)
    expect(copy.status).toBe('draft') // duplicating never carries over published status
    expect(await repo.list()).toHaveLength(2)
  })

  it('archives a palette by setting its status', async () => {
    const repo = makeRepository()
    const palette = await repo.create({ titleEn: 'Old prompt', slug: '', colors: [] })
    const archived = await repo.archive(palette.id)
    expect(archived.status).toBe('archived')
  })

  it('deletes a palette', async () => {
    const repo = makeRepository()
    const palette = await repo.create({ titleEn: 'Temp', slug: '', colors: [] })
    await repo.delete(palette.id)
    expect(await repo.list()).toHaveLength(0)
  })

  it('exports the full record as plain JSON-serializable data', async () => {
    const repo = makeRepository()
    const palette = await repo.create({
      titleEn: 'Exportable',
      slug: 'exportable',
      colors: ['#ABCDEF'],
      theme: 'Autumn',
      challengePromptEn: 'Color a pumpkin patch',
    })

    const json = JSON.stringify(palette)
    const parsed = JSON.parse(json)
    expect(parsed.titleEn).toBe('Exportable')
    expect(parsed.theme).toBe('Autumn')
    expect(parsed.challengePromptEn).toBe('Color a pumpkin patch')
  })

  it('falls back to the other language when one is missing', async () => {
    const repo = makeRepository()
    const enOnly = await repo.create({ titleEn: 'English Only', slug: 'en-only', colors: [] })
    const thOnly = await repo.create({ titleTh: 'ภาษาไทยเท่านั้น', slug: 'th-only', colors: [] })

    expect(resolveBilingualText(enOnly.titleEn, enOnly.titleTh, 'th')).toBe('English Only')
    expect(resolveBilingualText(thOnly.titleEn, thOnly.titleTh, 'en')).toBe('ภาษาไทยเท่านั้น')
    expect(resolveBilingualText(undefined, undefined, 'en')).toBeUndefined()
  })
})
