import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, Palette as PaletteIcon, Sparkles, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useNavigationStore } from '@/app/navigationStore'
import { localAdminAccessAdapter } from '@/adapters'
import { markerRepository } from '@/features/marker-db'
import { useLocalization, pluralKey } from '@/localization'
import type { PaletteColor } from '@/shared/color'
import { cn } from '@/shared/lib/utils'
import { matchAgainstSet } from '../matchAgainstSet'
import { useAvailableMarkerSets } from '../hooks/useAvailableMarkerSets'
import { hasSeenMatchNotice, markMatchNoticeSeen } from '../seenNotice'
import type { MarkerMatchResult, MatchConfidence } from '../types'

const CONFIDENCE_STYLES: Record<MatchConfidence, string> = {
  Excellent: 'bg-primary/30 text-primary',
  Close: 'bg-primary/20 text-primary',
  Approximate: 'bg-accent/60 text-accent-foreground',
  Distant: 'bg-muted text-muted-foreground',
}

function paletteKey(palette: PaletteColor[]): string {
  return palette.map((c) => c.hex).join(',')
}

interface MarkerMatchPanelProps {
  palette: PaletteColor[]
  /**
   * Notified with the current match results (or null) and the matched
   * set's display label (e.g. "Ohuhu · Honolulu · Pastel Colors 48", or
   * null alongside null matches) on every change, so a sibling like
   * PaletteResultPanel can label the PNG export with marker codes and the
   * set name.
   */
  onMatchesChange?: (matches: MarkerMatchResult[] | null, setLabel: string | null) => void
}

/**
 * The marker-matching panel shared by both From Image and Generate
 * Palette (see docs/algorithms.md). All matching logic lives in
 * matchAgainstSet; this component only owns UI state.
 */
