import type { SupportedLanguage } from '@/adapters/LocalizationAdapter'

/** Current-language value if present, else whichever language has content, else undefined — never blank when any content exists. */
export function resolveBilingualText(
  en: string | undefined,
  th: string | undefined,
  language: SupportedLanguage,
): string | undefined {
  const primary = language === 'th' ? th : en
  const fallback = language === 'th' ? en : th
  return primary?.trim() ? primary : fallback?.trim() ? fallback : undefined
}
