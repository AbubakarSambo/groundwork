import { it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
import { groundsApi } from '@/api/grounds'

/**
 * A NEW HIRE'S CHECK-IN BEFORE ANYBODY HAS ANSWERED, AS WAIRIMU WHO RUNS IT READS IT (faith90-board.jpg, screen
 * match 16 October): the board says it fills in after the first check-ins, what Faith and Wairimu agreed on day 1
 * beside why getting set up is kept apart, what is left to do, and what the organisation kept from another new
 * hire's check-in.
 */
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: { id: 'u-wairimu', firstName: 'Wairimu', role: 'LEAD', organizationName: 'Baridi Appliances' } }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(), list: vi.fn().mockResolvedValue([]) } }))
/* The length is the server's one owner's (lib/how-long-setup-takes.ts reads GET /entry/a-check-in-takes). Changed 3 November 2026: the board said "About ten minutes" of its own. */
vi.mock('@/api/entry', () => ({ entryApi: { aCheckInTakes: vi.fn().mockResolvedValue('About ten minutes') } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))

it('says the board fills in, and shows what was agreed, what is left to do and what may be relevant', async () => {
  ;(boardApi.get as any).mockResolvedValue({
    groundId: 'g-f', renders: true, mode: 'SHARED', family: 'ONBOARDING', sections: [], title: 'Faith, first 90 days', scenario: 'NEW_HIRE',
    myParticipantId: 'p-w', canEditFrame: true, readOnlyNote: null,
    participants: [{ id: 'p-w', name: 'Wairimu Kamau', partyType: 'INITIATOR' }, { id: 'p-f', name: 'Faith Muthoni', partyType: 'PARTICIPANT' }],
    checkInGrid: { sessions: [1], rows: [{ participantId: 'p-w', cells: { 1: 'not-started' } }, { participantId: 'p-f', cells: { 1: 'not-started' } }] },
    startingState: { heading: 'What was agreed at the start', rows: [{ when: 'By day 30', what: 'Visit all 12 supermarkets on the list' }, { when: 'By day 90', what: '4 new accounts with a first order' }] },
    mayBeRelevant: [{ id: 'm1', says: 'Check stock before a new rep starts.', whoConfirmedIt: 'You confirmed it on 21 September.' }],
  })
  ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u-wairimu', leadFirstName: 'Wairimu', cadence: 'WEEKLY', cadenceAnchorDay: 1, timelineDays: 84, participants: [], checkIns: [], roundCompletions: [], contextItems: [] })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g-f/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  /* The second heading, 'The board fills in after the first check-ins.', is gone: it said the same as the heading above it. */
  expect(await screen.findByText('What Faith and you agreed on day 1')).toBeTruthy()
  expect(screen.queryByText('The board fills in after the first check-ins.')).toBeNull()
  expect(screen.getByText('What Faith and you agreed on day 1')).toBeTruthy()
  expect(screen.getByText('Visit all 12 supermarkets on the list')).toBeTruthy()
  expect(screen.getByText('Getting set up is kept apart')).toBeTruthy()
  expect(screen.getByText('See the onboarding board').closest('a')?.getAttribute('href')).toBe('/suite/onboard')
  expect(screen.getByText("Your own check-in")).toBeTruthy()
  expect(await screen.findByText("About ten minutes")).toBeTruthy()
  expect(screen.getByText('1 invited')).toBeTruthy()
  expect(screen.getByText('This may be relevant')).toBeTruthy()
  expect(screen.getByText('Check stock before a new rep starts.')).toBeTruthy()
  expect(screen.getByText('You confirmed it on 21 September.')).toBeTruthy()
  expect(screen.getByText('See what Baridi Appliances has learned')).toBeTruthy()
  expect(screen.getByText('Not relevant')).toBeTruthy()
})