export function MarkerMatchPanel({ palette, onMatchesChange }: MarkerMatchPanelProps) {
  const { t } = useLocalization()
  const { options, totalSetCount, allSetIds, isLoading } = useAvailableMarkerSets()
  const goToNewMarkerSet = useNavigationStore((s) => s.goToNewMarkerSet)
  const goToMarkerSet = useNavigationStore((s) => s.goToMarkerSet)
  const goToMarkerDb = useNavigationStore((s) => s.goToMarkerDb)
  const isAdmin = localAdminAccessAdapter.isAdmin()

  const [selectedSetId, setSelectedSetId] = useState<string | null>(null)
  const [matches, setMatches] = useState<MarkerMatchResult[] | null>(null)
  const [isMatching, setIsMatching] = useState(false)
  const [noticeVisible, setNoticeVisible] = useState(() => !hasSeenMatchNotice())
  const hasMatchedRef = useRef(false)
  const lastKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (options.length > 0 && (!selectedSetId || !options.some((o) => o.setId === selectedSetId))) {
      setSelectedSetId(options[0].setId)
    }
    if (options.length === 0) setSelectedSetId(null)
  }, [options, selectedSetId])

  const matchedSetLabel = matches ? (options.find((o) => o.setId === selectedSetId)?.label ?? null) : null

  useEffect(() => {
    onMatchesChange?.(matches, matchedSetLabel)
    // Also clears out a stale export label on unmount (e.g. an extraction
    // error hides this panel entirely) so PaletteExportButton doesn't keep
    // labeling swatches with codes from a palette no longer on screen.
    return () => onMatchesChange?.(null, null)
  }, [matches, matchedSetLabel, onMatchesChange])

  const runMatch = useCallback(
    async (setId: string) => {
      setIsMatching(true)
      try {
        const result = await matchAgainstSet(
          palette.map((c) => c.hex),
          setId,
          markerRepository,
        )
        setMatches(result)
        hasMatchedRef.current = true
        lastKeyRef.current = `${setId}::${paletteKey(palette)}`
      } finally {
        setIsMatching(false)
      }
    },
    [palette],
  )

  // Once the user has matched at least once, keep results current
  // automatically — regenerating the palette or switching sets re-matches
  // without a second click.
  useEffect(() => {
    if (!hasMatchedRef.current || !selectedSetId) return
    const key = `${selectedSetId}::${paletteKey(palette)}`
    if (key === lastKeyRef.current) return
    runMatch(selectedSetId)
  }, [selectedSetId, palette, runMatch])

  const dismissNotice = () => {
    markMatchNoticeSeen()
    setNoticeVisible(false)
  }

  if (palette.length === 0) return null

  return (
    <div className="border-border bg-card flex w-full flex-col gap-4 rounded-2xl border p-5">
      <div className="flex items-center gap-2">
        <PaletteIcon className="text-primary size-4" />
        <h3 className="font-medium">{t('markerMatcher.title')}</h3>
      </div>

      {isLoading ? null : totalSetCount === 0 ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <p className="text-muted-foreground text-sm">{t('markerMatcher.noSetYet')}</p>
          {isAdmin && (
            <Button type="button" className="rounded-full" onClick={goToNewMarkerSet}>
              {t('markerMatcher.addMarkerSet')}
            </Button>
          )}
        </div>
      ) : options.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <p className="text-muted-foreground text-sm">{t('markerMatcher.noColorData')}</p>
          {isAdmin && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => (allSetIds.length === 1 ? goToMarkerSet(allSetIds[0]) : goToMarkerDb())}
              >
                {t('markerMatcher.importCsv')}
              </Button>
              <Button
                type="button"
                className="rounded-full"
                onClick={() => (allSetIds.length === 1 ? goToMarkerSet(allSetIds[0]) : goToMarkerDb())}
              >
                {t('markerMatcher.addColors')}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <>
          {noticeVisible && (
            <div className="bg-muted flex items-start gap-2 rounded-xl p-3 text-xs">
              <p className="text-muted-foreground flex-1">{t('markerMatcher.noticeApproximate')}</p>
              <button
                type="button"
                aria-label={t('markerMatcher.dismissAria')}
                className="text-muted-foreground hover:text-foreground shrink-0"
                onClick={dismissNotice}
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}

          <div className="flex flex-col items-center gap-2 sm:flex-row">
            <Select value={selectedSetId ?? undefined} onValueChange={setSelectedSetId}>
              <SelectTrigger className="w-full sm:flex-1">
                <SelectValue placeholder={t('markerMatcher.chooseSetPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.setId} value={option.setId}>
                    {t(`markerMatcher.${pluralKey('optionLabel', option.availableCount)}`, {
                      label: option.label,
                      count: option.availableCount,
                    })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              className="w-full shrink-0 rounded-full sm:w-auto"
              disabled={!selectedSetId || isMatching}
              onClick={() => selectedSetId && runMatch(selectedSetId)}
            >
              <Sparkles className={cn('size-4', isMatching && 'animate-spin')} />
              {t('markerMatcher.matchColors')}
            </Button>
          </div>

          {matches && (
            <div className="flex flex-col gap-2">
              {matches.map((match, i) => (
                <div key={i} className="bg-muted/60 flex items-center gap-3 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="border-border size-9 shrink-0 rounded-full border"
                      style={{ backgroundColor: match.requestedHex }}
                    />
                    <span className="font-mono text-xs">{match.requestedHex}</span>
                  </div>

                  <ArrowRight className="text-muted-foreground size-4 shrink-0" />

                  <div className="flex flex-1 items-center gap-2">
                    <span
                      className="border-border size-9 shrink-0 rounded-full border"
                      style={{ backgroundColor: match.markerHex }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {match.closestMarkerCode}
                        {match.markerName && <span className="text-muted-foreground"> · {match.markerName}</span>}
                      </p>
                      <p className="text-muted-foreground font-mono text-xs">{match.markerHex}</p>
                      {match.source && (
                        <p className="text-muted-foreground text-[11px]">
                          {t('markerMatcher.matchedUsing', { source: t(`markerMatcher.source.${match.source}`) })}
                        </p>
                      )}
                    </div>
                  </div>

                  <Badge className={cn('shrink-0', CONFIDENCE_STYLES[match.confidence])}>
                    {t(`markerMatcher.confidence.${match.confidence}`)} · ΔE {match.deltaE.toFixed(1)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
