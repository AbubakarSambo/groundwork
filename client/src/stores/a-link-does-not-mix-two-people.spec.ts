import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './auth'
import { queryClient } from '@/lib/queryClient'
import { justSignedIn, stillToChoose } from '@/lib/choose-an-organisation'
import type { User } from '@/types'

/**
 * B-200: A LINK CHANGES WHO IS SIGNED IN, AND THE FIRST SCREEN MUST NOT MIX THE TWO PEOPLE.
 *
 * Grace, an admin, signed in - then opens Wairimu's own sign-in link (or her reset-password link,
 * or "Answer today's check-in now" from an invite). All three call the same `setAuth`. Before this
 * fix, everything the app had already fetched and cached for Grace (her organisation, her grounds,
 * her sidebar) stayed in the shared query cache under the same keys, so the next screen rendered
 * Wairimu's own page content inside Grace's still-cached sidebar - two people on one screen, until
 * a reload threw the stale cache away. Driving the store directly, the way every one of the three
 * pages does, rather than rendering a page: the point is what a genuine change of identity leaves
 * behind, not any one page's markup.
 */
const GRACE = {
  id: 'grace-1', email: 'grace@example.test', firstName: 'Grace', lastName: 'Achieng',
  role: 'ADMIN', organizationId: 'o1', mayOpenCheckIns: true, isPlatformAdmin: false,
} as unknown as User

const WAIRIMU = {
  id: 'wairimu-1', email: 'wairimu@example.test', firstName: 'Wairimu', lastName: 'Njoroge',
  role: 'MEMBER', organizationId: 'o2', mayOpenCheckIns: false, isPlatformAdmin: false,
} as unknown as User

beforeEach(() => {
  useAuthStore.setState({ user: null, token: null, isAuthenticated: false, _hasHydrated: false })
  queryClient.clear()
})

describe('a link does not mix two people', () => {
  it('throws away what the cache knew about the person being replaced', () => {
    useAuthStore.getState().setAuth(GRACE, 'grace-token')
    // Grace's sidebar and grounds are already in the cache, the way AppShell and the grounds
    // list leave them once they have loaded.
    queryClient.setQueryData(['grounds'], [{ id: 'g1', label: "Grace's ground" }])
    queryClient.setQueryData(['organization'], { id: 'o1', name: "Grace's org" })
    expect(queryClient.getQueryData(['grounds'])).toBeTruthy()

    // Wairimu's own sign-in link verifies on this browser while Grace is still signed in.
    useAuthStore.getState().setAuth(WAIRIMU, 'wairimu-token')

    expect(useAuthStore.getState().user?.id).toBe('wairimu-1')
    // Nothing fetched for Grace survives to be read as Wairimu's.
    expect(queryClient.getQueryData(['grounds'])).toBeUndefined()
    expect(queryClient.getQueryData(['organization'])).toBeUndefined()
  })

  it('forgets a still-pending "choose an organisation" question that was Grace\'s, not Wairimu\'s', () => {
    useAuthStore.getState().setAuth(GRACE, 'grace-token')
    justSignedIn()
    expect(stillToChoose()).toBe(true)

    useAuthStore.getState().setAuth(WAIRIMU, 'wairimu-token')

    expect(stillToChoose()).toBe(false)
  })

  it('does not clear the cache for a plain first sign-in, with nobody signed in before', () => {
    queryClient.setQueryData(['public-thing'], { ok: true })
    useAuthStore.getState().setAuth(GRACE, 'grace-token')
    expect(queryClient.getQueryData(['public-thing'])).toEqual({ ok: true })
  })

  it('does not clear the cache when the same person is simply re-read (the invite "resumed" path)', () => {
    useAuthStore.getState().setAuth(GRACE, 'grace-token')
    queryClient.setQueryData(['grounds'], [{ id: 'g1', label: "Grace's ground" }])

    // authApi.me() re-read after a membership change, same account, same id, new token.
    useAuthStore.getState().setAuth({ ...GRACE, mayOpenCheckIns: true } as User, 'grace-token-2')

    expect(queryClient.getQueryData(['grounds'])).toBeTruthy()
  })
})
