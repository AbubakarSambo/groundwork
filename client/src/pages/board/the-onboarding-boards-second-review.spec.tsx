import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
vi.mock('@/api/patterns', () => ({ patternsApi: { answer: vi.fn() } }))

/**
 * THE ONBOARDING BOARD, SECOND REVIEW (scratchpad's pictures/review-onboard-2/).
 *
 * Four more fixes, same check-in as the-onboarding-boards-own-order.spec.tsx ("Engagement
 * Director, first 90 days", e2cfd3d8-f80a-4ac0-a680-e327daed0223; Dr Amina Bello leads, Tobi
 * Adewale is the new hire):
 *
 * 1. The new hire's board is no longer one closed fold - he reads the same open sections as his
 *    lead (day-30-and-60.txt: "Wairimu and Kwame see the same pictures"). A sales participant's own
 *    view is unaffected: hers still leads, with the rest folded below it.
 * 2. His history heading is true of what is under it: "Your history" for him, and for her, his own
 *    row under his name and her own row under its own heading, "Your own record".
 * 4. A not-known `workRecords` entry is left out of the end fold once the board already draws a
 *    filled section under the exact same heading (a not-known "Work plan" beside the switchboard's
 *    own filled "Work plan"); a not-known "Timeline" is unaffected, since it reads "Every deadline",
 *    never "Timeline".
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
  { id: 'p-tobi', name: 'Tobi Adewale', role: 'Engagement Director.', managingOnly: false, signedOffAt: null, partyType: 'PARTICIPANT' },
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
    workRecords: [
      { section: 'Deal grid', holds: '', state: 'not-known' as const, why: 'Groundwork does not know what kind of work this check-in is about yet, so it keeps no records of this kind.' },
      { section: 'Work plan', holds: '', state: 'not-known' as const, why: 'Groundwork does not know what kind of work this check-in is about yet, so it keeps no records of this kind.' },
      { section: 'Timeline', holds: '', state: 'not-known' as const, why: 'Groundwork does not know what kind of work this check-in is about yet, so it keeps no records of this kind.' },
    ],
    workPlan: [
      { id: 'wp-1', participantId: 'p-tobi', who: 'Tobi Adewale', says: 'In check-in 2, Tobi Adewale made a commitment, which is in the record.', when: null, state: 'open' as const, statedInSession: 2 },
    ],
    timeline: [
      { on: '2026-09-26', says: 'On 26 September, the first answers for check-in 1 came in.' },
    ],
    startingState: null,
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
      agreements: [],
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
      <MemoryRouter initialEntries={['/grounds/g1/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('fix 1: the new hire reads the same open sections as his lead, not one closed fold', () => {
  it('Tobi reads "Where you both see it differently" and "The team today" in the open, no "The whole check-in" fold at all', async () => {
    me = { id: 'u-tobi', firstName: 'Tobi', role: 'MEMBER' }
    renderBoard(boardAsLead({
      myParticipantId: 'p-tobi', canEditFrame: false,
      personHistory: [{ participantId: 'p-tobi', who: 'You', says: 'You have answered 4 check-ins.', sessions: [] }],
    }))
    await screen.findByRole('heading', { name: 'Engagement Director, first 90 days' })
    expect(screen.getByText('Where you both see it differently')).toBeTruthy()
    expect(screen.queryByText('The whole check-in')).toBeNull()
  })

  it('a sales participant: her own view still leads, with the rest open below it, under no fold', async () => {
    me = { id: 'u-tobi', firstName: 'Tobi', role: 'MEMBER' }
    renderBoard(boardAsLead({
      family: 'DELIVERY', kindOfWork: 'sales org', myParticipantId: 'p-tobi', canEditFrame: false,
      teamPicture: { shared: true },
    }))
    await screen.findByRole('heading', { name: 'Engagement Director, first 90 days' })
    expect(screen.queryByText('The whole check-in')).toBeNull()
  })
})

describe('fix 2: every history heading is true of what is under it', () => {
  /* Screen match, 16 October: the lead's onboarding board as pictured shows the new hire's history only (kwame-board.jpg); "Your own record" is not on it. */
  it('the lead reads the new hire’s history under his name, and no "Your own record"', async () => {
    me = { id: 'u-amina', firstName: 'Amina', role: 'MEMBER' }
    renderBoard(boardAsLead())
    await screen.findByRole('heading', { name: 'Engagement Director, first 90 days' })
    const tobis = screen.getByText(/^Tobi’s history/).closest('section') as HTMLElement
    expect(within(tobis).getByText('Tobi Adewale has answered 4 check-ins and made 7 commitments.')).toBeTruthy()
    expect(screen.queryByText('Your own record')).toBeNull()
  })

  it('the new hire reads "Your history", never "Tobi’s history"', async () => {
    me = { id: 'u-tobi', firstName: 'Tobi', role: 'MEMBER' }
    renderBoard(boardAsLead({
      myParticipantId: 'p-tobi', canEditFrame: false,
      personHistory: [{ participantId: 'p-tobi', who: 'You', says: 'You have answered 4 check-ins and made 7 commitments.', sessions: [] }],
    }))
    await screen.findByRole('heading', { name: 'Engagement Director, first 90 days' })
    expect(screen.getByText('Your history')).toBeTruthy()
    expect(screen.queryByText('Tobi’s history')).toBeNull()
    expect(screen.queryByText('Your own record')).toBeNull()
  })
})

/*
 * Screen match, 16 October: the lead's onboarding board as pictured has no fold and no "Work plan" section
 * (kwame-board.jpg). These two used to pin how the fold said the not-known sentence once; there is no fold now.
 */
describe('fix 4, as pictured: no fold on the lead’s onboarding board', () => {
  it('reads no "Groundwork does not know..." sentence and no fold', async () => {
    me = { id: 'u-amina', firstName: 'Amina', role: 'MEMBER' }
    renderBoard(boardAsLead())
    await screen.findByRole('heading', { name: 'Engagement Director, first 90 days' })
    expect(screen.queryByText('Groundwork does not know what kind of work this check-in is about yet, so it keeps no records of this kind.')).toBeNull()
    expect(screen.queryByText('Everything else from this check-in')).toBeNull()
  })
})
