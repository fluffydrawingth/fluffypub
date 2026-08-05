import { create } from 'zustand'
import type { ColorCount, PaletteColor } from '@/shared/color'

interface PaletteState {
  colorCount: ColorCount
  palette: PaletteColor[]
  setColorCount: (count: ColorCount) => void
  setPalette: (palette: PaletteColor[]) => void
}

/**
 * Zustand rather than component state: future features (Palette Library,
 * Sharing, Marker Matcher, History) all need to read/write "the current
 * palette" from outside whichever flow produced it (extraction or the
 * no-image generator), without prop-drilling.
 */
export const usePaletteStore = create<PaletteState>((set) => ({
  colorCount: 6,
  palette: [],
  setColorCount: (count) => set({ colorCount: count }),
  setPalette: (palette) => set({ palette }),
}))
