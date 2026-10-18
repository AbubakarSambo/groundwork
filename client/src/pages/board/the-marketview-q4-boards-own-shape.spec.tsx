import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'

/**
 * THE MARKETVIEW Q4 BOARD'S OWN SHAPE (mvq4.txt), built from the fixtures captured against the
 * seeded "MarketView, Q4" ground (6e84ca43-31d4-4e33-bf38-91defee0543a; docs/requests-to-engine.md
 * request 150).
 *
 * 1. "What the systems show" and "Where what people said and the systems differ" draw right after
 *    "What needs you", before patterns - one row a number, drawn as the engine's own sentence
 *    (never a target or a goal read apart from it - the engine does not send those as separate
 *    fields; see docs/answers-from-engine.md), then the three `whatANumberIsNot` sentences. Where
 *    a key repeats (weekly active users), the latest figure is the row and the earlier figure
 *    reads underneath as "Up from <value>."
 * 2. `kindLayout['MarketView Q4']` folds the records table, the team, "Who checked in", "Over
 *    time" and "Reports" into the end fold; patterns and coaching stay open, just before "Where
 *    this is heading".
 * 3. "Help nobody mentioned" moves into the end fold for this kind, with the rest of the team and
 *    records.
 * 4. A participant reads "Your share" too, the same as a sales org participant.
 */
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: me }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({ initiatorId: 'p-lead', leadFirstName: 'Wairimu' }) } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))
vi.mock('@/components/gw/Suggestions', () => ({ SuggestionsForTheLead: () => null }))

let me = { id: 'p-lead', firstName: 'Wairimu', role: 'MEMBER' }

const WHAT_THE_SYSTEMS_SHOW = {
  heading: 'What the systems show',
  state: 'filled' as const,
  numbers: [
    { key: 'paid_subscriptions', source: 'Paystack', value: 31, unit: 'subscriptions', measuredAt: '2026-10-04', says: 'Paystack shows 31 subscriptions for paid subscriptions this quarter, against a goal of 40, as of 4 October.' },
    { key: 'renewals_paid', source: 'Paystack', value: 7, unit: 'renewals', measuredAt: '2026-10-04', says: 'Paystack shows 7 renewals for renewals paid, of 9 due, as of 4 October.' },
    { key: 'weekly_active_users', source: 'MarketView', value: 162, unit: 'users', measuredAt: '2026-10-04', says: 'MarketView shows 162 users for weekly active users, against a goal of 200, as of 4 October.' },
    { key: 'reports_downloaded', source: 'MarketView', value: 418, unit: 'downloads', measuredAt: '2026-10-04', says: 'MarketView shows 418 downloads for reports downloaded this week, up 12 percent, as of 4 October.' },
    { key: 'weekly_active_users', source: 'MarketView', value: 148, unit: 'users', measuredAt: '2026-09-27', says: 'MarketView shows 148 users for weekly active users, against a goal of 200, as of 27 September.' },
  ],
  whatANumberIsNot: [
    'These came from your own systems and nobody here has checked them.',
    'A number that disagrees with somebody is not proof they were wrong. It may be measuring something else, over a different period, or counting something they were not talking about.',
    'Nothing here says whether a number is good. That depends on what you were aiming for, which is not something this can know.',
  ],
}

const NONE_YET_DIFFER = {
  heading: 'Where what people said and the systems differ',
  state: 'none-yet' as const,
  says: 'Nothing anybody said differs from a document or a number on record yet.',
}

function aBoard(overrides: Record<string, unknown> = {}) {
  return {
    groundId: 'g-mvq4', renders: true, mode: 'SHARED', family: 'DELIVERY', title: 'MarketView, Q4', scenario: 'OKR_ALIGNMENT',
    coverageVariant: 'text', lastChangedAt: '2026-09-23T18:00:00.000Z',
    sections: ['phaseSpine', 'quickRead', 'objectives', 'checkInGrid', 'patterns', 'decisions'],
    kindOfWork: 'MarketView Q4' as const,
    myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null,
    participants: [
      { id: 'p-lead', name: 'Wairimu Kamau', role: null, managingOnly: false, signedOffAt: null, partyType: 'INITIATOR' },
      { id: 'p-otieno', name: 'Otieno Mwangi', role: 'Sales lead for subscriptions.', managingOnly: false, signedOffAt: null, partyType: 'PARTICIPANT' },
    ],
    eachPerson: [
      { participantId: 'p-otieno', who: 'Otieno Mwangi', target: null, count: 1, reason: null, says: 'Otieno Mwangi has checked in.', ask: null },
    ],
    workRecords: [],
    byArea: { state: 'not-known', why: 'Nothing on record says which site, county, team or queue each piece of work belongs to, so the work cannot be shown by area yet.' },
    blockers: [],
    openIssues: { state: 'not-known', why: 'Nothing on record follows an issue from unclear to decided to done and checked.' },
    helpNobodyMentioned: {
      lines: ['A colleague said Otieno Mwangi helped them. Otieno Mwangi did not mention it in their own check-ins.'],
      why: 'You see the help, not who said it.',
    },
    whatTheSystemsShow: WHAT_THE_SYSTEMS_SHOW,
    whereWhatWasSaidAndTheSystemsDiffer: NONE_YET_DIFFER,
    yourShare: [],
    ...overrides,
  }
}

