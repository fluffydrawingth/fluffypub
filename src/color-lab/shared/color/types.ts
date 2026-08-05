export interface RgbColor {
  r: number
  g: number
  b: number
}

export interface LabColor {
  l: number
  a: number
  b: number
}

export interface OklabColor {
  l: number
  a: number
  b: number
}

export type HexColor = string

/** A single color as it appears in any generated/extracted palette. */
export interface PaletteColor {
  hex: HexColor
  rgb: RgbColor
  /** Fraction (0-1) of the source this color represents. Not meaningful for generated palettes. */
  population?: number
}

/** Palette size, shared by both extraction and the no-image generator. */
export type ColorCount = 4 | 5 | 6 | 8

export const COLOR_COUNT_OPTIONS: ColorCount[] = [4, 5, 6, 8]
