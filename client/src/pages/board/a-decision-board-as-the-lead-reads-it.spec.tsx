import { it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
import { groundsApi } from '@/api/grounds'

/**
 * A BIG DECISION, AS WAIRIMU WHO RUNS IT READS IT (supplier-board.jpg, screen match 16 October): the decision and
 * how many answered on their own, each account side by side in each person's own words with In or Waiting, and
 * what is known (with proof), believed (somebody's word) and unknown (the lead's own questions still open).
 */
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: { id: 'u-wairimu', firstName: 'Wairimu', role: 'LEAD' } }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(), list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))

it('draws the decision, each account and what is known, believed and unknown', async () => {
  ;(boardApi.get as any).mockResolvedValue({
    groundId: 'g-sup', renders: true, mode: 'SHARED', family: 'SENSING', sections: [], title: 'Supplier review', scenario: 'CRISIS_ALIGNMENT',
    endState: 'Which supplier for the 600L units next quarter?', myParticipantId: 'p-w', canEditFrame: true, readOnlyNote: null,
    participants: [{ id: 'p-w', name: 'Wairimu Kamau', role: 'Sales', partyType: 'INITIATOR' }, { id: 'p-g', name: 'Grace Achieng', role: 'Operations' }, { id: 'p-o', name: 'Omar Said', role: null }],
    checkInGrid: { sessions: [1], rows: [{ participantId: 'p-w', cells: { 1: 'done' } }, { participantId: 'p-g', cells: { 1: 'done' } }, { participantId: 'p-o', cells: { 1: 'empty' } }] },
    whoOwnsWhat: [
      { participantId: 'p-w', name: 'You', items: [{ id: 'a', type: null, text: 'You said, "Switch to Frostline."', mark: 'said' }, { id: 'b', type: 'PROGRESS', text: 'You said, "Coolmax delivered late 3 times."', mark: 'proven' }] },
      { participantId: 'p-g', name: 'Grace Achieng', items: [{ id: 'c', type: null, text: 'Grace Achieng said, "Stay with Coolmax."', mark: 'said' }, { id: 'd', type: 'WORRY', text: 'Grace Achieng said, "Coolmax breaks down less."', mark: 'said' }, { id: 'e', type: 'PROGRESS', text: 'Grace Achieng said, "Frostline sent the repair log."', mark: 'said', settled: true }] },
      { participantId: 'p-o', name: 'Omar Said', items: [] },
    ],
  })
  ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u-wairimu', leadFirstName: 'Wairimu', participants: [], checkIns: [], roundCompletions: [],
    contextItems: [{ id: 'u1', kind: 'UNSETTLED', text: 'Whether Frostline can repair in Mombasa' }] })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g-sup/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  expect(await screen.findByText('Which supplier for the 600L units next quarter?')).toBeTruthy()
  expect(screen.getByText('Each person answered on their own before any discussion. 2 of 3 so far; Omar hasn’t answered.')).toBeTruthy()
  expect(screen.getByText('“Stay with Coolmax.”')).toBeTruthy()
  expect(screen.getByText('“Switch to Frostline.”')).toBeTruthy()
  expect(screen.getByText('Waiting')).toBeTruthy()
  expect(screen.getByText('Coolmax delivered late 3 times.')).toBeTruthy()
  /* Fix plan group 4: somebody's word is said as theirs, never judged as unbacked; a claim the record settles anywhere is Known. */
  expect(screen.getByText('Coolmax breaks down less. (Grace said it)')).toBeTruthy()
  expect(screen.queryByText(/nothing on record backs it/)).toBeNull()
  expect(screen.getByText('Frostline sent the repair log.')).toBeTruthy()
  expect(screen.queryByText('Frostline sent the repair log. (Grace said it)')).toBeNull()
  expect(screen.getByText('Whether Frostline can repair in Mombasa')).toBeTruthy()
  expect(screen.getByText('For you to decide once Omar’s account is in.')).toBeTruthy()
})

