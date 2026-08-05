import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Crop, ImageUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ImageCropper, ImageDropzone, useImageUpload } from '@/features/image-upload'
import {
  ExtractionDebugPanel,
  ExtractionControls,
  MODE_PRESETS,
  suggestArtworkCrop,
  useColorExtraction,
  type CropRect,
  type ExtractedColor,
  type ExtractionMode,
} from '@/features/color-engine'
import { deltaEOk, hexToRgb, rgbToHex, rgbToOklab, type PaletteColor } from '@/shared/color'
import { PaletteControls, usePaletteStore } from '@/features/palette'
import { PaletteResultPanel } from '@/features/palette-result'
import { useLocalization } from '@/localization'

/** undefined = crop not chosen yet (show cropper); null = full image confirmed. */
type CropChoice = CropRect | null | undefined

const REROLL_MIN_DISTANCE = 0.045

export function FromImageView() {
  const { t } = useLocalization()
  const { image, isLoading: isImageLoading, error: imageError, loadFile, clear } = useImageUpload()
  const colorCount = usePaletteStore((state) => state.colorCount)
  const setColorCount = usePaletteStore((state) => state.setColorCount)
  const setPalette = usePaletteStore((state) => state.setPalette)

  const [mode, setMode] = useState<ExtractionMode>('artwork')
  const [includeNeutrals, setIncludeNeutrals] = useState(MODE_PRESETS.artwork.includeNeutralsDefault)
  const [crop, setCrop] = useState<CropChoice>(undefined)

  const [colors, setColors] = useState<ExtractedColor[]>([])
  const [pickSlot, setPickSlot] = useState<number | null>(null)
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const rerollCursor = useRef(0)
  const previewImgRef = useRef<HTMLImageElement>(null)

  const handleModeChange = (nextMode: ExtractionMode) => {
    setMode(nextMode)
    setIncludeNeutrals(MODE_PRESETS[nextMode].includeNeutralsDefault)
  }

  const handleFileSelected = (file: File) => {
    setCrop(undefined)
    setPickSlot(null)
    loadFile(file)
  }

  const handleClear = () => {
    setCrop(undefined)
    setPickSlot(null)
    clear()
  }

  const suggestedCrop = useMemo(() => (image ? suggestArtworkCrop(image.element) : null), [image])

  const cropConfirmed = crop !== undefined
  const {
    palette: extractedPalette,
    debug,
    isExtracting,
    error: extractionError,
    regenerate,
  } = useColorExtraction(image && cropConfirmed ? image.element : null, {
    colorCount,
    mode,
    includeNeutrals,
    crop: crop ?? null,
  })

  // Local editable copy of the extraction result; edits flow to the shared
  // store so copy/export always reflect what's on screen.
  useEffect(() => {
    setColors(extractedPalette)
    setPickSlot(null)
    rerollCursor.current = 0
  }, [extractedPalette])

  useEffect(() => {
    if (image && cropConfirmed) setPalette(colors)
  }, [colors, setPalette, image, cropConfirmed])

  /** Canvas of the analyzed region at natural resolution — preview + eyedropper source. */
  const croppedCanvas = useMemo(() => {
    if (!image || !cropConfirmed) return null
    const source = crop ?? {
      x: 0,
      y: 0,
      width: image.element.naturalWidth || image.element.width,
      height: image.element.naturalHeight || image.element.height,
    }
    const canvas = document.createElement('canvas')
    canvas.width = source.width
    canvas.height = source.height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(image.element, source.x, source.y, source.width, source.height, 0, 0, source.width, source.height)
    return canvas
  }, [image, crop, cropConfirmed])

  const croppedPreviewUrl = useMemo(() => croppedCanvas?.toDataURL() ?? null, [croppedCanvas])

  const replaceSlot = (slot: number, replacement: PaletteColor) => {
    setColors((prev) => prev.map((c, i) => (i === slot ? replacement : c)))
  }

  const handlePreviewClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (pickSlot === null || !croppedCanvas || !previewImgRef.current) return
    const img = previewImgRef.current
    const rect = img.getBoundingClientRect()
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * croppedCanvas.width)
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * croppedCanvas.height)
    const ctx = croppedCanvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    const [r, g, b] = ctx.getImageData(
      Math.max(0, Math.min(x, croppedCanvas.width - 1)),
      Math.max(0, Math.min(y, croppedCanvas.height - 1)),
      1,
      1,
    ).data
    const rgb = { r, g, b }
    replaceSlot(pickSlot, { rgb, hex: rgbToHex(rgb) })
    setPickSlot(null)
  }

  const handleReroll = (slot: number) => {
    if (!debug) return
    const pool = [...debug.candidates]
      .sort((a, b) => b.score - a.score)
      .filter((c) => !colors.some((existing) => existing.hex === c.hex))
      .filter((c) =>
        colors.every(
          (existing, i) =>
            i === slot ||
            deltaEOk(rgbToOklab(hexToRgb(c.hex)), rgbToOklab(existing.rgb)) > REROLL_MIN_DISTANCE,
        ),
      )
    if (pool.length === 0) return
    const pick = pool[rerollCursor.current % pool.length]
    rerollCursor.current += 1
    const rgb = hexToRgb(pick.hex)
    replaceSlot(slot, { rgb, hex: pick.hex, population: pick.population })
  }

  const handleRemove = (slot: number) => {
    setColors((prev) => prev.filter((_, i) => i !== slot))
    setPickSlot(null)
  }

  if (!image) {
    return (
      <div className="flex w-full flex-col items-center gap-6">
        <ImageDropzone
          previewUrl={null}
          fileName={null}
          isLoading={isImageLoading}
          error={imageError}
          onFileSelected={handleFileSelected}
          onClear={handleClear}
        />
      </div>
    )
  }

  if (!cropConfirmed) {
    return (
      <div className="flex w-full flex-col items-center gap-4">
        <ImageCropper
          imageUrl={image.url}
          naturalWidth={image.element.naturalWidth || image.element.width}
          naturalHeight={image.element.naturalHeight || image.element.height}
          suggestedCrop={suggestedCrop}
          onConfirm={setCrop}
        />
        <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={handleClear}>
          <ImageUp className="size-4" />
          {t('imagePalette.chooseDifferentPhoto')}
        </Button>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex w-full flex-col items-center gap-5"
    >
      <div className="flex w-full flex-col items-center gap-2">
        {croppedPreviewUrl && (
          <img
            ref={previewImgRef}
            src={croppedPreviewUrl}
            alt={image.fileName}
            onClick={handlePreviewClick}
            className={
              pickSlot !== null
                ? 'max-h-56 cursor-crosshair rounded-xl object-contain shadow-sm ring-2 ring-primary'
                : 'max-h-56 rounded-xl object-contain shadow-sm'
            }
          />
        )}
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={() => setCrop(undefined)}>
            <Crop className="size-4" />
            {t('imagePalette.reCrop')}
          </Button>
          <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={handleClear}>
            <ImageUp className="size-4" />
            {t('common.changePhoto')}
          </Button>
        </div>
      </div>

      <ExtractionControls
        mode={mode}
        onModeChange={handleModeChange}
        includeNeutrals={includeNeutrals}
        onIncludeNeutralsChange={setIncludeNeutrals}
      />

      <PaletteControls colorCount={colorCount} onColorCountChange={setColorCount} />

      <PaletteResultPanel
        palette={colors}
        error={extractionError}
        onRegenerate={regenerate}
        isRegenerating={isExtracting}
        adjust={{ onReroll: handleReroll, onRemove: handleRemove, pickSlot, onPickSlotChange: setPickSlot }}
        devDiagnostics={
          import.meta.env.DEV && debug ? (
            <div className="flex w-full flex-col items-center gap-2">
              <button
                type="button"
                className="text-muted-foreground/60 text-xs underline-offset-2 hover:underline"
                onClick={() => setShowDiagnostics((v) => !v)}
              >
                {showDiagnostics ? t('admin.hideDevDiagnostics') : t('admin.showDevDiagnostics')}
              </button>
              {showDiagnostics && <ExtractionDebugPanel debug={debug} />}
            </div>
          ) : undefined
        }
      />
    </motion.div>
  )
}
