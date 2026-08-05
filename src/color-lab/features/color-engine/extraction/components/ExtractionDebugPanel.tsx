import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ExtractionDebugInfo } from '../types'

interface ExtractionDebugPanelProps {
  debug: ExtractionDebugInfo
}

const REASON_LABELS: Record<string, string> = {
  'below-population-floor': 'below population floor',
  'too-close-to-selected': 'too close to selection',
  'neutral-filtered': 'neutral filtered',
}

function fmt(value: number): string {
  return value.toFixed(3)
}

/** Development-only introspection into candidate scoring. Never rendered in production. */
export function ExtractionDebugPanel({ debug }: ExtractionDebugPanelProps) {
  const sorted = [...debug.candidates].sort((a, b) => b.score - a.score)

  return (
    <div className="border-border bg-card w-full rounded-xl border p-4 text-left text-xs">
      <p className="text-muted-foreground mb-3 font-mono">
        dev only · sampled {debug.sampledPixelCount} px · {debug.candidates.length} candidates ·{' '}
        {debug.finalSelection.length} selected
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Color</TableHead>
            <TableHead>Population</TableHead>
            <TableHead>Chroma</TableHead>
            <TableHead>Contrast</TableHead>
            <TableHead>Salience</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((c, i) => (
            <TableRow key={`${c.hex}-${i}`}>
              <TableCell className="flex items-center gap-2 font-mono">
                <span
                  className="border-border size-3.5 rounded-full border"
                  style={{ backgroundColor: c.hex }}
                />
                {c.hex}
              </TableCell>
              <TableCell>{(c.population * 100).toFixed(1)}%</TableCell>
              <TableCell>{fmt(c.chroma)}</TableCell>
              <TableCell>{fmt(c.contrast)}</TableCell>
              <TableCell>{fmt(c.salience)}</TableCell>
              <TableCell>{fmt(c.score)}</TableCell>
              <TableCell>
                {c.selected ? (
                  <Badge className="bg-primary/20 text-primary">selected</Badge>
                ) : (
                  <Badge variant="outline">{REASON_LABELS[c.rejectedReason ?? ''] ?? 'rejected'}</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
