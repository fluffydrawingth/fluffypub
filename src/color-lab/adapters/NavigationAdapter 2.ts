import { useNavigationStore } from '@/app/navigationStore'

/**
 * Abstracts "jump to a marker set" / "open the new-set wizard" navigation
 * so a host app could wire this to real routing instead of the standalone
 * app's in-memory section-switching. The standalone app's default
 * implementation wraps `useNavigationStore` imperatively (via `getState()`,
 * not the hook) so it can be called from outside a component.
 *
 * Note: components in this codebase (`MarkerMatchPanel`, `AppShell`,
 * `MarkerDatabasePage`) currently call `useNavigationStore` directly rather
 * than going through this adapter — wiring them through it is follow-up
 * work for the actual Fluffy Pub integration, not done in this pass. See
 * docs/integration-with-fluffypub.md.
 */
export interface NavigationAdapter {
  goToMarkerDb(): void
  goToMarkerSet(setId: string): void
  goToNewMarkerSet(): void
}

export const localNavigationAdapter: NavigationAdapter = {
  goToMarkerDb: () => useNavigationStore.getState().goToMarkerDb(),
  goToMarkerSet: (setId) => useNavigationStore.getState().goToMarkerSet(setId),
  goToNewMarkerSet: () => useNavigationStore.getState().goToNewMarkerSet(),
}
