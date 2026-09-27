import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TodayPage } from './TodayPage'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'

/**
 * "YOU ARE IN." ON TODAY, AS A MEMBER WHO HAS JUST JOINED READS IT (U.3 review).
 *
 * It said "Open one to start contributing." to somebody with no check-in to open.
 */
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn(), everywhere: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { list: vi.fn() } }))
import { todayApi } from '@/api/today'
import { groundsApi } from '@/api/grounds'

/* Ama may not open check-ins herself: the server says so (mayOpenCheckIns: false). */
const AMA = { id: 'u-a', firstName: 'Ama', role: 'MEMBER', organizationName: 'Coamana', mayOpenCheckIns: false }

function open(grounds: any[], user: any = AMA) {
  ;(todayApi.get as any).mockResolvedValue({ count: 0, line: null, needs: [], comingUp: [] })
  ;(groundsApi.list as any).mockResolvedValue(grounds)
  vi.spyOn(apiClient, 'get').mockResolvedValue({ data: {} } as any)
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={['/today?welcome=1']}><TodayPage /></MemoryRouter></QueryClientProvider>)
}
const said = async () => (await screen.findByText('You are in.')).parentElement!.textContent!.replace(/\s+/g, ' ').trim()

beforeEach(() => vi.clearAllMocks())

describe('"You are in." on Today', () => {
  it('with no check-ins, says one will appear, and never "Open one"', async () => {
    open([])
    await vi.waitFor(async () => expect(await said()).toBe('You are in. You have no check-ins yet. When someone adds you to one, you will see it here.'))
    expect(document.body.textContent).not.toMatch(/Open one|start contributing/)
  })

  it('to someone who may open check-ins, with none yet, says they can start one (U.5 review)', async () => {
    open([], { ...AMA, role: 'LEAD', mayOpenCheckIns: true })
    await vi.waitFor(async () => expect(await said()).toBe('You are in. You have no check-ins yet. Start one, or when someone adds you to one, you will see it here.'))
  })

  it('a session that does not carry the answer is told it can start one, as the Start button is shown to it', async () => {
    /* The rule in nobody-sees-a-button-that-refuses-them.spec.ts: \`!== false\`, never \`=== true\`. */
    const { mayOpenCheckIns: _gone, ...older } = AMA
    open([], older)
    await vi.waitFor(async () => expect(await said()).toBe('You are in. You have no check-ins yet. Start one, or when someone adds you to one, you will see it here.'))
  })

  it('with a check-in, says to open one', async () => {
    open([{ id: 'g1', label: 'Sales team, Q3' }])
    await vi.waitFor(async () => expect(await said()).toBe('You are in. You will see your check-ins and reports here. Open one to take part.'))
  })
})
