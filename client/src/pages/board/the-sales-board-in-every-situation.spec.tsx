import { it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
import { groundsApi } from '@/api/grounds'

/**
 * THE SALES CHECK-IN IN EVERY SITUATION (B5-boards-every-situation/*-board.jpg, screen match 16 October). The same
 * sales board, with what the switchboard switches on for the situation: "What needs you" with lead actions, the deals
 * day by day with the deal grid, blockers with blockers, what keeps coming up with patterns. Everything else is the same.
 */
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: { id: 'u-w', firstName: 'Wairimu', role: 'LEAD' } }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(), list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))

const board = (scenario: string) => ({
  groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', sections: [], title: 'Sales team, Q3', scenario, kindOfWork: 'sales org',
  myParticipantId: 'p-w', canEditFrame: true, readOnlyNote: null,
  participants: [{ id: 'p-w', name: 'Wairimu Kamau', partyType: 'INITIATOR', managingOnly: true }, { id: 'p-a', name: 'Aisha Otieno', partyType: 'PARTICIPANT' }],
  objectives: [{ id: 'o1', name: 'The team is aiming for 25 sales.', count: 21, target: 25, assumes: ['6 reps each close about 4 sales.'] }],
  decisions: [{ question: 'Decide whether a price range counts as a budget', why: 'You wrote this down as still to decide.' }],
  workRecords: [{ section: 'Deal grid', holds: 'deals', state: 'filled', stages: ['Qualified', 'Won'], groups: [], rows: [{ id: 'd1', kind: 'deal', name: 'Eastside Foods', owner: 'Aisha Otieno', ownerParticipantId: 'p-a', stage: 'Qualified', mark: 'said', contactHistory: [] }] }],
  blockers: [{ id: 'b1', name: 'stock of 600L freezers', state: 'blocking', says: 'Aisha is waiting on Operations.', wouldClearItSays: 'Nobody has said what would clear it yet.' }],
  patterns: [{ id: 'k1', participantId: 'p-a', yours: false, whatHappened: 'Visits without the shop’s name.', heading: 'x' }],
})

function renderFor(scenario: string) {
  ;(boardApi.get as any).mockResolvedValue(board(scenario))
  ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u-w', leadFirstName: 'Wairimu', cadence: 'DAILY', workingDays: [1, 2, 3, 4, 5], participants: [], checkIns: [], roundCompletions: [], contextItems: [] })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

it('Get a project back on track: needs you, the deals, blockers and what keeps coming up', async () => {
  renderFor('DRIFT')
  expect(await screen.findByText('What needs you in this check-in')).toBeTruthy()
  expect(screen.getByText('Every deal, day by day')).toBeTruthy()
  expect(screen.getByText('Blockers')).toBeTruthy()
  expect(screen.getByText('What keeps coming up')).toBeTruthy()
})

it('Start an advisor or board relationship: none of the four, and the rest of the board', async () => {
  renderFor('NEW_ADVISOR')
  expect(await screen.findByRole('link', { name: 'See every other part of this board' })).toBeTruthy()
  expect(screen.queryByText('What needs you in this check-in')).toBeNull()
  expect(screen.queryByText('Every deal, day by day')).toBeNull()
  expect(screen.queryByText('Blockers')).toBeNull()
  expect(screen.queryByText('What keeps coming up')).toBeNull()
})
