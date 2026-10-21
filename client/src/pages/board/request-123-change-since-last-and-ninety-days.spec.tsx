import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
vi.mock('@/api/patterns', () => ({ patternsApi: { answer: vi.fn() } }))

/**
 * REQUEST 123, THE REST: "CHANGE SINCE LAST CHECK-IN" AND "THE 90 DAYS, IN THREE STEPS", AND
 * PATTERNS, ON THE ONBOARDING BOARD (day-30-and-60.txt).
 *
 * `changeSinceLast` goes right after "What was agreed at the start"; `ninetyDays` right after
 * that, before the person's history (docs/answers-from-engine.md, "Request 123" and "Request 123,
 * the rest"). "What keeps coming up" (patterns) and coaching draw the same way the sales and
 * project boards already do - out of the fold, with coaching straight after.
 *
 * Rows below are the engine's own example rows,
 * api/src/modules/board/request-123-change-since-the-last-check-in-as-each-reader-reads-it.spec.ts
 * and api/src/modules/board/request-123-the-ninety-days-as-each-reader-reads-them.spec.ts, read as
 * Amina (the lead) reads them.
 */
const me = { id: 'u-amina', firstName: 'Amina', role: 'MEMBER' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: me }) }))
vi.mock('@/api/board', () => ({
  boardApi: { get: vi.fn() },
  KIND_OF_WORK_OPTIONS: [
    'sales org', 'engineering release', 'support desk', 'distribution operations',
    'trader training programme', "founder's own check-in", 'asset loans',
    'MarketView where next', 'MarketView Q4', 'a law firm matter', 'a government programme',
  ],
}))
vi.mock('@/api/grounds', () => ({
  groundsApi: { get: vi.fn().mockResolvedValue({ initiatorId: 'u-amina', leadFirstName: 'Amina', cadence: 'WEEKLY' }) },
}))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))
vi.mock('@/components/gw/Suggestions', () => ({ SuggestionsForTheLead: () => null }))

const PARTICIPANTS = [
  { id: 'p-amina', name: 'Amina Bello', role: null, managingOnly: false, signedOffAt: null, partyType: 'INITIATOR' },
  { id: 'p-tobi', name: 'Tobi Adewale', role: 'Engagement Director.', managingOnly: false, signedOffAt: null, partyType: 'PARTICIPANT' },
]

const NOT_KNOWN_WORK_RECORDS = [
  { section: 'Deal grid', holds: '', state: 'not-known' as const, why: 'Groundwork does not know what kind of work this check-in is about yet, so it keeps no records of this kind.' },
  { section: 'Forecast', holds: '', state: 'not-known' as const, why: 'Groundwork does not know what kind of work this check-in is about yet, so it keeps no records of this kind.' },
  { section: 'Themes', holds: '', state: 'not-known' as const, why: 'Groundwork does not know what kind of work this check-in is about yet, so it keeps no records of this kind.' },
]

const CHANGE_SINCE_LAST = {
  heading: 'Change since last check-in',
  between: 'Between session 2 and session 3.',
  rows: [
    { area: 'Commitments', state: 'late' as const, says: 'Tobi Adewale made 1 commitment in session 3. Of Tobi Adewale\'s commitments, 1 was marked done since session 2. Tobi Adewale still has 1 commitment open from before session 2.', kind: 'commitments' as const },
    { area: 'Waits', state: 'late' as const, says: 'Tobi Adewale is waiting on you for the commercial terms for each client, and has been since 2 September. The wait for access to the client folders was cleared on 15 September.', kind: 'waits' as const },
    { area: 'Know the five biggest clients', state: 'late' as const, says: 'This goal was due on 10 September and is still open.', kind: 'goal' as const },
    { area: 'Lead a renewal conversation', state: 'moved' as const, says: 'This goal was marked met between session 2 and session 3.', kind: 'goal' as const },
    { area: 'Own all five clients', state: 'held' as const, says: 'Nothing has changed on this goal between session 2 and session 3.', kind: 'goal' as const },
  ],
}

