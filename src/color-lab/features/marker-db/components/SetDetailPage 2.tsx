import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Download, Pencil, Plus, RotateCcw, ScanLine, Trash2, Upload } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useLocalization, pluralKey } from '@/localization'
import { markerRepository } from '../repository/instance'
import {
  commitSetCsvImport,
  exportCustomMarkersToCsv,
  parseSetJsonRecords,
  previewSetCsvImport,
  setImportCsvTemplate,
  validateSetImportRows,
  type DuplicatePolicy,
  type SetImportPreview,
} from '../services/setImportExport'
import type {
  CustomMarker,
  MarkerBrand,
  MarkerCommercialSet,
  MarkerReference,
  MarkerSeries,
  UserMarkerSet,
} from '../types'
import { isValidHex } from '../validation/hexValidation'

function downloadText(fileName: string, text: string, mimeType: string) {
  const blob = new Blob([text], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

interface ColorFormState {
  markerCode: string
  colorName: string
  hex: string
  notes: string
}

const EMPTY_FORM: ColorFormState = { markerCode: '', colorName: '', hex: '#AA3BFF', notes: '' }

interface SetDetailPageProps {
  userSetId: string
  brands: MarkerBrand[]
  series: MarkerSeries[]
  commercialSets: MarkerCommercialSet[]
  references: MarkerReference[]
  userSets: UserMarkerSet[]
  onBack: () => void
  onChanged: () => Promise<void>
  onScan: () => void
}

export function SetDetailPage({
  userSetId,
  brands,
  series,
  commercialSets,
  references,
  userSets,
  onBack,
  onChanged,
  onScan,
}: SetDetailPageProps) {
  const { t } = useLocalization()
  const userSet = userSets.find((s) => s.id === userSetId)

  const [formOpen, setFormOpen] = useState(false)
  const [editingCustomMarker, setEditingCustomMarker] = useState<CustomMarker | null>(null)
  const [form, setForm] = useState<ColorFormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [overrideTarget, setOverrideTarget] = useState<MarkerReference | null>(null)
  const [overrideHex, setOverrideHex] = useState('#AA3BFF')
  const [importPreview, setImportPreview] = useState<SetImportPreview | null>(null)
  const [duplicatePolicy, setDuplicatePolicy] = useState<DuplicatePolicy>('skip')
  const [status, setStatus] = useState<string | null>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)
  const jsonInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!formOpen) return
    setFormError(null)
    setForm(
      editingCustomMarker
        ? {
            markerCode: editingCustomMarker.markerCode,
            colorName: editingCustomMarker.colorName,
            hex: editingCustomMarker.hex,
            notes: editingCustomMarker.notes ?? '',
          }
        : EMPTY_FORM,
    )
  }, [formOpen, editingCustomMarker])

  if (!userSet) {
    return (
      <div className="flex flex-col items-center gap-3 py-10">
        <p className="text-muted-foreground text-sm">{t('markerDatabase.setNoLongerExists')}</p>
        <Button type="button" variant="outline" className="rounded-full" onClick={onBack}>
          <ArrowLeft className="size-4" />
          {t('markerDatabase.backToSets')}
        </Button>
      </div>
    )
  }

  const commercialSet = userSet.referenceSetId
    ? commercialSets.find((s) => s.id === userSet.referenceSetId)
    : undefined
  const brandName = commercialSet ? (brands.find((b) => b.id === commercialSet.brandId)?.name ?? '') : ''
  const seriesName = commercialSet?.seriesId
    ? (series.find((s) => s.id === commercialSet.seriesId)?.name ?? '')
    : ''

  const setReferences = commercialSet
    ? commercialSet.markerReferenceIds
        .map((id) => references.find((r) => r.id === id))
        .filter((r): r is MarkerReference => r !== undefined)
    : []
  const overrideByReference = new Map(userSet.swatchOverrides.map((o) => [o.markerReferenceId, o] as const))
  const ownedCount = userSet.ownedMarkerReferenceIds.length + userSet.customMarkers.length

  const hexValid = isValidHex(form.hex)
  const canSaveColor = form.markerCode.trim().length > 0 && hexValid

  const handleSaveColor = async () => {
    if (!canSaveColor) return
    const code = form.markerCode.trim()
    const duplicate = userSet.customMarkers.some(
      (m) => m.id !== editingCustomMarker?.id && m.markerCode.toLowerCase() === code.toLowerCase(),
    )
    if (duplicate) {
      setFormError(t('markerDatabase.duplicateMarkerError', { code }))
      return
    }

    if (editingCustomMarker) {
      await markerRepository.updateCustomMarker(userSet.id, editingCustomMarker.id, {
        markerCode: code,
        colorName: form.colorName.trim(),
        hex: form.hex.trim(),
        notes: form.notes.trim() || undefined,
      })
    } else {
      await markerRepository.addCustomMarker(userSet.id, {
        markerCode: code,
        colorName: form.colorName.trim(),
        hex: form.hex.trim(),
        notes: form.notes.trim() || undefined,
      })
    }
    await onChanged()
    setFormOpen(false)
  }

  const handleDeleteCustomMarker = async (marker: CustomMarker) => {
    if (!confirm(t('markerDatabase.deleteCustomMarkerConfirm', { name: marker.colorName || marker.markerCode })))
      return
    await markerRepository.removeCustomMarker(userSet.id, marker.id)
    await onChanged()
  }

  const handleDeleteSet = async () => {
    if (!confirm(t('markerDatabase.deleteSetConfirm', { name: userSet.customName }))) return
    await markerRepository.deleteUserSet(userSet.id)
    await onChanged()
    onBack()
  }

  const handleToggleOwned = async (reference: MarkerReference, owned: boolean) => {
    await markerRepository.setReferenceOwned(userSet.id, reference.id, owned)
    await onChanged()
  }

  const handleSaveOverride = async () => {
    if (!overrideTarget || !isValidHex(overrideHex)) return
    await markerRepository.setSwatchOverride(userSet.id, overrideTarget.id, overrideHex.trim())
    await onChanged()
    setOverrideTarget(null)
  }

  const handleResetOverride = async (reference: MarkerReference) => {
    await markerRepository.setSwatchOverride(userSet.id, reference.id, null)
    await onChanged()
  }

  const handleCsvFile = async (file: File) => {
    const text = await file.text()
    setDuplicatePolicy('skip')
    setImportPreview(await previewSetCsvImport(text, userSet, markerRepository))
  }

  const handleJsonFile = async (file: File) => {
    try {
      const records = parseSetJsonRecords(await file.text())
      const ownedReferences = await Promise.all(
        userSet.ownedMarkerReferenceIds.map((id) => markerRepository.getReference(id)),
      )
      setDuplicatePolicy('skip')
      setImportPreview(
        validateSetImportRows(
          records,
          userSet,
          ownedReferences.filter((r): r is MarkerReference => r !== null),
        ),
      )
    } catch {
      setStatus(t('markerDatabase.jsonReadError'))
    }
  }

  const handleConfirmImport = async () => {
    if (!importPreview) return
    const result = await commitSetCsvImport(importPreview, userSet, markerRepository, duplicatePolicy)
    await onChanged()
    setImportPreview(null)
    const parts = [
      result.created > 0 && t('markerDatabase.importResultAdded', { count: result.created }),
      result.updated > 0 && t('markerDatabase.importResultUpdated', { count: result.updated }),
      result.skipped > 0 && t('markerDatabase.importResultSkipped', { count: result.skipped }),
    ].filter(Boolean)
    setStatus(parts.length > 0 ? parts.join(', ') + '.' : t('markerDatabase.importResultNothing'))
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={onBack}>
            <ArrowLeft className="size-4" />
            {t('markerDatabase.setsBackLabel')}
          </Button>
          <div>
            {(brandName || seriesName) && (
              <p className="text-muted-foreground text-xs">
                {brandName}
                {seriesName && ` · ${seriesName}`}
              </p>
            )}
            <h2 className="text-lg font-medium">{userSet.customName}</h2>
            <p className="text-muted-foreground text-sm">
              {userSet.plannedCount
                ? t('markerDatabase.ownedOfPlanned', { count: ownedCount, plannedCount: userSet.plannedCount })
                : t(`markerDatabase.${pluralKey('ownedCount', ownedCount)}`, { count: ownedCount })}
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label={t('markerDatabase.deleteSetAria')}
          className="text-muted-foreground hover:text-destructive p-2"
          onClick={handleDeleteSet}
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground text-xs">{t('markerDatabase.importHint')}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" className="rounded-full" onClick={() => csvInputRef.current?.click()}>
            <Upload className="size-4" />
            {t('markerDatabase.importCsv')}
          </Button>
          <Button type="button" className="rounded-full" onClick={() => jsonInputRef.current?.click()}>
            <Upload className="size-4" />
            {t('markerDatabase.importJson')}
          </Button>
          <Button type="button" variant="outline" className="rounded-full" onClick={onScan}>
            <ScanLine className="size-4" />
            {t('markerDatabase.scanSwatchImage')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="rounded-full"
            onClick={() => downloadText('marker-import-template.csv', setImportCsvTemplate(), 'text/csv')}
          >
            <Download className="size-4" />
            {t('markerDatabase.downloadTemplate')}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => {
              setEditingCustomMarker(null)
              setFormOpen(true)
            }}
          >
            <Plus className="size-4" />
            {t('markerDatabase.addColor')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={userSet.customMarkers.length === 0}
            onClick={() =>
              downloadText(
                `${userSet.customName.toLowerCase().replace(/\s+/g, '-')}.csv`,
                exportCustomMarkersToCsv(userSet.customMarkers),
                'text/csv',
              )
            }
          >
            <Download className="size-4" />
            {t('markerDatabase.export')}
          </Button>
        </div>
      </div>

      {status && <p className="text-muted-foreground text-center text-xs">{status}</p>}

      {setReferences.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">{t('markerDatabase.referenceMarkersHeading')}</h3>
          <div className="border-border overflow-hidden rounded-2xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.swatch')}</TableHead>
                  <TableHead>{t('markerDatabase.tableCode')}</TableHead>
                  <TableHead>{t('common.colorName')}</TableHead>
                  <TableHead>{t('common.hex')}</TableHead>
                  <TableHead>{t('markerDatabase.tableSource')}</TableHead>
                  <TableHead className="text-right">{t('markerDatabase.tableOwned')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {setReferences.map((reference) => {
                  const override = overrideByReference.get(reference.id)
                  const owned = userSet.ownedMarkerReferenceIds.includes(reference.id)
                  const hex = override?.hex ?? reference.approximateHex
                  return (
                    <TableRow key={reference.id} className={owned ? undefined : 'opacity-50'}>
                      <TableCell>
                        <span
                          className="border-border inline-block size-6 rounded-full border"
                          style={{ backgroundColor: hex }}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {reference.canonicalCode}
                        {reference.aliases.length > 0 && (
                          <div className="text-muted-foreground text-[11px] font-normal">
                            {reference.aliases.map((a) => `${a.label}: ${a.code}`).join(' · ')}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{reference.colorName}</TableCell>
                      <TableCell className="font-mono text-sm">{hex}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge variant={override ? 'default' : 'outline'} className="text-[10px]">
                            {override ? t('markerMatcher.source.override') : t('markerDatabase.referenceBadge')}
                          </Badge>
                          <button
                            type="button"
                            aria-label={t('markerDatabase.overrideHexAria', { code: reference.canonicalCode })}
                            className="text-muted-foreground hover:text-foreground p-1"
                            onClick={() => {
                              setOverrideTarget(reference)
                              setOverrideHex(hex)
                            }}
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          {override && (
                            <button
                              type="button"
                              aria-label={t('markerDatabase.resetToReferenceAria', { code: reference.canonicalCode })}
                              className="text-muted-foreground hover:text-foreground p-1"
                              onClick={() => handleResetOverride(reference)}
                            >
                              <RotateCcw className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <input
                          type="checkbox"
                          aria-label={t('markerDatabase.markOwnedAria', { code: reference.canonicalCode })}
                          checked={owned}
                          onChange={(e) => handleToggleOwned(reference, e.target.checked)}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {setReferences.length > 0 && <h3 className="text-sm font-medium">{t('markerDatabase.customMarkersHeading')}</h3>}
        <div className="border-border overflow-hidden rounded-2xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.swatch')}</TableHead>
                <TableHead>{t('markerDatabase.tableMarkerCode')}</TableHead>
                <TableHead>{t('common.colorName')}</TableHead>
                <TableHead>{t('common.hex')}</TableHead>
                <TableHead className="text-right">{t('markerDatabase.tableActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userSet.customMarkers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                    {t('markerDatabase.noCustomColorsYet')}
                  </TableCell>
                </TableRow>
              )}
              {userSet.customMarkers.map((marker) => (
                <TableRow key={marker.id}>
                  <TableCell>
                    <span
                      className="border-border inline-block size-6 rounded-full border"
                      style={{ backgroundColor: marker.hex }}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">{marker.markerCode}</TableCell>
                  <TableCell>{marker.colorName}</TableCell>
                  <TableCell className="font-mono text-sm">{marker.hex}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        aria-label={t('markerDatabase.editMarkerAria', { code: marker.markerCode })}
                        className="text-muted-foreground hover:text-foreground p-1.5"
                        onClick={() => {
                          setEditingCustomMarker(marker)
                          setFormOpen(true)
                        }}
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={t('markerDatabase.deleteMarkerAria', { code: marker.markerCode })}
                        className="text-muted-foreground hover:text-destructive p-1.5"
                        onClick={() => handleDeleteCustomMarker(marker)}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleCsvFile(file)
          e.target.value = ''
        }}
      />
      <input
        ref={jsonInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleJsonFile(file)
          e.target.value = ''
        }}
      />

      {/* Add/edit custom color */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCustomMarker
                ? t('markerDatabase.editColorTitle')
                : t('markerDatabase.addColorToSetTitle', { setName: userSet.customName })}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>
                  {t('markerDatabase.tableMarkerCode')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.markerCode}
                  onChange={(e) => setForm((f) => ({ ...f, markerCode: e.target.value }))}
                  placeholder="R-29"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t('common.colorName')}</Label>
                <Input
                  value={form.colorName}
                  onChange={(e) => setForm((f) => ({ ...f, colorName: e.target.value }))}
                  placeholder="Cherry Red"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>
                {t('common.hex')} <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label={t('markerDatabase.pickHexAria')}
                  value={hexValid ? form.hex : '#aa3bff'}
                  onChange={(e) => setForm((f) => ({ ...f, hex: e.target.value }))}
                  className="border-border size-9 shrink-0 rounded-full border"
                />
                <Input
                  value={form.hex}
                  onChange={(e) => setForm((f) => ({ ...f, hex: e.target.value }))}
                  className="font-mono"
                  aria-invalid={!hexValid}
                />
              </div>
              {!hexValid && (
                <p className="text-destructive text-xs">
                  {t('validation.enterValidHex', { example: '#FF0000' })}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t('markerDatabase.notes')}</Label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>

            {formError && <p className="text-destructive text-sm">{formError}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={handleSaveColor} disabled={!canSaveColor}>
              {editingCustomMarker ? t('markerDatabase.saveChanges') : t('markerDatabase.addColor')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Override a reference marker's hex with a personal swatch */}
      <Dialog open={overrideTarget !== null} onOpenChange={(open) => !open && setOverrideTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {t('markerDatabase.overrideTitle', { code: overrideTarget?.canonicalCode ?? '' })}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label>{t('markerDatabase.yourMarkerHexLabel')}</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label={t('markerDatabase.pickHexAria')}
                value={isValidHex(overrideHex) ? overrideHex : '#aa3bff'}
                onChange={(e) => setOverrideHex(e.target.value)}
                className="border-border size-9 shrink-0 rounded-full border"
              />
              <Input
                value={overrideHex}
                onChange={(e) => setOverrideHex(e.target.value)}
                className="font-mono"
                aria-invalid={!isValidHex(overrideHex)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOverrideTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={handleSaveOverride} disabled={!isValidHex(overrideHex)}>
              {t('markerDatabase.saveOverride')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import preview */}
      <Dialog open={importPreview !== null} onOpenChange={(open) => !open && setImportPreview(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('markerDatabase.importPreviewTitle')}</DialogTitle>
          </DialogHeader>
          {importPreview && (
            <>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge className="bg-primary/20 text-primary">
                  {t('markerDatabase.newCountBadge', { count: importPreview.newCount })}
                </Badge>
                {importPreview.duplicateCount > 0 && (
                  <Badge className="bg-accent/60 text-accent-foreground">
                    {t(`markerDatabase.${pluralKey('duplicateCountBadge', importPreview.duplicateCount)}`, {
                      count: importPreview.duplicateCount,
                    })}
                  </Badge>
                )}
                {importPreview.errorCount > 0 && (
                  <Badge variant="outline" className="text-destructive border-destructive/40">
                    {t(`markerDatabase.${pluralKey('errorCountBadge', importPreview.errorCount)}`, {
                      count: importPreview.errorCount,
                    })}
                  </Badge>
                )}
              </div>

              {importPreview.duplicateCount > 0 && (
                <div className="bg-muted flex flex-col gap-2 rounded-xl p-3">
                  <p className="text-sm font-medium">
                    {t(`markerDatabase.${pluralKey('duplicatePrompt', importPreview.duplicateCount)}`, {
                      count: importPreview.duplicateCount,
                    })}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDuplicatePolicy('skip')}
                      className={
                        duplicatePolicy === 'skip'
                          ? 'bg-primary text-primary-foreground rounded-full px-3 py-1 text-xs'
                          : 'bg-background text-muted-foreground rounded-full px-3 py-1 text-xs'
                      }
                    >
                      {t('markerDatabase.skipDuplicates')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDuplicatePolicy('update')}
                      className={
                        duplicatePolicy === 'update'
                          ? 'bg-primary text-primary-foreground rounded-full px-3 py-1 text-xs'
                          : 'bg-background text-muted-foreground rounded-full px-3 py-1 text-xs'
                      }
                    >
                      {t('markerDatabase.updateExisting')}
                    </button>
                  </div>
                </div>
              )}

              <div className="border-border max-h-80 overflow-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('markerDatabase.tableRow')}</TableHead>
                      <TableHead>{t('markerDatabase.tableCode')}</TableHead>
                      <TableHead>{t('markerDatabase.tableName')}</TableHead>
                      <TableHead>{t('common.hex')}</TableHead>
                      <TableHead>{t('markerDatabase.tableStatus')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importPreview.rows.map((row) => (
                      <TableRow key={row.rowIndex}>
                        <TableCell>{row.rowIndex + 1}</TableCell>
                        <TableCell className="font-mono text-sm">{row.markerCode}</TableCell>
                        <TableCell>{row.colorName}</TableCell>
                        <TableCell className="font-mono text-sm">{row.hex}</TableCell>
                        <TableCell>
                          {row.status === 'new' && (
                            <Badge className="bg-primary/20 text-primary">{t('markerDatabase.statusNew')}</Badge>
                          )}
                          {row.status === 'duplicate' && (
                            <Badge className="bg-accent/60 text-accent-foreground">
                              {duplicatePolicy === 'update'
                                ? t('markerDatabase.statusWillUpdate')
                                : t('markerDatabase.statusWillSkip')}
                            </Badge>
                          )}
                          {row.status === 'error' && (
                            <div className="flex flex-col gap-0.5">
                              {row.errors.map((error, i) => (
                                <span key={i} className="text-destructive text-xs">
                                  {error}
                                </span>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setImportPreview(null)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={importPreview.newCount === 0 && importPreview.duplicateCount === 0}
                >
                  {t(
                    `markerDatabase.${pluralKey(
                      'importRows',
                      duplicatePolicy === 'update'
                        ? importPreview.newCount + importPreview.duplicateCount
                        : importPreview.newCount,
                    )}`,
                    {
                      count:
                        duplicatePolicy === 'update'
                          ? importPreview.newCount + importPreview.duplicateCount
                          : importPreview.newCount,
                    },
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
