import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InvitePage } from './InvitePage'
import { participantsApi } from '@/api/participants'

/**
 * B-205 (review round 2): SOMEBODY SIGNED IN AS A DIFFERENT PERSON IS TOLD SO, NOT ASKED TO SIGN IN.
 *
 * Grace, signed in as herself, opening Tobi's own invitation to "Sales team, Q4" (Tobi already has
 * an account from Msingi, so `alreadyAccepted` is true) used to read "You already have an account.
 * Sign in to pick up this check-in." with a button, "Pick up where I left off", that called
 * `accept.mutate()` regardless of who was signed in. The server answered it correctly - it never
 * signs Grace into Tobi's account - but it did that by emailing TOBI a fresh sign-in link FROM
 * GRACE'S BROWSER, with nothing on screen ever telling Grace that was what her own click had just
 * done, and no way for her to tell the invitation was not hers at all.
 *
 * Fixed: a browser signed in as anybody other than the invited address reads whose invitation this
 * is and who is signed in, with "Go to Today" and "Sign out" - and crucially, `accept.mutate()` is
 * never called from this screen, so nothing is sent to Tobi's address just because Grace looked.
 */
vi.mock('@/api/participants', () => ({
  participantsApi: { preview: vi.fn(), accept: vi.fn() },
}))
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({
    setAuth: vi.fn(),
    user: { id: 'grace-1', email: 'grace@msingi.test', firstName: 'Grace', lastName: 'Achieng' },
    isAuthenticated: true,
  }),
}))

const navigated: string[] = []
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom')
  return { ...actual, useNavigate: () => (to: string) => { navigated.push(to) } }
})

function renderInvite() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/join?token=tok']}>
        <Routes><Route path="/join" element={<InvitePage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  navigated.length = 0
  ;(participantsApi.preview as any).mockResolvedValue({
    groundLabel: 'Sales team, Q4', initiatorName: 'Wairimu', alreadyAccepted: true, email: 'tobi@msingi.test',
  })
})

describe('Grace, signed in, on Tobi\'s own invitation', () => {
  it('is told plainly whose invitation this is and who is signed in', async () => {
    renderInvite()
    expect(await screen.findByText('This invitation is for someone else')).toBeTruthy()
    expect(screen.getByText('This invitation is for tobi@msingi.test. You are signed in as Grace Achieng.')).toBeTruthy()
  })

  it('is never told to sign in, and is not offered "Pick up where I left off"', async () => {
    renderInvite()
    await screen.findByText('This invitation is for someone else')
    expect(screen.queryByText(/Sign in/i)).toBeNull()
    expect(screen.queryByText(/Pick up where I left off/i)).toBeNull()
  })

  it('offers "Go to Today", which navigates there and calls accept() on nobody\'s behalf', async () => {
    renderInvite()
    fireEvent.click(await screen.findByRole('button', { name: 'Go to Today' }))
    expect(navigated).toContain('/today')
    expect(participantsApi.accept).not.toHaveBeenCalled()
  })

  it('offers a quiet way to sign out, to /signout', async () => {
    renderInvite()
    const signOut = await screen.findByRole('link', { name: 'Sign out' })
    expect(signOut).toHaveAttribute('href', '/signout')
  })

  it('never emails Tobi a sign-in link just because Grace opened the page', async () => {
    renderInvite()
    await screen.findByText('This invitation is for someone else')
    expect(participantsApi.accept).not.toHaveBeenCalled()
  })
})
