import { useEffect, useState } from 'react'
import { ArrowLeft, Check, Library } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocalization, pluralKey } from '@/localization'
import { markerRepository } from '../repository/instance'
import type { MarkerBrand, MarkerCommercialSet, MarkerSeries } from '../types'

type Step = 'brand' | 'series' | 'set' | 'confirm'

interface AddFromReferenceWizardProps {
  onCreated: (userSetId: string) => void
  onCancel: () => void
}

/** Brand -> series -> commercial set -> preview count -> add to My Marker Sets. Never guesses codes or colors — this only links to data an admin already imported. */
export function AddFromReferenceWizard({ onCreated, onCancel }: AddFromReferenceWizardProps) {
  const { t } = useLocalization()
  const [step, setStep] = useState<Step>('brand')
  const [brands, setBrands] = useState<MarkerBrand[]>([])
  const [series, setSeries] = useState<MarkerSeries[]>([])
  const [commercialSets, setCommercialSets] = useState<MarkerCommercialSet[]>([])
  const [selectedBrand, setSelectedBrand] = useState<MarkerBrand | null>(null)
  const [selectedSeries, setSelectedSeries] = useState<MarkerSeries | null>(null)
  const [selectedSet, setSelectedSet] = useState<MarkerCommercialSet | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    markerRepository.listBrands().then((b) => {
      setBrands(b)
      setIsLoading(false)
    })
  }, [])

  const chooseBrand = async (brand: MarkerBrand) => {
    setSelectedBrand(brand)
    setSelectedSeries(null)
    setSelectedSet(null)
    setIsLoading(true)
    const seriesList = await markerRepository.listSeries({ brandId: brand.id })
    setSeries(seriesList)
    setIsLoading(false)
    setStep(seriesList.length > 0 ? 'series' : 'set')
    if (seriesList.length === 0) await loadCommercialSets(brand.id, undefined)
  }

  const loadCommercialSets = async (brandId: string, seriesId: string | undefined) => {
    setIsLoading(true)
    const sets = await markerRepository.listCommercialSets({ brandId, seriesId })
    setCommercialSets(sets)
    setIsLoading(false)
  }

  const chooseSeries = async (chosen: MarkerSeries | null) => {
    setSelectedSeries(chosen)
    setSelectedSet(null)
    setStep('set')
    if (selectedBrand) await loadCommercialSets(selectedBrand.id, chosen?.id)
  }

  const chooseSet = (commercialSet: MarkerCommercialSet) => {
    setSelectedSet(commercialSet)
    setStep('confirm')
  }

  const handleConfirm = async () => {
    if (!selectedSet) return
    setIsSaving(true)
    try {
      const userSet = await markerRepository.createUserSet({
        referenceSetId: selectedSet.id,
        customName: selectedSet.name,
      })
      onCreated(userSet.id)
    } finally {
      setIsSaving(false)
    }
  }

  const back = () => {
    if (step === 'confirm') setStep('set')
    else if (step === 'set') setStep(series.length > 0 ? 'series' : 'brand')
    else if (step === 'series') setStep('brand')
    else onCancel()
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={back}>
          <ArrowLeft className="size-4" />
          {t('common.back')}
        </Button>
        <h2 className="text-lg font-medium">{t('markerDatabase.addFromReferenceLibrary')}</h2>
      </div>

      <div className="border-border bg-card flex flex-col gap-3 rounded-2xl border p-5">
        {step === 'brand' && (
          <>
            <p className="text-muted-foreground text-sm">{t('markerDatabase.chooseBrand')}</p>
            {!isLoading && brands.length === 0 && (
              <p className="text-muted-foreground text-sm">{t('markerDatabase.noBrandsInLibrary')}</p>
            )}
            <div className="flex flex-col gap-1">
              {brands.map((brand) => (
                <button
                  key={brand.id}
                  type="button"
                  onClick={() => chooseBrand(brand)}
                  className="hover:bg-muted/60 rounded-xl px-3 py-2 text-left"
                >
                  {brand.name}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'series' && selectedBrand && (
          <>
            <p className="text-muted-foreground text-sm">
              {t('markerDatabase.chooseSeriesInBrand', { brand: selectedBrand.name })}
            </p>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => chooseSeries(null)}
                className="hover:bg-muted/60 rounded-xl px-3 py-2 text-left"
              >
                {t('markerDatabase.noSeries')}
              </button>
              {series.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => chooseSeries(s)}
                  className="hover:bg-muted/60 rounded-xl px-3 py-2 text-left"
                >
                  {s.name}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'set' && (
          <>
            <p className="text-muted-foreground text-sm">{t('markerDatabase.chooseSet')}</p>
            {!isLoading && commercialSets.length === 0 && (
              <p className="text-muted-foreground text-sm">
                {t(
                  selectedSeries
                    ? 'markerDatabase.noCommercialSetsBrandSeries'
                    : 'markerDatabase.noCommercialSetsBrand',
                )}
              </p>
            )}
            <div className="flex flex-col gap-1">
              {commercialSets.map((commercialSet) => (
                <button
                  key={commercialSet.id}
                  type="button"
                  onClick={() => chooseSet(commercialSet)}
                  className="hover:bg-muted/60 flex items-center justify-between rounded-xl px-3 py-2 text-left"
                >
                  <span>{commercialSet.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {t(`markerDatabase.${pluralKey('markerCount', commercialSet.markerReferenceIds.length)}`, {
                      count: commercialSet.markerReferenceIds.length,
                    })}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'confirm' && selectedSet && selectedBrand && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <Library className="text-primary size-8" />
            <div>
              <p className="text-muted-foreground text-xs">
                {selectedBrand.name}
                {selectedSeries && ` · ${selectedSeries.name}`}
              </p>
              <p className="text-lg font-medium">{selectedSet.name}</p>
              <p className="text-muted-foreground text-sm">
                {t(`markerDatabase.${pluralKey('markerCount', selectedSet.markerReferenceIds.length)}`, {
                  count: selectedSet.markerReferenceIds.length,
                })}{' '}
                {t('markerDatabase.allMarkedOwnedByDefault')}
              </p>
            </div>
            <Button type="button" className="rounded-full" onClick={handleConfirm} disabled={isSaving}>
              <Check className="size-4" />
              {t('markerDatabase.addToMyMarkerSets')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
