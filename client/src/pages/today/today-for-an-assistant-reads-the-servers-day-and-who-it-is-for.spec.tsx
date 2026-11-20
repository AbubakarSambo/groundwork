import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TodayPage } from './TodayPage'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'

/**
 * FATIMA ROUND 2, D2 AND D3. The executive assistant's Today showed nothing about the person she acts for, and said the real day when the server was running on the test clock.
 * Here is what Zainab reads: the day the server gives, and one row that says whose it is, what is outstanding, what waits for a decision and where the draft stands.
 */
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn(), everywhere: vi.fn(), outstanding: vi.fn().mockResolvedValue(null) } }))
import { todayApi } from '@/api/today'

const ROW = {
  key: 'acts-for-u-rakiya', kind: 'decide',
  title: 'You act for Rakiya Lawal. 11 matters are outstanding for Rakiya.',
  detail: "1 thing needs Rakiya's decision. The year-end draft is version 2, and it is waiting for Rakiya's approval. You can ask for changes, and only Rakiya can approve it.",
  action: { label: "Ask about Rakiya's matters", to: '/chat' }, groundId: '', organizationId: 'o',
}
const ZAINAB = { id: 'u-z', firstName: 'Zainab', role: 'MEMBER', organizationName: 'Dangote Abuja Office' }

function open(read: any) {
  ;(todayApi.get as any).mockResolvedValue(read)
  vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { people: 5, admins: 1, checkIns: 1, paying: false, connected: false, whatsappOn: false, whatsappConnected: false, welcomeCardSeen: true } } as any)
  useAuthStore.setState({ user: ZAINAB, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={['/today']}><TodayPage /></MemoryRouter></QueryClientProvider>)
}
beforeEach(() => { vi.restoreAllMocks() })

describe('Today, as the assistant who acts for Rakiya', () => {
  it('says whose it is, what is outstanding, what waits for a decision and where the draft is, and links to Ask', async () => {
    open({ now: '2026-11-13T09:00:00Z', count: 1, line: null, needs: [ROW], comingUp: [] })
    await screen.findByText('You act for Rakiya Lawal. 11 matters are outstanding for Rakiya.')
    expect(document.body.textContent).toContain("1 thing needs Rakiya's decision.")
    expect(document.body.textContent).toContain("The year-end draft is version 2, and it is waiting for Rakiya's approval.")
    expect(screen.getByRole('link', { name: "Ask about Rakiya's matters" }).getAttribute('href')).toBe('/chat')
  })

  it('says the day the server says, not the real day', async () => {
    open({ now: '2026-11-13T09:00:00Z', count: 0, line: null, needs: [], comingUp: [] })
    await screen.findByText(/Nothing needs you right now/)
    expect(document.body.textContent).toMatch(/Friday,? 13 November|Friday 13 November/)
  })
})
