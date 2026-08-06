import type { PaletteColor } from '@/shared/color'

const SWATCH_WIDTH = 180
const COLOR_BLOCK_HEIGHT = 160
/** Label area height: one line (hex only) vs. two lines (marker code + hex), see exportPaletteAsPng. */
const LABEL_HEIGHT_HEX_ONLY = 60
const LABEL_HEIGHT_WITH_CODE = 80
/** Header bar height when a marker-set label is shown above the swatches. */
const HEADER_HEIGHT = 44

/**
 * `markerCodes[i]` is the matched marker code for `palette[i]` (e.g.
 * "Y030"), from whichever marker set the user picked in the marker-matching
 * panel — `undefined` for a swatch with no match (no set chosen, or that
 * swatch fell outside the match, in which case it just falls back to
 * showing hex only). Kept as a plain parallel array rather than importing
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
  markerCodes?: (string | undefined)[],
  headerText?: string,
): void {
  if (palette.length === 0) return

  const hasAnyCode = markerCodes?.some(Boolean) ?? false
  const labelHeight = hasAnyCode ? LABEL_HEIGHT_WITH_CODE : LABEL_HEIGHT_HEX_ONLY
  const headerHeight = headerText ? HEADER_HEIGHT : 0
  const canvasWidth = SWATCH_WIDTH * palette.length

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

  palette.forEach((color, index) => {
    const x = index * SWATCH_WIDTH

    ctx.fillStyle = color.hex
    ctx.fillRect(x, headerHeight, SWATCH_WIDTH, COLOR_BLOCK_HEIGHT)

    const code = markerCodes?.[index]
    ctx.textAlign = 'center'

    if (code) {
      // Two lines: marker code (bold, primary) above hex (smaller, muted).
      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = '#3a3540'
      ctx.font = '700 22px sans-serif'
      ctx.fillText(code, x + SWATCH_WIDTH / 2, headerHeight + COLOR_BLOCK_HEIGHT + 30)
      ctx.fillStyle = '#8a8290'
      ctx.font = '500 15px sans-serif'
      ctx.fillText(color.hex, x + SWATCH_WIDTH / 2, headerHeight + COLOR_BLOCK_HEIGHT + 52)
    } else {
      // Single line, vertically centered — original hex-only layout.
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#3a3540'
      ctx.font = '600 22px sans-serif'
      ctx.fillText(color.hex, x + SWATCH_WIDTH / 2, headerHeight + COLOR_BLOCK_HEIGHT + labelHeight / 2)
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
