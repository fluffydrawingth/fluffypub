// Color Engine: the umbrella for all color intelligence features.
// `extraction` (image -> palette) and `marker-matching` (palette -> nearest
// marker colors) are implemented. Planned siblings (harmonies, conversion,
// ai-analysis, mood-detection, palette-optimization) each get their own
// folder here as they're built — see docs/roadmap.md.
export * from './extraction/extractColors'
export * from './extraction/types'
export * from './extraction/modePresets'
export { useColorExtraction } from './extraction/hooks/useColorExtraction'
export { suggestArtworkCrop } from './extraction/suggestCrop'
export { ExtractionControls } from './extraction/components/ExtractionControls'
export { ExtractionDebugPanel } from './extraction/components/ExtractionDebugPanel'

export * from './marker-matching'
