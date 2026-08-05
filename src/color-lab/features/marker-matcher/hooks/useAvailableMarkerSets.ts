import { useCallback, useEffect, useState } from 'react'
import { markerRepository } from '@/features/marker-db'
import { listAvailableMarkerSets } from '../matchAgainstSet'
import type { MarkerSetOption } from '../types'

interface UseAvailableMarkerSetsResult {
  /** Sets with at least one color — what the selector shows. */
  options: MarkerSetOption[]
  /** Every set that exists, regardless of color count — distinguishes "no sets at all" from "sets exist but are empty". */
  totalSetCount: number
  /** ids of every set, in the same order/count as totalSetCount — used to deep-link when there's exactly one. */
  allSetIds: string[]
  isLoading: boolean
  refresh: () => Promise<void>
}

export function useAvailableMarkerSets(): UseAvailableMarkerSetsResult {
  const [options, setOptions] = useState<MarkerSetOption[]>([])
  const [allSetIds, setAllSetIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    const [available, allSets] = await Promise.all([
      listAvailableMarkerSets(markerRepository),
      markerRepository.listUserSets(),
    ])
    setOptions(available)
    setAllSetIds(allSets.map((s) => s.id))
    setIsLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { options, totalSetCount: allSetIds.length, allSetIds, isLoading, refresh }
}
