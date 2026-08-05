import { create } from 'zustand'
import type { GeneratedColor } from '../types'

/** Per docs/algorithms.md — at least the last 12 results are kept per mode/vibe so the diversity check has enough to compare against. */
const MAX_HISTORY = 12

export interface PaletteHistoryEntry {
  colors: GeneratedColor[]
  /** The sub-style id used — a mood family id for Generate by Vibe, or an archetype id for Random Palette. */
  familyId: string
}

interface PaletteHistoryState {
  /**
   * Keyed by mode — a mood id for Generate by Vibe (so switching vibes
   * doesn't compare against a different vibe's colors), or `'random'` for
   * Random Palette. Most recent first per key. In-memory/session-only —
   * never persisted, per docs/algorithms.md.
   */
  byKey: Record<string, PaletteHistoryEntry[]>
  pushPalette: (key: string, entry: PaletteHistoryEntry) => void
  getRecent: (key: string) => PaletteHistoryEntry[]
}

export const usePaletteHistoryStore = create<PaletteHistoryState>((set, get) => ({
  byKey: {},
  pushPalette: (key, entry) =>
    set((state) => ({
      byKey: {
        ...state.byKey,
        [key]: [entry, ...(state.byKey[key] ?? [])].slice(0, MAX_HISTORY),
      },
    })),
  getRecent: (key) => get().byKey[key] ?? [],
}))
