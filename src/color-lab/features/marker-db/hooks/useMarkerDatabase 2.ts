import { useCallback, useEffect, useState } from 'react'
import { markerRepository } from '../repository/instance'
import type { MarkerBrand, MarkerCommercialSet, MarkerReference, MarkerSeries, UserMarkerSet } from '../types'

interface UseMarkerDatabaseResult {
  brands: MarkerBrand[]
  series: MarkerSeries[]
  references: MarkerReference[]
  commercialSets: MarkerCommercialSet[]
  userSets: UserMarkerSet[]
  isLoading: boolean
  refresh: () => Promise<void>
}

/**
 * localStorage has no reactive subscriptions, so this just refetches
 * everything after each mutation the UI performs. Fine at this data scale.
 */
export function useMarkerDatabase(): UseMarkerDatabaseResult {
  const [brands, setBrands] = useState<MarkerBrand[]>([])
  const [series, setSeries] = useState<MarkerSeries[]>([])
  const [references, setReferences] = useState<MarkerReference[]>([])
  const [commercialSets, setCommercialSets] = useState<MarkerCommercialSet[]>([])
  const [userSets, setUserSets] = useState<UserMarkerSet[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    const [b, s, r, cs, us] = await Promise.all([
      markerRepository.listBrands(),
      markerRepository.listSeries(),
      markerRepository.listReferences(),
      markerRepository.listCommercialSets(),
      markerRepository.listUserSets(),
    ])
    setBrands(b)
    setSeries(s)
    setReferences(r)
    setCommercialSets(cs)
    setUserSets(us)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { brands, series, references, commercialSets, userSets, isLoading, refresh }
}
