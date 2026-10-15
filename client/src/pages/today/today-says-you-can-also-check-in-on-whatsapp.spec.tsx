import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TodayPage } from './TodayPage'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { CheckInOnWhatsApp } from '@/components/gw/CheckInOnWhatsApp'
import { ANSWER_ON_WHATSAPP_INSTEAD } from '@/lib/answer-on-whatsapp-instead'

/**
 * HAFSAH'S FIX LIST, ITEM 5: "You can also check in on WhatsApp", with a way to connect, wherever someone is about to
 * check in. The server serves it only where WhatsApp is on for the organisation (api/src/modules/whatsapp/
 * you-can-also-check-in-on-whatsapp.spec.ts); here is what Amani reads on Today and on the check-in page.
 */
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn(), everywhere: vi.fn(), outstanding: vi.fn().mockResolvedValue(null) } }))
import { todayApi } from '@/api/today'

const DUE = { key: 'own-s', kind: 'do', title: 'Your next check-in for Sales team, Q4', detail: 'About ten minutes.', action: { label: 'Start it', to: '/checkin/c1' }, groundId: 's', organizationId: 'o' }
const AMANI = { id: 'u-a', firstName: 'Amani', role: 'MEMBER', organizationName: 'Msingi Foods' }

function open(read: any) {
  ;(todayApi.get as any).mockResolvedValue(read)
  vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { people: 5, admins: 1, checkIns: 1, paying: false, connected: false, whatsappOn: true, whatsappConnected: false, welcomeCardSeen: true } } as any)
  useAuthStore.setState({ user: AMANI, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={['/today']}><TodayPage /></MemoryRouter></QueryClientProvider>)
}

beforeEach(() => { vi.restoreAllMocks() })

describe('Today, as Amani', () => {
  it('says she can also check in on WhatsApp, under her check-in, with Connect WhatsApp', async () => {
    open({ count: 1, line: null, needs: [DUE], comingUp: [], checkInOnWhatsApp: { says: 'You can also check in on WhatsApp.', link: 'https://wa.me/447700900123?text=Hi', label: 'Connect WhatsApp' } })
    const link = await screen.findByTestId('today-check-in-on-whatsapp')
    expect(link.textContent).toBe('Connect WhatsApp')
    expect(link.getAttribute('href')).toBe('https://wa.me/447700900123?text=Hi')
    expect(link.parentElement?.textContent).toBe('You can also check in on WhatsApp. Connect WhatsApp')
  })
  it('says nothing about WhatsApp when the server does not serve it', async () => {
    open({ count: 1, line: null, needs: [DUE], comingUp: [] })
    await screen.findByText('Your next check-in for Sales team, Q4')
    expect(document.body.textContent).not.toContain('check in on WhatsApp')
  })
})

describe('the check-in page and the end of a session', () => {
  it('read the same line, with the way across', () => {
    render(<CheckInOnWhatsApp link="https://wa.me/447700900123?text=Hi" label={ANSWER_ON_WHATSAPP_INSTEAD} testId="answer-on-whatsapp" />)
    const link = screen.getByTestId('answer-on-whatsapp')
    expect(link.parentElement?.textContent).toBe('You can also check in on WhatsApp. Answer on WhatsApp instead')
    expect(link.getAttribute('href')).toBe('https://wa.me/447700900123?text=Hi')
  })
})
