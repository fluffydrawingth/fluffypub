import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CropRect } from '@/features/color-engine'
import { useLocalization } from '@/localization'

type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se' | null

const MIN_CROP_PX = 24

interface ImageCropperProps {
  imageUrl: string
  naturalWidth: number
  naturalHeight: number
  /** Auto-suggested artwork region, or null when the full image looks right. */
  suggestedCrop: CropRect | null
  onConfirm: (crop: CropRect | null) => void
  /** Defaults to the localized artwork-framing copy — override for other cropping contexts (e.g. a swatch chart). */
  hint?: string
}

function clampRect(rect: CropRect, width: number, height: number): CropRect {
  const w = Math.max(MIN_CROP_PX, Math.min(rect.width, width))
  const h = Math.max(MIN_CROP_PX, Math.min(rect.height, height))
  return {
    x: Math.max(0, Math.min(rect.x, width - w)),
    y: Math.max(0, Math.min(rect.y, height - h)),
    width: w,
    height: h,
  }
}

export function ImageCropper({
  imageUrl,
  naturalWidth,
  naturalHeight,
  suggestedCrop,
  onConfirm,
  hint,
}: ImageCropperProps) {
  const { t } = useLocalization()
  const resolvedHint = hint ?? t('imagePalette.cropHint')
  const imgRef = useRef<HTMLImageElement>(null)
  const [displayScale, setDisplayScale] = useState(1)
  const [crop, setCrop] = useState<CropRect>(
    () =>
      suggestedCrop ?? {
        x: Math.round(naturalWidth * 0.08),
        y: Math.round(naturalHeight * 0.08),
        width: Math.round(naturalWidth * 0.84),
        height: Math.round(naturalHeight * 0.84),
      },
  )

  const dragRef = useRef<{
    mode: DragMode
    startX: number
    startY: number
    startCrop: CropRect
  }>({ mode: null, startX: 0, startY: 0, startCrop: crop })

  const updateScale = useCallback(() => {
    const img = imgRef.current
    if (img && img.clientWidth > 0) setDisplayScale(img.clientWidth / naturalWidth)
  }, [naturalWidth])

  useEffect(() => {
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [updateScale])

  const beginDrag = (mode: DragMode) => (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current = { mode, startX: e.clientX, startY: e.clientY, startCrop: crop }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag.mode) return
    const dx = (e.clientX - drag.startX) / displayScale
    const dy = (e.clientY - drag.startY) / displayScale
    const start = drag.startCrop

    let next: CropRect
    switch (drag.mode) {
      case 'move':
        next = { ...start, x: start.x + dx, y: start.y + dy }
        break
      case 'nw':
        next = { x: start.x + dx, y: start.y + dy, width: start.width - dx, height: start.height - dy }
        break
      case 'ne':
        next = { x: start.x, y: start.y + dy, width: start.width + dx, height: start.height - dy }
        break
      case 'sw':
        next = { x: start.x + dx, y: start.y, width: start.width - dx, height: start.height + dy }
        break
      case 'se':
        next = { x: start.x, y: start.y, width: start.width + dx, height: start.height + dy }
        break
    }
    setCrop(clampRect(next, naturalWidth, naturalHeight))
  }

  const endDrag = () => {
    dragRef.current.mode = null
  }

  const toDisplay = (value: number) => value * displayScale

  const handleBase =
    'bg-primary border-background absolute size-3.5 rounded-full border-2 shadow-sm'

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <p className="text-muted-foreground text-sm">{resolvedHint}</p>

      <div className="relative inline-block max-w-full touch-none overflow-hidden rounded-xl select-none">
        <img
          ref={imgRef}
          src={imageUrl}
          alt={t('imagePalette.cropperImageAlt')}
          className="block max-h-96 w-auto max-w-full"
          draggable={false}
          onLoad={updateScale}
        />
        <div
          role="presentation"
          className="border-primary absolute cursor-move rounded-md border-2"
          style={{
            left: toDisplay(crop.x),
            top: toDisplay(crop.y),
            width: toDisplay(crop.width),
            height: toDisplay(crop.height),
            boxShadow: '0 0 0 9999px rgba(20, 12, 28, 0.45)',
          }}
          onPointerDown={beginDrag('move')}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <span
            role="presentation"
            className={`${handleBase} -top-1.5 -left-1.5 cursor-nwse-resize`}
            onPointerDown={beginDrag('nw')}
          />
          <span
            role="presentation"
            className={`${handleBase} -top-1.5 -right-1.5 cursor-nesw-resize`}
            onPointerDown={beginDrag('ne')}
          />
          <span
            role="presentation"
            className={`${handleBase} -bottom-1.5 -left-1.5 cursor-nesw-resize`}
            onPointerDown={beginDrag('sw')}
          />
          <span
            role="presentation"
            className={`${handleBase} -right-1.5 -bottom-1.5 cursor-nwse-resize`}
            onPointerDown={beginDrag('se')}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          type="button"
          className="rounded-full"
          onClick={() =>
            onConfirm({
              x: Math.round(crop.x),
              y: Math.round(crop.y),
              width: Math.round(crop.width),
              height: Math.round(crop.height),
            })
          }
        >
          <Check className="size-4" />
          {t('common.useSelectedArea')}
        </Button>
        <Button type="button" variant="outline" className="rounded-full" onClick={() => onConfirm(null)}>
          <Maximize2 className="size-4" />
          {t('common.useFullImage')}
        </Button>
      </div>
    </div>
  )
}
