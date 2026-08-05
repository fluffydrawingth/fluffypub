import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_GENERATION_SEED } from '../generatePalette'
import { MOOD_PROFILES } from '../moodProfiles'
import { generateVariedPalette, type VarietyDiagnostics } from '../paletteVariety'
import { rerollSwatch } from '../rerollSwatch'
import { usePaletteHistoryStore } from '../store/usePaletteHistoryStore'
import type { GeneratedColor, PaletteGeneratorOptions } from '../types'

interface UsePaletteGeneratorResult {
  palette: GeneratedColor[]
  /** Stable id of the family this palette came from, e.g. "berry-dessert" — translate via `paletteGenerator.families.<id>`, never store the label. */
  familyId: string
  /** Friendly English label of the family, e.g. "Berry Dessert" — fallback only, prefer translating `familyId`. */
  familyLabel: string
  /** Dev-only diagnostics (seed, retry count, similarity score) — never rendered for normal users. */
  diagnostics: VarietyDiagnostics | null
  /** Re-runs at the deterministic baseline seed for the current settings. */
  generate: () => void
  /** Re-runs with a new random seed — a different family/result, avoiding recent repeats. */
  regenerate: () => void
  /** Replaces a single swatch, staying within the current family's rules. */
  rerollAt: (index: number) => void
  /** Drops a single swatch (no-op at the last remaining color). */
  removeAt: (index: number) => void
}

export function usePaletteGenerator(
  options: Omit<PaletteGeneratorOptions, 'seed'>,
): UsePaletteGeneratorResult {
  const { startColor, mood, harmony, size } = options
  const [palette, setPalette] = useState<GeneratedColor[]>([])
  const [familyId, setFamilyId] = useState('')
  const [familyLabel, setFamilyLabel] = useState('')
  const [diagnostics, setDiagnostics] = useState<VarietyDiagnostics | null>(null)
  const seedRef = useRef(DEFAULT_GENERATION_SEED)

  const run = useCallback(
    (seed: number) => {
      const recentPalettes = usePaletteHistoryStore.getState().getRecent(mood)
      const result = generateVariedPalette({ startColor, mood, harmony, size }, seed, recentPalettes)
      setPalette(result.colors)
      setFamilyId(result.familyId)
      setFamilyLabel(result.familyLabel)
      setDiagnostics(result.diagnostics)
      usePaletteHistoryStore.getState().pushPalette(mood, { colors: result.colors, familyId: result.familyId })
    },
    [startColor, mood, harmony, size],
  )

  useEffect(() => {
    seedRef.current = DEFAULT_GENERATION_SEED
    run(seedRef.current)
  }, [run])

  const generate = useCallback(() => {
    seedRef.current = DEFAULT_GENERATION_SEED
    run(seedRef.current)
  }, [run])

  const regenerate = useCallback(() => {
    seedRef.current = Date.now()
    run(seedRef.current)
  }, [run])

  const rerollAt = useCallback(
    (index: number) => {
      const family = MOOD_PROFILES[mood].families.find((f) => f.id === familyId)
      if (!family) return
      setPalette((prev) => {
        const replacement = rerollSwatch(family, prev, index, Date.now())
        const next = prev.map((c, i) => (i === index ? replacement : c))
        usePaletteHistoryStore.getState().pushPalette(mood, { colors: next, familyId })
        return next
      })
    },
    [mood, familyId],
  )

  const removeAt = useCallback((index: number) => {
    setPalette((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))
  }, [])

  return { palette, familyId, familyLabel, diagnostics, generate, regenerate, rerollAt, removeAt }
}
