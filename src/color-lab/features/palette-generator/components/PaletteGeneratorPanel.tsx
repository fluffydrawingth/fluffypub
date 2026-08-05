import { useEffect, useState } from 'react'
import { PaletteControls, usePaletteStore } from '@/features/palette'
import { PaletteResultPanel } from '@/features/palette-result'
import { useLocalization, type TranslationKey } from '@/localization'
import type { HexColor } from '@/shared/color'
import { usePaletteGenerator } from '../hooks/usePaletteGenerator'
import type { HarmonyChoice, Mood } from '../types'
import { PaletteGeneratorForm } from './PaletteGeneratorForm'
import { VarietyDebugPanel } from './VarietyDebugPanel'

const HEX_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

export function PaletteGeneratorPanel() {
  const { t } = useLocalization()
  const colorCount = usePaletteStore((state) => state.colorCount)
  const setColorCount = usePaletteStore((state) => state.setColorCount)
  const setPalette = usePaletteStore((state) => state.setPalette)
  const palette = usePaletteStore((state) => state.palette)

  const [mood, setMood] = useState<Mood>('cozy')
  const [harmony, setHarmony] = useState<HarmonyChoice>('auto')
  const [useStartColor, setUseStartColor] = useState(false)
  const [startColor, setStartColor] = useState<HexColor | undefined>(undefined)
  const [showDiagnostics, setShowDiagnostics] = useState(false)

  const effectiveStartColor =
    useStartColor && startColor && HEX_PATTERN.test(startColor) ? startColor : undefined

  const {
    palette: generated,
    familyId,
    diagnostics,
    generate,
    regenerate,
    rerollAt,
    removeAt,
  } = usePaletteGenerator({ startColor: effectiveStartColor, mood, harmony, size: colorCount })

  useEffect(() => {
    setPalette(generated)
  }, [generated, setPalette])

  const captionText = familyId
    ? t('paletteGenerator.familyCaption', {
        mood: t(`paletteGenerator.moods.${mood}.label`),
        /** Family ids are data-driven (from moodProfiles.ts, not a closed literal union), so the key is built at runtime — t() falls back to the id itself if a translation is ever missing. */
        family: t(`paletteGenerator.families.${familyId}` as TranslationKey),
      })
    : undefined

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <PaletteGeneratorForm
        mood={mood}
        onMoodChange={setMood}
        harmony={harmony}
        onHarmonyChange={setHarmony}
        useStartColor={useStartColor}
        onUseStartColorChange={setUseStartColor}
        startColor={startColor}
        onStartColorChange={setStartColor}
        onGenerate={generate}
      />

      <PaletteControls colorCount={colorCount} onColorCountChange={setColorCount} />

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
              {showDiagnostics && <VarietyDebugPanel familyId={familyId} diagnostics={diagnostics} />}
            </div>
          ) : undefined
        }
      />
    </div>
  )
}
