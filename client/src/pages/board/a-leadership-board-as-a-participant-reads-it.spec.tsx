import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
import { groundsApi } from '@/api/grounds'

/**
 * A LEADERSHIP CHECK-IN, AS WAIRIMU READS IT (leadership-board.jpg, screen match 16 October). Amani runs it and
 * takes part; Wairimu reads that she is a participant, the organisation's priorities as the Company page reads
 * them to her, her own part (what she said she would do, by when), the team's report once shared, and the other
 * boards she is in. Nothing of anybody else's words.
 */
const me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'LEAD' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: me }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(), list: vi.fn() } }))
vi.mock('@/api/company', () => ({ companyApi: { get: vi.fn().mockResolvedValue({ priorities: [
  { id: 'p1', number: 1, title: 'Grow revenue 50%', tag: null, reading: { tag: 'At risk', says: 'x' } },
  { id: 'p3', number: 3, title: 'Build a stronger organisation', tag: 'Nobody owns it yet', reading: null },
] }) } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))

function open() {
  ;(boardApi.get as any).mockResolvedValue({
    groundId: 'g-lead', renders: true, mode: 'SHARED', family: 'DELIVERY', sections: [], title: 'Leadership, Q3', scenario: 'OKR_ALIGNMENT',
    myParticipantId: 'p-wairimu', canEditFrame: false, readOnlyNote: null, lastChangedAt: '2026-09-16T15:00:00Z',
    participants: [{ id: 'p-amani', name: 'Amani Njoroge', partyType: 'INITIATOR', managingOnly: false }, { id: 'p-wairimu', name: 'Wairimu Kamau', partyType: 'PARTICIPANT', managingOnly: false }],
    workPlan: [{ id: 'w1', participantId: 'p-wairimu', who: 'You', says: 'In check-in 11, you said, "Bring the pipeline numbers". It is open.', when: 'today, 6pm', state: 'open' }],
    teamPicture: { shared: false, says: 'Today’s team picture is not shared yet.', yourOwnReport: null },
  })
  ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u-amani', leadFirstName: 'Amani', leadAnswersToo: true, cadence: 'WEEKLY', cadenceAnchorDay: 3, participants: [], checkIns: [], roundCompletions: [] })
  ;(groundsApi.list as any).mockResolvedValue([])
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g-lead/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('a leadership check-in, as a participant', () => {
  it('reads that she is a participant, the priorities, her own part and the company board link', async () => {
    open()
    /* The line telling her she is a participant is gone (it said what the title and tabs already say). */
    expect(await screen.findByText('Grow revenue 50%')).toBeTruthy()
    expect(screen.queryByText(/You’re a participant here/)).toBeNull()
    expect(await screen.findByText('Grow revenue 50%')).toBeTruthy()
    expect(screen.getByText('At risk')).toBeTruthy()
    expect(screen.getByText('Nobody owns it yet')).toBeTruthy()
    expect(screen.getByText('Bring the pipeline numbers')).toBeTruthy()
    expect(screen.getByText('Due today')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'The leadership report' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'See the company board' })).toBeTruthy()
  })
})
