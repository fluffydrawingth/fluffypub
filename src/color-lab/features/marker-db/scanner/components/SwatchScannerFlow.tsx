import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, ClipboardPaste, RefreshCw, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import type { CropRect } from '@/features/color-engine'
import { ImageCropper, ImageDropzone, useImageUpload } from '@/features/image-upload'
import { useLocalization, pluralKey } from '@/localization'
import { rgbToHex } from '@/shared/color'
import { markerRepository } from '../../repository/instance'
import type { MarkerReference, UserMarkerSet } from '../../types'
import { isValidHex } from '../../validation/hexValidation'
import { assignCodesFromExistingSet, assignCodesFromPastedList } from '../codeAssignment'
import { extractGridColors } from '../gridExtraction'
import type { ScanCell } from '../types'

type Step = 'upload' | 'crop' | 'grid' | 'review'

const MIN_GRID = 1
const MAX_GRID = 20

function clampGridSize(value: number): number {
  return Math.max(MIN_GRID, Math.min(MAX_GRID, Math.round(value) || MIN_GRID))
}

interface SwatchScannerFlowProps {
  userSet: UserMarkerSet
  displayName: string
  ownedReferences: MarkerReference[]
  onSaved: () => Promise<void>
  onCancel: () => void
}

/**
 * Guided, non-AI swatch chart scanner (see docs/marker-database.md). Marker
 * codes are always human-sourced (pasted list, reused set codes, or typed in
 * review) — the scanner only ever proposes colors, never codes. A scanned
 * code matching an owned reference (canonical or alias) writes a swatch
 * override; any other code creates a custom marker.
 */
