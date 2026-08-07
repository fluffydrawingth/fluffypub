import type { HexColor } from '@/shared/color'

/**
 * A palette a customer has hearted for themselves — plain personal storage,
 * not editorial content (contrast with CuratedPalette, which is
 * admin-authored and has a publish workflow). See docs/architecture.md.
 */
export interface FavoritePalette {
  id: string
  colors: HexColor[]
  label?: string
  createdAt: string
}

export interface CreateFavoritePaletteInput {
  colors: HexColor[]
  label?: string
}
