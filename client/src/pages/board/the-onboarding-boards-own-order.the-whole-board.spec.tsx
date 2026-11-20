/* THE WHOLE BOARD, AS IT WAS (screen match, 16 October): this file's assertions as they stood before the board was drawn as pictured, now read on "See every other part of this board" (?whole=1), so nothing the picture leaves out is lost. */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
vi.mock('@/api/patterns', () => ({ patternsApi: { answer: vi.fn() } }))

/**
 * THE ONBOARDING BOARD (ONBOARDING family), AS EACH READER READS IT.
 *
 * Modelled on the real check-in "Engagement Director, first 90 days"
 * (e2cfd3d8-f80a-4ac0-a680-e327daed0223): Dr Amina Bello leads it, Tobi Adewale is the new hire,
 * `kindOfWork` is not set, and the engine has not yet built a `teamPicture` for this family
 * (request 123). Reads the rendered board for the lead and for the new hire - the prototype's own
 * order (day-30-and-60.txt), not only the server's data.
 */
let me = { id: 'u-amina', firstName: 'Amina', role: 'MEMBER' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: me }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({
  groundsApi: {
    get: vi.fn().mockResolvedValue({ initiatorId: 'u-amina', leadFirstName: 'Dr', cadence: 'FORTNIGHTLY' }),
  },
}))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))
vi.mock('@/components/gw/Suggestions', () => ({ SuggestionsForTheLead: () => null }))

const PARTICIPANTS = [
  { id: 'p-amina', name: 'Dr Amina Bello', role: null, managingOnly: false, signedOffAt: null, partyType: 'INITIATOR' },
  { id: 'p-tobi', name: 'Tobi Adewale', role: 'Engagement Director. Owns the relationships with the five largest clients.', managingOnly: false, signedOffAt: null, partyType: 'PARTICIPANT' },
]

const NOT_KNOWN_WORK_RECORDS = [
  { section: 'Deal grid', holds: '', state: 'not-known' as const, why: 'Groundwork does not know what kind of work this check-in is about yet, so it keeps no records of this kind.' },
  { section: 'Forecast', holds: '', state: 'not-known' as const, why: 'Groundwork does not know what kind of work this check-in is about yet, so it keeps no records of this kind.' },
  { section: 'Themes', holds: '', state: 'not-known' as const, why: 'Groundwork does not know what kind of work this check-in is about yet, so it keeps no records of this kind.' },
]

