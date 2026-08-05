import { useRef, useState } from 'react'
import { ArrowLeft, Check, Download, Pencil, Trash2, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLocalization, pluralKey } from '@/localization'
import { markerRepository } from '../repository/instance'
import { exportAllAsJson, importAllFromJson } from '../services/jsonBackup'
import type { MarkerBrand, MarkerCommercialSet, MarkerReference, MarkerSeries } from '../types'

interface ManageBrandsProps {
  brands: MarkerBrand[]
  series: MarkerSeries[]
  commercialSets: MarkerCommercialSet[]
  references: MarkerReference[]
  onBack: () => void
  onChanged: () => Promise<void>
}

/** Advanced maintenance only — the normal workflow never needs this screen. */
export function ManageBrands({ brands, series, commercialSets, references, onBack, onChanged }: ManageBrandsProps) {
  const { t } = useLocalization()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const jsonInputRef = useRef<HTMLInputElement>(null)

  const handleRename = async (brand: MarkerBrand) => {
    const name = draftName.trim()
    if (name && name !== brand.name) await markerRepository.updateBrand(brand.id, { name })
    setEditingId(null)
    await onChanged()
  }

  const handleDelete = async (brand: MarkerBrand) => {
    const setCount = commercialSets.filter((s) => s.brandId === brand.id).length
    const referenceCount = references.filter((r) => r.brandId === brand.id).length
    const sets = t(`markerDatabase.${pluralKey('brandSetCount', setCount)}`, { count: setCount })
    const colors = t(`markerDatabase.${pluralKey('brandColorCount', referenceCount)}`, { count: referenceCount })
    if (!confirm(t('markerDatabase.deleteBrandConfirm', { name: brand.name, sets, colors }))) return
    await markerRepository.deleteBrand(brand.id)
    await onChanged()
  }

  const handleBackupImport = async (file: File) => {
    try {
      await importAllFromJson(await file.text(), markerRepository)
      await onChanged()
      setStatus(t('markerDatabase.backupRestored'))
    } catch {
      setStatus(t('markerDatabase.backupReadError'))
    }
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={onBack}>
          <ArrowLeft className="size-4" />
          {t('common.back')}
        </Button>
        <h2 className="text-lg font-medium">{t('markerDatabase.manageBrands')}</h2>
      </div>

      <div className="border-border bg-card flex flex-col gap-1 rounded-2xl border p-4">
        {brands.length === 0 && (
          <p className="text-muted-foreground py-4 text-center text-sm">{t('markerDatabase.noBrandsMessage')}</p>
        )}
        {brands.map((brand) => {
          const seriesCount = series.filter((s) => s.brandId === brand.id).length
          const setCount = commercialSets.filter((s) => s.brandId === brand.id).length
          return (
            <div key={brand.id} className="hover:bg-muted/50 flex items-center gap-2 rounded-xl px-3 py-2">
              {editingId === brand.id ? (
                <>
                  <Input
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRename(brand)}
                    className="h-8"
                    autoFocus
                  />
                  <button
                    type="button"
                    aria-label={t('markerDatabase.saveBrandNameAria')}
                    className="text-primary p-1.5"
                    onClick={() => handleRename(brand)}
                  >
                    <Check className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={t('markerDatabase.cancelRenameAria')}
                    className="text-muted-foreground p-1.5"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="size-4" />
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <p className="font-medium">{brand.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {t(`markerDatabase.${pluralKey('brandSummary', setCount)}`, { seriesCount, setCount })}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={t('markerDatabase.renameAria', { name: brand.name })}
                    className="text-muted-foreground hover:text-foreground p-1.5"
                    onClick={() => {
                      setEditingId(brand.id)
                      setDraftName(brand.name)
                    }}
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={t('markerDatabase.deleteAria', { name: brand.name })}
                    className="text-muted-foreground hover:text-destructive p-1.5"
                    onClick={() => handleDelete(brand)}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          onClick={async () =>
            downloadBackup(await exportAllAsJson(markerRepository))
          }
        >
          <Download className="size-4" />
          {t('markerDatabase.exportFullBackup')}
        </Button>
        <Button type="button" variant="outline" className="rounded-full" onClick={() => jsonInputRef.current?.click()}>
          <Upload className="size-4" />
          {t('markerDatabase.restoreBackup')}
        </Button>
      </div>
      {status && <p className="text-muted-foreground text-center text-xs">{status}</p>}

      <input
        ref={jsonInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleBackupImport(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}

function downloadBackup(json: string) {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'marker-db-backup.json'
  link.click()
  URL.revokeObjectURL(url)
}