export function SwatchScannerFlow({
  userSet,
  displayName,
  ownedReferences,
  onSaved,
  onCancel,
}: SwatchScannerFlowProps) {
  const { t } = useLocalization()
  const { image, isLoading, error, loadFile, clear } = useImageUpload()
  const [step, setStep] = useState<Step>('upload')
  const [crop, setCrop] = useState<CropRect | null>(null)
  const [rows, setRows] = useState(4)
  const [cols, setCols] = useState(6)
  const [cells, setCells] = useState<ScanCell[]>([])
  const [pasteText, setPasteText] = useState('')
  const [saving, setSaving] = useState(false)
  const previousImageRef = useRef<typeof image>(null)

  useEffect(() => {
    if (image && !previousImageRef.current) setStep('crop')
    if (!image) setStep('upload')
    previousImageRef.current = image
  }, [image])

  const croppedCanvas = useMemo(() => {
    if (!image || step === 'upload' || step === 'crop') return null
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
  }, [image, crop, step])

  const croppedPreviewUrl = useMemo(() => croppedCanvas?.toDataURL() ?? null, [croppedCanvas])

  const handleChangePhoto = () => {
    clear()
    setCrop(null)
    setCells([])
    setStep('upload')
  }

  const handleDetectCells = () => {
    if (!croppedCanvas) return
    const ctx = croppedCanvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    const imageData = ctx.getImageData(0, 0, croppedCanvas.width, croppedCanvas.height)
    const colors = extractGridColors(imageData.data, croppedCanvas.width, croppedCanvas.height, rows, cols)
    setCells(
      colors.map((rgb, index) => ({
        index,
        rgb,
        hex: rgbToHex(rgb),
        markerCode: '',
        colorName: '',
        excluded: false,
      })),
    )
    setStep('review')
  }

  const applyPastedCodes = () => {
    const codes = assignCodesFromPastedList(pasteText, cells.length)
    setCells((prev) => prev.map((cell, i) => (codes[i] ? { ...cell, markerCode: codes[i] } : cell)))
  }

  const applyExistingCodes = () => {
    const codes = assignCodesFromExistingSet(ownedReferences, userSet.customMarkers, cells.length)
    setCells((prev) => prev.map((cell, i) => (codes[i] ? { ...cell, markerCode: codes[i] } : cell)))
  }

  const updateCell = (index: number, patch: Partial<ScanCell>) => {
    setCells((prev) => prev.map((cell) => (cell.index === index ? { ...cell, ...patch } : cell)))
  }

  const includedCells = cells.filter((c) => !c.excluded)
  const readyCells = includedCells.filter((c) => c.markerCode.trim() && isValidHex(c.hex))
  const hasExistingCodes = ownedReferences.length > 0 || userSet.customMarkers.length > 0

  const handleSave = async () => {
    setSaving(true)
    try {
      const referenceByCode = new Map<string, MarkerReference>()
      for (const reference of ownedReferences) {
        referenceByCode.set(reference.canonicalCode.toLowerCase(), reference)
        for (const alias of reference.aliases) referenceByCode.set(alias.code.toLowerCase(), reference)
      }
      const customByCode = new Map(userSet.customMarkers.map((m) => [m.markerCode.toLowerCase(), m] as const))

      for (const cell of readyCells) {
        const code = cell.markerCode.trim()
        const key = code.toLowerCase()
        const matchedReference = referenceByCode.get(key)
        const matchedCustom = customByCode.get(key)

        if (matchedReference) {
          await markerRepository.setSwatchOverride(userSet.id, matchedReference.id, cell.hex)
        } else if (matchedCustom) {
          await markerRepository.updateCustomMarker(userSet.id, matchedCustom.id, {
            colorName: cell.colorName.trim() || matchedCustom.colorName,
            hex: cell.hex,
          })
        } else {
          await markerRepository.addCustomMarker(userSet.id, {
            markerCode: code,
            colorName: cell.colorName.trim(),
            hex: cell.hex,
          })
        }
      }
      await onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={onCancel}>
          <ArrowLeft className="size-4" />
          {t('common.cancel')}
        </Button>
        <div>
          <p className="text-muted-foreground text-xs">{t('markerDatabase.scanSwatchImage')}</p>
          <h2 className="text-lg font-medium">{displayName}</h2>
        </div>
      </div>

      {step === 'upload' && (
        <ImageDropzone
          previewUrl={null}
          fileName={null}
          isLoading={isLoading}
          error={error}
          onFileSelected={loadFile}
          onClear={clear}
          label={t('markerDatabase.scanner.dropzoneLabel')}
        />
      )}

      {step === 'crop' && image && (
        <div className="flex w-full flex-col items-center gap-4">
          <ImageCropper
            imageUrl={image.url}
            naturalWidth={image.element.naturalWidth || image.element.width}
            naturalHeight={image.element.naturalHeight || image.element.height}
            suggestedCrop={null}
            hint={t('markerDatabase.scanner.cropHint')}
            onConfirm={(nextCrop) => {
              setCrop(nextCrop)
              setStep('grid')
            }}
          />
          <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={handleChangePhoto}>
            {t('imagePalette.chooseDifferentPhoto')}
          </Button>
        </div>
      )}

      {step === 'grid' && croppedPreviewUrl && (
        <div className="flex w-full flex-col items-center gap-4">
          <div className="relative inline-block max-w-full overflow-hidden rounded-xl">
            <img
              src={croppedPreviewUrl}
              alt={t('markerDatabase.scanner.croppedImageAlt')}
              className="block max-h-96 w-auto max-w-full"
            />
            <div
              className="pointer-events-none absolute inset-0 grid"
              style={{ gridTemplateRows: `repeat(${rows}, 1fr)`, gridTemplateColumns: `repeat(${cols}, 1fr)` }}
            >
              {Array.from({ length: rows * cols }).map((_, i) => (
                <div key={i} className="border-primary/70 border" />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-center gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="scanner-rows">{t('markerDatabase.scanner.rows')}</Label>
              <Input
                id="scanner-rows"
                type="number"
                min={MIN_GRID}
                max={MAX_GRID}
                value={rows}
                onChange={(e) => setRows(clampGridSize(Number(e.target.value)))}
                className="w-20"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="scanner-cols">{t('markerDatabase.scanner.columns')}</Label>
              <Input
                id="scanner-cols"
                type="number"
                min={MIN_GRID}
                max={MAX_GRID}
                value={cols}
                onChange={(e) => setCols(clampGridSize(Number(e.target.value)))}
                className="w-20"
              />
            </div>
            <Button type="button" className="rounded-full" onClick={handleDetectCells}>
              <Check className="size-4" />
              {t(`markerDatabase.scanner.${pluralKey('detectCells', rows * cols)}`, { count: rows * cols })}
            </Button>
          </div>
          <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={() => setStep('crop')}>
            {t('imagePalette.reCrop')}
          </Button>
        </div>
      )}

      {step === 'review' && (
        <div className="flex w-full flex-col gap-4">
          <div className="bg-muted flex flex-col gap-3 rounded-xl p-4">
            <p className="text-sm font-medium">{t('markerDatabase.scanner.assignMarkerCodes')}</p>
            <p className="text-muted-foreground text-xs">{t('markerDatabase.scanner.codesNeverGuessedHint')}</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <Textarea
                rows={2}
                placeholder={t('markerDatabase.scanner.pasteCodesPlaceholder')}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                className="sm:flex-1"
              />
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={applyPastedCodes}
                  disabled={!pasteText.trim()}
                >
                  <ClipboardPaste className="size-4" />
                  {t('markerDatabase.scanner.applyList')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={applyExistingCodes}
                  disabled={!hasExistingCodes}
                >
                  <RefreshCw className="size-4" />
                  {t('markerDatabase.scanner.reuseSetCodes')}
                </Button>
              </div>
            </div>
          </div>

          <div className="border-border overflow-hidden rounded-2xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.swatch')}</TableHead>
                  <TableHead>{t('markerDatabase.tableMarkerCode')}</TableHead>
                  <TableHead>{t('common.colorName')}</TableHead>
                  <TableHead>{t('common.hex')}</TableHead>
                  <TableHead className="text-right">{t('markerDatabase.scanner.tableCell')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cells.map((cell) => (
                  <TableRow key={cell.index} className={cell.excluded ? 'opacity-40' : undefined}>
                    <TableCell>
                      <span
                        className="border-border inline-block size-6 rounded-full border"
                        style={{ backgroundColor: cell.hex }}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={cell.markerCode}
                        onChange={(e) => updateCell(cell.index, { markerCode: e.target.value })}
                        className="h-8 w-24 font-mono text-sm"
                        placeholder="R29"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={cell.colorName}
                        onChange={(e) => updateCell(cell.index, { colorName: e.target.value })}
                        className="h-8 w-32 text-sm"
                        placeholder="Cherry Red"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={cell.hex}
                        onChange={(e) => updateCell(cell.index, { hex: e.target.value })}
                        className="h-8 w-24 font-mono text-sm"
                        aria-invalid={!isValidHex(cell.hex)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
                        onClick={() => updateCell(cell.index, { excluded: !cell.excluded })}
                      >
                        {cell.excluded ? t('markerDatabase.scanner.include') : t('markerDatabase.scanner.exclude')}
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-muted-foreground text-xs">
              {t('markerDatabase.scanner.readyCellsSummary', {
                ready: readyCells.length,
                included: includedCells.length,
              })}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" className="rounded-full" onClick={() => setStep('grid')}>
                {t('markerDatabase.scanner.backToGrid')}
              </Button>
              <Button
                type="button"
                className="rounded-full"
                onClick={handleSave}
                disabled={readyCells.length === 0 || saving}
              >
                <Save className="size-4" />
                {t(`markerDatabase.scanner.${pluralKey('saveColors', readyCells.length)}`, {
                  count: readyCells.length,
                })}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
