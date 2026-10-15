import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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

describe('the invite page prefills the name the lead already gave', () => {
  it('splits a full name on the first space into First and Last', async () => {
    ;(participantsApi.preview as any).mockResolvedValue({
      groundLabel: 'Renewals', initiatorName: 'Hafsah', leadFirstName: 'Hafsah',
      scenario: 'NEW_PROJECT', alreadyAccepted: false, nameGiven: 'Musa Bello',
    })
    renderInvite()
    const first = await screen.findByLabelText('First name') as HTMLInputElement
    const last = screen.getByLabelText('Last name') as HTMLInputElement
    expect(first.value).toBe('Musa')
    expect(last.value).toBe('Bello')
  })

  it('leaves both fields empty when no name was given', async () => {
    ;(participantsApi.preview as any).mockResolvedValue({
      groundLabel: 'Renewals', initiatorName: 'Hafsah', leadFirstName: 'Hafsah',
      scenario: 'NEW_PROJECT', alreadyAccepted: false,
    })
    renderInvite()
    const first = await screen.findByLabelText('First name') as HTMLInputElement
    const last = screen.getByLabelText('Last name') as HTMLInputElement
    expect(first.value).toBe('')
    expect(last.value).toBe('')
  })

  it('still lets the invited person change what was prefilled', async () => {
    ;(participantsApi.preview as any).mockResolvedValue({
      groundLabel: 'Renewals', initiatorName: 'Hafsah', leadFirstName: 'Hafsah',
      scenario: 'NEW_PROJECT', alreadyAccepted: false, nameGiven: 'Musa Bello',
    })
    renderInvite()
    const first = await screen.findByLabelText('First name') as HTMLInputElement
    first.focus()
    ;(first as any).value = 'Amani'
    first.dispatchEvent(new Event('input', { bubbles: true }))
    expect((screen.getByLabelText('First name') as HTMLInputElement).value).toBe('Amani')
  })
})
