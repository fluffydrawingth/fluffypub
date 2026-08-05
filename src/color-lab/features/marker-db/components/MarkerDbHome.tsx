import { Library, Plus, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocalization, pluralKey } from '@/localization'
import type { MarkerBrand, MarkerCommercialSet, MarkerSeries, UserMarkerSet } from '../types'

interface MarkerDbHomeProps {
  brands: MarkerBrand[]
  series: MarkerSeries[]
  commercialSets: MarkerCommercialSet[]
  userSets: UserMarkerSet[]
  onAddFromLibrary: () => void
  onNewCustomSet: () => void
  onOpenSet: (userSetId: string) => void
  onManageBrands: () => void
}

export function MarkerDbHome({
  brands,
  series,
  commercialSets,
  userSets,
  onAddFromLibrary,
  onNewCustomSet,
  onOpenSet,
  onManageBrands,
}: MarkerDbHomeProps) {
  const { t } = useLocalization()
  const brandName = (id: string) => brands.find((b) => b.id === id)?.name ?? ''
  const seriesName = (id?: string) => (id ? (series.find((s) => s.id === id)?.name ?? '') : '')

  const setLabel = (userSet: UserMarkerSet) => {
    const commercialSet = userSet.referenceSetId
      ? commercialSets.find((s) => s.id === userSet.referenceSetId)
      : undefined
    if (!commercialSet) return { subtitle: '', title: userSet.customName }
    const subtitle = [brandName(commercialSet.brandId), seriesName(commercialSet.seriesId)]
      .filter(Boolean)
      .join(' · ')
    return { subtitle, title: userSet.customName }
  }

  const ownedCount = (userSet: UserMarkerSet) =>
    userSet.ownedMarkerReferenceIds.length + userSet.customMarkers.length

  if (userSets.length === 0) {
    return (
      <div className="flex w-full flex-col items-center gap-5 py-10 text-center">
        <p className="text-muted-foreground max-w-sm text-sm">{t('markerDatabase.emptyStateHint')}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" size="lg" className="rounded-full" onClick={onAddFromLibrary}>
            <Library className="size-4" />
            {t('markerDatabase.addFromReferenceLibrary')}
          </Button>
          <Button type="button" size="lg" variant="outline" className="rounded-full" onClick={onNewCustomSet}>
            <Plus className="size-4" />
            {t('markerDatabase.createCustomSet')}
          </Button>
        </div>
        <button
          type="button"
          className="text-muted-foreground/70 hover:text-foreground text-xs underline-offset-2 hover:underline"
          onClick={onManageBrands}
        >
          {t('markerDatabase.manageBrands')}
        </button>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-medium">{t('markerDatabase.myMarkerSets')}</h2>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={onAddFromLibrary}>
            <Library className="size-4" />
            {t('markerDatabase.addFromReferenceLibrary')}
          </Button>
          <Button type="button" size="sm" className="rounded-full" onClick={onNewCustomSet}>
            <Plus className="size-4" />
            {t('markerDatabase.createCustomSet')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {userSets.map((userSet) => {
          const { subtitle, title } = setLabel(userSet)
          const count = ownedCount(userSet)
          return (
            <button
              key={userSet.id}
              type="button"
              onClick={() => onOpenSet(userSet.id)}
              className="border-border bg-card hover:border-primary/40 flex flex-col gap-2 rounded-2xl border p-4 text-left transition-colors"
            >
              <div>
                {subtitle && <p className="text-muted-foreground text-xs">{subtitle}</p>}
                <p className="font-medium">{title}</p>
                <p className="text-muted-foreground text-sm">
                  {userSet.plannedCount
                    ? t('markerDatabase.ownedOfPlanned', { count, plannedCount: userSet.plannedCount })
                    : t(`markerDatabase.${pluralKey('ownedCount', count)}`, { count })}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        className="text-muted-foreground/70 hover:text-foreground flex items-center gap-1 self-center text-xs underline-offset-2 hover:underline"
        onClick={onManageBrands}
      >
        <Settings2 className="size-3.5" />
        {t('markerDatabase.manageBrands')}
      </button>
    </div>
  )
}
