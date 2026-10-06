import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { posthog } from '@/lib/posthog'
import { markSignedIn, clearSignedIn } from '@/lib/signed-in-flag'
import { justSignedIn } from '@/lib/choose-an-organisation'
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
