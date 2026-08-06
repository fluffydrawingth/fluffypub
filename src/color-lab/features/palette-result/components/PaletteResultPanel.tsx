import { useCallback, useState, type ReactNode } from 'react'
import { Shuffle, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SaveAsCuratedPaletteButton } from '@/features/curated-palettes'
import { MarkerMatchPanel, type MarkerMatchResult } from '@/features/marker-matcher'
import { AdjustColorsPanel, PaletteDisplay, PaletteExportButton } from '@/features/palette'
import { useLocalization } from '@/localization'
import type { PaletteColor } from '@/shared/color'
import { cn } from '@/shared/lib/utils'

interface AdjustColorsConfig {
  onReroll: (slot: number) => void
  onRemove: (slot: number) => void
  pickSlot?: number | null
  onPickSlotChange?: (slot: number | null) => void
}

interface PaletteResultPanelProps {
  palette: PaletteColor[]
  /** Already-localized caption, e.g. "Cozy · Warm Café" or "Random · Sunset" — resolving the key is the caller's job. */
  captionText?: string
  onRegenerate: () => void
  isRegenerating?: boolean
  /** Omit to hide the per-swatch editing toggle entirely (no mode currently does this, but keeps the panel usable without it). */
  adjust?: AdjustColorsConfig
  /** From Image only: suppresses the palette/matching display and shows this message instead. */
  error?: string | null
  /** Dev-only diagnostics toggle + panel — shape differs per mode (variety vs extraction), so the caller composes it. */
  devDiagnostics?: ReactNode
}

/**
 * The one result view shared by From Image, Generate by Vibe, and Random
 * Palette: swatches, HEX copy (via PaletteSwatch), regenerate, adjust
 * colors, export PNG, marker matching, save-as-curated-palette. See
 * docs/public-admin-separation.md and docs/architecture.md.
 */
export function PaletteResultPanel({
  palette,
  captionText,
  onRegenerate,
  isRegenerating = false,
  adjust,
  error = null,
  devDiagnostics,
}: PaletteResultPanelProps) {
  const { t } = useLocalization()
  const [adjusting, setAdjusting] = useState(false)
  const [matches, setMatches] = useState<MarkerMatchResult[] | null>(null)
  const [matchedSetLabel, setMatchedSetLabel] = useState<string | null>(null)

  // Stable across renders so MarkerMatchPanel's effect (keyed on this
  // callback) doesn't fire spuriously on every unrelated parent re-render.
  const handleMatchesChange = useCallback((nextMatches: MarkerMatchResult[] | null, setLabel: string | null) => {
    setMatches(nextMatches)
    setMatchedSetLabel(setLabel)
  }, [])

  // Label the PNG export with the marker code the user matched each swatch
  // to, aligned by index — but only where the match's own requestedHex
  // still agrees with the current palette's hex at that position, so a
  // stale in-flight match (palette just regenerated, re-match not back
  // yet) never mislabels a swatch. See exportPaletteAsPng.
  const markerCodes = matches
    ? palette.map((color, i) => (matches[i]?.requestedHex === color.hex ? matches[i].closestMarkerCode : undefined))
    : undefined

  // The exported PNG's header bar — which marker set the codes above came
  // from — omitted entirely when there's no current match.
  const exportHeaderText = matchedSetLabel
    ? t('common.exportMatchedTo', { label: matchedSetLabel })
    : undefined

  return (
    <div className="flex w-full flex-col items-center gap-5">
      {error ? <p className="text-destructive text-sm">{error}</p> : <PaletteDisplay palette={palette} />}

      {!error && captionText && (
        <p className="text-muted-foreground -mt-3 text-xs">{captionText}</p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          type="button"
          variant="secondary"
          className="rounded-full"
          onClick={onRegenerate}
          disabled={isRegenerating}
        >
          <Shuffle className={cn('size-4', isRegenerating && 'animate-spin')} />
          {t('common.regenerate')}
        </Button>
        <PaletteExportButton palette={palette} markerCodes={markerCodes} headerText={exportHeaderText} />
        {adjust && (
          <Button
            type="button"
            variant={adjusting ? 'secondary' : 'ghost'}
            size="sm"
            className="rounded-full"
            onClick={() => setAdjusting((v) => !v)}
          >
            <SlidersHorizontal className="size-4" />
            {t('common.adjustColors')}
          </Button>
        )}
        <SaveAsCuratedPaletteButton palette={palette} />
      </div>

      {adjust && adjusting && (
        <AdjustColorsPanel
          colors={palette}
          pickSlot={adjust.pickSlot}
          onPickSlotChange={adjust.onPickSlotChange}
          onRemove={adjust.onRemove}
          onReroll={adjust.onReroll}
        />
      )}

      {!error && <MarkerMatchPanel palette={palette} onMatchesChange={handleMatchesChange} />}

      {devDiagnostics}
    </div>
  )
}
