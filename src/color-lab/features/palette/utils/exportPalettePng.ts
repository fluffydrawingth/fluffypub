import type { PaletteColor } from '@/shared/color'

const SWATCH_WIDTH = 180
const COLOR_BLOCK_HEIGHT = 160
/** Label area height with no match at all — hex only, vertically centered. */
const LABEL_HEIGHT_HEX_ONLY = 60
/** Fixed rows every matched swatch always gets: code, then hex. */
const LABEL_TOP_PADDING = 14
const LABEL_BOTTOM_PADDING = 12
const CODE_LINE_HEIGHT = 24
const HEX_LINE_HEIGHT = 18
/** Extra rows added only when at least one swatch actually has that detail. */
const COLOR_NAME_LINE_HEIGHT = 18
const SET_LABEL_LINE_HEIGHT = 16
/** Header bar height when a marker-set label is shown above the swatches. */
const HEADER_HEIGHT = 44
/** Horizontal inset text is truncated against, each side. */
const TEXT_INSET = 10

/**
 * Per-swatch marker detail for the PNG export — everything the on-screen
 * match panel already shows for that swatch, so the export is legible
 * without the app open: the matched code, the marker's own color
 * name/legacy code (if any), and which of the user's marker sets it came
 * from (if any — relevant once matching pools colors across several
 * sets, see matchAgainstSets, so the exported image still says which
 * physical set to reach for instead of just a bare code).
 */
export interface MarkerSwatchLabel {
  code: string
  colorName?: string
  setLabel?: string
}

/** Binary-searches the longest prefix (plus an ellipsis) that fits `maxWidth`, for the current font. */
function truncateToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let lo = 0
  let hi = text.length
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (ctx.measureText(text.slice(0, mid) + '…').width <= maxWidth) lo = mid
    else hi = mid - 1
  }
  return lo > 0 ? text.slice(0, lo) + '…' : '…'
}

/**
 * `markerLabels[i]` is the matched marker detail for `palette[i]`, from
 * whichever marker set(s) the user picked in the marker-matching panel —
 * `undefined` for a swatch with no match (no set chosen, or that swatch
 * fell outside the match, in which case it just falls back to showing hex
 * only). Kept as a plain parallel array rather than importing
 * `MarkerMatchResult` here so this low-level `palette` feature stays free
 * of a dependency on marker-matching — see docs/architecture.md.
 *
 * `headerText`, when present, is drawn as a full-width bar above the
 * swatches (e.g. "Matched to: Ohuhu · Honolulu · Pastel Colors 48") —
 * already localized by the caller, same convention as `captionText`
 * elsewhere in this feature; this function never resolves a translation
 * key itself.
 */
export function exportPaletteAsPng(
  palette: PaletteColor[],
  fileName = 'fluffy-color-lab-palette.png',
  markerLabels?: (MarkerSwatchLabel | undefined)[],
  headerText?: string,
): void {
  if (palette.length === 0) return

  const hasAnyLabel = markerLabels?.some(Boolean) ?? false
  const hasAnyColorName = markerLabels?.some((l) => l?.colorName) ?? false
  const hasAnySetLabel = markerLabels?.some((l) => l?.setLabel) ?? false
  const headerHeight = headerText ? HEADER_HEIGHT : 0
  const canvasWidth = SWATCH_WIDTH * palette.length

  const labelHeight = hasAnyLabel
    ? LABEL_TOP_PADDING +
      CODE_LINE_HEIGHT +
      (hasAnyColorName ? COLOR_NAME_LINE_HEIGHT : 0) +
      HEX_LINE_HEIGHT +
      (hasAnySetLabel ? SET_LABEL_LINE_HEIGHT : 0) +
      LABEL_BOTTOM_PADDING
    : LABEL_HEIGHT_HEX_ONLY

  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = headerHeight + COLOR_BLOCK_HEIGHT + labelHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  if (headerText) {
    ctx.fillStyle = '#f3eef7'
    ctx.fillRect(0, 0, canvasWidth, headerHeight)
    ctx.fillStyle = '#5a5265'
    ctx.font = '600 16px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(headerText, canvasWidth / 2, headerHeight / 2, canvasWidth - 32)
  }

  const maxTextWidth = SWATCH_WIDTH - TEXT_INSET * 2

  palette.forEach((color, index) => {
    const x = index * SWATCH_WIDTH
    const centerX = x + SWATCH_WIDTH / 2

    ctx.fillStyle = color.hex
    ctx.fillRect(x, headerHeight, SWATCH_WIDTH, COLOR_BLOCK_HEIGHT)

    const label = markerLabels?.[index]
    ctx.textAlign = 'center'

    if (label) {
      let y = headerHeight + COLOR_BLOCK_HEIGHT + LABEL_TOP_PADDING
      ctx.textBaseline = 'top'

      // Marker code — bold, primary line.
      ctx.fillStyle = '#3a3540'
      ctx.font = '700 20px sans-serif'
      ctx.fillText(truncateToWidth(ctx, label.code, maxTextWidth), centerX, y)
      y += CODE_LINE_HEIGHT

      // Color name / legacy code, if this marker has one.
      if (hasAnyColorName) {
        if (label.colorName) {
          ctx.fillStyle = '#6b6472'
          ctx.font = '500 13px sans-serif'
          ctx.fillText(truncateToWidth(ctx, label.colorName, maxTextWidth), centerX, y)
        }
        y += COLOR_NAME_LINE_HEIGHT
      }

      // Hex.
      ctx.fillStyle = '#8a8290'
      ctx.font = '500 13px sans-serif'
      ctx.fillText(color.hex, centerX, y)
      y += HEX_LINE_HEIGHT

      // Which marker set this came from, if matching pooled more than one.
      if (hasAnySetLabel) {
        if (label.setLabel) {
          ctx.fillStyle = '#a08fc9'
          ctx.font = 'italic 500 11px sans-serif'
          ctx.fillText(truncateToWidth(ctx, label.setLabel, maxTextWidth), centerX, y)
        }
      }
    } else {
      // No match for this swatch — single line, vertically centered, hex only.
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#3a3540'
      ctx.font = '600 22px sans-serif'
      ctx.fillText(color.hex, centerX, headerHeight + COLOR_BLOCK_HEIGHT + labelHeight / 2)
    }
  })

  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}
