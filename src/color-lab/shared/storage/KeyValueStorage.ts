/** Minimal Web Storage subset — lets repositories be tested without a real localStorage/DOM, and lets a host app (Fluffy Pub) swap in its own persistence later. */
export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function createMemoryStorage(): KeyValueStorage {
  const data = new Map<string, string>()
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
    },
  }
}

export function getDefaultStorage(): KeyValueStorage {
  if (typeof localStorage !== 'undefined') return localStorage
  return createMemoryStorage()
}
