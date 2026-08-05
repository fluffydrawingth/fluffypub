import { cn } from '@/shared/lib/utils'
import { COLOR_COUNT_OPTIONS, type ColorCount } from '@/shared/color'

interface PaletteControlsProps {
  colorCount: ColorCount
  onColorCountChange: (count: ColorCount) => void
}

export function PaletteControls({ colorCount, onColorCountChange }: PaletteControlsProps) {
  return (
    <div className="bg-muted flex items-center gap-1 rounded-full p-1">
      {COLOR_COUNT_OPTIONS.map((count) => (
        <button
          key={count}
          type="button"
          onClick={() => onColorCountChange(count)}
          className={cn(
            'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
            colorCount === count
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {count}
        </button>
      ))}
    </div>
  )
}
