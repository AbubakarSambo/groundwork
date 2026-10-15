import { useEffect, useRef } from 'react'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

/**
 * THE STORED USER IS A COPY FROM THE DAY THEY SIGNED IN.
 *
 * The auth store persists the whole user object to localStorage and, until this, nothing ever
 * asked the server whether it was still true. Everything the server decides about a person - may
 * they open check-ins, are they a platform admin, is the org set up, which organisation are they
 * in - was read from that copy, so a change made on the server never reached a browser that was
 * already signed in. It survived refreshes, because a refresh rehydrates the same stale copy.
 *
 * Three things we watched go wrong, all one cause: a permission removed came back on the next
 * refresh, a promotion to platform admin did nothing until the person signed out and in again,
 * and a second organisation joined was invisible to the app.
 *
 * So: once per load, after hydration, ask. Merge rather than replace, because the store holds the
 * token and the server does not send it back. A 401 means the token is dead, and the honest thing
 * is to end the session rather than leave somebody looking at a signed-in shell that 401s on every
 * request. Any other failure - offline, server down - is left alone: the stale copy is a better
 * answer than throwing somebody out because the network blinked.
 *
 * B-200: "ONCE PER LOAD" USED TO MEAN ONCE PER LOAD, EVEN ACROSS A CHANGE OF WHO IS SIGNED IN.
 *
 * `asked` was a bare boolean, set once the first time this asked anything and never cleared again
 * for the rest of the page's life. Grace, signed in, opening Wairimu's own sign-in link replaces
 * the signed-in person on this same page load (see `setAuth`, stores/auth.ts) - and if Grace's own
 * `GET /auth/me` (asked for when SHE first signed in) was still in flight at that moment, it
 * resolved AFTER Wairimu's session was set and merged Grace's own fields back over the top of it:
 * `updateUser` replaces every key the response carries, and that response was a full `User`, for
 * somebody who was no longer the one signed in. The token (set separately, directly) stayed
 * Wairimu's; the rest of the person did not. Walked live: the token in storage was
 * wairimu@msingi.test's, and the store's own `user` was grace@msingi.test's.
 *
 * Keyed by the signed-in person's id instead, so a genuine change of identity asks fresh for the
 * new person (which this hook's own job already says it should: tell this browser the truth about
 * whoever is signed in) - and the answer is only applied if that is still who is signed in when it
 * arrives, so a reply that was already stale about somebody who has since been replaced is simply
 * dropped rather than written over them.
 */
export function useWhoTheServerSaysYouAre() {
  const hydrated = useAuthStore(s => s._hasHydrated)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const userId = useAuthStore(s => s.user?.id ?? null)
  const askedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!hydrated || !isAuthenticated || !userId || askedFor.current === userId) return
    askedFor.current = userId
    authApi
      .me()
      .then(user => {
        if (useAuthStore.getState().user?.id !== userId) return
        useAuthStore.getState().updateUser(user)
      })
      .catch((error: { response?: { status?: number } }) => {
        if (error?.response?.status === 401 && useAuthStore.getState().user?.id === userId) useAuthStore.getState().logout()
      })
  }, [hydrated, isAuthenticated, userId])
}
