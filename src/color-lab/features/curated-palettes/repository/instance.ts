import { SupabaseCuratedPaletteRepository } from './SupabaseCuratedPaletteRepository'

/**
 * Single shared repository instance for the app. Fluffy Pub swap: backed
 * by Supabase (via `/api/color-lab?resource=curated`) instead of
 * localStorage. See docs/integration-with-fluffypub.md.
 */
export const curatedPaletteRepository = new SupabaseCuratedPaletteRepository()
