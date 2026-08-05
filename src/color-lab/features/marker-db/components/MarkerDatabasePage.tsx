import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigationStore } from '@/app/navigationStore'
import { Button } from '@/components/ui/button'
import { useLocalization } from '@/localization'
import { useMarkerDatabase } from '../hooks/useMarkerDatabase'
import { SwatchScannerFlow } from '../scanner'
import type { MarkerReference, UserMarkerSet } from '../types'
import { AddFromReferenceWizard } from './AddFromReferenceWizard'
import { ManageBrands } from './ManageBrands'
import { MarkerDbHome } from './MarkerDbHome'
import { SetDetailPage } from './SetDetailPage'
import { SetWizard } from './SetWizard'

type View =
  | { kind: 'home' }
  | { kind: 'wizard' }
  | { kind: 'add-from-library' }
  | { kind: 'set'; userSetId: string }
  | { kind: 'brands' }
  | { kind: 'scanner'; userSetId: string }

export function MarkerDatabasePage() {
  const { t } = useLocalization()
  const { brands, series, references, commercialSets, userSets, refresh } = useMarkerDatabase()
  const markerDbRequest = useNavigationStore((s) => s.markerDbRequest)
  const clearMarkerDbRequest = useNavigationStore((s) => s.clearMarkerDbRequest)

  // Deep-link from outside (e.g. MarkerMatchPanel's "Add marker set"): jump
  // straight to a requested view on mount, then consume the request so
  // navigating away and back doesn't repeat it.
  const [view, setView] = useState<View>(() => {
    if (markerDbRequest?.kind === 'set') return { kind: 'set', userSetId: markerDbRequest.setId }
    if (markerDbRequest?.kind === 'wizard') return { kind: 'wizard' }
    return { kind: 'home' }
  })

  useEffect(() => {
    if (markerDbRequest) clearMarkerDbRequest()
  }, [markerDbRequest, clearMarkerDbRequest])

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:py-10">
      {view.kind === 'home' && (
        <>
          <header className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('markerDatabase.myMarkerSets')}</h1>
            <p className="text-muted-foreground max-w-md text-sm">{t('markerDatabase.myMarkerSetsSubtitle')}</p>
          </header>
          <MarkerDbHome
            brands={brands}
            series={series}
            commercialSets={commercialSets}
            userSets={userSets}
            onAddFromLibrary={() => setView({ kind: 'add-from-library' })}
            onNewCustomSet={() => setView({ kind: 'wizard' })}
            onOpenSet={(userSetId) => setView({ kind: 'set', userSetId })}
            onManageBrands={() => setView({ kind: 'brands' })}
          />
        </>
      )}

      {view.kind === 'wizard' && (
        <SetWizard
          onCreated={async (userSetId) => {
            await refresh()
            setView({ kind: 'set', userSetId })
          }}
          onCancel={() => setView({ kind: 'home' })}
        />
      )}

      {view.kind === 'add-from-library' && (
        <AddFromReferenceWizard
          onCreated={async (userSetId) => {
            await refresh()
            setView({ kind: 'set', userSetId })
          }}
          onCancel={() => setView({ kind: 'home' })}
        />
      )}

      {view.kind === 'set' && (
        <SetDetailPage
          userSetId={view.userSetId}
          brands={brands}
          series={series}
          commercialSets={commercialSets}
          references={references}
          userSets={userSets}
          onBack={() => setView({ kind: 'home' })}
          onChanged={refresh}
          onScan={() => setView({ kind: 'scanner', userSetId: view.userSetId })}
        />
      )}

      {view.kind === 'scanner' && (
        <ScannerView
          userSetId={view.userSetId}
          userSets={userSets}
          references={references}
          onBack={() => setView({ kind: 'home' })}
          onSaved={async () => {
            await refresh()
            setView({ kind: 'set', userSetId: view.userSetId })
          }}
          onCancel={() => setView({ kind: 'set', userSetId: view.userSetId })}
        />
      )}

      {view.kind === 'brands' && (
        <ManageBrands
          brands={brands}
          series={series}
          commercialSets={commercialSets}
          references={references}
          onBack={() => setView({ kind: 'home' })}
          onChanged={refresh}
        />
      )}
    </div>
  )
}

interface ScannerViewProps {
  userSetId: string
  userSets: UserMarkerSet[]
  references: MarkerReference[]
  onBack: () => void
  onSaved: () => Promise<void>
  onCancel: () => void
}

function ScannerView({ userSetId, userSets, references, onBack, onSaved, onCancel }: ScannerViewProps) {
  const { t } = useLocalization()
  const userSet = userSets.find((s) => s.id === userSetId)
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

  const ownedReferences = userSet.ownedMarkerReferenceIds
    .map((id) => references.find((r) => r.id === id))
    .filter((r): r is MarkerReference => r !== undefined)

  return (
    <SwatchScannerFlow
      userSet={userSet}
      displayName={userSet.customName}
      ownedReferences={ownedReferences}
      onSaved={onSaved}
      onCancel={onCancel}
    />
  )
}
