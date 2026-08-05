import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { en } from '@/locales/en'
import { th } from '@/locales/th'
import type { LocalizationAdapter, SupportedLanguage } from '@/adapters/LocalizationAdapter'
import type { TranslationKey, TranslationTree } from './translationKey'

const STORAGE_KEY = 'fluffy-color-lab:language'

const dictionaries: Record<SupportedLanguage, TranslationTree> = { en, th }

function resolve(tree: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => {
    if (node && typeof node === 'object' && part in node) {
      return (node as Record<string, unknown>)[part]
    }
    return undefined
  }, tree)
}

function interpolate(template: string, variables?: Record<string, string | number>): string {
  if (!variables) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in variables ? String(variables[name]) : match,
  )
}

/** Exported for direct unit testing — components should go through `useLocalization()`, never call this directly. */
export function translate(
  language: SupportedLanguage,
  key: TranslationKey,
  variables?: Record<string, string | number>,
): string {
  const primary = resolve(dictionaries[language], key)
  if (typeof primary === 'string') return interpolate(primary, variables)
  const fallback = resolve(dictionaries.en, key)
  if (typeof fallback === 'string') return interpolate(fallback, variables)
  return key
}

export interface LocalizationContextValue extends LocalizationAdapter {
  /** Only the standalone `LocalizationProvider` sets this — Fluffy Pub owns its own language switch. */
  setLanguage?: (language: SupportedLanguage) => void
}

export const LocalizationContext = createContext<LocalizationContextValue>({
  language: 'en',
  t: (key) => key,
})

export function useLocalization(): LocalizationContextValue {
  return useContext(LocalizationContext)
}

function detectDefaultLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return 'en'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'th' || stored === 'en') return stored
  return navigator.language.toLowerCase().startsWith('th') ? 'th' : 'en'
}

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<SupportedLanguage>(detectDefaultLanguage)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language)
    document.documentElement.lang = language
  }, [language])

  const value = useMemo<LocalizationContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key, variables) => translate(language, key, variables),
    }),
    [language],
  )

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>
}
