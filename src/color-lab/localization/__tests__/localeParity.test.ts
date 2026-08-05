import { describe, expect, it } from 'vitest'
import { en } from '@/locales/en'
import { th } from '@/locales/th'

function collectKeyPaths(tree: unknown, prefix = ''): string[] {
  if (typeof tree === 'string') return [prefix]
  if (!tree || typeof tree !== 'object') return []
  return Object.entries(tree as Record<string, unknown>).flatMap(([key, value]) =>
    collectKeyPaths(value, prefix ? `${prefix}.${key}` : key),
  )
}

describe('locale parity (en.ts <-> th.ts)', () => {
  const enKeys = new Set(collectKeyPaths(en))
  const thKeys = new Set(collectKeyPaths(th))

  it('every English key exists in Thai', () => {
    const missingFromThai = [...enKeys].filter((key) => !thKeys.has(key))
    expect(missingFromThai).toEqual([])
  })

  it('every Thai key exists in English', () => {
    const missingFromEnglish = [...thKeys].filter((key) => !enKeys.has(key))
    expect(missingFromEnglish).toEqual([])
  })

  it('has no empty-string leaf values in either dictionary', () => {
    const emptyEnKeys = collectKeyPaths(en).filter((key) => resolveLeaf(en, key) === '')
    const emptyThKeys = collectKeyPaths(th).filter((key) => resolveLeaf(th, key) === '')
    expect(emptyEnKeys).toEqual([])
    expect(emptyThKeys).toEqual([])
  })
})

function resolveLeaf(tree: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((node, part) => {
    if (node && typeof node === 'object' && part in node) return (node as Record<string, unknown>)[part]
    return undefined
  }, tree)
}
