import type { VarietyDiagnostics } from '../paletteVariety'

interface VarietyDebugPanelProps {
  familyId: string
  diagnostics: VarietyDiagnostics
}

/** Development-only introspection into the diversity/retry logic. Never rendered in production. */
export function VarietyDebugPanel({ familyId, diagnostics }: VarietyDebugPanelProps) {
  return (
    <div className="border-border bg-card w-full rounded-xl border p-3 text-left font-mono text-xs">
      <p className="text-muted-foreground">
        dev only · sub-style {familyId} · seed {diagnostics.seed} · retries {diagnostics.retryCount} ·
        similarity{' '}
        {diagnostics.similarityScore === null ? 'n/a (no history)' : diagnostics.similarityScore.toFixed(4)}
        {diagnostics.exhaustedRetries ? ' · exhausted retries, used least-similar candidate' : ''}
      </p>
    </div>
  )
}
