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
})
