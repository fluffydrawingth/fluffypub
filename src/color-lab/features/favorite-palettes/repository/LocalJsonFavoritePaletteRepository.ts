import { getDefaultStorage, type KeyValueStorage } from '@/shared/storage'
import type { CreateFavoritePaletteInput, FavoritePalette } from '../types'
import type { FavoritePaletteRepository } from './FavoritePaletteRepository'

export const FAVORITE_PALETTES_STORAGE_KEY = 'fluffy-color-lab:favorite-palettes'

function now(): string {
  return new Date().toISOString()
}

function generateId(): string {
  return crypto.randomUUID()
}

export class LocalJsonFavoritePaletteRepository implements FavoritePaletteRepository {
  private readonly storage: KeyValueStorage
  private readonly storageKey: string

  constructor(storage: KeyValueStorage = getDefaultStorage(), storageKey: string = FAVORITE_PALETTES_STORAGE_KEY) {
    this.storage = storage
    this.storageKey = storageKey
  }

  private read(): FavoritePalette[] {
    const raw = this.storage.getItem(this.storageKey)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  private write(palettes: FavoritePalette[]): void {
    this.storage.setItem(this.storageKey, JSON.stringify(palettes))
  }

  async list(): Promise<FavoritePalette[]> {
    return this.read()
  }

  async create(input: CreateFavoritePaletteInput): Promise<FavoritePalette> {
    const palettes = this.read()
    const palette: FavoritePalette = {
      id: generateId(),
      colors: input.colors,
      label: input.label,
      createdAt: now(),
    }
    palettes.push(palette)
    this.write(palettes)
    return palette
  }

  async delete(id: string): Promise<void> {
    const palettes = this.read().filter((p) => p.id !== id)
    this.write(palettes)
  }
}
