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
 */
export function useWhoTheServerSaysYouAre() {
  const hydrated = useAuthStore(s => s._hasHydrated)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const asked = useRef(false)

  useEffect(() => {
    if (!hydrated || !isAuthenticated || asked.current) return
    asked.current = true
    authApi
      .me()
      .then(user => useAuthStore.getState().updateUser(user))
      .catch((error: { response?: { status?: number } }) => {
        if (error?.response?.status === 401) useAuthStore.getState().logout()
      })
  }, [hydrated, isAuthenticated])
}
