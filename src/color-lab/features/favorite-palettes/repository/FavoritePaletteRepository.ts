import type { CreateFavoritePaletteInput, FavoritePalette } from '../types'

/**
 * Storage-agnostic contract, same pattern as CuratedPaletteRepository — a
 * future SupabaseFavoritePaletteRepository (per-customer, server-backed)
 * needs no UI changes. Deliberately smaller than CuratedPaletteRepository:
 * favorites have no update/publish/duplicate/archive workflow, just
 * add/list/remove.
 */
export interface FavoritePaletteRepository {
  list(): Promise<FavoritePalette[]>
  create(input: CreateFavoritePaletteInput): Promise<FavoritePalette>
  delete(id: string): Promise<void>
}
