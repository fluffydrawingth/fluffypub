import { useState } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useLocalization } from '@/localization'
import { markerRepository } from '../repository/instance'
import type { MarkerSourceType } from '../types'

const SOURCE_VALUES: MarkerSourceType[] = ['user', 'official', 'community', 'estimated']

interface SetWizardProps {
  onCreated: (userSetId: string) => void
  onCancel: () => void
}

/** For markers not in the reference library — no brand/series structure, just a name and its own colors. */
export function SetWizard({ onCreated, onCancel }: SetWizardProps) {
  const { t } = useLocalization()
  const [setName, setSetName] = useState('')
  const [plannedCount, setPlannedCount] = useState('')
  const [sourceType, setSourceType] = useState<MarkerSourceType>('user')
  const [sourceReference, setSourceReference] = useState('')
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const canSave = setName.trim().length > 0 && !isSaving

  const handleSubmit = async () => {
    if (!canSave) return
    setIsSaving(true)
    try {
      const parsedCount = parseInt(plannedCount, 10)
      const userSet = await markerRepository.createUserSet({
        customName: setName.trim(),
        plannedCount: Number.isFinite(parsedCount) && parsedCount > 0 ? parsedCount : undefined,
        sourceType,
        sourceReference: sourceReference.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      onCreated(userSet.id)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={onCancel}>
          <ArrowLeft className="size-4" />
          {t('common.back')}
        </Button>
        <h2 className="text-lg font-medium">{t('markerDatabase.createCustomSet')}</h2>
      </div>

      <div className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wizard-set">
            {t('markerDatabase.setNameLabel')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="wizard-set"
            value={setName}
            onChange={(e) => setSetName(e.target.value)}
            placeholder={t('markerDatabase.setNamePlaceholder')}
          />
          <p className="text-muted-foreground text-xs">{t('markerDatabase.setNameHint')}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wizard-count">{t('markerDatabase.numberOfMarkersLabel')}</Label>
            <Input
              id="wizard-count"
              type="number"
              min="1"
              value={plannedCount}
              onChange={(e) => setPlannedCount(e.target.value)}
              placeholder={t('markerDatabase.numberOfMarkersPlaceholder')}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wizard-source">{t('markerDatabase.sourceLabel')}</Label>
            <Select value={sourceType} onValueChange={(v) => setSourceType(v as MarkerSourceType)}>
              <SelectTrigger id="wizard-source" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`markerDatabase.sourceOptions.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wizard-source-ref">{t('markerDatabase.sourceReferenceLabel')}</Label>
          <Input
            id="wizard-source-ref"
            value={sourceReference}
            onChange={(e) => setSourceReference(e.target.value)}
            placeholder={t('markerDatabase.sourceReferencePlaceholder')}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wizard-notes">{t('markerDatabase.notes')}</Label>
          <Textarea id="wizard-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <Button type="button" className="rounded-full" onClick={handleSubmit} disabled={!canSave}>
          <Check className="size-4" />
          {t('markerDatabase.createSetAndAddColors')}
        </Button>
      </div>
    </div>
  )
}
