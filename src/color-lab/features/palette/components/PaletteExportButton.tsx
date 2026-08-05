import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocalization } from '@/localization'
import type { PaletteColor } from '@/shared/color'
import { exportPaletteAsPng } from '../utils/exportPalettePng'

interface PaletteExportButtonProps {
  palette: PaletteColor[]
  /** `markerCodes[i]` labels `palette[i]` with its matched marker code in the exported PNG — see exportPaletteAsPng. */
  markerCodes?: (string | undefined)[]
}

export function PaletteExportButton({ palette, markerCodes }: PaletteExportButtonProps) {
  const { t } = useLocalization()

  return (
    <Button
      type="button"
      variant="outline"
      className="rounded-full"
      disabled={palette.length === 0}
      onClick={() => exportPaletteAsPng(palette, undefined, markerCodes)}
    >
      <Download className="size-4" />
      {t('common.exportPng')}
    </Button>
  )
}
