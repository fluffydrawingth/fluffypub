import type { LabColor, OklabColor } from './types'

// CIE76 delta-E: fast, standard for CIE Lab. Good enough for sorting/clustering;
// swap for CIEDE2000 if marker-matching later needs perceptual precision.
export function deltaE76(a: LabColor, b: LabColor): number {
  return Math.sqrt((a.l - b.l) ** 2 + (a.a - b.a) ** 2 + (a.b - b.b) ** 2)
}

export function deltaEOk(a: OklabColor, b: OklabColor): number {
  return Math.sqrt((a.l - b.l) ** 2 + (a.a - b.a) ** 2 + (a.b - b.b) ** 2)
}
