/* THE WHOLE BOARD, AS IT WAS (screen match, 16 October): this file's assertions as they stood before the board was drawn as pictured, now read on "See every other part of this board" (?whole=1), so nothing the picture leaves out is lost. */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
vi.mock('@/api/patterns', () => ({ patternsApi: { answer: vi.fn() } }))

/**
 * REQUEST 123: `startingState` AS AN OBJECT ON THE ONBOARDING BOARD.
 *
 * The engine now sends `startingState` as an object on the onboarding board (`family ===
 * 'ONBOARDING'`) - "What was agreed at the start", its rows grouped by the step of the first 90
 * days they fall due in (docs/answers-from-engine.md, "Request 123"; day-30-and-60.txt). Every
 * other board still gets the plain sentence this field used to be everywhere, or null.
 *
 * Rows below are the same example rows as the engine's own test,
 * api/src/modules/board/request-123-what-was-agreed-at-the-start-as-each-reader-reads-it.spec.ts,
 * read as Amina (the lead) reads them.
 */
const me = { id: 'u-amina', firstName: 'Amina', role: 'MEMBER' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: me }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({
  groundsApi: { get: vi.fn().mockResolvedValue({ initiatorId: 'u-amina', leadFirstName: 'Dr', cadence: 'FORTNIGHTLY' }) },
}))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))
vi.mock('@/components/gw/Suggestions', () => ({ SuggestionsForTheLead: () => null }))

const PARTICIPANTS = [
  { id: 'p-amina', name: 'Dr Amina Bello', role: null, managingOnly: false, signedOffAt: null, partyType: 'INITIATOR' },
  { id: 'p-tobi', name: 'Tobi Adewale', role: 'Engagement Director.', managingOnly: false, signedOffAt: null, partyType: 'PARTICIPANT' },
]

const NOT_KNOWN_WORK_RECORDS = [
  { section: 'Deal grid', holds: '', state: 'not-known' as const, why: 'Groundwork does not know what kind of work this check-in is about yet, so it keeps no records of this kind.' },
  { section: 'Forecast', holds: '', state: 'not-known' as const, why: 'Groundwork does not know what kind of work this check-in is about yet, so it keeps no records of this kind.' },
  { section: 'Themes', holds: '', state: 'not-known' as const, why: 'Groundwork does not know what kind of work this check-in is about yet, so it keeps no records of this kind.' },
]

const STARTING_STATE_OBJECT = {
  heading: 'What was agreed at the start',
  rows: [
    { when: 'Day 1', whose: 'Tobi Adewale', says: 'In session 1, Tobi Adewale said, "I will read the contract for each of the five clients."', what: null, kind: 'commitment' },
    { when: 'By day 30', whose: 'Tobi Adewale', says: 'A goal was agreed for Tobi Adewale, to be met by day 30.', what: 'Know the five biggest clients and what each one buys', kind: 'goal' },
    { when: 'By day 90', whose: 'Tobi Adewale', says: 'A goal was agreed for Tobi Adewale, to be met by day 90.', what: 'Own the relationship with all five clients', kind: 'goal' },
  ],
}

function boardAsLead(overrides: any = {}) {
  return {
    groundId: 'g1', renders: true, mode: 'SHARED', family: 'ONBOARDING', sections: ['startingState', 'divergence', 'decisions'],
    title: 'Engagement Director, first 90 days', scenario: 'NEW_HIRE', coverageVariant: 'text',
    lastChangedAt: '2026-09-26T19:12:00.000Z',
    participants: PARTICIPANTS,
    myParticipantId: 'p-amina', canEditFrame: true, readOnlyNote: null,
    kindOfWork: null,
    workRecords: NOT_KNOWN_WORK_RECORDS,
    startingState: STARTING_STATE_OBJECT,
    personHistory: [
      { participantId: 'p-amina', who: 'You', says: 'You have answered 4 sessions.', sessions: [] },
      { participantId: 'p-tobi', who: 'Tobi Adewale', says: 'Tobi Adewale has answered 4 sessions and made 7 commitments.', sessions: [] },
    ],
    divergence: { items: [], agreements: [], whyNothingYet: 'Nothing has come up yet where you see it differently.' },
    decisions: [],
    teamPicture: undefined,
    phaseSpine: undefined,
    howItIsGoing: { latestSummary: null, glance: null },
    ...overrides,
  }
}

function renderBoard(payload: any) {
  ;(boardApi.get as any).mockResolvedValue(payload)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/board?whole=1']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('"What was agreed at the start" as an object (request 123)', () => {
  it('draws the heading, each step that has rows, each row’s sentence, and the goal’s own words underneath', async () => {
    renderBoard(boardAsLead())
    await screen.findByRole('heading', { name: 'Engagement Director, first 90 days' })

    expect(screen.getByText('What was agreed at the start')).toBeTruthy()
    expect(screen.getByText('Day 1')).toBeTruthy()
    expect(screen.getByText('By day 30')).toBeTruthy()
    expect(screen.getByText('By day 90')).toBeTruthy()
    /* Only steps that have a row draw a step heading. */
    expect(screen.queryByText('By day 60')).toBeNull()
    expect(screen.queryByText('After day 90')).toBeNull()

    expect(screen.getByText('In session 1, Tobi Adewale said, "I will read the contract for each of the five clients."')).toBeTruthy()
    expect(screen.getByText('A goal was agreed for Tobi Adewale, to be met by day 30.')).toBeTruthy()
    expect(screen.getByText('Know the five biggest clients and what each one buys')).toBeTruthy()
    expect(screen.getByText('A goal was agreed for Tobi Adewale, to be met by day 90.')).toBeTruthy()
    expect(screen.getByText('Own the relationship with all five clients')).toBeTruthy()
  })

  it('still draws the plain sentence, unchanged, when another board sends it as a string', async () => {
    renderBoard(boardAsLead({ family: 'DELIVERY', scenario: 'OKR_ALIGNMENT', startingState: 'Agreed to close 12 sales by the end of the quarter.' }))
    await screen.findByRole('heading', { name: 'Engagement Director, first 90 days' })
    expect(screen.getByText('What was agreed at the start')).toBeTruthy()
    expect(screen.getByText('Agreed to close 12 sales by the end of the quarter.')).toBeTruthy()
    expect(screen.queryByText('Day 1')).toBeNull()
  })

  it('draws nothing when there is nothing agreed yet (null)', async () => {
    renderBoard(boardAsLead({ startingState: null }))
    await screen.findByRole('heading', { name: 'Engagement Director, first 90 days' })
    expect(screen.queryByText('What was agreed at the start')).toBeNull()
  })
})