const NINETY_DAYS = {
  heading: 'The 90 days, in three steps',
  steps: [
    { step: 1, day: 30, question: 'Is Tobi Adewale settled in?', says: '2 goals were agreed for Tobi Adewale to be met by day 30. 1 is marked met and 1 is still open. Tobi Adewale has made 2 commitments so far, and 1 is marked done.', reached: true },
    { step: 2, day: 60, question: 'Is Tobi Adewale doing the job?', says: 'This step comes on 30 October. 1 goal was agreed for Tobi Adewale to be met by day 60. It is still open.', reached: false },
    { step: 3, day: 90, question: 'What you need to decide', says: 'This step comes on 29 November. 1 goal was agreed for Tobi Adewale to be met by day 90. It is still open.', reached: false },
  ],
}

function boardAsLead(overrides: any = {}) {
  return {
    groundId: 'g1', renders: true, mode: 'SHARED', family: 'ONBOARDING', sections: ['startingState', 'divergence', 'decisions', 'patterns'],
    title: 'Engagement Director, first 90 days', scenario: 'NEW_HIRE', coverageVariant: 'text',
    lastChangedAt: '2026-09-26T19:12:00.000Z',
    participants: PARTICIPANTS,
    myParticipantId: 'p-amina', canEditFrame: true, readOnlyNote: null,
    kindOfWork: null,
    workRecords: NOT_KNOWN_WORK_RECORDS,
    startingState: null,
    changeSinceLast: CHANGE_SINCE_LAST,
    ninetyDays: NINETY_DAYS,
    personHistory: [
      { participantId: 'p-amina', who: 'You', says: 'You have answered 4 sessions.', sessions: [] },
      { participantId: 'p-tobi', who: 'Tobi Adewale', says: 'Tobi Adewale has answered 4 sessions and made 7 commitments.', sessions: [] },
    ],
    divergence: { items: [], agreements: [], whyNothingYet: 'Nothing has come up yet where you see it differently.' },
    decisions: [],
    teamPicture: undefined,
    phaseSpine: undefined,
    howItIsGoing: { latestSummary: null, glance: null },
    patterns: [],
    coaching: { yours: null, eachPerson: null },
    ...overrides,
  }
}

