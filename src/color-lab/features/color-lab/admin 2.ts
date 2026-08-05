// Admin API — marker reference library, marker set management, and
// curated-palette authoring. NEVER import these into a public nav or route;
// mount them only behind a real admin/role check (see AdminAccessAdapter in
// ./index.ts's adapter re-exports). See docs/public-admin-separation.md.

export { ReferenceLibraryAdmin as MarkerReferenceAdmin } from '@/features/marker-db/admin/ReferenceLibraryAdmin'
export { MarkerDatabaseView as MarkerSetAdmin } from '@/app/views/MarkerDatabaseView'
export { CuratedPaletteAdmin } from '@/features/curated-palettes'
