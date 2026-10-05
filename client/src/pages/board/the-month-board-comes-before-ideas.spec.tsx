import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
import { groundsApi } from '@/api/grounds'
import { recommendedCheckInsApi } from '@/api/recommendedCheckIns'
import type { TheMonthBoard, TheIdeasFromYourTeam } from '@/api/anchorShapes'

/**
 * FAULT 4 (live walk, 6 October 2026): FOR THE LEAD, "ARE WE MOVING TOGETHER?" COMES BEFORE
 * "IDEAS FROM YOUR TEAM".
 *
 * Section 24 makes the month board the lead's top question; the walk found "Ideas from your
 * team" sitting above it instead. For a member, who never gets a month board
 * (`theMonthBoardForTheLead` is lead-only), the ideas block stays exactly where it was.
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

const ideasFixture: TheIdeasFromYourTeam = {
  heading: 'Ideas from your team',
  ideas: [
    { id: 'idea-1', title: 'Client review one month before project close', raisedBy: 'Raised by Lucy.', similarNeedsSentence: null },
  ],
  whenThereAreNone: 'No idea from your team has been captured yet.',
}

const board = (opts?: { anchorScenarioOn?: boolean; theMonthBoard?: TheMonthBoard; ideasFromYourTeam?: TheIdeasFromYourTeam }) => ({
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
  ...(opts?.ideasFromYourTeam ? { ideasFromYourTeam: opts.ideasFromYourTeam } : {}),
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

describe('the board order, for the lead', () => {
  it('reads the month board before Ideas from your team', async () => {
    ;(boardApi.get as any).mockResolvedValue(board({ anchorScenarioOn: true, theMonthBoard: monthBoardFixture, ideasFromYourTeam: ideasFixture }))
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u1', participants: [] })
    renderBoard()
    await screen.findByText('Are we moving together?')
    const ideasHeading = await screen.findByText('Ideas from your team')
    const monthHeading = screen.getByText('Are we moving together?')
    expect(
      monthHeading.compareDocumentPosition(ideasHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })
})

describe('the board order, for a member', () => {
  beforeEach(() => { currentUser = { id: 'u2', firstName: 'Kennedy', role: 'MEMBER' } })

  it('leaves Ideas from your team exactly where it was, with no month board to move around', async () => {
    ;(boardApi.get as any).mockResolvedValue(board({ anchorScenarioOn: true, ideasFromYourTeam: ideasFixture }))
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u1', participants: [] })
    renderBoard()
    expect(screen.queryByText('Are we moving together?')).toBeNull()
    expect(await screen.findByText('Ideas from your team')).toBeTruthy()
  })
})
