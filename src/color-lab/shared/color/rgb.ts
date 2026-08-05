import type { HexColor, RgbColor } from './types'

export function clamp8(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)))
}

export function hexToRgb(hex: HexColor): RgbColor {
  const normalized = hex.replace('#', '')
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized

  const int = parseInt(full, 16)
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  }
}

export function rgbToHex({ r, g, b }: RgbColor): HexColor {
  const toHex = (value: number) => clamp8(value).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

export function srgbToLinear(channel: number): number {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

export function linearToSrgb(linear: number): number {
  const c =
    linear <= 0.0031308 ? linear * 12.92 : 1.055 * Math.pow(linear, 1 / 2.4) - 0.055
  return clamp8(c * 255)
}
