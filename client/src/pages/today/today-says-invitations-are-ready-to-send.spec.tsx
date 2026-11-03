import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TodayPage } from './TodayPage'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { ReadyToSend } from '@/pages/enter/FillsInAsYouTalk'

/**
 * "CHECK IN ON YOUR OWN FIRST, INVITE LATER" (Hafsah, 3 November 2026): the invitations stay ready until the lead presses "Send N
 * invitations", and until then Today shows one line, "N invitations ready to send", with the button. The server writes the line and
 * the button's words (api what-needs-you.ts) and serves them only to whoever runs the check-in; here is what Wairimu reads.
 */
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn(), everywhere: vi.fn(), outstanding: vi.fn().mockResolvedValue(null) } }))
vi.mock('@/api/grounds', async (orig) => {
  const real: any = await orig()
  return { ...real, groundsApi: { ...real.groundsApi, sendTheInvitationsReadyToSend: vi.fn().mockResolvedValue({ sent: 4 }) } }
})
import { todayApi } from '@/api/today'
import { groundsApi } from '@/api/grounds'

const WAIRIMU = { id: 'wairimu', firstName: 'Wairimu', role: 'MEMBER', organizationName: 'Baridi Appliances' }

function open(read: any) {
  ;(todayApi.get as any).mockResolvedValue(read)
  vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { people: 5, admins: 1, checkIns: 1, paying: false, connected: false, whatsappOn: false, whatsappConnected: false, welcomeCardSeen: true } } as any)
  useAuthStore.setState({ user: WAIRIMU, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={['/today']}><TodayPage /></MemoryRouter></QueryClientProvider>)
}

beforeEach(() => { vi.clearAllMocks() })

describe('Wairimu checked in on her own first', () => {
  it('reads "4 invitations ready to send" with "Send 4 invitations", and the button sends them', async () => {
    open({ count: 0, line: '4 invitations ready to send', lineGroundId: 'g1', lineReadyToSend: { groundId: 'g1', count: 4, label: 'Send 4 invitations' }, needs: [], comingUp: [] })
    const button = await screen.findByRole('button', { name: 'Send 4 invitations' })
    expect(button.parentElement?.textContent).toContain('4 invitations ready to send')
    fireEvent.click(button)
    await waitFor(() => expect(groundsApi.sendTheInvitationsReadyToSend).toHaveBeenCalledWith('g1'))
  })

  it('setup offers to check in on her own first, beside "Send 4 invitations"', () => {
    const later = vi.fn()
    render(<ReadyToSend people={4} opens="Their first check-in opens tomorrow." onSend={() => undefined} onLater={later} sending={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Check in on your own first, invite later' }))
    expect(later).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Send 4 invitations' })).toBeTruthy()
  })
})
