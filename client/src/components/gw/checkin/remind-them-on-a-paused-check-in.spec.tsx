import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionPaywallModal } from './SessionPaywallModal'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'

/**
 * "REMIND THEM" ON A PAUSED CHECK-IN (upgrade.txt, "Anyone else, once it has paused"): the button
 * is new on the one overlay that already tells a lead or a member their check-in is blocked and
 * "we have told them you are waiting". Pressing it calls `POST /billing/remind-the-admins` with
 * the ground it is about, and the server's own `says` replaces the button - never a sentence the
 * screen invents. A guest is refused this by the server, so the button is never offered to one.
 */
function fakePaywall(overrides?: Partial<Record<string, any>>) {
  return {
    show: true,
    close: vi.fn(),
    freeExtensionAvailable: false,
    code: '',
    setCode: vi.fn(),
    codeMsg: null,
    setCodeMsg: vi.fn(),
    redeem: { mutate: vi.fn(), isPending: false },
    claimFreeExtension: { mutate: vi.fn(), isPending: false },
    createSubscription: { mutate: vi.fn(), isPending: false },
    ...overrides,
  } as any
}

function renderModal(canPayHere: boolean, groundId: string | undefined, role: string) {
  useAuthStore.setState({ user: { id: 'u1', role } as any, isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <SessionPaywallModal paywall={fakePaywall()} canPayHere={canPayHere} groundId={groundId} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => { vi.restoreAllMocks() })

describe('"Remind them" on a paused check-in', () => {
  it('sends { groundId }, and the served `says` replaces the button', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: { reminded: true, says: 'We have reminded your admins that you are waiting. You can remind them again tomorrow.' },
    } as any)
    renderModal(false, 'ground-42', 'MEMBER')

    const button = await screen.findByRole('button', { name: 'Remind them' })
    button.click()

    await waitFor(() => expect(post).toHaveBeenCalledWith('/billing/remind-the-admins', { groundId: 'ground-42' }))
    expect(await screen.findByText('We have reminded your admins that you are waiting. You can remind them again tomorrow.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Remind them' })).toBeNull()
  })

  it('is offered to a lead', () => {
    renderModal(false, 'ground-42', 'LEAD')
    expect(screen.getByRole('button', { name: 'Remind them' })).toBeTruthy()
  })

  it('is never offered to a guest', () => {
    renderModal(false, 'ground-42', 'GUEST')
    expect(screen.queryByRole('button', { name: 'Remind them' })).toBeNull()
  })

  it('is not shown on a check-in that is not paused (the admin who can pay here)', () => {
    renderModal(true, 'ground-42', 'ADMIN')
    expect(screen.queryByRole('button', { name: 'Remind them' })).toBeNull()
  })
})