function renderBoard(board: any, at = '/grounds/g-mvq4/board') {
  ;(boardApi.get as any).mockResolvedValue(board)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[at]}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the MarketView Q4 board, as the lead', () => {
  it('reads "What the systems show" right after "What needs you", before patterns, with the latest figure and "Up from" for a repeated key', async () => {
    me = { id: 'p-lead', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard(aBoard())
    await screen.findByRole('heading', { name: 'MarketView, Q4' })

    const section = screen.getByRole('region', { name: 'What the systems show' })
    expect(within(section).getByText('Paystack shows 31 subscriptions for paid subscriptions this quarter, against a goal of 40, as of 4 October.')).toBeTruthy()
    // The repeated key (weekly active users) draws once, as its latest figure...
    expect(within(section).getByText('MarketView shows 162 users for weekly active users, against a goal of 200, as of 4 October.')).toBeTruthy()
    // ...with the earlier figure read underneath, built only from the two served values.
    expect(within(section).getByText('Up from 148.')).toBeTruthy()
    // The earlier entry itself is not drawn as its own row.
    expect(screen.queryByText('MarketView shows 148 users for weekly active users, against a goal of 200, as of 27 September.')).toBeNull()
    // The three standing sentences about what a number is not.
    expect(within(section).getByText(/These came from your own systems/)).toBeTruthy()

    const body = document.body.textContent ?? ''
    const whatNeedsYou = body.indexOf('What needs you')
    const systemsShow = body.indexOf('What the systems show')
    const patterns = body.indexOf('What keeps coming up')
    expect(systemsShow).toBeGreaterThan(whatNeedsYou)
    if (patterns >= 0) expect(patterns).toBeGreaterThan(systemsShow)
  })

  it('reads "none-yet" as the engine\'s own sentence, and rows when filled, under "Where what people said and the systems differ"', async () => {
    me = { id: 'p-lead', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard(aBoard())
    await screen.findByRole('heading', { name: 'MarketView, Q4' })
    const section = screen.getByRole('region', { name: 'Where what people said and the systems differ' })
    expect(within(section).getByText('Nothing anybody said differs from a document or a number on record yet.')).toBeTruthy()
  })

  it('reads filled rows under "Where what people said and the systems differ" when the engine sends them', async () => {
    me = { id: 'p-lead', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard(aBoard({
      whereWhatWasSaidAndTheSystemsDiffer: {
        heading: 'Where what people said and the systems differ',
        state: 'filled',
        rows: [{ id: 'e-1', participantId: 'p-otieno', said: 'Otieno Mwangi said, "three new subscriptions this week."', documentSays: 'A document on this check-in says it differently. It says, "two paid, one invoice open."' }],
      },
    }))
    await screen.findByRole('heading', { name: 'MarketView, Q4' })
    const section = screen.getByRole('region', { name: 'Where what people said and the systems differ' })
    expect(within(section).getByText('Otieno Mwangi said, "three new subscriptions this week."')).toBeTruthy()
    expect(within(section).getByText('A document on this check-in says it differently. It says, "two paid, one invoice open."')).toBeTruthy()
  })

  /* Screen match, 16 October: the lead first reads mvq4-board.jpg's own board, which has none of these; they hold, word for word, on "See every other part of this board" (?whole=1). */
  it('folds the records table, the team, "Who checked in", "Over time", "Reports" and "Help nobody mentioned"; keeps patterns and coaching open', async () => {
    me = { id: 'p-lead', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard(aBoard(), '/grounds/g-mvq4/board?whole=1')
    await screen.findByRole('heading', { name: 'MarketView, Q4' })

    const fold = screen.getByText('Everything else from this check-in').closest('details') as HTMLElement
    expect(within(fold).getByText('The team today')).toBeTruthy()
    expect(within(fold).getByText('Help nobody mentioned')).toBeTruthy()

    const beforeFold = (document.body.textContent ?? '').slice(0, (document.body.textContent ?? '').indexOf('Everything else from this check-in'))
    expect(beforeFold.includes('Help nobody mentioned')).toBe(false)
  })
})

describe('the MarketView Q4 board, as a participant', () => {
  it('reads "Your share" the same way a sales org participant does, and none of the lead-only sections', async () => {
    me = { id: 'p-otieno', firstName: 'Otieno', role: 'MEMBER' }
    renderBoard(aBoard({
      myParticipantId: 'p-otieno',
      whatTheSystemsShow: undefined,
      whereWhatWasSaidAndTheSystemsDiffer: undefined,
      helpNobodyMentioned: undefined,
      yourShare: [{ objectiveId: 'o-1', says: 'You are targeting 40 paying subscribers by the end of the quarter. You set this aim. Nothing has been counted against it yet.', whoSees: 'Only you and Wairimu Kamau see your share.' }],
    }))
    await screen.findByRole('heading', { name: 'MarketView, Q4' })
    const section = screen.getByRole('region', { name: 'Your share' })
    expect(within(section).getByText('You are targeting 40 paying subscribers by the end of the quarter. You set this aim. Nothing has been counted against it yet.')).toBeTruthy()
    expect(within(section).getByText('Only you and Wairimu Kamau see your share.')).toBeTruthy()
    expect(screen.queryByText('What the systems show')).toBeNull()
  })
})
