import { Pipette, RotateCw, X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useLocalization } from '@/localization'
import type { PaletteColor } from '@/shared/color'

interface AdjustColorsPanelProps {
  colors: PaletteColor[]
  onRemove: (slot: number) => void
  onReroll: (slot: number) => void
  /**
   * Only From Image supports picking a replacement straight off the source
   * photo — omit both props for generated/random palettes and the
   * eyedropper button simply doesn't render.
   */
  pickSlot?: number | null
  onPickSlotChange?: (slot: number | null) => void
}

/**
 * Per-slot palette editing shared by From Image, Generate by Vibe, and
 * Random Palette: remove a color, re-roll it, or (From Image only) arm a
 * slot for pick-from-image — the actual image click is handled by the
 * parent, which owns the preview. See docs/architecture.md.
 */
export function AdjustColorsPanel({
  colors,
  pickSlot = null,
  onPickSlotChange,
  onRemove,
  onReroll,
}: AdjustColorsPanelProps) {
  const { t } = useLocalization()
  const canPickFromImage = onPickSlotChange !== undefined

  return (
    <div className="border-border bg-card flex w-full flex-col gap-2 rounded-2xl border p-4">
      {canPickFromImage ? (
        <p className={cn('text-center text-sm', pickSlot !== null ? 'text-primary font-medium' : 'text-muted-foreground')}>
          {pickSlot !== null ? t('imagePalette.adjustHintPicking') : t('imagePalette.adjustHintDefault')}
        </p>
      ) : (
        <p className="text-muted-foreground text-center text-sm">{t('common.adjustHintGeneric')}</p>
      )}

      <div className="flex flex-col gap-1.5">
        {colors.map((color, index) => (
          <div
            key={`${color.hex}-${index}`}
            className={cn(
              'flex items-center gap-3 rounded-full px-3 py-1.5',
              pickSlot === index ? 'bg-primary/10' : 'hover:bg-muted/60',
            )}
          >
            <span
              className="border-border size-7 shrink-0 rounded-full border"
              style={{ backgroundColor: color.hex }}
            />
            <span className="flex-1 font-mono text-sm">{color.hex}</span>

            {canPickFromImage && (
              <button
                type="button"
                aria-label={t('imagePalette.pickFromImageAria', { hex: color.hex })}
                title={t('imagePalette.pickFromImageTitle')}
                className={cn(
                  'rounded-full p-1.5 transition-colors',
                  pickSlot === index
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => onPickSlotChange?.(pickSlot === index ? null : index)}
              >
                <Pipette className="size-4" />
              </button>
            )}
            <button
              type="button"
              aria-label={t('common.rerollAria', { hex: color.hex })}
              title={t('common.rerollTitle')}
              className="text-muted-foreground hover:text-foreground rounded-full p-1.5"
              onClick={() => onReroll(index)}
            >
              <RotateCw className="size-4" />
            </button>
            <button
              type="button"
              aria-label={t('common.removeAria', { hex: color.hex })}
              title={t('common.removeTitle')}
              className="text-muted-foreground hover:text-destructive rounded-full p-1.5"
              onClick={() => onRemove(index)}
              disabled={colors.length <= 1}
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
