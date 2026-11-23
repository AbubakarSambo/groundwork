import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TodayPage } from './TodayPage'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'

/**
 * A SETUP LEFT UNFINISHED IS THE FIRST THING ON TODAY (Hafsah's blocker, 31 October 2026: "nothing anyone says in setup is ever lost").
 *
 * Round 3's field programme lead told the setup about his four field officers, with their numbers, and left before it was saved. Today
 * said "Nothing needs you right now", and pressing Start opened a new setup that asked him everything again. The setup was still kept on
 * his device, under the key /start restores from; nothing led back to it. Now it is the first row of "What needs you", in his own words,
 * drawn before the rest of the page has loaded, and "Carry on" opens /start, which restores it where he left off.
 */
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn(), everywhere: vi.fn(), outstanding: vi.fn().mockResolvedValue(null) } }))
import { todayApi } from '@/api/today'
/* The setup is kept on the server (GET /entry/unfinished), the one copy Today and Check-ins read, on any device (round 5). */
vi.mock('@/api/entry', () => ({ entryApi: { unfinished: vi.fn() } }))
import { entryApi } from '@/api/entry'

const KOFI = { id: 'u-kofi', firstName: 'Kofi', role: 'ADMIN', organizationName: 'Mensah farmer training' }

function keepTheSetupHeLeft(over: Record<string, unknown> = {}) {
  vi.mocked(entryApi.unfinished).mockResolvedValue(({
    scenario: '', closed: false, onboardingStep: 2, history: [],
    onboardingSelections: { mode: 'new', initial: 'Get weekly reports from my field officers.' },
    onboardingHistory: [
      { role: 'assistant', content: 'What do you want your team to check in about?' },
      { role: 'user', content: 'Get weekly reports from my field officers.' },
      { role: 'assistant', content: 'Anything else I should know?' },
      { role: 'user', content: 'My field officers are Adwoa Nsiah (024 456 7890), Kwame Asante (027 123 4567), Ama Serwaa and Yaw Boateng.' },
    ],
    ...over,
  }) as any)
}

function open(read: Promise<unknown>) {
  ;(todayApi.get as any).mockReturnValue(read)
  vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { people: 1, admins: 1, checkIns: 0, paying: false, connected: false, whatsappOn: false, whatsappConnected: false, welcomeCardSeen: true } } as any)
  useAuthStore.setState({ user: KOFI, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={['/today']}><TodayPage /></MemoryRouter></QueryClientProvider>)
}

/* 23 November (journey 3): the rebuilt Today's rows are the design system's (.ds-row). */
const rows = () => [...document.querySelectorAll('.ds-row')].map((li) => ({
  title: li.querySelector('.ds-text-card')?.textContent,
  detail: li.querySelector('.ds-row-main > .ds-text-secondary')?.textContent ?? null,
  action: [...li.querySelectorAll('a:not(.ds-row-link)')].map((a) => [a.textContent, a.getAttribute('href')]),
}))

describe('Today, for a lead who left a setup unfinished', () => {
  beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); vi.mocked(entryApi.unfinished).mockResolvedValue(null) })

  it('shows the way back first, in his own words, before the rest has loaded', async () => {
    keepTheSetupHeLeft()
    open(new Promise(() => {}))
    await waitFor(() => expect(rows().length).toBe(1))
    expect(rows()[0]).toEqual({
      title: 'Finish setting up “Get weekly reports from my field officers”',
      detail: 'Everything you said is kept, and it opens where you left off.',
      action: [['Carry on', '/start']],
    })
    expect(screen.queryByText('Nothing needs you right now.')).toBeNull()
  })

  it('keeps it first once the rest has loaded, and never says nothing needs him', async () => {
    keepTheSetupHeLeft()
    open(Promise.resolve({
      count: 1, line: null, comingUp: [],
      needs: [{ key: 'turn-s', kind: 'decide', title: 'Your own check-in for Sales team', detail: 'About ten minutes.', action: { label: 'Start it', to: '/checkin/s1' }, groundId: 's', organizationId: 'o' }],
    }))
    await waitFor(() => expect(rows().length).toBe(2))
    expect(rows()[0].title).toBe('Finish setting up “Get weekly reports from my field officers”')
    expect(rows()[1].title).toBe('Your own check-in for Sales team')
    expect(screen.queryByText('Nothing needs you right now.')).toBeNull()
  })

  it('a setup with nothing said in it yet is not something to finish', async () => {
    keepTheSetupHeLeft({ onboardingSelections: { mode: 'new' }, onboardingHistory: [{ role: 'assistant', content: 'What do you want your team to check in about?' }] })
    open(Promise.resolve({ count: 0, line: null, needs: [], comingUp: [] }))
    expect(await screen.findByText('Nothing needs you right now.')).toBeTruthy()
    expect(screen.queryByText(/Finish setting up/)).toBeNull()
  })

  it('on a device that never had it, the setup kept on the server is put back on this device, so Carry on opens it as he left it', async () => {
    keepTheSetupHeLeft()
    expect(localStorage.getItem('gw_entry_session')).toBeNull()
    open(Promise.resolve({ count: 0, line: null, needs: [], comingUp: [] }))
    await waitFor(() => expect(rows()[0]?.title).toBe('Finish setting up “Get weekly reports from my field officers”'))
    const onThisDevice = JSON.parse(localStorage.getItem('gw_entry_session')!)
    expect(onThisDevice.onboardingHistory.map((t: any) => t.content)).toContain('My field officers are Adwoa Nsiah (024 456 7890), Kwame Asante (027 123 4567), Ama Serwaa and Yaw Boateng.')
  })

  it('a setup somebody else left on this device is not his: only the server copy is read', async () => {
    localStorage.setItem('gw_entry_session', JSON.stringify({ onboardingSelections: { initial: 'Who did you train this week and on what topics?' }, onboardingHistory: [{ role: 'user', content: 'Who did you train this week and on what topics?' }] }))
    open(Promise.resolve({ count: 0, line: null, needs: [], comingUp: [] }))
    expect(await screen.findByText('Nothing needs you right now.')).toBeTruthy()
    expect(screen.queryByText(/Finish setting up/)).toBeNull()
  })

  it('with no setup kept, Today is as it was', async () => {
    open(Promise.resolve({ count: 0, line: null, needs: [], comingUp: [] }))
    expect(await screen.findByText('Nothing needs you right now.')).toBeTruthy()
    expect(screen.queryByText(/Finish setting up/)).toBeNull()
  })
})
