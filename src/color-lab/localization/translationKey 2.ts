import type { en } from '@/locales/en'

type Primitive = string | number | boolean

type PathsOf<T> = T extends Primitive
  ? []
  : {
      [K in Extract<keyof T, string>]: [K, ...PathsOf<T[K]>]
    }[Extract<keyof T, string>]

type Join<Parts extends readonly string[]> = Parts extends readonly [infer Head extends string, ...infer Rest extends readonly string[]]
  ? Rest extends readonly []
    ? Head
    : `${Head}.${Join<Rest>}`
  : never

/** Every dot-path leaf in `en.ts`, derived automatically — never hand-maintained. */
export type TranslationKey = Join<PathsOf<typeof en>>

/** Same shape as `en.ts`, but with string-literal leaves widened to `string` so `th.ts` isn't forced to reuse English text. */
type Widen<T> = T extends string ? string : { [K in keyof T]: Widen<T[K]> }

export type TranslationTree = Widen<typeof en>
