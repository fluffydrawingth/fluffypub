import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Copy } from 'lucide-react'
import type { PaletteColor } from '@/shared/color'
import { copyToClipboard } from '../utils/copyToClipboard'
import { cn } from '@/shared/lib/utils'
import { useLocalization } from '@/localization'

interface PaletteSwatchProps {
  color: PaletteColor
  index: number
}

export function PaletteSwatch({ color, index }: PaletteSwatchProps) {
  const { t } = useLocalization()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const ok = await copyToClipboard(color.hex)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <motion.button
      type="button"
      onClick={handleCopy}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 260, damping: 22 }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      className="group flex flex-col items-center gap-2 focus:outline-none"
    >
      <div
        className="border-border/50 relative size-20 rounded-2xl border shadow-sm sm:size-24"
        style={{ backgroundColor: color.hex }}
      >
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center rounded-2xl bg-black/25 opacity-0 transition-opacity group-hover:opacity-100',
            copied && 'opacity-100',
          )}
        >
          {copied ? (
            <Check className="size-6 text-white" />
          ) : (
            <Copy className="size-5 text-white" />
          )}
        </div>
      </div>
      <span className="text-foreground/80 font-mono text-xs tracking-wide sm:text-sm">
        {copied ? t('common.copied') : color.hex}
      </span>
    </motion.button>
  )
}
