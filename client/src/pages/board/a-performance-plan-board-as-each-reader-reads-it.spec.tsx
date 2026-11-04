import { it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
import { groundsApi } from '@/api/grounds'
import { suggestionsApi } from '@/api/suggestions'

/**
 * A PERFORMANCE PLAN, AS EACH READER READS IT (danielpip-board.jpg, screen match 16 October). Wairimu, who runs
 * it, reads Groundwork's suggestion about Daniel with her decision to make, what Daniel was already told on his
 * own board (only where the board says he saw it first), and a way into Daniel's case. Daniel reads none of it:
 * the suggestion is never served to him as the lead reads it, and his board is not this one.
 */
let me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'LEAD' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: me }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(), list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/suggestions', async (orig) => ({ ...(await orig() as any), suggestionsApi: { onCheckIn: vi.fn(), decide: vi.fn(), mine: vi.fn().mockResolvedValue({ suggestions: [] }) } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))

const board = (mine: string) => ({
  groundId: 'g-pip', renders: true, mode: 'SHARED', family: 'EVALUATION', sections: ['objectives', 'checkInGrid', 'divergence'], title: 'Daniel, the next six weeks', scenario: 'PIP',
  myParticipantId: mine, canEditFrame: mine === 'p-w', readOnlyNote: null,
  participants: [{ id: 'p-w', name: 'Wairimu Kamau', partyType: 'INITIATOR' }, { id: 'p-d', name: 'Daniel Ouma', partyType: 'PARTICIPANT' }],
  checkInGrid: { sessions: [1, 2, 3, 4], rows: [] },
  patterns: [
    { id: 'k1', participantId: 'p-d', whatHappened: 'Calls that need a difficult ask moved to next week, for 3 weeks in a row.', whoSeesIt: 'Daniel saw this first and has not answered yet.' },
    { id: 'k2', participantId: 'p-d', whatHappened: 'Visits without the shop’s name, for 2 weeks in a row.', whoSeesIt: 'Daniel has not seen this yet, and has not answered yet.' },
  ],
})
const suggestion = {
  id: 's1', checkIn: { id: 'g-pip', label: 'Daniel, the next six weeks' }, aboutName: 'Daniel', headline: 'Groundwork suggests extra support for Daniel Ouma',
  why: 'In the last 4 weeks, Daniel Ouma kept 11 of the 20 commitments made in this check-in. That is 55%.', whatWouldChangeIt: 'If Daniel Ouma keeps at least six in ten.',
  theirOwnAnswer: null, ifYouAgree: 'Extra support.', otherChoices: [], aboutTheEnding: false, decision: null,
  theirSide: 'Most of my time goes on cleaning the customer records, which I was asked to do.', appeal: null, appealDecision: null, mayChangeTheDecision: true,
}

function renderIt() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g-pip/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u-wairimu', leadFirstName: 'Wairimu', cadence: 'WEEKLY', cadenceAnchorDay: 1, timelineDays: 42, participants: [], checkIns: [], roundCompletions: [], contextItems: [] })
})

it('Wairimu reads the suggestion and the way into his case', async () => {
  me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'LEAD' }
  ;(boardApi.get as any).mockResolvedValue(board('p-w'))
  ;(suggestionsApi.onCheckIn as any).mockResolvedValue({ suggestions: [suggestion] })
  renderIt()
  expect(await screen.findByText('Groundwork suggests extra support for Daniel Ouma')).toBeTruthy()
  expect(screen.getByText('This is only a suggestion. You decide, and Daniel sees your reasons.')).toBeTruthy()
  expect(screen.getByText('Agree')).toBeTruthy()
  expect(screen.getByText('Choose something else')).toBeTruthy()
  /* Changed in F5: "Daniel was also told" was read from the stored pattern's who-sees-it sentence, which the lead stopped receiving in F2
     (a stored pattern is read only by the person it is about) and which is gone now, so it is not drawn. */
  expect(screen.queryByText(/Daniel was also told/)).toBeNull()
  expect(screen.queryByText(/visits without the shop’s name/i)).toBeNull()
  expect(screen.getByText('Open Daniel’s case').closest('a')?.getAttribute('href')).toBe('/grounds/g-pip/person/p-d')
  expect(screen.getByText('Daniel and you. Weekly, Mondays. Session 4 of 6.')).toBeTruthy()
  expect(screen.getByText('Every session')).toBeTruthy()
})

it('Daniel does not read the lead’s suggestion or the way into his own case', async () => {
  me = { id: 'u-daniel', firstName: 'Daniel', role: 'MEMBER' }
  ;(boardApi.get as any).mockResolvedValue({ ...board('p-d'), patterns: [] })
  ;(suggestionsApi.onCheckIn as any).mockResolvedValue({ suggestions: [] })
  renderIt()
  expect(await screen.findAllByText('Daniel, the next six weeks')).toBeTruthy()
  expect(screen.queryByText(/Groundwork suggests/)).toBeNull()
  expect(screen.queryByText('Open Daniel’s case')).toBeNull()
  expect(screen.queryByText(/This is only a suggestion/)).toBeNull()
})
