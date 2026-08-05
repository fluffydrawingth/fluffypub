import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Upload } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useLocalization, pluralKey } from '@/localization'
import { markerRepository } from '../repository/instance'
import {
  commitReferenceImport,
  previewReferenceImport,
  type ConflictPolicy,
  type ReferenceImportPreview,
} from '../services/referenceImport'
import type { MarkerBrand, MarkerCommercialSet, MarkerReference } from '../types'

interface ReferenceLibraryAdminProps {
  onBack: () => void
}

/**
 * Dev/admin-only screen: import a reference-data CSV and browse what's in
 * the library. Not part of the normal user-facing app — see
 * docs/marker-database.md. No real reference data ships with this screen;
 * it only ever writes data a human explicitly supplies via import.
 */
export function ReferenceLibraryAdmin({ onBack }: ReferenceLibraryAdminProps) {
  const { t } = useLocalization()
  const [brands, setBrands] = useState<MarkerBrand[]>([])
  const [commercialSets, setCommercialSets] = useState<MarkerCommercialSet[]>([])
  const [references, setReferences] = useState<MarkerReference[]>([])
  const [preview, setPreview] = useState<ReferenceImportPreview | null>(null)
  const [conflictPolicy, setConflictPolicy] = useState<ConflictPolicy>('skip')
  const [status, setStatus] = useState<string | null>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)

  const refresh = async () => {
    const [b, cs, r] = await Promise.all([
      markerRepository.listBrands(),
      markerRepository.listCommercialSets(),
      markerRepository.listReferences(),
    ])
    setBrands(b)
    setCommercialSets(cs)
    setReferences(r)
  }

  useEffect(() => {
    refresh()
  }, [])

  const handleCsvFile = async (file: File) => {
    const text = await file.text()
    setConflictPolicy('skip')
    setPreview(await previewReferenceImport(text, markerRepository))
  }

  const handleConfirmImport = async () => {
    if (!preview) return
    const result = await commitReferenceImport(preview, markerRepository, conflictPolicy)
    await refresh()
    setPreview(null)
    const parts = [
      result.created > 0 && t('admin.importResultCreated', { count: result.created }),
      result.updated > 0 && t('markerDatabase.importResultUpdated', { count: result.updated }),
      result.skipped > 0 && t('markerDatabase.importResultSkipped', { count: result.skipped }),
    ].filter(Boolean)
    setStatus(parts.length > 0 ? parts.join(', ') + '.' : t('markerDatabase.importResultNothing'))
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:py-10">
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={onBack}>
          <ArrowLeft className="size-4" />
          {t('common.back')}
        </Button>
        <div>
          <h1 className="text-lg font-medium">{t('admin.referenceLibraryTitle')}</h1>
          <p className="text-muted-foreground text-xs">{t('admin.referenceLibraryDevHint')}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" className="rounded-full" onClick={() => csvInputRef.current?.click()}>
          <Upload className="size-4" />
          {t('admin.importReferenceCsv')}
        </Button>
      </div>
      {status && <p className="text-muted-foreground text-xs">{status}</p>}

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

      {preview && (
        <div className="border-border flex flex-col gap-3 rounded-2xl border p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge className="bg-primary/20 text-primary">
              {t('markerDatabase.newCountBadge', { count: preview.newCount })}
            </Badge>
            {preview.duplicateCount > 0 && (
              <Badge className="bg-muted text-muted-foreground">
                {t('admin.duplicateCountBadge', { count: preview.duplicateCount })}
              </Badge>
            )}
            {preview.conflictCount > 0 && (
              <Badge className="bg-accent/60 text-accent-foreground">
                {t('admin.conflictCountBadge', { count: preview.conflictCount })}
              </Badge>
            )}
            {preview.errorCount > 0 && (
              <Badge variant="outline" className="text-destructive border-destructive/40">
                {t('admin.errorCountBadge', { count: preview.errorCount })}
              </Badge>
            )}
          </div>

          {preview.conflictCount > 0 && (
            <div className="bg-muted flex flex-col gap-2 rounded-xl p-3">
              <p className="text-sm font-medium">
                {t(`admin.${pluralKey('conflictPrompt', preview.conflictCount)}`, {
                  count: preview.conflictCount,
                })}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConflictPolicy('skip')}
                  className={
                    conflictPolicy === 'skip'
                      ? 'bg-primary text-primary-foreground rounded-full px-3 py-1 text-xs'
                      : 'bg-background text-muted-foreground rounded-full px-3 py-1 text-xs'
                  }
                >
                  {t('admin.skipConflicts')}
                </button>
                <button
                  type="button"
                  onClick={() => setConflictPolicy('update')}
                  className={
                    conflictPolicy === 'update'
                      ? 'bg-primary text-primary-foreground rounded-full px-3 py-1 text-xs'
                      : 'bg-background text-muted-foreground rounded-full px-3 py-1 text-xs'
                  }
                >
                  {t('admin.updateExisting')}
                </button>
              </div>
            </div>
          )}

          <div className="border-border max-h-72 overflow-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.tableBrand')}</TableHead>
                  <TableHead>{t('markerDatabase.tableCode')}</TableHead>
                  <TableHead>{t('markerDatabase.tableName')}</TableHead>
                  <TableHead>{t('common.hex')}</TableHead>
                  <TableHead>{t('admin.tableAliases')}</TableHead>
                  <TableHead>{t('markerDatabase.tableStatus')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.groups.map((group) => (
                  <TableRow key={group.key}>
                    <TableCell className="text-sm">
                      {group.brand}
                      {group.series && ` · ${group.series}`}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{group.canonicalCode}</TableCell>
                    <TableCell>{group.colorName}</TableCell>
                    <TableCell className="font-mono text-sm">{group.hex}</TableCell>
                    <TableCell className="text-xs">{group.aliases.map((a) => a.code).join(', ')}</TableCell>
                    <TableCell>
                      {group.status === 'new' && (
                        <Badge className="bg-primary/20 text-primary">{t('markerDatabase.statusNew')}</Badge>
                      )}
                      {group.status === 'duplicate' && (
                        <Badge className="bg-muted text-muted-foreground">{t('admin.statusDuplicate')}</Badge>
                      )}
                      {group.status === 'conflict' && (
                        <Badge className="bg-accent/60 text-accent-foreground">
                          {conflictPolicy === 'update'
                            ? t('markerDatabase.statusWillUpdate')
                            : t('markerDatabase.statusWillSkip')}
                        </Badge>
                      )}
                      {group.status === 'error' && (
                        <div className="flex flex-col gap-0.5">
                          {group.errors.map((error, i) => (
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

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setPreview(null)}>
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={handleConfirmImport}>
              {t('admin.commitImport')}
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">
          {t('admin.libraryContentsHeading', {
            brands: t(`admin.${pluralKey('brandCount', brands.length)}`, { count: brands.length }),
            sets: t(`markerDatabase.${pluralKey('brandSetCount', commercialSets.length)}`, {
              count: commercialSets.length,
            }),
            references: t(`admin.${pluralKey('referenceCount', references.length)}`, {
              count: references.length,
            }),
          })}
        </h2>
        <div className="border-border max-h-96 overflow-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.tableBrand')}</TableHead>
                <TableHead>{t('markerDatabase.tableCode')}</TableHead>
                <TableHead>{t('markerDatabase.tableName')}</TableHead>
                <TableHead>{t('common.hex')}</TableHead>
                <TableHead>{t('markerDatabase.tableStatus')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {references.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                    {t('admin.noReferenceDataYet')}
                  </TableCell>
                </TableRow>
              )}
              {references.map((reference) => (
                <TableRow key={reference.id}>
                  <TableCell className="text-sm">
                    {brands.find((b) => b.id === reference.brandId)?.name ?? ''}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{reference.canonicalCode}</TableCell>
                  <TableCell>{reference.colorName}</TableCell>
                  <TableCell className="font-mono text-sm">{reference.approximateHex}</TableCell>
                  <TableCell className="text-xs">{t(`admin.referenceStatus.${reference.status}`)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
