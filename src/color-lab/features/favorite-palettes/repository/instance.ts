import { SupabaseFavoritePaletteRepository } from './SupabaseFavoritePaletteRepository'

/**
 * Single shared repository instance for the app. Fluffy Pub swap: backed
 * by Supabase (via `/api/color-lab?resource=favorites`) instead of
 * localStorage, so a customer's favorited palettes are real, per-account
 * data instead of per-browser. See docs/integration-with-fluffypub.md
 * ("Storage adapter replacement").
 */
export const favoritePaletteRepository = new SupabaseFavoritePaletteRepository()
