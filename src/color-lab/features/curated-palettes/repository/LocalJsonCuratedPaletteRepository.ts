import { getDefaultStorage, type KeyValueStorage } from '@/shared/storage'
import type { CreateCuratedPaletteInput, CuratedPalette, UpdateCuratedPaletteInput } from '../types'
import type { CuratedPaletteRepository } from './CuratedPaletteRepository'

export const CURATED_PALETTES_STORAGE_KEY = 'fluffy-color-lab:curated-palettes'

function now(): string {
  return new Date().toISOString()
}

function generateId(): string {
  return crypto.randomUUID()
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export class LocalJsonCuratedPaletteRepository implements CuratedPaletteRepository {
  private readonly storage: KeyValueStorage
  private readonly storageKey: string

  constructor(storage: KeyValueStorage = getDefaultStorage(), storageKey: string = CURATED_PALETTES_STORAGE_KEY) {
    this.storage = storage
    this.storageKey = storageKey
  }

  private read(): CuratedPalette[] {
    const raw = this.storage.getItem(this.storageKey)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  private write(palettes: CuratedPalette[]): void {
    this.storage.setItem(this.storageKey, JSON.stringify(palettes))
  }

  async list(): Promise<CuratedPalette[]> {
    return this.read()
  }

  async get(id: string): Promise<CuratedPalette | null> {
    return this.read().find((p) => p.id === id) ?? null
  }

  async create(input: CreateCuratedPaletteInput): Promise<CuratedPalette> {
    const palettes = this.read()
    const slug = input.slug.trim() || slugify(input.titleEn || input.titleTh || '')
    const palette: CuratedPalette = {
      id: generateId(),
      titleEn: input.titleEn,
      titleTh: input.titleTh,
      slug,
      descriptionEn: input.descriptionEn,
      descriptionTh: input.descriptionTh,
      colors: input.colors,
      colorCount: input.colors.length,
      vibe: input.vibe,
      theme: input.theme,
      challengePromptEn: input.challengePromptEn,
      challengePromptTh: input.challengePromptTh,
      status: 'draft',
      createdAt: now(),
      updatedAt: now(),
    }
    palettes.push(palette)
    this.write(palettes)
    return palette
  }

  async update(id: string, patch: UpdateCuratedPaletteInput): Promise<CuratedPalette> {
    const palettes = this.read()
    const palette = palettes.find((p) => p.id === id)
    if (!palette) throw new Error(`Curated palette not found: ${id}`)
    Object.assign(palette, patch, { updatedAt: now() })
    if (patch.colors) palette.colorCount = patch.colors.length
    this.write(palettes)
    return palette
  }

  async duplicate(id: string): Promise<CuratedPalette> {
    const original = await this.get(id)
    if (!original) throw new Error(`Curated palette not found: ${id}`)
    return this.create({
      titleEn: original.titleEn ? `${original.titleEn} (copy)` : undefined,
      titleTh: original.titleTh ? `${original.titleTh} (ฉบับสำเนา)` : undefined,
      slug: `${original.slug}-copy`,
      descriptionEn: original.descriptionEn,
      descriptionTh: original.descriptionTh,
      colors: [...original.colors],
      vibe: original.vibe,
      theme: original.theme,
      challengePromptEn: original.challengePromptEn,
      challengePromptTh: original.challengePromptTh,
    })
  }

  async archive(id: string): Promise<CuratedPalette> {
    return this.update(id, { status: 'archived' })
  }

  async delete(id: string): Promise<void> {
    const palettes = this.read().filter((p) => p.id !== id)
    this.write(palettes)
  }
}
