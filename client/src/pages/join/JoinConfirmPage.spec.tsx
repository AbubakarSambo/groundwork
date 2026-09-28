import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { JoinConfirmPage } from './JoinConfirmPage'
import { joinApi } from '@/api/entry'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

/**
 * THE REAL CAUSE OF NEEMA'S SWITCHER READING "Your organisation" / "Takes part" (found chasing the
 * U.8 review's item 8c, which the coordinator reverted: `theMembershipFollowsTheUser` in
 * prisma.service.ts already nests a membership into every `user.create`, and a read-only query of
 * groundwork_dev confirmed neema.u8@example.test's `OrganizationMembership` row genuinely exists,
 * active, for Kilima Traders U8 - so the data was never missing).
 *
 * The real cause is here. This page signs somebody in against a placeholder user with no
 * `organizationName` and `role: 'MEMBER'` - exactly "Your organisation" (AppShell.tsx's fallback)
 * and "Takes part" (`roleWord('MEMBER')`) - then tries once to overwrite it with the real profile
 * from `authApi.me()`. Nothing else in the app ever calls `/auth/me` again after this page, so one
 * dropped request left the placeholder as her session's permanent state, through every reload,
 * until she signed in some other way. Retried a few times before falling back.
 */
vi.mock('@/api/entry', () => ({ joinApi: { confirm: vi.fn() } }))
vi.mock('@/api/auth', () => ({ authApi: { me: vi.fn() } }))

const REAL_PROFILE = {
  id: 'u-neema', email: 'neema.u8@example.test', firstName: 'Neema', lastName: 'Achieng',
  role: 'MEMBER' as const, organizationId: 'org-kilima', organizationName: 'Kilima Traders U8',
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/join/confirm?token=tok123']}>
      <Routes>
        <Route path="/join/confirm" element={<JoinConfirmPage />} />
        <Route path="/checkin/:id" element={<p>The check-in</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ user: null, token: null, isAuthenticated: false } as any)
  ;(joinApi.confirm as any).mockResolvedValue({
    groundId: 'g1', checkInId: 'ci1', accessToken: 'tok-abc', userId: 'u-neema',
    existingAccount: false, queuedForApproval: false,
  })
})

describe('joining by a confirmed link, and who ends up in the store', () => {
  it('replaces the placeholder with the real profile when the read succeeds first try', async () => {
    ;(authApi.me as any).mockResolvedValue(REAL_PROFILE)
    renderPage()
    await waitFor(() => expect(useAuthStore.getState().user?.organizationName).toBe('Kilima Traders U8'))
    expect(useAuthStore.getState().user?.role).toBe('MEMBER')
  })

  it('retries a dropped profile read instead of leaving the placeholder standing for good', async () => {
    ;(authApi.me as any)
      .mockRejectedValueOnce(new Error('network blip'))
      .mockResolvedValueOnce(REAL_PROFILE)
    renderPage()
    await waitFor(() => expect(useAuthStore.getState().user?.organizationName).toBe('Kilima Traders U8'), { timeout: 3000 })
    expect((authApi.me as any).mock.calls.length).toBe(2)
  })

  it('falls back to the placeholder only once every retry fails, and still lets the person in', async () => {
    ;(authApi.me as any).mockRejectedValue(new Error('down'))
    renderPage()
    await waitFor(() => expect((authApi.me as any).mock.calls.length).toBe(3), { timeout: 3000 })
    /* Never a broken "signed in as nobody, in no organisation" - the placeholder still has this
       check-in's own userId and a real token, and the person still reaches their check-in. */
    expect(useAuthStore.getState().user?.id).toBe('u-neema')
    expect(useAuthStore.getState().user?.organizationName).toBeUndefined()
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })
})
