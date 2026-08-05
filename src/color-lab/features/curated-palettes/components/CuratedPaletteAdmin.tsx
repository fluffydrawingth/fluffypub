import { useEffect, useState } from 'react'
import { Archive, Copy, Download, Image as ImageIcon, Plus, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { exportPaletteAsPng } from '@/features/palette'
import { isValidHex } from '@/features/marker-db'
import { useLocalization } from '@/localization'
import { hexToRgb } from '@/shared/color'
import { curatedPaletteRepository } from '../repository/instance'
import { resolveBilingualText } from '../resolveBilingualText'
import type { CuratedPalette } from '../types'

function downloadJson(palette: CuratedPalette) {
  const blob = new Blob([JSON.stringify(palette, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${palette.slug || palette.id}.json`
  link.click()
  URL.revokeObjectURL(url)
}

interface EditorState {
  titleEn: string
  titleTh: string
  descriptionEn: string
  descriptionTh: string
  theme: string
  challengePromptEn: string
  challengePromptTh: string
  colors: string[]
}

function toEditorState(palette: CuratedPalette): EditorState {
  return {
    titleEn: palette.titleEn ?? '',
    titleTh: palette.titleTh ?? '',
    descriptionEn: palette.descriptionEn ?? '',
    descriptionTh: palette.descriptionTh ?? '',
    theme: palette.theme ?? '',
    challengePromptEn: palette.challengePromptEn ?? '',
    challengePromptTh: palette.challengePromptTh ?? '',
    colors: [...palette.colors],
  }
}

export function CuratedPaletteAdmin() {
  const { t, language } = useLocalization()
  const [palettes, setPalettes] = useState<CuratedPalette[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [newColorHex, setNewColorHex] = useState('#AA3BFF')
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const refresh = async () => {
    const list = await curatedPaletteRepository.list()
    setPalettes(list)
  }

  useEffect(() => {
    refresh()
  }, [])

  const selected = palettes.find((p) => p.id === selectedId) ?? null

  useEffect(() => {
    if (!selectedId) {
      setEditor(null)
      return
    }
    curatedPaletteRepository.get(selectedId).then((palette) => setEditor(palette ? toEditorState(palette) : null))
  }, [selectedId])

  const handleCreate = async () => {
    const palette = await curatedPaletteRepository.create({
      titleEn: 'Untitled palette',
      slug: '',
      colors: [],
    })
    await refresh()
    setSelectedId(palette.id)
  }

  const handleSave = async () => {
    if (!selected || !editor) return
    await curatedPaletteRepository.update(selected.id, {
      titleEn: editor.titleEn.trim() || undefined,
      titleTh: editor.titleTh.trim() || undefined,
      descriptionEn: editor.descriptionEn.trim() || undefined,
      descriptionTh: editor.descriptionTh.trim() || undefined,
      theme: editor.theme.trim() || undefined,
      challengePromptEn: editor.challengePromptEn.trim() || undefined,
      challengePromptTh: editor.challengePromptTh.trim() || undefined,
      colors: editor.colors,
    })
    await refresh()
  }

  const handleDuplicate = async (palette: CuratedPalette) => {
    const copy = await curatedPaletteRepository.duplicate(palette.id)
    await refresh()
    setSelectedId(copy.id)
  }

  const handleArchive = async (palette: CuratedPalette) => {
    await curatedPaletteRepository.archive(palette.id)
    await refresh()
  }

  const handlePublish = async (palette: CuratedPalette) => {
    await curatedPaletteRepository.update(palette.id, { status: 'published' })
    await refresh()
  }

  const handleDelete = async (palette: CuratedPalette) => {
    const name = resolveBilingualText(palette.titleEn, palette.titleTh, language) ?? palette.id
    if (!confirm(t('curatedPalettes.deleteConfirm', { name }))) return
    await curatedPaletteRepository.delete(palette.id)
    if (selectedId === palette.id) setSelectedId(null)
    await refresh()
  }

  const addColor = () => {
    if (!editor || !isValidHex(newColorHex)) return
    setEditor({ ...editor, colors: [...editor.colors, newColorHex.trim()] })
  }

  const removeColor = (index: number) => {
    if (!editor) return
    setEditor({ ...editor, colors: editor.colors.filter((_, i) => i !== index) })
  }

  const reorder = (from: number, to: number) => {
    if (!editor || from === to) return
    const next = [...editor.colors]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setEditor({ ...editor, colors: next })
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-medium">{t('curatedPalettes.title')}</h1>
        <p className="text-muted-foreground text-xs">{t('curatedPalettes.devHint')}</p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-[240px_1fr]">
        <div className="flex flex-col gap-2">
          <Button type="button" size="sm" className="rounded-full" onClick={handleCreate}>
            <Plus className="size-4" />
            {t('curatedPalettes.newPalette')}
          </Button>
          <div className="flex flex-col gap-1">
            {palettes.map((palette) => (
              <button
                key={palette.id}
                type="button"
                onClick={() => setSelectedId(palette.id)}
                className={
                  palette.id === selectedId
                    ? 'bg-primary/10 border-primary flex flex-col items-start gap-1 rounded-xl border p-2 text-left'
                    : 'border-border hover:bg-muted/50 flex flex-col items-start gap-1 rounded-xl border p-2 text-left'
                }
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {resolveBilingualText(palette.titleEn, palette.titleTh, language) ??
                      t('curatedPalettes.untitledPalette')}
                  </span>
                  <Badge variant={palette.status === 'published' ? 'default' : 'outline'} className="text-[10px]">
                    {t(`curatedPalettes.status.${palette.status}`)}
                  </Badge>
                </span>
                <span className="flex gap-0.5">
                  {palette.colors.slice(0, 6).map((hex, i) => (
                    <span key={i} className="size-3 rounded-full" style={{ backgroundColor: hex }} />
                  ))}
                </span>
              </button>
            ))}
            {palettes.length === 0 && (
              <p className="text-muted-foreground text-xs">{t('curatedPalettes.noPalettesYet')}</p>
            )}
          </div>
        </div>

        {selected && editor ? (
          <div className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>{t('curatedPalettes.titleEnLabel')}</Label>
                <Input value={editor.titleEn} onChange={(e) => setEditor({ ...editor, titleEn: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t('curatedPalettes.titleThLabel')}</Label>
                <Input value={editor.titleTh} onChange={(e) => setEditor({ ...editor, titleTh: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>{t('curatedPalettes.descriptionEnLabel')}</Label>
                <Textarea
                  rows={2}
                  value={editor.descriptionEn}
                  onChange={(e) => setEditor({ ...editor, descriptionEn: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t('curatedPalettes.descriptionThLabel')}</Label>
                <Textarea
                  rows={2}
                  value={editor.descriptionTh}
                  onChange={(e) => setEditor({ ...editor, descriptionTh: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>{t('curatedPalettes.challengePromptEnLabel')}</Label>
                <Input
                  value={editor.challengePromptEn}
                  onChange={(e) => setEditor({ ...editor, challengePromptEn: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t('curatedPalettes.challengePromptThLabel')}</Label>
                <Input
                  value={editor.challengePromptTh}
                  onChange={(e) => setEditor({ ...editor, challengePromptTh: e.target.value })}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('curatedPalettes.theme')}</Label>
              <Input value={editor.theme} onChange={(e) => setEditor({ ...editor, theme: e.target.value })} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t('curatedPalettes.colorsLabelWithCount', { count: editor.colors.length })}</Label>
              <div className="flex flex-wrap gap-2">
                {editor.colors.map((hex, index) => (
                  <div
                    key={index}
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragIndex !== null) reorder(dragIndex, index)
                      setDragIndex(null)
                    }}
                    className="border-border relative flex size-14 cursor-move flex-col items-center justify-center rounded-xl border"
                    style={{ backgroundColor: hex }}
                  >
                    <button
                      type="button"
                      aria-label={t('curatedPalettes.removeColorAria', { hex })}
                      onClick={() => removeColor(index)}
                      className="bg-background/80 text-foreground absolute -top-1.5 -right-1.5 rounded-full p-0.5"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-1">
                  <input
                    type="color"
                    aria-label={t('curatedPalettes.pickNewColorAria')}
                    value={isValidHex(newColorHex) ? newColorHex : '#aa3bff'}
                    onChange={(e) => setNewColorHex(e.target.value)}
                    className="border-border size-9 shrink-0 rounded-full border"
                  />
                  <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={addColor}>
                    <Plus className="size-4" />
                    {t('markerDatabase.addColor')}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" className="rounded-full" onClick={handleSave}>
                {t('markerDatabase.saveChanges')}
              </Button>
              {selected.status !== 'published' && (
                <Button type="button" variant="outline" className="rounded-full" onClick={() => handlePublish(selected)}>
                  {t('curatedPalettes.publish')}
                </Button>
              )}
              <Button type="button" variant="outline" className="rounded-full" onClick={() => handleDuplicate(selected)}>
                <Copy className="size-4" />
                {t('curatedPalettes.duplicate')}
              </Button>
              <Button type="button" variant="outline" className="rounded-full" onClick={() => handleArchive(selected)}>
                <Archive className="size-4" />
                {t('curatedPalettes.archive')}
              </Button>
              <Button type="button" variant="outline" className="rounded-full" onClick={() => downloadJson(selected)}>
                <Download className="size-4" />
                {t('common.exportJson')}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() =>
                  exportPaletteAsPng(
                    editor.colors.map((hex) => ({ hex, rgb: hexToRgb(hex) })),
                    `${selected.slug || selected.id}.png`,
                  )
                }
              >
                <ImageIcon className="size-4" />
                {t('common.exportPng')}
              </Button>
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive ml-auto flex items-center gap-1 text-xs"
                onClick={() => handleDelete(selected)}
              >
                <Trash2 className="size-3.5" />
                {t('common.delete')}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground flex items-center justify-center rounded-2xl border border-dashed p-10 text-sm">
            {t('curatedPalettes.selectOrCreateHint')}
          </div>
        )}
      </div>
    </div>
  )
}
