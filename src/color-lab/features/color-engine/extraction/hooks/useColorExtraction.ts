import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocalization } from '@/localization'
import { DEFAULT_EXTRACTION_SEED, extractPalette } from '../extractColors'
import type { ExtractedColor, ExtractionDebugInfo, ExtractionOptions } from '../types'

interface UseColorExtractionResult {
  palette: ExtractedColor[]
  debug: ExtractionDebugInfo | null
  isExtracting: boolean
  error: string | null
  regenerate: () => void
}

export function useColorExtraction(
  image: HTMLImageElement | null,
  options: Omit<ExtractionOptions, 'seed'>,
): UseColorExtractionResult {
  const { t } = useLocalization()
  const { colorCount, mode, includeNeutrals, crop } = options
  const [palette, setPalette] = useState<ExtractedColor[]>([])
  const [debug, setDebug] = useState<ExtractionDebugInfo | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const seedRef = useRef(DEFAULT_EXTRACTION_SEED)

  const run = useCallback(
    (seed: number) => {
      if (!image) {
        setPalette([])
        setDebug(null)
        return
      }
      setIsExtracting(true)
      setError(null)
      try {
        const result = extractPalette(image, { colorCount, mode, includeNeutrals, crop, seed })
        setPalette(result.colors)
        setDebug(result.debug)
      } catch (err) {
        setError(err instanceof Error ? err.message : t('notices.extractionFailed'))
      } finally {
        setIsExtracting(false)
      }
    },
    [image, colorCount, mode, includeNeutrals, crop, t],
  )

  useEffect(() => {
    seedRef.current = DEFAULT_EXTRACTION_SEED
    run(seedRef.current)
  }, [run])

  const regenerate = useCallback(() => {
    seedRef.current = Date.now()
    run(seedRef.current)
  }, [run])

  return { palette, debug, isExtracting, error, regenerate }
}
