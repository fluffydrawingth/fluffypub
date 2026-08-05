import type { CreateCuratedPaletteInput, CuratedPalette, UpdateCuratedPaletteInput } from '../types'
import type { CuratedPaletteRepository } from './CuratedPaletteRepository'

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

function authHeaders(): Record<string, string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('fluffy_token') : null
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

/**
 * Fluffy Pub-specific: same read-mutate-write shape as
 * `LocalJsonCuratedPaletteRepository`, but the whole list goes to
 * `/api/color-lab?resource=curated` (Supabase-backed, admin-gated on
 * write) instead of `localStorage`. See
 * `SupabaseMarkerRepository.ts` for the identical pattern and rationale.
 */
export class SupabaseCuratedPaletteRepository implements CuratedPaletteRepository {
  private readonly endpoint = '/api/color-lab?resource=curated'

  private async read(): Promise<CuratedPalette[]> {
    // Network failures degrade to an empty list rather than throwing — see
    // SupabaseMarkerRepository.read() for why this needs a try/catch.
    try {
      const res = await fetch(this.endpoint)
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data) ? data : []
    } catch {
      return []
    }
  }

  private async write(palettes: CuratedPalette[]): Promise<void> {
    const res = await fetch(this.endpoint, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(palettes),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `Failed to save curated palettes (${res.status})`)
    }
  }

  async list(): Promise<CuratedPalette[]> {
    return this.read()
  }

  async get(id: string): Promise<CuratedPalette | null> {
    return (await this.read()).find((p) => p.id === id) ?? null
  }

  async create(input: CreateCuratedPaletteInput): Promise<CuratedPalette> {
    const palettes = await this.read()
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
    await this.write(palettes)
    return palette
  }

  async update(id: string, patch: UpdateCuratedPaletteInput): Promise<CuratedPalette> {
    const palettes = await this.read()
    const palette = palettes.find((p) => p.id === id)
    if (!palette) throw new Error(`Curated palette not found: ${id}`)
    Object.assign(palette, patch, { updatedAt: now() })
    if (patch.colors) palette.colorCount = patch.colors.length
    await this.write(palettes)
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
    const palettes = (await this.read()).filter((p) => p.id !== id)
    await this.write(palettes)
  }
}
