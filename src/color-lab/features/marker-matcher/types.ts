export type { MarkerMatchResult, MatchConfidence, MatchSource } from '@/features/color-engine'

/** A set worth offering in the selector — has at least one color. */
export interface MarkerSetOption {
  setId: string
  label: string
  availableCount: number
}
