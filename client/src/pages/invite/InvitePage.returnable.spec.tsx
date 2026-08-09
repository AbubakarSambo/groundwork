import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InvitePage } from './InvitePage'
import { participantsApi } from '@/api/participants'

/**
 * AN INVITE LINK YOU CAN COME BACK TO.
 *
 * The link was destroyed on first use. That closed a real hole - it mints a
 * signed session, so a link that always works is a password anyone forwarded the
 * email could use, and what it opens is the participant's private account on a
 * ground their manager is also in.
 *
 * But it also meant someone who joined, got pulled into something else, and came
 * back to their own email was told their link was "invalid". In a product people
 * use in the middle of a working day, clicking, getting distracted, and coming
 * back is the normal path, not the exception.
 *
 * The link now lives forever and what changes is what clicking it does:
 *
 *   never joined          -> join, account created, signed in
 *   joined, this browser   -> straight back in, carrying the session they were
 *                             given when they joined
 *   joined, anywhere else  -> nothing minted here; a fresh sign-in link is sent
 *                             to the address that was invited
 *
 * Nobody meets a dead end, nobody is told their link is invalid, and a forwarded
 * link is worth nothing to whoever received it. The security property and the
 * annoyance were never the same thing.
 */

vi.mock('@/api/participants', () => ({
  participantsApi: { preview: vi.fn(), accept: vi.fn() },
}))
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ setAuth: vi.fn(), user: null, isAuthenticated: false }),
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

describe('coming back to an invite link you have already used', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    navigated.length = 0
    ;(participantsApi.preview as any).mockResolvedValue({
      groundLabel: 'New hire', initiatorName: 'Hafsah', alreadyAccepted: true,
    })
  })

  it('carries straight on when this is the browser they joined on', async () => {
    ;(participantsApi.accept as any).mockResolvedValue({ resumed: true, groundId: 'g1', checkInId: 'ci9' })
    renderInvite()

    fireEvent.click(await screen.findByRole('button', { name: /Pick up where I left off/i }))

    // THE POINT: click, get distracted, come back - and land back in the session.
    await waitFor(() => expect(navigated).toContain('/checkin/ci9'))
  })

  it('emails a way in rather than signing in a different browser', async () => {
    ;(participantsApi.accept as any).mockResolvedValue({ emailed: true, email: 'abubakar@x.test' })
    renderInvite()

    fireEvent.click(await screen.findByRole('button', { name: /Pick up where I left off/i }))

    expect(await screen.findByText(/Check your email/i)).toBeTruthy()
    expect(screen.getByText(/abubakar@x.test/)).toBeTruthy()
    // Nothing was minted here, so nothing to navigate into.
    expect(navigated).toHaveLength(0)
  })

  it('never tells someone their own link is invalid', async () => {
    ;(participantsApi.accept as any).mockResolvedValue({ emailed: true, email: 'abubakar@x.test' })
    renderInvite()
    fireEvent.click(await screen.findByRole('button', { name: /Pick up where I left off/i }))
    await screen.findByText(/Check your email/i)

    // THE REGRESSION: "This invite link is invalid or has already been used."
    expect(screen.queryByText(/invalid/i)).toBeNull()
    expect(screen.queryByText(/already been used/i)).toBeNull()
  })

  it('still signs in a first-time joiner', async () => {
    ;(participantsApi.preview as any).mockResolvedValue({
      groundLabel: 'New hire', initiatorName: 'Hafsah', alreadyAccepted: false,
    })
    ;(participantsApi.accept as any).mockResolvedValue({
      user: { id: 'u1', email: 'abubakar@x.test' }, accessToken: 'jwt', groundId: 'g1', checkInId: 'ci1',
    })
    renderInvite()

    fireEvent.click(await screen.findByRole('button', { name: /Add my version/i }))

    await waitFor(() => expect(navigated).toContain('/checkin/ci1'))
  })
})
