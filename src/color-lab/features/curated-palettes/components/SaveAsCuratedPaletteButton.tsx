import { useState } from 'react'
import { Check, Star } from 'lucide-react'
import { localAdminAccessAdapter } from '@/adapters'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
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
 *
 * Regular customers never see this at all (fully hidden, not just
 * disabled). The leading divider + "Admin" badge are purely for the
 * admin's own benefit — sitting right next to the customer-facing
 * FavoritePaletteButton in the same row, it needs to read as clearly
 * different at a glance so the one person who does see both doesn't
 * mix up "I like this" with "publish this as site content."
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
      <div className="flex items-center gap-2">
        <Separator orientation="vertical" className="h-5" />
        <Badge variant="outline" className="text-muted-foreground">
          {t('navigation.adminEntry')}
        </Badge>
        <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={handleSave}>
          {saved ? <Check className="size-4" /> : <Star className="size-4" />}
          {saved ? t('curatedPalettes.savedAsDraft') : t('curatedPalettes.saveAsCurated')}
        </Button>
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  )
}
