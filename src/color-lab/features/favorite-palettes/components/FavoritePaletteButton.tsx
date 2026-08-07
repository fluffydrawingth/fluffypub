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

function sameColors(a: string[] | undefined, b: string[]): boolean {
  // Defensive: a malformed/mismatched-shape favorite from a repository
  // (e.g. a network or backend response that isn't what the interface
  // promises) should never crash the whole app — just fail the match.
  return Array.isArray(a) && a.length === b.length && a.every((hex, i) => hex === b[i])
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
  const [error, setError] = useState<string | null>(null)

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
    setError(null)
    try {
      if (existing) {
        await favoritePaletteRepository.delete(existing.id)
        setExisting(null)
      } else {
        const created = await favoritePaletteRepository.create({ colors: hexes })
        setExisting(created)
      }
    } catch (err) {
      // A silent failure here (network/backend error swallowed) looks
      // identical to the button doing nothing — always surface it.
      setError(t('favoritePalettes.saveError', { message: err instanceof Error ? err.message : String(err) }))
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
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
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  )
}
