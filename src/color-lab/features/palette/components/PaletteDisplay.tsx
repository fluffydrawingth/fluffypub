import type { PaletteColor } from '@/shared/color'
import { PaletteSwatch } from './PaletteSwatch'

interface PaletteDisplayProps {
  palette: PaletteColor[]
}

export function PaletteDisplay({ palette }: PaletteDisplayProps) {
  if (palette.length === 0) return null

  return (
    <div id="palette-display" className="flex flex-wrap justify-center gap-4 sm:gap-6">
      {palette.map((color, index) => (
        <PaletteSwatch key={`${color.hex}-${index}`} color={color} index={index} />
      ))}
    </div>
  )
}
