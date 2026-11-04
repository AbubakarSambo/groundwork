import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * ACCEPTING AN INVITATION ASKS FOR A PHONE NUMBER (Hafsah, 30 October 2026: always shown, labelled "Phone number", and only what
 * mentions WhatsApp is hidden while it is off). Accepting signs them in, and the number is then saved to them through PATCH /auth/me.
 */
let whatsappOn = false
vi.mock('@/lib/whatsapp-is-on', () => ({ useWhatsAppIsOn: () => whatsappOn }))
vi.mock('react-router-dom', async () => ({ ...(await vi.importActual<typeof import('react-router-dom')>('react-router-dom')), useNavigate: () => vi.fn() }))
vi.mock('@/api', () => ({ participantsApi: { preview: vi.fn(), accept: vi.fn() } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ setAuth: vi.fn() }) }))
vi.mock('@/api/auth', () => ({ authApi: { setPhoneNumber: vi.fn(async () => ({})), me: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

import { participantsApi } from '@/api'
import { authApi } from '@/api/auth'
import { InvitePage } from './InvitePage'

const PREVIEW = { groundLabel: 'Groundwork project', initiatorName: 'Sarah Okonkwo', leadFirstName: 'Sarah', scenario: 'NEW_PROJECT', roleAsDescribed: null, alreadyAccepted: false, organisationName: 'Acme Inc' }
const renderInvite = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
    <MemoryRouter initialEntries={['/invite?token=tkn-1']}><Routes><Route path="/invite" element={<InvitePage />} /></Routes></MemoryRouter>
  </QueryClientProvider>,
)

describe('the invitation, with WhatsApp off and on', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(participantsApi.preview as any).mockResolvedValue(PREVIEW)
    ;(participantsApi.accept as any).mockResolvedValue({ accessToken: 'jwt-1', user: { id: 'u-p', email: 'p@x.test' }, groundId: 'g-1', checkInId: 'ci-1', existingAccount: false })
  })

  it('shows "Phone number" with WhatsApp off, and says nothing about WhatsApp beside it', async () => {
    whatsappOn = false
    renderInvite()
    expect(await screen.findByLabelText('Phone number')).toBeTruthy()
    expect(screen.getByText('Optional.')).toBeTruthy()
  })

  it('shows the same field with WhatsApp on, with its sentence about WhatsApp', async () => {
    whatsappOn = true
    renderInvite()
    expect(await screen.findByLabelText('Phone number')).toBeTruthy()
    expect(screen.getByText('Optional. With it, your check-ins can also reach you on WhatsApp.')).toBeTruthy()
  })

  it('saves a typed number through PATCH /auth/me once accepting has signed them in', async () => {
    whatsappOn = false
    renderInvite()
    fireEvent.change(await screen.findByLabelText('Phone number'), { target: { value: '+254 712 345 678' } })
    fireEvent.click(screen.getByRole('button', { name: /Answer today’s check-in now/i }))
    await waitFor(() => expect(authApi.setPhoneNumber).toHaveBeenCalledWith('+254 712 345 678'))
  })
})
