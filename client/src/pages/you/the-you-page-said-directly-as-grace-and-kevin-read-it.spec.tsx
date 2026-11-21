import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { YouPage } from './YouPage'
import { useAuthStore } from '@/stores/auth'
import SERVED from './__fixtures__/night-run-2-you.json'

/**
 * THE YOU PAGE, SAID DIRECTLY (the direct morning, Hafsah, 20 October 2026). The pages are what the API served Grace Achieng (she runs
 * "Sales team, Q4") and Kevin Omondi (a rep in it) on Tuesday 20 October in the morning, in the second night run. Off, the page says
 * "Only you see this page." as before. On, it says what the page holds and stops. Only the person may read it either way: that is
 * the server's rule (api grounds/the-you-board-as-each-reader-reads-it.spec.ts), and it does not move with the switch.
 */
vi.mock('@/api/you', () => ({ youApi: { get: vi.fn() } }))
vi.mock('@/api/my-data', () => ({ myDataApi: { get: vi.fn(), erase: vi.fn() } }))
vi.mock('@/api/patterns', () => ({ patternsApi: { answer: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { list: vi.fn().mockResolvedValue([]) } }))
import { youApi } from '@/api/you'

function open(who: 'grace' | 'kevin', on: boolean) {
  ;(youApi.get as any).mockResolvedValue({ ...(SERVED as any)[who], directMorning: on })
  useAuthStore.setState({ user: { id: `u-${who}`, firstName: who === 'grace' ? 'Grace' : 'Kevin', role: 'MEMBER' }, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={['/you']}><YouPage /></MemoryRouter></QueryClientProvider>)
}
const text = () => document.body.textContent ?? ''
beforeEach(() => { vi.clearAllMocks() })

describe.each(['grace', 'kevin'] as const)('the You page, as %s reads it', (who) => {
  /* Changed 21 November 2026 (Batch E, N13): "Only you see this page." was a privacy note on a screen, which the standards forbid. It is gone with the switch off too. Only the person may read You either way: that is the backend's rule. */
  it('off: what the page holds, with no privacy note', async () => {
    open(who, false)
    await screen.findByText('What you said you’d do')
    expect(screen.getByText('What’s yours, across your check-ins.')).toBeTruthy()
    expect(text()).not.toMatch(/Only you see this/)
  })

  it('on: what the page holds, with no privacy note, and the same sections', async () => {
    open(who, true)
    await screen.findByText('What you said you’d do')
    expect(screen.getByText('What’s yours, across your check-ins.')).toBeTruthy()
    expect(text()).not.toMatch(/Only you see this/)
    expect(text()).toContain('Sales team, Q4')
  })
})

describe('the You page, Kevin’s goals and promises are the same either way', () => {
  it('his target and what he said he would do read the same, on and off', async () => {
    const { unmount } = open('kevin', false)
    await screen.findByText('Units sold by 30 October. You have 49 of 30.')
    const off = text()
    unmount()
    open('kevin', true)
    await screen.findByText('Units sold by 30 October. You have 49 of 30.')
    expect(text()).toBe(off)
  })
})
