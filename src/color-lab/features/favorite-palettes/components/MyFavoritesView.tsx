import { useEffect, useState } from 'react'
import { Heart, Trash2 } from 'lucide-react'
import { localAuthAccessAdapter } from '@/adapters'
import { Button } from '@/components/ui/button'
import { exportPaletteAsPng } from '@/features/palette'
import { useLocalization } from '@/localization'
import { hexToRgb, type PaletteColor } from '@/shared/color'
import { favoritePaletteRepository } from '../repository/instance'
import type { FavoritePalette } from '../types'

function toPaletteColors(favorite: FavoritePalette): PaletteColor[] {
  return favorite.colors.map((hex) => ({ hex, rgb: hexToRgb(hex) }))
}

/**
 * The "My Favorites" tab — lists whatever the signed-in customer has
 * hearted via FavoritePaletteButton, list/remove only (no editing —
 * contrast with CuratedPaletteAdmin, which is an authoring tool). See
 * docs/architecture.md and docs/public-admin-separation.md.
 */
export function MyFavoritesView() {
  const { t } = useLocalization()
  const [favorites, setFavorites] = useState<FavoritePalette[] | null>(null)
  const isSignedIn = localAuthAccessAdapter.isSignedIn()

  const refresh = () => {
    favoritePaletteRepository.list().then((list) => {
      setFavorites([...list].reverse())
    })
  }

  useEffect(() => {
    if (isSignedIn) refresh()
    // Re-check once on mount / whenever sign-in state changes to this tab.
  }, [isSignedIn])

  if (!isSignedIn) {
    return (
      <div className="flex w-full flex-col items-center gap-3 py-10 text-center">
        <Heart className="text-muted-foreground size-8" />
        <p className="text-muted-foreground max-w-xs text-sm">{t('favoritePalettes.signInPrompt')}</p>
        <Button type="button" className="rounded-full" onClick={() => localAuthAccessAdapter.requestSignIn()}>
          {t('favoritePalettes.signInCta')}
        </Button>
      </div>
    )
  }

  if (favorites === null) return null

  if (favorites.length === 0) {
    return (
      <div className="flex w-full flex-col items-center gap-2 py-10 text-center">
        <Heart className="text-muted-foreground size-8" />
        <p className="text-muted-foreground max-w-xs text-sm">{t('favoritePalettes.noPalettesYet')}</p>
      </div>
    )
  }

  const handleDelete = async (favorite: FavoritePalette) => {
    if (!confirm(t('favoritePalettes.deleteConfirm'))) return
    await favoritePaletteRepository.delete(favorite.id)
    refresh()
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {favorites.map((favorite) => {
        const palette = toPaletteColors(favorite)
        return (
          <div key={favorite.id} className="border-border bg-card flex flex-col gap-3 rounded-2xl border p-4">
            <div className="flex flex-wrap gap-2">
              {palette.map((color, i) => (
                <span
                  key={`${color.hex}-${i}`}
                  className="border-border size-10 shrink-0 rounded-lg border"
                  style={{ backgroundColor: color.hex }}
                  title={color.hex}
                />
              ))}
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => exportPaletteAsPng(palette)}
              >
                {t('common.exportPng')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-full"
                onClick={() => handleDelete(favorite)}
              >
                <Trash2 className="size-3.5" />
                {t('favoritePalettes.remove')}
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
