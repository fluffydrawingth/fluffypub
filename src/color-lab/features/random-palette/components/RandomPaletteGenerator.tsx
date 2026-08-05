import { useEffect, useState } from 'react'
import { VarietyDebugPanel } from '@/features/palette-generator'
import { PaletteResultPanel } from '@/features/palette-result'
import { usePaletteStore } from '@/features/palette'
import { useLocalization, type TranslationKey } from '@/localization'
import type { ColorCount } from '@/shared/color'
import { useRandomPaletteGenerator } from '../hooks/useRandomPaletteGenerator'
import type { ColorIntensity, ContrastLevel, Temperature } from '../types'
import { RandomPaletteForm } from './RandomPaletteForm'

export function RandomPaletteGenerator() {
  const { t } = useLocalization()
  const setPalette = usePaletteStore((state) => state.setPalette)
  const palette = usePaletteStore((state) => state.palette)

  const [size, setSize] = useState<ColorCount>(5)
  const [intensity, setIntensity] = useState<ColorIntensity>('balanced')
  const [temperature, setTemperature] = useState<Temperature>('any')
  const [contrast, setContrast] = useState<ContrastLevel>('mixed')
  const [includeNeutral, setIncludeNeutral] = useState(true)
  const [showDiagnostics, setShowDiagnostics] = useState(false)

  const {
    palette: generated,
    archetypeId,
    diagnostics,
    generate,
    regenerate,
    rerollAt,
    removeAt,
  } = useRandomPaletteGenerator({ size, intensity, temperature, contrast, includeNeutral })

  useEffect(() => {
    setPalette(generated)
  }, [generated, setPalette])

  const captionText = archetypeId
    ? t('randomPalette.resultCaption', {
        /** Archetype ids are data-driven (from archetypes.ts, not a closed literal union), so the key is built at runtime — t() falls back to the id itself if a translation is ever missing. */
        label: t(`randomPalette.archetypes.${archetypeId}` as TranslationKey),
      })
    : undefined

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <RandomPaletteForm
        size={size}
        onSizeChange={setSize}
        intensity={intensity}
        onIntensityChange={setIntensity}
        temperature={temperature}
        onTemperatureChange={setTemperature}
        contrast={contrast}
        onContrastChange={setContrast}
        includeNeutral={includeNeutral}
        onIncludeNeutralChange={setIncludeNeutral}
        onGenerate={generate}
      />

      <PaletteResultPanel
        palette={palette}
        captionText={captionText}
        onRegenerate={regenerate}
        adjust={{ onReroll: rerollAt, onRemove: removeAt }}
        devDiagnostics={
          import.meta.env.DEV && diagnostics ? (
            <div className="flex w-full flex-col items-center gap-2">
              <button
                type="button"
                className="text-muted-foreground/60 text-xs underline-offset-2 hover:underline"
                onClick={() => setShowDiagnostics((v) => !v)}
              >
                {showDiagnostics ? t('admin.hideDevDiagnostics') : t('admin.showDevDiagnostics')}
              </button>
              {showDiagnostics && <VarietyDebugPanel familyId={archetypeId} diagnostics={diagnostics} />}
            </div>
          ) : undefined
        }
      />
    </div>
  )
}
