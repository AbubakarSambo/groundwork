import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
import { groundsApi } from '@/api/grounds'
import { recommendedCheckInsApi } from '@/api/recommendedCheckIns'
import type { TheMonthBoard } from '@/api/anchorShapes'

/**
 * PIECES 12, 13 AND 20: THE MONTH BOARD, "Are we moving together?" (anchor plan section 5, row 6;
 * docs/answers-from-engine.md, "Request 147", `TheMonthBoard`). Lead only.
 *
 * UPDATED FOR DECISION 114 (docs/decisions-merged.md; docs/answers-from-engine.md, "8 October
 * (later): the anchor through the ordinary routes, route by route"): "who reads a section is now
 * decided by the server." `BoardPage.tsx` no longer gates `theMonthBoard` on `anchorScenarioOn` or
 * `viewerRunsThisCheckIn` - it draws whatever `theMonthBoard` the payload itself carries, trusting
 * that the engine only ever fills the field for whoever runs the check-in, and only while the
 * anchor switch is on (`the-anchor-board-parts.ts`). So the two old tests that handed the lead a
 * `theMonthBoard` alongside `anchorScenarioOn: false`, or handed a colleague one at all, are gone -
 * that combination cannot happen on a real payload, which is exactly the point of trusting it
 * rather than re-checking it on screen - and are replaced below by the realistic shape of each
 * reader's own payload: the field simply absent when it is not theirs to read. The privacy intent
 * is unchanged: a colleague's own payload never carries `theMonthBoard`, and the page draws nothing
 * when it is not there.
 */
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))
vi.mock('@/api/recommendedCheckIns', () => ({
  recommendedCheckInsApi: { list: vi.fn().mockResolvedValue({ offers: [] }), yes: vi.fn(), notNow: vi.fn() },
}))

let currentUser: { id: string; firstName: string; role: string } = { id: 'u1', firstName: 'Hafsah', role: 'ADMIN' }
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: currentUser }),
}))

const monthBoardFixture: TheMonthBoard = {
  question: 'Are we moving together?',
  weekOfTheMonth: 2,
  weekSaid: 'Week 2 of the month',
  lenses: [
    { key: 'understanding', heading: 'Understanding', question: 'Do people see the bigger picture?', reading: 'Most of the team now connects their own work to the wider outcome.' },
  ],
  whatIsMoving: ['Omar connected a project delay to a renewal risk.'],
  whatTheTeamIsContributing: [],
  peopleHelpingThingsMove: [],
  wherePerspectivesDiffer: [],
  whatIsStillGettingInTheWay: [],
  whatGroundworkIsWorkingOnNext: [],
}

const board = (opts?: { anchorScenarioOn?: boolean; theMonthBoard?: TheMonthBoard }) => ({
  groundId: 'g1',
  renders: true,
  mode: 'SHARED',
  family: 'UPDATE',
  sections: [],
  title: 'Help my team understand',
  scenario: null,
  coverageVariant: 'NONE',
  myParticipantId: 'p1',
  canEditFrame: false,
  readOnlyNote: '',
  eachPerson: [],
  anchorScenarioOn: opts?.anchorScenarioOn ?? false,
  ...(opts?.theMonthBoard ? { theMonthBoard: opts.theMonthBoard } : {}),
  participants: [
    { id: 'p1', name: 'Hafsah', role: null, managingOnly: false, signedOffAt: null },
    { id: 'p2', name: 'Kennedy', role: null, managingOnly: false, signedOffAt: null },
  ],
})

function renderBoard() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(recommendedCheckInsApi.list as any).mockResolvedValue({ offers: [] })
  currentUser = { id: 'u1', firstName: 'Hafsah', role: 'ADMIN' }
})

describe('the month board, for the lead', () => {
  it('draws nothing when the field is not served (the switch off, or any other check-in)', async () => {
    ;(boardApi.get as any).mockResolvedValue(board({ anchorScenarioOn: false }))
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u1', participants: [] })
    renderBoard()
    await screen.findByRole('heading', { name: 'Help my team understand' })
    expect(screen.queryByText('Are we moving together?')).toBeNull()
  })

  it("draws the engine's own month board whenever the payload carries it", async () => {
    ;(boardApi.get as any).mockResolvedValue(board({ anchorScenarioOn: true, theMonthBoard: monthBoardFixture }))
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u1', participants: [] })
    renderBoard()
    expect(await screen.findByText('Are we moving together?')).toBeTruthy()
    expect(screen.getByText('Week 2 of the month')).toBeTruthy()
    expect(screen.getByText('Omar connected a project delay to a renewal risk.')).toBeTruthy()
  })
})

describe('the month board, for a participant, not the lead', () => {
  beforeEach(() => {
    currentUser = { id: 'u2', firstName: 'Kennedy', role: 'MEMBER' }
  })

  it('draws nothing: a colleague’s own payload never carries theMonthBoard, which the server alone decides', async () => {
    /* The realistic shape of a colleague's own board answer (the-anchor-board-parts.ts: `theMonthBoard`
       is only ever set on the lead's own parts) - the privacy intent this spec has always pinned,
       now checked against the payload itself rather than against a client-side reader flag. */
    ;(boardApi.get as any).mockResolvedValue(board({ anchorScenarioOn: true }))
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u1', participants: [] })
    renderBoard()
    await screen.findByRole('heading', { name: 'Help my team understand' })
    expect(screen.queryByText('Are we moving together?')).toBeNull()
  })
})