const PHASE_SPINE_BETWEEN_ROUNDS = {
  startsAt: null, endsAt: null, currentSession: 4, plannedSessions: 6,
  sessions: [
    { n: 4, state: 'done', date: '2026-09-26T16:12:36.813Z', opensOn: null, says: 'Check-in 4 finished on 26 September.' },
    { n: 5, state: 'upcoming', date: null, opensOn: '2026-10-12T16:11:17.452Z', says: 'Check-in 5 opens on 12 October.' },
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
    startingState: 'Tobi owns the five largest client relationships.',
    personHistory: [
      { participantId: 'p-amina', who: 'You', says: 'You have answered 4 check-ins.', sessions: [] },
      { participantId: 'p-tobi', who: 'Tobi Adewale', says: 'Tobi Adewale has answered 4 check-ins and made 7 commitments.', sessions: [] },
    ],
    divergence: {
      items: [{
        topic: "The definition of what it means to 'own' a client relationship.",
        positions: [{ who: 'You', view: 'A broad remit.' }, { who: 'Tobi Adewale', view: 'Client satisfaction only.' }],
        atStake: 'The commercial future could be left unowned.',
      }],
      agreements: ['The role exists to manage the five largest clients.'],
      whyNothingYet: null,
    },
    decisions: [{ question: 'Give Tobi Adewale an answer on the commercial terms.', why: null, owner: null, action: null, source: 'other' }],
    teamPicture: undefined,
    phaseSpine: PHASE_SPINE_BETWEEN_ROUNDS,
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

describe('the onboarding board’s own order (day-30-and-60.txt)', () => {
  it('draws "What was agreed at the start", the new hire’s history and "Where you both see it differently" right after "What needs you", in that order', async () => {
    me = { id: 'u-amina', firstName: 'Amina', role: 'MEMBER' }
    renderBoard(boardAsLead())
    await screen.findByRole('heading', { name: 'Engagement Director, first 90 days' })

    expect(screen.getByText('What was agreed at the start')).toBeTruthy()
    expect(screen.getByText('Tobi owns the five largest client relationships.')).toBeTruthy()
    /* The prototype's "His history" names no pronoun - the new hire's own first name instead. */
    expect(screen.getByText('Tobi’s history')).toBeTruthy()
    expect(screen.queryByText('What each person has done so far')).toBeNull()
    expect(screen.getByText('Where you both see it differently')).toBeTruthy()
    expect(screen.queryByText('Where people differ')).toBeNull()

    const body = document.body.textContent ?? ''
    const needsYou = body.indexOf('What needs you in this check-in')
    const startingState = body.indexOf('What was agreed at the start')
    const history = body.indexOf('Tobi’s history')
    const divergence = body.indexOf('Where you both see it differently')
    expect(needsYou).toBeGreaterThanOrEqual(0)
    expect(startingState).toBeGreaterThan(needsYou)
    expect(history).toBeGreaterThan(startingState)
    expect(divergence).toBeGreaterThan(history)
  })

  /*
   * PHONE CHECK, ITEM 8: SAID ONCE, NOT AS THREE (OR FIVE) NEAR-IDENTICAL HEADINGS. This used to
   * assert the opposite - "Deal grid", "Forecast" and "Themes" each drawn as their own heading in
   * the fold, the same stock sentence repeated under each - which is exactly the bug the phone
   * check found: a reader sees the same "Groundwork does not know what kind of work..." sentence
   * three or five times in a row. Updated to check the one sentence it now reads, and that none of
   * the raw switchboard names appear as a heading beside it.
   */
  it('says once, with no heading, that Groundwork does not know what kind of work this check-in is about, when every work record is not-known', async () => {
    me = { id: 'u-amina', firstName: 'Amina', role: 'MEMBER' }
    renderBoard(boardAsLead())
    await screen.findByRole('heading', { name: 'Engagement Director, first 90 days' })
    const fold = document.body as HTMLElement
    expect(within(fold).getByText('Groundwork does not know what kind of work this check-in is about yet, so it keeps no records of this kind.')).toBeTruthy()
    expect(within(fold).queryByText('Deal grid')).toBeNull()
    expect(within(fold).queryByText('Forecast')).toBeNull()
    expect(within(fold).queryByText('Themes')).toBeNull()
  })

  it('keeps a work-record section with real rows exactly where it was, not in the fold', async () => {
    me = { id: 'u-amina', firstName: 'Amina', role: 'MEMBER' }
    renderBoard(boardAsLead({
      workRecords: [
        ...NOT_KNOWN_WORK_RECORDS,
        { section: 'Work plan', holds: 'commitments and decisions', state: 'filled' as const, rows: [
          { id: 'w-1', kind: 'commitment', name: 'Empower Tobi on pricing', stage: null, owner: 'Dr Amina Bello', ownerParticipantId: 'p-amina', due: null, fields: {}, from: 'lead' as const },
        ] },
      ],
    }))
    await screen.findByRole('heading', { name: 'Engagement Director, first 90 days' })
    expect(screen.getByText('Empower Tobi on pricing')).toBeTruthy()
  })

  it('never offers the team-picture panel when the engine sends no teamPicture at all', async () => {
    me = { id: 'u-tobi', firstName: 'Tobi', role: 'MEMBER' }
    renderBoard(boardAsLead({ myParticipantId: 'p-tobi', canEditFrame: false }))
    await screen.findByRole('heading', { name: 'Engagement Director, first 90 days' })
    expect(screen.queryByText(/team picture/i)).toBeNull()
  })

  it('leaves out "Your own items, day by day" and "Your share" for a kind of work other than sales', async () => {
    me = { id: 'u-tobi', firstName: 'Tobi', role: 'MEMBER' }
    renderBoard(boardAsLead({
      myParticipantId: 'p-tobi', canEditFrame: false,
      yourShare: [{ objectiveId: 'o1', says: 'Should never show.', whoSees: 'Nobody.' }],
    }))
    await screen.findByRole('heading', { name: 'Engagement Director, first 90 days' })
    expect(screen.queryByText(/Your own .* day by day/i)).toBeNull()
    expect(screen.queryByText('Your share')).toBeNull()
    expect(screen.queryByText('Should never show.')).toBeNull()
  })

  it('the header names both people, the reader first, for the lead and for the new hire', async () => {
    me = { id: 'u-amina', firstName: 'Amina', role: 'MEMBER' }
    renderBoard(boardAsLead())
    await screen.findByRole('heading', { name: 'Engagement Director, first 90 days' })
    expect(screen.getByText(/^Tobi Adewale and you\./)).toBeTruthy()

    me = { id: 'u-tobi', firstName: 'Tobi', role: 'MEMBER' }
    renderBoard(boardAsLead({ myParticipantId: 'p-tobi', canEditFrame: false }))
    await screen.findByRole('heading', { name: 'Engagement Director, first 90 days' })
    expect(screen.getByText(/^You and Dr\./)).toBeTruthy()
  })

  it('does not offer "Start my check-in" to the new hire while no session is open, and reads when the next one opens instead', async () => {
    me = { id: 'u-tobi', firstName: 'Tobi', role: 'MEMBER' }
    renderBoard(boardAsLead({ myParticipantId: 'p-tobi', canEditFrame: false }))
    await screen.findByRole('heading', { name: 'Engagement Director, first 90 days' })
    expect(screen.queryByText('Start my check-in')).toBeNull()
    expect(screen.getByText('Check-in 5 opens on 12 October.')).toBeTruthy()
  })

  it('still offers the lead "Your check-in" between rounds - she always has something to do', async () => {
    me = { id: 'u-amina', firstName: 'Amina', role: 'MEMBER' }
    renderBoard(boardAsLead())
    await screen.findByRole('heading', { name: 'Engagement Director, first 90 days' })
    expect(screen.getByText('Your check-in')).toBeTruthy()
  })
})
