import { describe, expect, it } from 'vitest'
import { createMemoryStorage } from '@/shared/storage'
import { LocalJsonCuratedPaletteRepository } from '@/features/curated-palettes/repository/LocalJsonCuratedPaletteRepository'
import { MOODS } from '@/features/palette-generator/types'
import { translate } from '../LocalizationContext'

describe('stable values survive a language switch unchanged', () => {
  it('a saved curated palette keeps the same vibe/status strings regardless of which language renders them', async () => {
    const repo = new LocalJsonCuratedPaletteRepository(createMemoryStorage())
    const palette = await repo.create({ titleEn: 'Berry Dessert', slug: '', colors: ['#FF0000'], vibe: 'sweet' })
    const vibe = palette.vibe
    if (!vibe) throw new Error('expected vibe to be set')

    // Render the same stored value under both languages — the stored enum never changes,
    // only its translated label does.
    const labelEn = translate('en', `paletteGenerator.moods.${vibe}.label`)
    const labelTh = translate('th', `paletteGenerator.moods.${vibe}.label`)

    expect(palette.vibe).toBe('sweet')
    expect(palette.status).toBe('draft')
    expect(labelEn).not.toBe(labelTh)
    expect(labelEn).toBe('Sweet')
    expect(labelTh).toBe('หวานน่ารัก')

    // Switching the UI language never mutates the stored record.
    expect(palette.vibe).toBe('sweet')
    expect(palette.status).toBe('draft')
  })

  it('every mood id used as a stored value has a translation in both languages', () => {
    for (const mood of MOODS) {
      const en = translate('en', `paletteGenerator.moods.${mood}.label`)
      const th = translate('th', `paletteGenerator.moods.${mood}.label`)
      expect(en).not.toBe(`paletteGenerator.moods.${mood}.label`)
      expect(th).not.toBe(`paletteGenerator.moods.${mood}.label`)
    }
  })
})