function renderBoard(payload: any) {
  ;(boardApi.get as any).mockResolvedValue(payload)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('"Change since last check-in" and "The 90 days, in three steps" (request 123)', () => {
  it('draws the heading, the between line, and one row per area with its tag and sentence', async () => {
    renderBoard(boardAsLead())
    await screen.findByRole('heading', { name: 'Engagement Director, first 90 days' })

    expect(screen.getByText('Change since last check-in')).toBeTruthy()
    expect(screen.getByText('Between session 2 and session 3.')).toBeTruthy()
    // Screen match: "Commitments" is also a line of the person's history now (kwame-board.jpg).
    expect(screen.getAllByText('Commitments').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Late').length).toBeGreaterThan(0)
    expect(screen.getByText('Moved')).toBeTruthy()
    expect(screen.getByText('Held')).toBeTruthy()
    expect(screen.getByText(/Tobi Adewale made 1 commitment in session 3\./)).toBeTruthy()
    expect(screen.getByText('This goal was marked met between session 2 and session 3.')).toBeTruthy()
  })

  it('draws "The 90 days, in three steps" with each step\'s question as a heading and its sentence under it', async () => {
    renderBoard(boardAsLead())
    await screen.findByRole('heading', { name: 'Engagement Director, first 90 days' })

    expect(screen.getByText('The 90 days, in three steps')).toBeTruthy()
    // Screen match, 16 October: each step reads as kwame-board.jpg has it, "After 30 days: is ... settled in?".
    expect(screen.getByText('After 30 days: is Tobi Adewale settled in?')).toBeTruthy()
    expect(screen.getByText('After 60 days: is Tobi Adewale doing the job?')).toBeTruthy()
    expect(screen.getByText('After 90 days: what you need to decide')).toBeTruthy()
    expect(screen.getByText(/2 goals were agreed for Tobi Adewale to be met by day 30\./)).toBeTruthy()
    expect(screen.getByText(/This step comes on 30 October\./)).toBeTruthy()
  })

  it('draws "You and Tobi see the same pictures." to the lead (first names, as kwame-board.jpg has them), not the prototype\'s own Wairimu and Kwame', async () => {
    renderBoard(boardAsLead())
    await screen.findByRole('heading', { name: 'Engagement Director, first 90 days' })
    expect(screen.getByText('You and Tobi see the same pictures.')).toBeTruthy()
    expect(screen.queryByText(/Wairimu/)).toBeNull()
    expect(screen.queryByText(/Kwame/)).toBeNull()
  })

  it('draws "You and Amina see the same pictures." to the new hire, with the lead\'s first name', async () => {
    me.id = 'u-tobi'
    renderBoard(boardAsLead({ myParticipantId: 'p-tobi' }))
    await screen.findByRole('heading', { name: 'Engagement Director, first 90 days' })
    expect(screen.getByText('You and Amina see the same pictures.')).toBeTruthy()
    me.id = 'u-amina'
  })

  it('leaves the line out, rather than guessing, when the other person\'s name is not to hand', async () => {
    renderBoard(boardAsLead({ participants: [{ ...PARTICIPANTS[0] }] }))
    await screen.findByRole('heading', { name: 'Engagement Director, first 90 days' })
    expect(screen.getByText('The 90 days, in three steps')).toBeTruthy()
    expect(screen.queryByText(/see the same pictures/)).toBeNull()
  })

  it('places "Change since last check-in" right after "What was agreed at the start" and "The 90 days" right after that, before the person\'s history', async () => {
    renderBoard(boardAsLead({ startingState: { heading: 'What was agreed at the start', rows: [] } }))
    await screen.findByRole('heading', { name: 'Engagement Director, first 90 days' })
    const main = document.body.textContent ?? ''
    const iAgreed = main.indexOf('What was agreed at the start')
    const iChange = main.indexOf('Change since last check-in')
    const iNinety = main.indexOf('The 90 days, in three steps')
    const iHistory = main.indexOf('Tobi Adewale has answered 4 sessions')
    expect(iAgreed).toBeGreaterThan(-1)
    expect(iAgreed).toBeLessThan(iChange)
    expect(iChange).toBeLessThan(iNinety)
    expect(iNinety).toBeLessThan(iHistory)
  })

  it('draws nothing of "Change since last check-in" or "The 90 days" when the server sends neither', async () => {
    renderBoard(boardAsLead({ changeSinceLast: undefined, ninetyDays: undefined }))
    await screen.findByRole('heading', { name: 'Engagement Director, first 90 days' })
    expect(screen.queryByText('Change since last check-in')).toBeNull()
    expect(screen.queryByText('The 90 days, in three steps')).toBeNull()
  })

  /*
   * SCREEN MATCH, 16 OCTOBER: THE ONBOARDING BOARD AS PICTURED (kwame-board.jpg) HAS NO "WHAT KEEPS COMING UP" AND
   * NO COACHING FOR THE LEAD. Was: both drawn out of the fold. What keeps coming up about the new hire is on their own
   * page (one person's page, person-page.jpg), opened from the board. Listed for Hafsah in the morning report.
   */
  it('draws no "What keeps coming up" on the lead’s onboarding board as pictured', async () => {
    renderBoard(boardAsLead({
      patterns: [{ id: 'pt-1', participantId: 'p-tobi', code: 'A2', about: 'the work', yours: false, says: 'Tobi raises blockers late in the week.', who: 'Tobi Adewale' }],
    }))
    await screen.findByRole('heading', { name: 'Engagement Director, first 90 days' })
    expect(screen.queryByText('What keeps coming up')).toBeNull()
  })
})
