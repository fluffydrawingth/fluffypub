import { useMemo, useState } from 'react'
import { ChevronsUpDown, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useLocalization, pluralKey } from '@/localization'
import type { MarkerSetOption } from '../types'

interface MarkerSetMultiSelectProps {
  options: MarkerSetOption[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function MarkerSetMultiSelect({ options, selectedIds, onChange }: MarkerSetMultiSelectProps) {
  const { t } = useLocalization()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  const selectedLabels = options.filter((o) => selectedIds.includes(o.setId)).map((o) => o.label)

  const toggle = (setId: string) => {
    onChange(selectedIds.includes(setId) ? selectedIds.filter((id) => id !== setId) : [...selectedIds, setId])
  }

  const triggerText =
    selectedLabels.length === 0
      ? t('markerMatcher.chooseSetPlaceholder')
      : selectedLabels.length === 1
        ? selectedLabels[0]
        : t(`markerMatcher.${pluralKey('setsSelectedCount', selectedLabels.length)}`, { count: selectedLabels.length })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full min-w-0 justify-between font-normal sm:flex-1">
          <span className="truncate">{triggerText}</span>
          <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <div className="border-border flex items-center gap-2 border-b px-3 py-2">
          <Search className="text-muted-foreground size-4 shrink-0" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('markerMatcher.searchSetsPlaceholder')} className="h-8 border-none px-0 shadow-none focus-visible:ring-0" />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="text-muted-foreground px-2 py-4 text-center text-sm">{t('markerMatcher.noSetsMatchSearch')}</p>
          ) : (
            filtered.map((option) => {
              const checked = selectedIds.includes(option.setId)
              return (
                <label key={option.setId} className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm">
                  <Checkbox checked={checked} onCheckedChange={() => toggle(option.setId)} />
                  <span className="min-w-0 flex-1 truncate">
                    {t(`markerMatcher.${pluralKey('optionLabel', option.availableCount)}`, { label: option.label, count: option.availableCount })}
                  </span>
                </label>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
