import { useState } from 'react'
import { Check, Star } from 'lucide-react'
import { localAdminAccessAdapter } from '@/adapters'
import { Button } from '@/components/ui/button'
import { useLocalization } from '@/localization'
import type { PaletteColor } from '@/shared/color'
import { curatedPaletteRepository } from '../repository/instance'

interface SaveAsCuratedPaletteButtonProps {
  palette: PaletteColor[]
}

/**
 * Admin-only: snapshots whatever palette is currently on screen into a new
 * draft CuratedPalette. A one-way copy — editing the draft afterward never
 * touches the original, and regenerating the on-screen palette never
 * touches the draft. See docs/curated-palettes.md and
 * docs/public-admin-separation.md.
 */
export function SaveAsCuratedPaletteButton({ palette }: SaveAsCuratedPaletteButtonProps) {
  const { t } = useLocalization()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!localAdminAccessAdapter.isAdmin() || palette.length === 0) return null

  const handleSave = async () => {
    setError(null)
    try {
      await curatedPaletteRepository.create({
        titleEn: 'Untitled palette',
        slug: '',
        colors: palette.map((c) => c.hex),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      // A silent failure here (network/backend error swallowed) looks
      // identical to the button doing nothing — always surface it.
      setError(t('curatedPalettes.saveError', { message: err instanceof Error ? err.message : String(err) }))
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={handleSave}>
        {saved ? <Check className="size-4" /> : <Star className="size-4" />}
        {saved ? t('curatedPalettes.savedAsDraft') : t('curatedPalettes.saveAsCurated')}
      </Button>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  )
}
