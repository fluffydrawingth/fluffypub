import { describe, expect, it } from 'vitest'
import { translate } from '../LocalizationContext'
import type { TranslationKey } from '../translationKey'

describe('translate()', () => {
  it('resolves a key to the English string when language is "en"', () => {
    expect(translate('en', 'common.cancel')).toBe('Cancel')
  })

  it('resolves the same key to a different string when language is "th"', () => {
    expect(translate('th', 'common.cancel')).toBe('ยกเลิก')
  })

  it('switching the language argument for the same key changes only the resolved text, never the key itself', () => {
    const key: TranslationKey = 'paletteGenerator.chooseVibe'
    const en = translate('en', key)
    const th = translate('th', key)
    expect(en).not.toBe(th)
    expect(en).toBe('Choose a vibe')
    expect(th).toBe('เลือกบรรยากาศของสี')
  })

  it('interpolates variables into the resolved string', () => {
    expect(translate('en', 'imagePalette.pickFromImageAria', { hex: '#FF0000' })).toBe(
      'Pick a replacement for #FF0000 from the image',
    )
    expect(translate('th', 'imagePalette.pickFromImageAria', { hex: '#FF0000' })).toContain('#FF0000')
  })

  it('falls back to the key itself when the key does not resolve to a string in either language', () => {
    // A key that structurally doesn't exist — the TranslationKey type prevents this at compile
    // time in real usage, so this simulates a bad key reaching translate() at runtime (e.g. a
    // dynamically-built key with a typo) rather than testing something reachable through normal
    // component code.
    const bogusKey = 'common.thisKeyDoesNotExist' as TranslationKey
    expect(translate('en', bogusKey)).toBe(bogusKey)
    expect(translate('th', bogusKey)).toBe(bogusKey)
  })
})
