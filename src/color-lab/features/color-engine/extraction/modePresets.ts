import type { ExtractionMode } from './types'

export interface CandidateScoreWeights {
  population: number
  chroma: number
  contrast: number
  salience: number
}

export interface ModePreset {
  /** How strongly to suppress pixels that are both near-background-lightness AND low-chroma (paper/backdrop). */
  paperSuppression: number
  /** How strongly to suppress low-chroma pixels generally (gray/beige/brown photographic regions). */
  neutralSuppression: number
  /** How strongly to suppress very dark low-chroma pixels — black outlines and cast shadows. */
  darknessSuppression: number
  /** How much to amplify the sampling weight of high-chroma (saturated) pixels. */
  chromaBoost: number
  /** Minimum OKLab distance required between two colors in the final selection. */
  minPerceptualDistance: number
  /** OKLab chroma below which a candidate counts as "neutral" for the includeNeutrals filter. */
  neutralChromaFloor: number
  /** Default state of the includeNeutrals toggle for this style. */
  includeNeutralsDefault: boolean
  /** Minimum weighted population share (0-1) for a candidate to avoid being discarded as noise. */
  populationFloor: number
  /** Max hue-angle difference (degrees) for two chromatic candidates to count as the same color family. */
  familyHueThreshold: number
  /** When true, selected colors are softened toward a pastel interpretation after selection. */
  softOutput: boolean
  scoreWeights: CandidateScoreWeights
}

export const MODE_PRESETS: Record<ExtractionMode, ModePreset> = {
  artwork: {
    paperSuppression: 0.92,
    neutralSuppression: 0.65,
    darknessSuppression: 0.88,
    chromaBoost: 0.8,
    minPerceptualDistance: 0.09,
    neutralChromaFloor: 0.055,
    includeNeutralsDefault: false,
    populationFloor: 0.003,
    familyHueThreshold: 32,
    softOutput: false,
    scoreWeights: { population: 0.8, chroma: 1.3, contrast: 1.1, salience: 1.5 },
  },
  'full-image': {
    paperSuppression: 0.35,
    neutralSuppression: 0.1,
    darknessSuppression: 0.1,
    chromaBoost: 0.15,
    minPerceptualDistance: 0.05,
    neutralChromaFloor: 0.03,
    includeNeutralsDefault: true,
    populationFloor: 0.003,
    familyHueThreshold: 20,
    softOutput: false,
    scoreWeights: { population: 1.5, chroma: 0.5, contrast: 0.5, salience: 0.5 },
  },
  soft: {
    paperSuppression: 0.92,
    neutralSuppression: 0.65,
    darknessSuppression: 0.88,
    chromaBoost: 0.8,
    minPerceptualDistance: 0.08,
    neutralChromaFloor: 0.055,
    includeNeutralsDefault: false,
    populationFloor: 0.003,
    familyHueThreshold: 32,
    softOutput: true,
    scoreWeights: { population: 0.8, chroma: 1.3, contrast: 1.1, salience: 1.5 },
  },
  vibrant: {
    paperSuppression: 0.92,
    neutralSuppression: 0.85,
    darknessSuppression: 0.92,
    chromaBoost: 1.3,
    minPerceptualDistance: 0.11,
    neutralChromaFloor: 0.07,
    includeNeutralsDefault: false,
    populationFloor: 0.003,
    familyHueThreshold: 36,
    softOutput: false,
    scoreWeights: { population: 0.6, chroma: 1.6, contrast: 1.0, salience: 1.6 },
  },
}

export const EXTRACTION_MODES: ExtractionMode[] = ['artwork', 'full-image', 'soft', 'vibrant']

export const EXTRACTION_MODE_LABELS: Record<ExtractionMode, string> = {
  artwork: 'Artwork Colors',
  'full-image': 'Full Image',
  soft: 'Soft Palette',
  vibrant: 'Vibrant Palette',
}

export const EXTRACTION_MODE_DESCRIPTIONS: Record<ExtractionMode, string> = {
  artwork: 'Colors visibly used in the coloring artwork',
  'full-image': 'Include the surrounding background and atmosphere',
  soft: 'A softer, pastel interpretation of the artwork colors',
  vibrant: 'The strongest colorful accents',
}
