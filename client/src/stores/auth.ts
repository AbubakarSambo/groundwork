import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { posthog } from '@/lib/posthog'
import { markSignedIn, clearSignedIn } from '@/lib/signed-in-flag'
import { justSignedIn, forgetChosenOrganisation } from '@/lib/choose-an-organisation'
import { takeItAllWithYou } from '@/lib/what-signing-out-takes-with-it'
import { queryClient } from '@/lib/queryClient'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  _hasHydrated: boolean
  setHasHydrated: (hydrated: boolean) => void
  setAuth: (user: User, token: string) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),

      setAuth: (user, token) => {
        /**
         * B-200: A LINK CAN HAND THIS BROWSER A DIFFERENT PERSON WHILE ONE IS ALREADY SIGNED IN.
         *
         * Grace, signed in, opening Wairimu's own sign-in link (or her reset-password link, or her
         * "answer today's check-in now" on an invite) replaces the signed-in person here - but
         * every query the app had already fetched and cached for Grace (the sidebar's organisation,
         * her grounds, her role) was still sitting in the shared query cache, keyed the same way for
         * anybody. The next screen rendered with Wairimu's own page content (freshly fetched with
         * her new token) sitting inside Grace's still-cached sidebar: two people on one screen,
         * until a reload threw the stale cache away.
         *
         * So a genuine change of identity - not a re-read of the same account, which the "resumed"
         * path on an invite link does to pick up a membership change - throws away everything the
         * cache knew about the person being replaced, and the one-time "choose an organisation"
         * flag with it, before the new person's session is set. Nothing is read from the old cache
         * again; the next render fetches fresh, as the new person.
         */
        const isDifferentPerson = get().isAuthenticated && get().user?.id !== user.id
        if (isDifferentPerson) {
          queryClient.clear()
          forgetChosenOrganisation()
        }
        localStorage.setItem('token', token)
        /**
         * The one bit the marketing site is allowed to know. Set here rather than at each of the
         * five places that sign somebody in (password, magic link, Google, password choice, entry
         * handover), because every one of them ends up calling this and a flag that only some
         * doors set is worse than no flag.
         */
        markSignedIn()
        /* Somebody who has just signed in, rather than switched organisation, and belongs to more than
           one is asked which to open (A3, #/orgs). The home page reads and clears this. */
        if (!get().isAuthenticated) justSignedIn()
        posthog.identify(user.id, {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organizationId: user.organizationId,
        })
        set({ user, token, isAuthenticated: true })
      },

      logout: () => {
        /* The token and everything else this app wrote about the person. See the module. */
        takeItAllWithYou()
        clearSignedIn()
        posthog.reset()
        set({ user: null, token: null, isAuthenticated: false })
      },

      updateUser: (userData) => {
        /* A role that changed changes what every list and button on the page may show. The store
           learned it; the query cache was still answering from the old role (A12). */
        const roleChanged = userData.role !== undefined && userData.role !== get().user?.role
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        }))
        if (roleChanged) void queryClient.invalidateQueries()
      },
    }),
    {
      name: 'auth-storage-v2',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)

/**
 * B-200 (review round 2): A LINK OPENED IN A NEW TAB LEAVES TWO PEOPLE IN THE OLD ONE.
 *
 * The fix inside `setAuth` above only covers the tab a sign-in link is actually opened in: it
 * throws away the stale query cache when THIS tab's own identity changes mid-session. It did
 * nothing for every OTHER open tab, which kept Grace's sidebar and Grace's cached queries while the
 * persisted store (`auth-storage-v2`, written by the `persist` middleware on every `set()` above)
 * now held Wairimu's. One click on anything in Grace's still-open tab sent Wairimu's bearer token
 * with it and rendered Wairimu's page content inside Grace's still-cached sidebar - two people on
 * one screen, in one tab, until a reload threw the stale cache away by accident.
 *
 * The browser's own `storage` event fires in every OTHER tab (never the one that wrote the key)
 * whenever `localStorage` changes, so it is read here to catch exactly that: a different person's
 * id appearing under the same persisted key. Two cases act on it:
 *
 *   - the id changed to somebody else entirely (a sign-in link for a different account, opened in
 *     another tab) - this tab reloads outright, so every request, every cached query and every
 *     rendered component starts over as them, rather than this code trying to patch a half-rendered
 *     tree from outside React;
 *   - the id changed to nobody (the other tab signed out) - "make signing out in one tab sign out
 *     the others the same way" is asked for here too, so this tab reloads rather than going on
 *     making requests with a token that no longer exists anywhere.
 *
 * A write that leaves the id exactly as it was - the "once per load" re-read in
 * `useWhoTheServerSaysYouAre`, which every open tab does on its own schedule - is deliberately NOT
 * acted on: two tabs signed in as the same person, each merging a field back from the server on its
 * own timer, must not reload each other in a loop every time either one writes.
 *
 * B-200 (review round 3): THE SAME PERSON, A DIFFERENT ORGANISATION, LEFT THE OTHER TAB WRONG TOO.
 *
 * This only ever compared the person's id. Neema, signed in to Msingi Foods in tab 1 on /today,
 * chooses Lakeview Clinic in tab 2's "/orgs" - still Neema, same id, but the token this store holds
 * is now Lakeview's. Tab 1's id check saw no change and did nothing: it kept Msingi's sidebar and
 * Msingi's cached queries on screen while every request it went on to make carried the new Lakeview
 * token underneath them, so Company (and anything else Msingi's own sidebar led to) rendered
 * Lakeview's content inside Msingi's chrome. A change of organisation is read the same as a change
 * of person for this purpose - everything this tab cached was fetched for the organisation it is
 * about to stop being signed into - so it is compared here too, and reloads the tab exactly the same
 * way.
 */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== 'auth-storage-v2') return
    let nextUserId: string | null = null
    let nextOrgId: string | null = null
    try {
      const parsed = event.newValue ? JSON.parse(event.newValue) : null
      nextUserId = parsed?.state?.user?.id ?? null
      nextOrgId = parsed?.state?.user?.organizationId ?? null
    } catch {
      /* A value this tab cannot parse is treated the same as "something changed, not sure what" -
         reloading is the safe answer either way, never guessing at a shape we could not read. */
      window.location.reload()
      return
    }
    const prevUserId = useAuthStore.getState().user?.id ?? null
    const prevOrgId = useAuthStore.getState().user?.organizationId ?? null
    if (nextUserId === prevUserId && nextOrgId === prevOrgId) return
    try { queryClient.clear() } catch { /* best effort before the reload that follows */ }
    forgetChosenOrganisation()
    window.location.reload()
  })
}
