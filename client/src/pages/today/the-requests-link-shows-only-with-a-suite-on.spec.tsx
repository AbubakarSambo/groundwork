import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TodayPage } from './TodayPage'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { useSuitesKnownOffStore } from '@/stores/suites-known-off'

/**
 * WALK OF THE EXISTING CLIENTS' USE CASES (7 October). Today always offered "Your own leave and
 * spending requests", and with both suites off (almost every existing client) it opened a page that
 * only says the suite is off. It shows now only when either list answers.
 */
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: 'Nothing needs you right now.', needs: [], comingUp: [] }), everywhere: vi.fn(), outstanding: vi.fn().mockResolvedValue(null) } }))
vi.mock('@/api/suites', async (orig) => {
  const real: any = await orig()
  return {
    ...real,
    yourRequestsApi: { ...real.yourRequestsApi, leave: vi.fn(), spending: vi.fn(), hours: vi.fn() },
    queueApi: { get: vi.fn().mockRejectedValue(Object.assign(new Error('off'), { response: { status: 404 } })) },
  }
})
import { yourRequestsApi } from '@/api/suites'

function open() {
  vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { people: 3, admins: 1, checkIns: 2, paying: false, connected: false, whatsappOn: false, whatsappConnected: false, welcomeCardSeen: true } } as any)
  useAuthStore.setState({ user: { id: 'u1', firstName: 'Rukia', role: 'LEAD' }, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={['/today']}><TodayPage /></MemoryRouter></QueryClientProvider>)
}

const off = () => Promise.reject(Object.assign(new Error('off'), { response: { status: 404, data: { message: 'The leave suite is not switched on.' } } }))

/*
 * B-002: TodayPage's three "your requests" reads now share `useSuitesKnownOffStore` with the
 * sidebar's own queue read (see b-002-your-requests-reads-stop-once-off-is-known.spec.tsx), so a
 * 404 in one test here would otherwise silence the queries in the next one. Reset between tests,
 * the same way suites-known-off.spec.tsx already resets it for AppShell.
 */
beforeEach(() => { useSuitesKnownOffStore.setState({ off: false, offByKey: {} }) })

describe('"Your own leave and spending requests" on Today', () => {
  it('is not offered when all three are off', async () => {
    ;(yourRequestsApi.leave as any).mockImplementation(off)
    ;(yourRequestsApi.spending as any).mockImplementation(off)
    ;(yourRequestsApi.hours as any).mockImplementation(off)
    open()
    await screen.findByText('Nothing needs you right now.')
    await new Promise(r => setTimeout(r, 50))
    expect(screen.queryByRole('link', { name: 'Your own leave and spending requests' })).toBeNull()
  })

  it('is offered when a suite answers', async () => {
    ;(yourRequestsApi.leave as any).mockResolvedValue({ requests: [] })
    ;(yourRequestsApi.spending as any).mockImplementation(off)
    ;(yourRequestsApi.hours as any).mockImplementation(off)
    open()
    expect(await screen.findByRole('link', { name: 'Your own leave and spending requests' })).toHaveAttribute('href', '/suite/mine')
  })

  /*
   * FAULT 1 OF THE LIVE WALK (6 October): a member who gives hours in chat was told "...you will
   * see it under your hours.", but Today's link never considered hours at all, with leave and
   * spending both off. Gated the same way as the other two, and renamed once hours answer, since
   * "leave and spending" would otherwise leave hours unsaid.
   */
  it('is offered, and renamed "Your own requests", when only hours answers', async () => {
    ;(yourRequestsApi.leave as any).mockImplementation(off)
    ;(yourRequestsApi.spending as any).mockImplementation(off)
    ;(yourRequestsApi.hours as any).mockResolvedValue({ weeks: [], standing: null })
    open()
    expect(await screen.findByRole('link', { name: 'Your own requests' })).toHaveAttribute('href', '/suite/mine')
    expect(screen.queryByRole('link', { name: 'Your own leave and spending requests' })).toBeNull()
  })
})
