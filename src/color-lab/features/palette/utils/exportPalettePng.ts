import type { PaletteColor } from '@/shared/color'

const SWATCH_WIDTH = 180
const SWATCH_HEIGHT = 220
const COLOR_BLOCK_HEIGHT = 160

export function exportPaletteAsPng(
  palette: PaletteColor[],
  fileName = 'fluffy-color-lab-palette.png',
): void {
  if (palette.length === 0) return

  const canvas = document.createElement('canvas')
  canvas.width = SWATCH_WIDTH * palette.length
  canvas.height = SWATCH_HEIGHT

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  palette.forEach((color, index) => {
    const x = index * SWATCH_WIDTH

    ctx.fillStyle = color.hex
    ctx.fillRect(x, 0, SWATCH_WIDTH, COLOR_BLOCK_HEIGHT)

    ctx.fillStyle = '#3a3540'
    ctx.font = '600 22px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(
      color.hex,
      x + SWATCH_WIDTH / 2,
      COLOR_BLOCK_HEIGHT + (SWATCH_HEIGHT - COLOR_BLOCK_HEIGHT) / 2,
    )
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
