import { PaletteGeneratorPanel } from '@/features/palette-generator'

export function GeneratePaletteView() {
  return (
    <div className="flex w-full flex-col items-center gap-8">
      <PaletteGeneratorPanel />
    </div>
  )
}
