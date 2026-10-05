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
 * docs/answers-from-engine.md, "Request 147", `TheMonthBoard`). Lead only, drawn only while
 * `anchorScenarioOn` is served true and `theMonthBoard` itself is present - nothing drawn otherwise,
 * and nothing drawn for a colleague even when both are true.
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
  it('draws nothing when the switch is off, even with the field served', async () => {
    ;(boardApi.get as any).mockResolvedValue(board({ anchorScenarioOn: false, theMonthBoard: monthBoardFixture }))
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u1', participants: [] })
    renderBoard()
    await screen.findByRole('heading', { name: 'Help my team understand' })
    expect(screen.queryByText('Are we moving together?')).toBeNull()
  })

  it('draws nothing when the switch is on but the field is not served', async () => {
    ;(boardApi.get as any).mockResolvedValue(board({ anchorScenarioOn: true }))
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u1', participants: [] })
    renderBoard()
    await screen.findByRole('heading', { name: 'Help my team understand' })
    expect(screen.queryByText('Are we moving together?')).toBeNull()
  })

  it("draws the engine's own month board when both are true", async () => {
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

  it('draws nothing, even when both are true', async () => {
    ;(boardApi.get as any).mockResolvedValue(board({ anchorScenarioOn: true, theMonthBoard: monthBoardFixture }))
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u1', participants: [] })
    renderBoard()
    await screen.findByRole('heading', { name: 'Help my team understand' })
    expect(screen.queryByText('Are we moving together?')).toBeNull()
  })
})
