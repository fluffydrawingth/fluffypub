import { cn } from '@/shared/lib/utils'
import { useLocalization } from '@/localization'
import { moodPreviewHexes } from '../moodProfiles'
import { MOODS, type Mood } from '../types'

const PREVIEWS: Record<Mood, string[]> = Object.fromEntries(
  MOODS.map((mood) => [mood, moodPreviewHexes(mood)]),
) as Record<Mood, string[]>

interface MoodPickerProps {
  mood: Mood
  onMoodChange: (mood: Mood) => void
}

/** The "choose a vibe" step: visual chips with tiny palette previews — the primary input. */
export function MoodPicker({ mood, onMoodChange }: MoodPickerProps) {
  const { t } = useLocalization()

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {MOODS.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onMoodChange(m)}
          title={t(`paletteGenerator.moods.${m}.description`)}
          className={cn(
            'flex flex-col items-center gap-1.5 rounded-2xl border px-3 py-2.5 transition-colors',
            mood === m
              ? 'border-primary bg-primary/10'
              : 'border-border bg-card hover:border-primary/40',
          )}
        >
          <span className={cn('text-sm font-medium', mood === m ? 'text-primary' : 'text-foreground')}>
            {t(`paletteGenerator.moods.${m}.label`)}
          </span>
          <span className="flex gap-1">
            {PREVIEWS[m].map((hex, i) => (
              <span
                key={i}
                className="border-border/40 size-3.5 rounded-full border"
                style={{ backgroundColor: hex }}
              />
            ))}
          </span>
        </button>
      ))}
    </div>
  )
}
