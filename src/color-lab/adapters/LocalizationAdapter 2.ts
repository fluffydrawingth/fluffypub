import type { TranslationKey } from '@/localization/translationKey'

/**
 * The standalone app's TH/EN switch and Fluffy Pub's own site-wide
 * language state both satisfy this same shape — see docs/localization.md.
 */
export type SupportedLanguage = 'th' | 'en'

export interface LocalizationAdapter {
  language: SupportedLanguage
  t(key: TranslationKey, variables?: Record<string, string | number>): string
}
