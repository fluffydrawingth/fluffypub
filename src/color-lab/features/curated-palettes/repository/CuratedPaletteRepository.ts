import type { CreateCuratedPaletteInput, CuratedPalette, UpdateCuratedPaletteInput } from '../types'

/**
 * Storage-agnostic contract, same pattern as marker-db's MarkerRepository —
 * a future SupabaseCuratedPaletteRepository would need no UI changes. See
 * docs/curated-palettes.md.
 */
export interface CuratedPaletteRepository {
  list(): Promise<CuratedPalette[]>
  get(id: string): Promise<CuratedPalette | null>
  create(input: CreateCuratedPaletteInput): Promise<CuratedPalette>
  update(id: string, patch: UpdateCuratedPaletteInput): Promise<CuratedPalette>
  duplicate(id: string): Promise<CuratedPalette>
  archive(id: string): Promise<CuratedPalette>
  delete(id: string): Promise<void>
}
