import type { HexColor, RgbColor } from '@/shared/color'

/** One grid cell after extraction, editable in the review step before saving. */
export interface ScanCell {
  index: number
  rgb: RgbColor
  hex: HexColor
  markerCode: string
  colorName: string
  excluded: boolean
}

export type CodeSource = 'paste' | 'existing-set' | 'manual'
