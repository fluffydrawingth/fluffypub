/**
 * Gates admin-only screens (Marker Reference Admin, Marker Set Admin,
 * Curated Palette Admin). The standalone app's default implementation was
 * `import.meta.env.DEV`; Fluffy Pub injects a real role check here instead,
 * via `setAdminCheck` — no changes to the gated components themselves.
 * See docs/integration-with-fluffypub.md and
 * fluffypub/src/pages/ColorLabPage.tsx (`ColorLabAuthBridge`), which calls
 * `setAdminCheck` on every auth-state change so `isAdmin()` always reflects
 * the current logged-in user without needing a hook.
 */
export interface AdminAccessAdapter {
  isAdmin(): boolean
}

let adminCheck: () => boolean = () => import.meta.env.DEV

/** Called once, at the Fluffy Pub integration boundary, to swap the admin check for a real one. */
export function setAdminCheck(fn: () => boolean): void {
  adminCheck = fn
}

export const localAdminAccessAdapter: AdminAccessAdapter = {
  isAdmin: () => adminCheck(),
}
