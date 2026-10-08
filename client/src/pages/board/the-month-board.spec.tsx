import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
import { groundsApi } from '@/api/grounds'
import { recommendedCheckInsApi } from '@/api/recommendedCheckIns'

/**
 * PIECES 12, 13 AND 20: "ARE WE MOVING TOGETHER?" (anchor plan section 5, row 6). Lead only.
 *
 * UPDATED FOR DECISION 114 (docs/decisions-merged.md; docs/answers-from-engine.md, "8 October
 * (later): the anchor through the ordinary routes, route by route", and "8 October (evening): the
 * anchor's last month parts are board sections"): "who reads a section is now decided by the
 * server." `BoardPage.tsx` no longer reads `theMonthBoard` at all - it draws whatever of
 * `theFourLenses`, `whereTheMonthIs`, `whatIsMoving`, `whatTheTeamIsContributing`,
 * `peopleHelpingTheTeamMove`, `wherePerspectivesDiffer`, `whatIsStillInTheWay` and
 * `whatGroundworkIsWorkingOnNext` the switchboard's own `sections` list names, trusting that the
 * engine only ever fills them for whoever runs the check-in. So the two old tests that handed the
 * lead `theMonthBoard` alongside `anchorScenarioOn: false`, or handed a colleague one at all, are
 * gone - replaced below by the realistic shape of each reader's own payload: the sections simply
 * absent when they are not theirs to read (the same move already made in
 * the-month-board-comes-before-ideas.spec.tsx and the-end-of-month-read-on-the-ending-page.spec.tsx).
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

const MONTH_SECTION_NAMES = ['theFourLenses', 'whereTheMonthIs', 'whatIsMoving']

const monthFields = {
  theFourLenses: {
    heading: 'The four lenses',
    question: 'Are we moving together?',
    lenses: [
      { key: 'understanding', heading: 'Understanding', question: 'Do people see the bigger picture?', reading: 'Most of the team now connects their own work to the wider outcome.' },
    ],
  },
  whereTheMonthIs: { heading: 'Where the month is', weekOfTheMonth: 2, text: 'Week 2 of the month' },
  whatIsMoving: { heading: "What's moving", items: ['Omar connected a project delay to a renewal risk.'] },
}

const board = (opts?: { anchorScenarioOn?: boolean; withMonthSections?: boolean }) => ({
  groundId: 'g1',
  renders: true,
  mode: 'SHARED',
  family: 'UPDATE',
  sections: opts?.withMonthSections ? MONTH_SECTION_NAMES : [],
  title: 'Help my team understand',
  scenario: null,
  coverageVariant: 'NONE',
  myParticipantId: 'p1',
  canEditFrame: false,
  readOnlyNote: '',
  eachPerson: [],
  anchorScenarioOn: opts?.anchorScenarioOn ?? false,
  ...(opts?.withMonthSections ? monthFields : {}),
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

describe('the month board sections, for the lead', () => {
  it('draws nothing when no section is served (the switch off, or any other check-in)', async () => {
    ;(boardApi.get as any).mockResolvedValue(board({ anchorScenarioOn: false, withMonthSections: false }))
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u1', participants: [] })
    renderBoard()
    await screen.findByRole('heading', { name: 'Help my team understand' })
    expect(screen.queryByText('Are we moving together?')).toBeNull()
  })

  it("draws the engine's own month sections whenever the payload carries them", async () => {
    ;(boardApi.get as any).mockResolvedValue(board({ anchorScenarioOn: true, withMonthSections: true }))
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u1', participants: [] })
    renderBoard()
    expect(await screen.findByText('Are we moving together?')).toBeTruthy()
    expect(screen.getByText('Week 2 of the month')).toBeTruthy()
    expect(screen.getByText('Omar connected a project delay to a renewal risk.')).toBeTruthy()
  })
})

describe('the month board sections, for a participant, not the lead', () => {
  beforeEach(() => {
    currentUser = { id: 'u2', firstName: 'Kennedy', role: 'MEMBER' }
  })

  it('draws nothing: a colleague’s own payload never carries the month sections, which the server alone decides', async () => {
    /* The realistic shape of a colleague's own board answer (the-anchor-sections-on-the-board.ts:
       these sections are only ever filled on the lead's own read) - the privacy intent this spec
       has always pinned, now checked against the payload itself rather than against a client-side
       reader flag. */
    ;(boardApi.get as any).mockResolvedValue(board({ anchorScenarioOn: true, withMonthSections: false }))
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u1', participants: [] })
    renderBoard()
    await screen.findByRole('heading', { name: 'Help my team understand' })
    expect(screen.queryByText('Are we moving together?')).toBeNull()
  })
})
