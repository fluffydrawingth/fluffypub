import { useState } from 'react'
import { ChevronDown, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/shared/lib/utils'
import { useLocalization } from '@/localization'
import type { HexColor } from '@/shared/color'
import { HARMONIES, type Harmony, type HarmonyChoice, type Mood } from '../types'
import { MoodPicker } from './MoodPicker'

const HARMONY_KEY: Record<Harmony, 'balanced' | 'analogous' | 'complementary' | 'splitComplementary' | 'triadic' | 'monochrome'> = {
  balanced: 'balanced',
  analogous: 'analogous',
  complementary: 'complementary',
  'split-complementary': 'splitComplementary',
  triadic: 'triadic',
  monochrome: 'monochrome',
}

const HEX_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i
const HEX_EXAMPLE = '#FFB6C1'

interface PaletteGeneratorFormProps {
  mood: Mood
  onMoodChange: (mood: Mood) => void
  harmony: HarmonyChoice
  onHarmonyChange: (harmony: HarmonyChoice) => void
  useStartColor: boolean
  onUseStartColorChange: (value: boolean) => void
  startColor: HexColor | undefined
  onStartColorChange: (color: HexColor | undefined) => void
  onGenerate: () => void
}

export function PaletteGeneratorForm({
  mood,
  onMoodChange,
  harmony,
  onHarmonyChange,
  useStartColor,
  onUseStartColorChange,
  startColor,
  onStartColorChange,
  onGenerate,
}: PaletteGeneratorFormProps) {
  const { t } = useLocalization()
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const isValidHex = !useStartColor || !startColor || HEX_PATTERN.test(startColor)

  return (
    <div className="border-border bg-card flex w-full flex-col gap-4 rounded-2xl border p-5">
      <div className="flex flex-col gap-2">
        <Label className="text-foreground font-medium">{t('paletteGenerator.chooseVibe')}</Label>
        <MoodPicker mood={mood} onMoodChange={onMoodChange} />
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 self-start text-sm"
          onClick={() => setAdvancedOpen((v) => !v)}
        >
          <ChevronDown className={cn('size-4 transition-transform', advancedOpen && 'rotate-180')} />
          {t('paletteGenerator.advancedOptions')}
        </button>

        {advancedOpen && (
          <div className="flex flex-col gap-4 pl-1">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="harmony-select" className="text-muted-foreground text-sm">
                {t('paletteGenerator.colorRelationship')}
              </Label>
              <Select value={harmony} onValueChange={(value) => onHarmonyChange(value as HarmonyChoice)}>
                <SelectTrigger id="harmony-select" className="w-full rounded-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">{t('paletteGenerator.harmonyAuto')}</SelectItem>
                  {HARMONIES.map((h) => (
                    <SelectItem key={h} value={h}>
                      {t(`paletteGenerator.harmony.${HARMONY_KEY[h]}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="use-start-color"
                checked={useStartColor}
                onCheckedChange={(checked) => {
                  onUseStartColorChange(checked)
                  if (!checked) onStartColorChange(undefined)
                }}
              />
              <Label htmlFor="use-start-color" className="text-muted-foreground text-sm">
                {t('paletteGenerator.useStartingColor')}
              </Label>
            </div>

            {useStartColor && (
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label={t('paletteGenerator.pickStartingColorAria')}
                  value={startColor && HEX_PATTERN.test(startColor) ? startColor : '#c8a2c8'}
                  onChange={(e) => onStartColorChange(e.target.value)}
                  className="border-border size-9 shrink-0 rounded-full border"
                />
                <Input
                  placeholder={HEX_EXAMPLE}
                  value={startColor ?? ''}
                  onChange={(e) => onStartColorChange(e.target.value || undefined)}
                  className="rounded-full font-mono"
                  aria-invalid={!isValidHex}
                />
              </div>
            )}
            {!isValidHex && (
              <p className="text-destructive text-xs">
                {t('validation.enterValidHex', { example: HEX_EXAMPLE })}
              </p>
            )}
          </div>
        )}
      </div>

      <Button type="button" className="w-full rounded-full" onClick={onGenerate} disabled={!isValidHex}>
        <Sparkles className="size-4" />
        {t('paletteGenerator.generate')}
      </Button>
    </div>
  )
}
