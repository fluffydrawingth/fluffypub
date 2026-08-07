import { useCallback, useRef, useState } from 'react'
import type { UploadedImage } from '../types'

interface UseImageUploadResult {
  image: UploadedImage | null
  isLoading: boolean
  error: string | null
  loadFile: (file: File) => void
  /** Injects an already-built UploadedImage (e.g. from loadImageFromUrl) without going through file input. */
  setImage: (image: UploadedImage) => void
  clear: () => void
}

export function useImageUpload(): UseImageUploadResult {
  const [image, setImageState] = useState<UploadedImage | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  const revokePrevious = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }, [])

  const loadFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file (PNG, JPG, WEBP...)')
        return
      }

      setIsLoading(true)
      setError(null)

      const url = URL.createObjectURL(file)
      const element = new Image()

      element.onload = () => {
        revokePrevious()
        objectUrlRef.current = url
        setImageState({ element, url, fileName: file.name })
        setIsLoading(false)
      }

      element.onerror = () => {
        URL.revokeObjectURL(url)
        setError('Could not read that image. Try a different file.')
        setIsLoading(false)
      }

      element.src = url
    },
    [revokePrevious],
  )

  // For images that arrive already built (e.g. loadImageFromUrl) — not a
  // blob: URL we own, so nothing to revoke for the new image itself, but a
  // previously loaded local file's blob URL is released to avoid a leak.
  const setImage = useCallback(
    (nextImage: UploadedImage) => {
      revokePrevious()
      setError(null)
      setIsLoading(false)
      setImageState(nextImage)
    },
    [revokePrevious],
  )

  const clear = useCallback(() => {
    revokePrevious()
    setImageState(null)
    setError(null)
  }, [revokePrevious])

  return { image, isLoading, error, loadFile, setImage, clear }
}
