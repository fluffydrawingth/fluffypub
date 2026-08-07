import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { localAuthAccessAdapter } from '@/adapters'
import { Button } from '@/components/ui/button'
import { useLocalization } from '@/localization'
import type { PaletteColor } from '@/shared/color'
import { cn } from '@/shared/lib/utils'
import { favoritePaletteRepository } from '../repository/instance'
import type { FavoritePalette } from '../types'

interface FavoritePaletteButtonProps {
  palette: PaletteColor[]
}

function sameColors(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((hex, i) => hex === b[i])
}

/**
 * Heart toggle available to any user (no admin gate, contrast with
 * SaveAsCuratedPaletteButton) — saves/removes whatever palette is
 * currently on screen from the signed-in customer's favorites. Filled
 * when the exact on-screen color sequence already matches a saved
 * favorite. See docs/architecture.md.
 */
export function FavoritePaletteButton({ palette }: FavoritePaletteButtonProps) {
  const { t } = useLocalization()
  const [existing, setExisting] = useState<FavoritePalette | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  const hexes = palette.map((c) => c.hex)
  const hexesKey = hexes.join(',')

  useEffect(() => {
    let cancelled = false
    favoritePaletteRepository.list().then((favorites) => {
      if (cancelled) return
      setExisting(favorites.find((f) => sameColors(f.colors, hexes)) ?? null)
    })
    return () => {
      cancelled = true
    }
    // Re-check whenever the on-screen palette's colors change, not on every render.
  }, [hexesKey])

  if (palette.length === 0) return null

  const handleClick = async () => {
    if (!localAuthAccessAdapter.isSignedIn()) {
      localAuthAccessAdapter.requestSignIn()
      return
    }
    setIsBusy(true)
    try {
      if (existing) {
        await favoritePaletteRepository.delete(existing.id)
        setExisting(null)
      } else {
        const created = await favoritePaletteRepository.create({ colors: hexes })
        setExisting(created)
      }
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="rounded-full"
      onClick={handleClick}
      disabled={isBusy}
    >
      <Heart className={cn('size-4', existing && 'fill-current text-primary')} />
      {existing ? t('favoritePalettes.removeFromFavorites') : t('favoritePalettes.addToFavorites')}
    </Button>
  )
}
