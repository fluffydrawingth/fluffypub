import type { Mood } from '@/features/palette-generator'
import type { HexColor } from '@/shared/color'

export type CuratedPaletteStatus = 'draft' | 'published' | 'archived'

/**
 * A hand-picked palette for future content use (challenges, prompts,
 * Journal/Community features) — not something a normal user creates. See
 * docs/curated-palettes.md.
 *
 * Prose fields are bilingual pairs, not translation-dictionary keys — this
 * is admin-authored content that may exist in only one language at a time,
 * unlike UI chrome (which must exist in both by construction). Resolve with
 * `resolveBilingualText()`, never read `titleEn`/`titleTh` directly in a
 * component. `vibe`/`status` stay stable enum values, translated only at
 * render — see docs/localization.md.
 */
export interface CuratedPalette {
  id: string
  titleEn?: string
  titleTh?: string
  slug: string
  descriptionEn?: string
  descriptionTh?: string
  colors: HexColor[]
  colorCount: number
  vibe?: Mood
  theme?: string
  challengePromptEn?: string
  challengePromptTh?: string
  status: CuratedPaletteStatus
  createdAt: string
  updatedAt: string
}

export interface CreateCuratedPaletteInput {
  titleEn?: string
  titleTh?: string
  slug: string
  descriptionEn?: string
  descriptionTh?: string
  colors: HexColor[]
  vibe?: Mood
  theme?: string
  challengePromptEn?: string
  challengePromptTh?: string
}

export type UpdateCuratedPaletteInput = Partial<CreateCuratedPaletteInput> & {
  status?: CuratedPaletteStatus
}
