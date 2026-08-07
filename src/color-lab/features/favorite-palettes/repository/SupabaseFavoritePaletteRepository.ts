import type { CreateFavoritePaletteInput, FavoritePalette } from '../types'
import type { FavoritePaletteRepository } from './FavoritePaletteRepository'

const ENDPOINT = '/api/color-lab?resource=favorites'

function authHeaders(): Record<string, string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('fluffy_token') : null
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

/**
 * Fluffy Pub-specific: unlike SupabaseMarkerRepository's single-admin
 * whole-blob pattern, favorites are genuinely per-customer rows in
 * `color_lab_favorites` — each call hits `/api/color-lab?resource=favorites`
 * as a normal REST resource (list/create/delete), scoped server-side to
 * the signed-in caller via requireAuth() + `user.id`, never a client-
 * supplied id. See docs/integration-with-fluffypub.md ("Storage adapter
 * replacement") in fluffy-color-lab, and
 * fluffypub/scripts/migrate_color_lab_favorites.sql.
 */
export class SupabaseFavoritePaletteRepository implements FavoritePaletteRepository {
  async list(): Promise<FavoritePalette[]> {
    try {
      const res = await fetch(ENDPOINT, { headers: authHeaders() })
      if (!res.ok) return []
      const data = (await res.json()) as FavoritePalette[] | null
      // Defensive: drop any entry that isn't actually a favorite-palette
      // shape (e.g. a routing/response mismatch on the backend) rather
      // than letting a malformed `colors` field crash the whole page.
      return Array.isArray(data) ? data.filter((item) => item && Array.isArray(item.colors)) : []
    } catch {
      return []
    }
  }

  async create(input: CreateFavoritePaletteInput): Promise<FavoritePalette> {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `Failed to save favorite palette (${res.status})`)
    }
    return (await res.json()) as FavoritePalette
  }

  async delete(id: string): Promise<void> {
    const res = await fetch(`${ENDPOINT}&id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `Failed to remove favorite palette (${res.status})`)
    }
  }
}
