import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ImageUp, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { useLocalization } from '@/localization'

interface ImageDropzoneProps {
  previewUrl: string | null
  fileName: string | null
  isLoading: boolean
  error: string | null
  onFileSelected: (file: File) => void
  onClear: () => void
  /** Defaults to the localized "coloring page" — override for other upload contexts (e.g. a swatch chart photo). */
  label?: string
}

export function ImageDropzone({
  previewUrl,
  fileName,
  isLoading,
  error,
  onFileSelected,
  onClear,
  label,
}: ImageDropzoneProps) {
  const { t } = useLocalization()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const resolvedLabel = label ?? t('common.dropzoneDefaultLabel')

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0]
    if (file) onFileSelected(file)
  }

  return (
    <div className="w-full">
      <motion.div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={cn(
          'relative flex min-h-64 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors',
          isDragging
            ? 'border-primary bg-primary/10'
            : 'border-border bg-card hover:border-primary/50 hover:bg-accent/40',
        )}
      >
        {previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt={fileName ?? t('common.uploadedArtworkAlt')}
              className="max-h-56 rounded-lg object-contain shadow-sm"
            />
            <p className="text-muted-foreground text-sm">{fileName}</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="absolute top-3 right-3 rounded-full"
              onClick={(e) => {
                e.stopPropagation()
                onClear()
              }}
            >
              <X className="size-4" />
            </Button>
          </>
        ) : (
          <>
            <div className="bg-primary/15 text-primary flex size-14 items-center justify-center rounded-full">
              <ImageUp className="size-7" />
            </div>
            <p className="text-foreground font-medium">
              {isLoading ? t('common.dropzoneLoading') : t('common.dropzoneTitle', { label: resolvedLabel })}
            </p>
            <p className="text-muted-foreground text-sm">{t('common.dropzoneHelp')}</p>
          </>
        )}
      </motion.div>

      {error && <p className="text-destructive mt-2 text-sm">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  )
}
