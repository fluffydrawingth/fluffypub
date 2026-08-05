import { useState } from 'react'
import { ChevronDown, Shuffle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/shared/lib/utils'
import { useLocalization } from '@/localization'
import { COLOR_COUNT_OPTIONS, type ColorCount } from '@/shared/color'
import {
  COLOR_INTENSITIES,
  CONTRAST_LEVELS,
  TEMPERATURES,
  type ColorIntensity,
  type ContrastLevel,
  type Temperature,
} from '../types'

interface RandomPaletteFormProps {
  size: ColorCount
  onSizeChange: (size: ColorCount) => void
  intensity: ColorIntensity
  onIntensityChange: (intensity: ColorIntensity) => void
  temperature: Temperature
  onTemperatureChange: (temperature: Temperature) => void
  contrast: ContrastLevel
  onContrastChange: (contrast: ContrastLevel) => void
  includeNeutral: boolean
  onIncludeNeutralChange: (value: boolean) => void
  onGenerate: () => void
}

function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  labelFor,
}: {
  options: readonly T[]
  value: T
  onChange: (value: T) => void
  labelFor: (option: T) => string
}) {
  return (
    <div className="bg-muted flex items-center gap-1 rounded-full p-1">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
            value === option
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {labelFor(option)}
        </button>
      ))}
    </div>
  )
}

export function RandomPaletteForm({
  size,
  onSizeChange,
  intensity,
  onIntensityChange,
  temperature,
  onTemperatureChange,
  contrast,
  onContrastChange,
  includeNeutral,
  onIncludeNeutralChange,
  onGenerate,
}: RandomPaletteFormProps) {
  const { t } = useLocalization()
  const [advancedOpen, setAdvancedOpen] = useState(false)

  return (
    <div className="border-border bg-card flex w-full flex-col gap-4 rounded-2xl border p-5">
      <div className="flex flex-col gap-1.5">
        <Label className="text-muted-foreground text-sm">{t('randomPalette.paletteSize')}</Label>
        <SegmentedControl
          options={COLOR_COUNT_OPTIONS}
          value={size}
          onChange={onSizeChange}
          labelFor={(count) => String(count)}
        />
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 self-start text-sm"
          onClick={() => setAdvancedOpen((v) => !v)}
        >
          <ChevronDown className={cn('size-4 transition-transform', advancedOpen && 'rotate-180')} />
          {t('randomPalette.advancedOptions')}
        </button>

        {advancedOpen && (
          <div className="flex flex-col gap-4 pl-1">
            <div className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground text-sm">{t('randomPalette.colorIntensity')}</Label>
              <SegmentedControl
                options={COLOR_INTENSITIES}
                value={intensity}
                onChange={onIntensityChange}
                labelFor={(v) => t(`randomPalette.intensity.${v}`)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground text-sm">{t('randomPalette.temperature')}</Label>
              <SegmentedControl
                options={TEMPERATURES}
                value={temperature}
                onChange={onTemperatureChange}
                labelFor={(v) => t(`randomPalette.temperatureOptions.${v}`)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground text-sm">{t('randomPalette.contrast')}</Label>
              <SegmentedControl
                options={CONTRAST_LEVELS}
                value={contrast}
                onChange={onContrastChange}
                labelFor={(v) => t(`randomPalette.contrastOptions.${v}`)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="include-neutral"
                checked={includeNeutral}
                onCheckedChange={onIncludeNeutralChange}
              />
              <Label htmlFor="include-neutral" className="text-muted-foreground text-sm">
                {t('randomPalette.includeNeutral')}
              </Label>
            </div>
          </div>
        )}
      </div>

      <Button type="button" className="w-full rounded-full" onClick={onGenerate}>
        <Shuffle className="size-4" />
        {t('randomPalette.surpriseMe')}
      </Button>
    </div>
  )
}
