/**
 * Gates the favorite-palettes feature (add to favorites, "My Favorites"
 * tab) on having a signed-in identity to save against. The standalone
 * app's default implementation always returned `true` (no accounts of
 * its own); Fluffy Pub injects a real signed-in check here instead, via
 * `setSignedInCheck`/`setSignInRequestHandler` — no changes to the gated
 * components themselves. See docs/integration-with-fluffypub.md and
 * fluffypub/src/pages/ColorLabPage.tsx (`useSyncAuthCheck`), which calls
 * both setters on every auth-state change so `isSignedIn()` always
 * reflects the current logged-in user without needing a hook.
 */
export interface AuthAccessAdapter {
  isSignedIn(): boolean
  requestSignIn(): void
}

let signedInCheck: () => boolean = () => true
let signInRequest: () => void = () => {}

/** Called once, at the Fluffy Pub integration boundary, to swap the signed-in check for a real one. */
export function setSignedInCheck(fn: () => boolean): void {
  signedInCheck = fn
}

/** Called once, at the Fluffy Pub integration boundary, to route a signed-out favorite attempt to the real login screen. */
export function setSignInRequestHandler(fn: () => void): void {
  signInRequest = fn
}

export const localAuthAccessAdapter: AuthAccessAdapter = {
  isSignedIn: () => signedInCheck(),
  requestSignIn: () => signInRequest(),
}
