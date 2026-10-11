/**
 * "CHOOSE AN ORGANISATION" (A3, #/orgs) IS ASKED ONCE, RIGHT AFTER SIGNING IN.
 *
 * Somebody in two or more organisations is asked which one to open when they sign in, and never
 * again until they next sign in: after that the top of the sidebar is where they switch, as the page
 * says. Kept for the browser tab only, and never a permission: it only decides which page opens.
 */
const KEY = 'gw-just-signed-in'

export function justSignedIn(): void {
  try { window.sessionStorage.setItem(KEY, '1') } catch { /* private mode: they are simply not asked */ }
}

/** True once after signing in; reading it clears it. */
export function takeJustSignedIn(): boolean {
  try {
    const was = window.sessionStorage.getItem(KEY) === '1'
    window.sessionStorage.removeItem(KEY)
    return was
  } catch {
    return false
  }
}

/** Whether they are still to be asked, without clearing it. */
export function stillToChoose(): boolean {
  try { return window.sessionStorage.getItem(KEY) === '1' } catch { return false }
}

/** Discards the flag without reading it: the question belonged to whoever was signed in before. */
export function forgetChosenOrganisation(): void {
  try { window.sessionStorage.removeItem(KEY) } catch { /* private mode: nothing to forget */ }
}
