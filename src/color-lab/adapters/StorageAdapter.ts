// The storage seam is `shared/storage`'s `KeyValueStorage` — re-exported
// here so every adapter Fluffy Pub needs to swap lives under one import
// path. See docs/integration-with-fluffypub.md.
export { createMemoryStorage, getDefaultStorage, type KeyValueStorage } from '@/shared/storage'
