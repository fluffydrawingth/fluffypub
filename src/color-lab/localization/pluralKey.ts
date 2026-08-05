/** Picks the `One`/`Other` suffixed variant of a base key — Thai has no plural forms, so `th.ts` reuses the same value for both. */
export function pluralKey<Base extends string>(base: Base, count: number): `${Base}One` | `${Base}Other` {
  return count === 1 ? `${base}One` : `${base}Other`
}
