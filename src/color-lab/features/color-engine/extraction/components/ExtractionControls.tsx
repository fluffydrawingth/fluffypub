import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/shared/lib/utils'
import { useLocalization } from '@/localization'
import { EXTRACTION_MODES } from '../modePresets'
import type { ExtractionMode } from '../types'

const MODE_KEY: Record<ExtractionMode, 'artwork' | 'fullImage' | 'soft' | 'vibrant'> = {
  artwork: 'artwork',
  'full-image': 'fullImage',
  soft: 'soft',
  vibrant: 'vibrant',
}

interface ExtractionControlsProps {
  mode: ExtractionMode
  onModeChange: (mode: ExtractionMode) => void
  includeNeutrals: boolean
  onIncludeNeutralsChange: (value: boolean) => void
}

export function ExtractionControls({
  mode,
  onModeChange,
  includeNeutrals,
  onIncludeNeutralsChange,
}: ExtractionControlsProps) {
  const { t } = useLocalization()

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {EXTRACTION_MODES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onModeChange(m)}
            title={t(`imagePalette.extractionModeDescription.${MODE_KEY[m]}`)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              mode === m
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:text-foreground',
            )}
          >
            {t(`imagePalette.extractionModeLabel.${MODE_KEY[m]}`)}
          </button>
        ))}
      </div>
      <p className="text-muted-foreground text-xs">
        {t(`imagePalette.extractionModeDescription.${MODE_KEY[mode]}`)}
      </p>

      <div className="flex items-center gap-2">
        <Switch
          id="include-neutrals"
          checked={includeNeutrals}
          onCheckedChange={onIncludeNeutralsChange}
        />
        <Label htmlFor="include-neutrals" className="text-muted-foreground text-sm">
          {t('imagePalette.includeNeutrals')}
        </Label>
      </div>
    </div>
  )
}
