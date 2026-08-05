import { create } from 'zustand'

export type AppSection = 'lab' | 'marker-db' | 'marker-db-admin' | 'curated-admin'

/** The only section a public (non-admin) user can ever be on. See docs/public-admin-separation.md. */
export const PUBLIC_SECTION: AppSection = 'lab'

export type AdminSection = Exclude<AppSection, 'lab'>

/** Every admin-only section — never rendered in the public header, never reachable without passing an admin check. */
export const ADMIN_SECTION_IDS: AdminSection[] = ['marker-db', 'marker-db-admin', 'curated-admin']

/** Pure gating rule for AppShell's secondary admin nav row: visible only to admins, and only once they've actually navigated off the public section. */
export function shouldShowAdminNavRow(isAdmin: boolean, section: AppSection): boolean {
  return isAdmin && section !== PUBLIC_SECTION
}

/**
 * Pure gating rule for which section actually renders. A non-admin can end
 * up with `section` set to an admin id (e.g. by calling `goToMarkerDb()`
 * from outside the header, such as a stale deep link) — this falls them
 * back to the public section rather than ever mounting an admin view.
 */
export function resolveEffectiveSection(isAdmin: boolean, section: AppSection): AppSection {
  return isAdmin || section === PUBLIC_SECTION ? section : PUBLIC_SECTION
}

/** One-shot deep-link request that MarkerDatabasePage consumes (and clears) on mount. */
export type MarkerDbRequest = { kind: 'set'; setId: string } | { kind: 'wizard' } | null

interface NavigationState {
  section: AppSection
  markerDbRequest: MarkerDbRequest
  goToLab: () => void
  goToMarkerDb: () => void
  goToMarkerDbAdmin: () => void
  goToCuratedAdmin: () => void
  goToMarkerSet: (setId: string) => void
  goToNewMarkerSet: () => void
  clearMarkerDbRequest: () => void
}

/**
 * Zustand so components outside AppShell (e.g. MarkerMatchPanel's "Add
 * marker set" button, nested two view-layers deep inside a palette tab) can
 * navigate to another top-level section — and optionally jump straight to a
 * specific set — without threading callbacks through every intermediate
 * component. Same "shared store beats prop-drilling" reasoning as
 * usePaletteStore, applied to navigation.
 */
export const useNavigationStore = create<NavigationState>((set) => ({
  section: 'lab',
  markerDbRequest: null,
  goToLab: () => set({ section: 'lab' }),
  goToMarkerDb: () => set({ section: 'marker-db' }),
  goToMarkerDbAdmin: () => set({ section: 'marker-db-admin' }),
  goToCuratedAdmin: () => set({ section: 'curated-admin' }),
  goToMarkerSet: (setId) => set({ section: 'marker-db', markerDbRequest: { kind: 'set', setId } }),
  goToNewMarkerSet: () => set({ section: 'marker-db', markerDbRequest: { kind: 'wizard' } }),
  clearMarkerDbRequest: () => set({ markerDbRequest: null }),
}))
