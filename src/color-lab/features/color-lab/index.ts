// Public API — the ONLY import surface a host app (Fluffy Pub) should use.
// Nothing else under src/features/* is a supported integration point. See
// docs/architecture.md#portability-features-color-lab-and-adapters-v10 and
// docs/integration-with-fluffypub.md.

// Top-level public tools — the only entry points a public nav should ever
// link to. Admin tools live in a separate module: see ./admin.ts.
export { ColorLabView as ColorLabPage } from '@/app/views/ColorLabView'
export { FromImageView as ImagePaletteTool } from '@/app/views/FromImageView'
export { GeneratePaletteView as VibePaletteGenerator } from '@/app/views/GeneratePaletteView'
export { RandomPaletteGenerator } from '@/features/random-palette'
export { MarkerMatchPanel } from '@/features/marker-matcher'

// Palette types + color utilities
export type { HexColor, LabColor, OklabColor, OklchColor, PaletteColor, RgbColor } from '@/shared/color'
export { deltaE76, deltaEOk, hexToRgb, rgbToHex, rgbToLab, rgbToOklab, rgbToOklch } from '@/shared/color'

// Marker reference + user-set types and the repository interface
export type {
  CustomMarker,
  MarkerAlias,
  MarkerBrand,
  MarkerCommercialSet,
  MarkerReference,
  MarkerRepository,
  MarkerSeries,
  SwatchOverride,
  UserMarkerSet,
} from '@/features/marker-db'
export { markerRepository } from '@/features/marker-db'

// Curated palettes
export type { CuratedPalette, CuratedPaletteRepository } from '@/features/curated-palettes'
export { curatedPaletteRepository } from '@/features/curated-palettes'

// Integration adapters
export * from '@/adapters'
