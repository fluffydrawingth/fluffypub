import { useCallback, useEffect, useRef, useState } from 'react'
import { rerollSwatch, usePaletteHistoryStore, type PaletteFamily } from '@/features/palette-generator'
import { generateVariedRandomPalette, type RandomVarietyDiagnostics } from '../generateRandomPalette'
import type { RandomGeneratedColor, RandomPaletteOptions } from '../types'

/** All Random Palette history lives under this one key, separate from any mood's history — see docs/random-palette.md. */
const HISTORY_KEY = 'random'

const DEFAULT_SEED = 7

interface UseRandomPaletteGeneratorResult {
  palette: RandomGeneratedColor[]
  /** Stable archetype id, e.g. "sunset" — translate via `randomPalette.archetypes.<id>`, never store the label. */
  archetypeId: string
  archetypeLabel: string
  diagnostics: RandomVarietyDiagnostics | null
  generate: () => void
  regenerate: () => void
  /** Replaces a single swatch, staying within the current archetype's (dial-applied) rules. */
  rerollAt: (index: number) => void
  /** Drops a single swatch (no-op at the last remaining color). */
  removeAt: (index: number) => void
}

export function useRandomPaletteGenerator(
  options: Omit<RandomPaletteOptions, 'seed'>,
): UseRandomPaletteGeneratorResult {
  const { size, intensity, temperature, contrast, includeNeutral } = options
  const [palette, setPalette] = useState<RandomGeneratedColor[]>([])
  const [archetypeId, setArchetypeId] = useState('')
  const [archetypeLabel, setArchetypeLabel] = useState('')
  const [diagnostics, setDiagnostics] = useState<RandomVarietyDiagnostics | null>(null)
  const seedRef = useRef(DEFAULT_SEED)
  const resolvedFamilyRef = useRef<PaletteFamily | null>(null)

  const run = useCallback(
    (seed: number) => {
      const recentPalettes = usePaletteHistoryStore.getState().getRecent(HISTORY_KEY)
      const result = generateVariedRandomPalette(
        { size, intensity, temperature, contrast, includeNeutral, seed },
        recentPalettes,
      )
      setPalette(result.colors)
      setArchetypeId(result.archetypeId)
      setArchetypeLabel(result.archetypeLabel)
      setDiagnostics(result.diagnostics)
      resolvedFamilyRef.current = result.resolvedFamily
      usePaletteHistoryStore
        .getState()
        .pushPalette(HISTORY_KEY, { colors: result.colors, familyId: result.archetypeId })
    },
    [size, intensity, temperature, contrast, includeNeutral],
  )

  useEffect(() => {
    seedRef.current = DEFAULT_SEED
    run(seedRef.current)
  }, [run])

  const generate = useCallback(() => {
    seedRef.current = DEFAULT_SEED
    run(seedRef.current)
  }, [run])

  const regenerate = useCallback(() => {
    seedRef.current = Date.now()
    run(seedRef.current)
  }, [run])

  const rerollAt = useCallback((index: number) => {
    const family = resolvedFamilyRef.current
    if (!family) return
    setPalette((prev) => {
      const replacement = rerollSwatch(family, prev, index, Date.now())
      const next = prev.map((c, i) => (i === index ? replacement : c))
      usePaletteHistoryStore.getState().pushPalette(HISTORY_KEY, { colors: next, familyId: archetypeId })
      return next
    })
  }, [archetypeId])

  const removeAt = useCallback((index: number) => {
    setPalette((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))
  }, [])

  return { palette, archetypeId, archetypeLabel, diagnostics, generate, regenerate, rerollAt, removeAt }
}
