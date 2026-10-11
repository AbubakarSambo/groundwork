import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useWhoTheServerSaysYouAre } from './who-the-server-says-you-are'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api/auth'
import type { User } from '@/types'

/**
 * Drives the hook rather than reading its source: the point is what reaches the store.
 */
const SIGNED_IN_YESTERDAY = {
  id: 'u1', email: 'lead@example.test', firstName: 'Lead', lastName: 'Person',
  role: 'ADMIN', organizationId: 'o1', mayOpenCheckIns: true, isPlatformAdmin: false,
} as unknown as User

function signedIn() {
  useAuthStore.setState({
    user: SIGNED_IN_YESTERDAY, token: 't', isAuthenticated: true, _hasHydrated: true,
  })
}

beforeEach(() => {
  vi.restoreAllMocks()
  useAuthStore.setState({ user: null, token: null, isAuthenticated: false, _hasHydrated: false })
})

describe('who the server says you are', () => {
  it('asks once the store has hydrated and the person is signed in', async () => {
    const me = vi.spyOn(authApi, 'me').mockResolvedValue({ ...SIGNED_IN_YESTERDAY } as never)
    signedIn()
    renderHook(() => useWhoTheServerSaysYouAre())
    await waitFor(() => expect(me).toHaveBeenCalledTimes(1))
  })

  it('does not ask before hydration - the stored user is not read yet', () => {
    const me = vi.spyOn(authApi, 'me')
    useAuthStore.setState({ _hasHydrated: false, isAuthenticated: true })
    renderHook(() => useWhoTheServerSaysYouAre())
    expect(me).not.toHaveBeenCalled()
  })

  it('does not ask when nobody is signed in', () => {
    const me = vi.spyOn(authApi, 'me')
    useAuthStore.setState({ _hasHydrated: true, isAuthenticated: false })
    renderHook(() => useWhoTheServerSaysYouAre())
    expect(me).not.toHaveBeenCalled()
  })

  it('a permission the server has withdrawn is gone, and does not come back on a refresh', async () => {
    /* The whole reason this exists. */
    vi.spyOn(authApi, 'me').mockResolvedValue({ ...SIGNED_IN_YESTERDAY, mayOpenCheckIns: false } as never)
    signedIn()
    renderHook(() => useWhoTheServerSaysYouAre())
    await waitFor(() => expect(useAuthStore.getState().user?.mayOpenCheckIns).toBe(false))
  })

  it('a promotion made on the server arrives without signing out and in', async () => {
    vi.spyOn(authApi, 'me').mockResolvedValue({ ...SIGNED_IN_YESTERDAY, isPlatformAdmin: true } as never)
    signedIn()
    renderHook(() => useWhoTheServerSaysYouAre())
    await waitFor(() => expect(useAuthStore.getState().user?.isPlatformAdmin).toBe(true))
  })

  it('keeps the token, which the server never sends back', async () => {
    vi.spyOn(authApi, 'me').mockResolvedValue({ ...SIGNED_IN_YESTERDAY } as never)
    signedIn()
    renderHook(() => useWhoTheServerSaysYouAre())
    await waitFor(() => expect(useAuthStore.getState().token).toBe('t'))
  })

  it('a dead token ends the session rather than leaving a shell that 401s', async () => {
    vi.spyOn(authApi, 'me').mockRejectedValue({ response: { status: 401 } })
    signedIn()
    renderHook(() => useWhoTheServerSaysYouAre())
    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(false))
  })

  it('but a network failure leaves the person signed in with what they had', async () => {
    vi.spyOn(authApi, 'me').mockRejectedValue(new Error('Network Error'))
    signedIn()
    renderHook(() => useWhoTheServerSaysYouAre())
    await new Promise(r => setTimeout(r, 20))
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    expect(useAuthStore.getState().user?.mayOpenCheckIns).toBe(true)
  })

  /**
   * B-200. Grace, signed in, opens Wairimu's own sign-in link - which replaces the signed-in
   * person on this SAME page load (`setAuth`, stores/auth.ts). Grace's own `GET /auth/me`, asked
   * for when she first signed in, can still be in flight at that moment; if it resolves after
   * Wairimu's session is set, `updateUser` would merge Grace's own fields back over Wairimu's -
   * the token stays Wairimu's (set directly, not through this hook), but the rest of the signed-in
   * person would not. Walked live: exactly this mismatch, token for one person and `user` for
   * another.
   */
  const WAIRIMU = {
    id: 'u2', email: 'wairimu@msingi.test', firstName: 'Wairimu', lastName: 'Njoroge',
    role: 'LEAD', organizationId: 'o2', mayOpenCheckIns: true, isPlatformAdmin: false,
  } as unknown as User

  it('a slow answer about the person who WAS signed in does not overwrite the person signed in now', async () => {
    let resolveGrace!: (u: User) => void
    const me = vi.spyOn(authApi, 'me').mockImplementation(() => new Promise<User>((res) => { resolveGrace = res }))
    signedIn()
    renderHook(() => useWhoTheServerSaysYouAre())
    await waitFor(() => expect(me).toHaveBeenCalledTimes(1))

    // Wairimu's own sign-in link verifies on this browser while Grace's own /auth/me is still out.
    useAuthStore.getState().setAuth(WAIRIMU, 'wairimu-token')
    expect(useAuthStore.getState().user?.id).toBe('u2')

    // Grace's slow answer finally arrives.
    resolveGrace({ ...SIGNED_IN_YESTERDAY })
    await new Promise((r) => setTimeout(r, 10))

    expect(useAuthStore.getState().user?.id).toBe('u2')
    expect(useAuthStore.getState().user?.email).toBe('wairimu@msingi.test')
    expect(useAuthStore.getState().token).toBe('wairimu-token')
  })

  it('asks fresh for a genuinely new person, rather than staying silent for the rest of the page life', async () => {
    const me = vi.spyOn(authApi, 'me').mockResolvedValue({ ...SIGNED_IN_YESTERDAY } as never)
    signedIn()
    const { rerender } = renderHook(() => useWhoTheServerSaysYouAre())
    await waitFor(() => expect(me).toHaveBeenCalledTimes(1))

    me.mockResolvedValue({ ...WAIRIMU } as never)
    useAuthStore.getState().setAuth(WAIRIMU, 'wairimu-token')
    rerender()

    await waitFor(() => expect(me).toHaveBeenCalledTimes(2))
  })
})
