/**
 * WHETHER THE SIDEBAR WAS FOLDED, REMEMBERED ON THIS DEVICE.
 *
 * Folding the sidebar away used to last until the next page load, so somebody who liked it folded
 * folded it again every visit. It is a convenience for one screen, not a setting that should follow a
 * person to their phone, so it lives in this browser only.
 *
 * Browser storage can be missing or refuse (a private window, blocked site data), and then the
 * sidebar simply opens unfolded, which is how it starts for everybody.
 */
/* Starts with `gw-`, so signing out sweeps it with everything else this app wrote (see
   what-signing-out-takes-with-it). On a shared computer the next person starts with it open. */
const KEY = 'gw-sidebar-folded'

export function sidebarWasFolded(): boolean {
  try {
    return window.localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function rememberSidebarFolded(folded: boolean): void {
  try {
    if (folded) window.localStorage.setItem(KEY, '1')
    else window.localStorage.removeItem(KEY)
  } catch {
    /* Nothing to do: it will open unfolded next time. */
  }
}
