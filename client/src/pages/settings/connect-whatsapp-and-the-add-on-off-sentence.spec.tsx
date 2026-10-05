import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SettingsPage } from './SettingsPage'
import { useAuthStore } from '@/stores/auth'

/**
 * TWO THINGS SETTINGS NOW DRAWS ONLY WHEN THE SERVER SERVES THEM.
 *
 * "Connect WhatsApp" (decision 106): a one-tap link, drawn only while `user.connectWhatsApp` is
 * non-null, labelled and linked exactly as served - never something a person must do to get their
 * check-ins.
 *
 * The WhatsApp add-on's own sentence (decision 78, screens gap closed 5 October): a lead or a
 * member reads here why their check-ins stay in the app, because Plan and billing is admin-only
 * for them. Read from `GET /billing/whatsapp`, exactly as served - never a figure this page works
 * out for itself.
 */
vi.mock('@/lib/whatsapp-is-on', () => ({ useWhatsAppIsOn: () => true }))

const m = vi.hoisted(() => ({ whatsapp: { on: true, sending: true, says: null } as any }))
vi.mock('@/api/billing', async () => {
  const actual = await vi.importActual<typeof import('@/api/billing')>('@/api/billing')
  return { ...actual, billingApi: { ...actual.billingApi, getWhatsApp: vi.fn().mockImplementation(async () => m.whatsapp) } }
})

function renderIt() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><SettingsPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  m.whatsapp = { on: true, sending: true, says: null }
})

describe('"Connect WhatsApp"', () => {
  it('is drawn, labelled and linked exactly as served, when the server serves it', async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: 'u1', email: 'wairimu@baridi.co.ke', firstName: 'Wairimu', lastName: '', role: 'LEAD',
        organizationId: 'o1', organizationName: 'Baridi Appliances', phoneNumber: '+254712345678',
        connectWhatsApp: { link: 'https://wa.me/447700900123?text=Hi', number: '+44 7700 900123', says: 'Connect WhatsApp' },
      } as any,
    } as any)
    renderIt()
    await screen.findByText('You can check in by replying on WhatsApp.')
    expect(screen.getByText('Optional. Tap to say hello to Groundwork on WhatsApp.')).toBeTruthy()
    const link = screen.getByRole('link', { name: 'Connect WhatsApp' })
    expect(link.getAttribute('href')).toBe('https://wa.me/447700900123?text=Hi')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener')
  })

  it('is absent once it is null (they have already written to Groundwork, or nothing is being offered)', async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: 'u1', email: 'wairimu@baridi.co.ke', firstName: 'Wairimu', lastName: '', role: 'LEAD',
        organizationId: 'o1', organizationName: 'Baridi Appliances', phoneNumber: '+254712345678',
        connectWhatsApp: null,
      } as any,
    } as any)
    renderIt()
    await screen.findByText('You can check in by replying on WhatsApp.')
    expect(screen.queryByText('Optional. Tap to say hello to Groundwork on WhatsApp.')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Connect WhatsApp' })).toBeNull()
  })
})

describe('the WhatsApp add-on, off, for a lead or a member', () => {
  it('reads the server’s own sentence', async () => {
    m.whatsapp = { on: false, sending: true, says: 'Your organisation has not turned on WhatsApp, so Groundwork does not send you reminders or summaries on WhatsApp.' }
    useAuthStore.setState({
      isAuthenticated: true,
      user: { id: 'u1', email: 'miriam@baridi.co.ke', firstName: 'Miriam', lastName: '', role: 'MEMBER', organizationId: 'o1', organizationName: 'Baridi Appliances', phoneNumber: null } as any,
    } as any)
    renderIt()
    await waitFor(() => expect(screen.getByText('Your organisation has not turned on WhatsApp, so Groundwork does not send you reminders or summaries on WhatsApp.')).toBeTruthy())
  })

  it('says nothing while the add-on is on', async () => {
    m.whatsapp = { on: true, sending: true, says: null }
    useAuthStore.setState({
      isAuthenticated: true,
      user: { id: 'u1', email: 'miriam@baridi.co.ke', firstName: 'Miriam', lastName: '', role: 'MEMBER', organizationId: 'o1', organizationName: 'Baridi Appliances', phoneNumber: null } as any,
    } as any)
    renderIt()
    await screen.findByText('You can check in by replying on WhatsApp.')
    expect(screen.queryByText(/has not turned on WhatsApp/)).toBeNull()
  })

  it('is never asked for by an admin here - she manages it on Plan and billing', async () => {
    const { billingApi } = await import('@/api/billing')
    useAuthStore.setState({
      isAuthenticated: true,
      user: { id: 'u1', email: 'grace@baridi.co.ke', firstName: 'Grace', lastName: '', role: 'ADMIN', organizationId: 'o1', organizationName: 'Baridi Appliances', phoneNumber: null } as any,
    } as any)
    renderIt()
    await screen.findByText('You can check in by replying on WhatsApp.')
    expect(billingApi.getWhatsApp).not.toHaveBeenCalled()
  })
})
