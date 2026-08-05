import { SupabaseMarkerRepository } from './SupabaseMarkerRepository'

/**
 * Single shared repository instance for the app. Fluffy Pub swap: backed
 * by Supabase (via `/api/color-lab?resource=markers`) instead of
 * localStorage, so the reference library and marker sets an admin
 * uploads are real, shared, site-wide data. See
 * docs/integration-with-fluffypub.md ("Storage adapter replacement").
 */
export const markerRepository = new SupabaseMarkerRepository()
