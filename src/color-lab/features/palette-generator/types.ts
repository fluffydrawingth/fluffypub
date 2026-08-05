import type { ColorCount, HexColor, PaletteColor } from '@/shared/color'

export type Mood =
  | 'cozy'
  | 'sweet'
  | 'dreamy'
  | 'pastel'
  | 'bright'
  | 'retro'
  | 'spooky'
  | 'earthy'
  | 'summer'
  | 'winter'

export const MOODS: Mood[] = [
  'cozy',
  'sweet',
  'dreamy',
  'pastel',
  'bright',
  'retro',
  'spooky',
  'earthy',
  'summer',
  'winter',
]

export type Harmony =
  | 'balanced'
  | 'analogous'
  | 'complementary'
  | 'split-complementary'
  | 'triadic'
  | 'monochrome'

export const HARMONIES: Harmony[] = [
  'balanced',
  'analogous',
  'complementary',
  'split-complementary',
  'triadic',
  'monochrome',
]

/** 'auto' lets the mood pick its own harmony — the UI default; users never need color theory. */
export type HarmonyChoice = Harmony | 'auto'

export interface PaletteGeneratorOptions {
  /** Optional starting color, truly optional — clamped into the mood's space when given. */
  startColor?: HexColor
  mood: Mood
  harmony: HarmonyChoice
  size: ColorCount
  seed: number
  /** Pin a specific family by id (mainly for tests/reproduction) — skips random family selection. */
  familyId?: string
  /** Family ids to downweight during random selection, so Regenerate avoids repeating a recent family. */
  recentFamilyIds?: string[]
}

export type GeneratedColor = PaletteColor
