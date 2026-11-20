import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InvitePage } from './InvitePage'
import { participantsApi } from '@/api/participants'

/**
 * FAULT 3 (SCREENS, INVITE PAGE): "First name" and "Last name" prefilled from the name the lead
 * already gave.
 *
 * The lead's people step (every situation, not only the anchor) now asks for a name beside each
 * email, and the server serves it back on this page's own preview as `nameGiven` ("Musa Bello").
 * Walked live: the invitation page still showed both fields empty, asking the invited person to
 * retype a name their own lead had just typed. This only fills what the server already sent, split
 * on the first space - still editable, and an invitation with no name given is unchanged.
 */

vi.mock('@/api/participants', () => ({
  participantsApi: { preview: vi.fn(), accept: vi.fn() },
}))
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ setAuth: vi.fn(), user: null, isAuthenticated: false }),
}))
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
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

beforeEach(() => { vi.clearAllMocks() })

/*
 * CHANGED 15 NOVEMBER 2026 (audit of the check-in pages, row 15). The name fields were prefilled and still drawn, with a help line
 * about the shared report. The lead's name for this person is now used without being asked again: the fields are drawn only when no
 * name was given, and what the lead typed is still what is sent on accepting.
 */
describe('the invite page uses the name the lead already gave, and asks only when none was given', () => {
  it('does not ask for a name the lead already gave, and sends it split on the first space', async () => {
    ;(participantsApi.preview as any).mockResolvedValue({
      groundLabel: 'Renewals', initiatorName: 'Hafsah', leadFirstName: 'Hafsah',
      scenario: 'NEW_PROJECT', alreadyAccepted: false, nameGiven: 'Musa Bello',
    })
    ;(participantsApi.accept as any).mockResolvedValue({ groundId: 'g1', token: 't', user: {} })
    renderInvite()
    const button = await screen.findByRole('button', { name: /Answer today’s check-in now/i })
    expect(screen.queryByLabelText('First name')).toBeNull()
    expect(screen.queryByLabelText('Last name')).toBeNull()
    expect(screen.queryByText(/Your name is optional/)).toBeNull()
    fireEvent.click(button)
    await waitFor(() => expect(participantsApi.accept).toHaveBeenCalledWith('tok', expect.objectContaining({ firstName: 'Musa', lastName: 'Bello' })))
  })

  it('asks for a name, empty, when none was given', async () => {
    ;(participantsApi.preview as any).mockResolvedValue({
      groundLabel: 'Renewals', initiatorName: 'Hafsah', leadFirstName: 'Hafsah',
      scenario: 'NEW_PROJECT', alreadyAccepted: false,
    })
    renderInvite()
    const first = await screen.findByLabelText('First name') as HTMLInputElement
    const last = screen.getByLabelText('Last name') as HTMLInputElement
    expect(first.value).toBe('')
    expect(last.value).toBe('')
    expect(screen.queryByText(/Your name is optional/)).toBeNull()
  })

  it('still asks for the phone number, which stays editable', async () => {
    ;(participantsApi.preview as any).mockResolvedValue({
      groundLabel: 'Renewals', initiatorName: 'Hafsah', leadFirstName: 'Hafsah',
      scenario: 'NEW_PROJECT', alreadyAccepted: false, nameGiven: 'Musa Bello',
    })
    renderInvite()
    await screen.findByRole('button', { name: /Answer today’s check-in now/i })
    expect(document.getElementById('invite-phone')).toBeTruthy()
  })
})
