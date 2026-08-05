const HEX_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

export function isValidHex(value: string): boolean {
  return HEX_PATTERN.test(value.trim())
}
