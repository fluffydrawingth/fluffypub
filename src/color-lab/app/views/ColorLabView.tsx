import { Palette as PaletteIcon } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MyFavoritesView } from '@/features/favorite-palettes'
import type { UploadedImage } from '@/features/image-upload'
import { RandomPaletteGenerator } from '@/features/random-palette'
import { useLocalization } from '@/localization'
import { FromImageView } from './FromImageView'
import { GeneratePaletteView } from './GeneratePaletteView'

export type ColorLabTab = 'from-image' | 'generate' | 'random' | 'favorites'

interface ColorLabViewProps {
  initialTab?: ColorLabTab
  /** Pre-supplied image (e.g. imported from a Community post) — forces the From Image tab regardless of initialTab. */
  initialImage?: UploadedImage
}

export function ColorLabView({ initialTab = 'from-image', initialImage }: ColorLabViewProps = {}) {
  const { t } = useLocalization()
  const tab = initialImage ? 'from-image' : initialTab

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-4 py-8 sm:py-10">
      <header className="flex flex-col items-center gap-2 text-center">
        <div className="bg-primary/15 text-primary flex size-12 items-center justify-center rounded-2xl">
          <PaletteIcon className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('colorLab.title')}</h1>
        <p className="text-muted-foreground max-w-sm text-sm sm:text-base">{t('colorLab.subtitle')}</p>
      </header>

      <Tabs defaultValue={tab} className="w-full items-center gap-8">
        <TabsList className="rounded-full">
          <TabsTrigger value="from-image" className="rounded-full">
            {t('colorLab.tabFromImage')}
          </TabsTrigger>
          <TabsTrigger value="generate" className="rounded-full">
            {t('colorLab.tabGeneratePalette')}
          </TabsTrigger>
          <TabsTrigger value="random" className="rounded-full">
            {t('colorLab.tabRandomPalette')}
          </TabsTrigger>
          <TabsTrigger value="favorites" className="rounded-full">
            {t('colorLab.tabFavorites')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="from-image" className="flex w-full flex-col items-center">
          <FromImageView initialImage={initialImage} />
        </TabsContent>
        <TabsContent value="generate" className="flex w-full flex-col items-center">
          <GeneratePaletteView />
        </TabsContent>
        <TabsContent value="random" className="flex w-full flex-col items-center">
          <RandomPaletteGenerator />
        </TabsContent>
        <TabsContent value="favorites" className="flex w-full flex-col items-center">
          <MyFavoritesView />
        </TabsContent>
      </Tabs>
    </div>
  )
}
