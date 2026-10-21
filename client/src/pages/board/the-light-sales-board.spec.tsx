import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
import { groundsApi } from '@/api/grounds'

/**
 * THE LIGHT SALES BOARD, AS EACH READER READS IT (docs/light-rebuild/sales-first.md, section 1).
 *
 * Wairimu, who runs the sales check-in, reads "What needs you" first, then the headline and the
 * gap, then everything else in five boxes of folded lines, each line with one fact the server sent.
 * Grace, an admin, reads the summary first ("At a glance"), with the full board one tap away. Miriam,
 * a team member, keeps her own view, with the short "Updated" line and the deal key behind ⓘ.
 * Nothing is taken out of the page: every section is still there, inside its line.
 */
let me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'LEAD' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: me }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: ({ label }: { label?: string }) => <button type="button">{label ?? 'This board'}</button> }))
vi.mock('@/components/gw/Suggestions', () => ({ SuggestionsForTheLead: () => null }))
vi.mock('@/api/recommendedCheckIns', () => ({ recommendedCheckInsApi: { list: vi.fn().mockResolvedValue({ offers: [] }), yes: vi.fn(), notNow: vi.fn(async () => ({ state: 'DECLINED' })), draftFromSetUp: vi.fn() } }))
import { recommendedCheckInsApi } from '@/api/recommendedCheckIns'

const PARTICIPANTS = [
  { id: 'p-wairimu', name: 'Wairimu Kamau', role: null, managingOnly: true, signedOffAt: null },
  { id: 'p-miriam', name: 'Miriam Wanjiru', role: null, managingOnly: false, signedOffAt: null },
  { id: 'p-brian', name: 'Brian Ochieng', role: null, managingOnly: false, signedOffAt: null },
]

const workRecords = [
  {
    section: 'Deal grid', holds: 'deals', state: 'filled' as const, stages: ['Need', 'Quoted', 'Won'],
    rows: [
      { id: 'd1', kind: 'deal', name: 'Westgate Deli', stage: 'Quoted', owner: 'Miriam Wanjiru', ownerParticipantId: 'p-miriam', due: null, fields: {}, from: 'said' as const, said: 'Sent Westgate Deli a quote.', saidBy: 'Miriam', mark: 'said' },
      { id: 'd2', kind: 'deal', name: 'Nyama Choma Palace', stage: 'Won', owner: 'Brian Ochieng', ownerParticipantId: 'p-brian', due: null, fields: {}, from: 'proof' as const, said: 'They paid in full.', saidBy: 'Brian', mark: 'proven' },
    ],
  },
]

const AT_A_GLANCE = {
  lines: {
    deals: '2 deals, each with what shows it',
    targetsOverTime: '21 of 25, on time',
    blockers: '1 blocking. The biggest: Price objections, raised once',
    workPlan: '2 open',
  },
  boxes: {
    work: ['2 deals, each with what shows it', '21 of 25, on time'],
    team: ['Today: 2 of 3 checked in'],
    plan: ['2 open'],
    risk: ['1 blocking. The biggest: Price objections, raised once'],
    rest: ['3 sessions so far, each with its reports'],
  },
  needsTheLead: '1 thing: Wairimu Kamau needs to get back to Brian Ochieng.',
  assumesEach: {},
}

function board(overrides: any = {}) {
  return {
    groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', sections: [],
    title: 'Sales team, Q3', scenario: 'NOT_A_REAL_SCENARIO', coverageVariant: 'text',
    lastChangedAt: '2026-09-23T15:02:00.000Z',
    participants: PARTICIPANTS,
    myParticipantId: null, canEditFrame: true, readOnlyNote: null,
    kindOfWork: 'sales org',
    workRecords,
    objectives: [{ id: 'o1', name: 'The team is aiming for 25 freezers sold.', target: 25, count: 21, ownerParticipantId: null, assumes: [] }],
    workPlan: [{ id: 'w1', who: 'Miriam Wanjiru', what: 'Collect the deposit from Westgate Deli.', state: 'open', says: 'In session 2, Miriam Wanjiru said, "Collect the deposit from Westgate Deli."' }],
    leadActions: [{ id: 'la1', says: 'You need to get back to Brian Ochieng, who is waiting on you for a stopping rule.', because: 'It was first said on 5 October.', action: { label: 'Reply in your check-in', goesTo: 'check-in' } }],
    howItIsGoing: { latestSummary: null, glance: { progress: { roundsDone: 3, roundsPlanned: 12, answeredThisRound: 2, ofPeople: 3 }, inTheWay: { count: 0, oldest: null, daysWaiting: null } } },
    atAGlance: AT_A_GLANCE,
    ...overrides,
  }
}

function renderBoard(payload: any) {
  ;(boardApi.get as any).mockResolvedValue(payload)
  ;(groundsApi.get as any).mockResolvedValue({
    initiatorId: 'u-wairimu', leadFirstName: 'Wairimu', scenario: 'NOT_A_REAL_SCENARIO',
    participants: [
      { id: 'p-wairimu', userId: 'u-wairimu', managingOnly: true },
      { id: 'p-miriam', userId: 'u-miriam', managingOnly: false },
      { id: 'p-brian', userId: 'u-brian', managingOnly: false },
    ],
    checkIns: [], roundCompletions: [],
  })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** The box (a `details`) a piece of text sits in, by the box's own name. */
function boxNamed(name: string): HTMLElement {
  const box = [...document.querySelectorAll('details.gwui-box')].find((d) => d.querySelector(':scope > summary .gwui-box-name')?.textContent === name)
  if (!box) throw new Error(`no box named ${name}`)
  return box as HTMLElement
}

/*
 * SCREEN MATCH, 16 OCTOBER: WAIRIMU, WHO RUNS IT, NOW READS THE BOARD AS PICTURED (board-as-lead.jpg,
 * pictured/ThePicturedSalesBoard.tsx): every section open, in the picture's order, no boxes and no folded
 * lines. Hafsah, 15 October: "Build each screen as pictured." These three tests used to pin the light
 * board for the lead (what needs her, then five boxes of folded lines); they now pin the pictured board
 * for her. The light board is unchanged for Grace, below, and for a sales check-in with no deal on record.
 */
describe('the sales board as pictured, as Wairimu, who runs it', () => {
  it('reads the full "Last updated" sentence and every section open, with no boxes and no folded lines', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'LEAD' }
    renderBoard(board())
    await screen.findByRole('region', { name: 'Every deal, day by day' })
    expect(screen.getByText(/^Last updated on Wednesday 23 September at \d{1,2}(:\d\d)?(am|pm)\. The board only changes when something new comes in/)).toBeTruthy()
    expect(screen.queryByText('Tap any line to see more')).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Everything else' })).toBeNull()
    expect(document.querySelectorAll('details.gwui-box').length).toBe(0)
    expect(screen.getByRole('button', { name: 'Views' })).toBeTruthy()
  })

  it('finds every deal under "Every deal, day by day", open, and the first one opened in full below', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'LEAD' }
    renderBoard(board())
    const deals = await screen.findByRole('region', { name: 'Every deal, day by day' })
    expect(within(deals).getAllByText('Westgate Deli').length).toBeGreaterThan(0)
    expect(within(deals).getAllByText('Nyama Choma Palace').length).toBeGreaterThan(0)
    expect(within(deals).getByText('Something here wrong? Anyone can correct what’s about their own work in their check-in; the change and the original both show here.')).toBeTruthy()
  })

  it('reads the sections in the picture’s order', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'LEAD' }
    renderBoard(board())
    await screen.findByRole('region', { name: 'Every deal, day by day' })
    const order = ['Every deal, day by day', 'What keeps coming up'].map((n) => screen.getByRole('region', { name: n }))
    expect(order[0].compareDocumentPosition(order[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('the sales board, as Grace, an admin who reads it', () => {
  /*
   * Screen match, 16 October (read-only-view.jpg): Grace reads the same board as pictured, every section open, with
   * nothing to press that only whoever runs it may do. Was: the light board's "At a glance" with the full board
   * folded; that summary is still one tap away (the-light-sales-board.the-whole-board.spec.tsx reads it there,
   * word for word). An admin is still never told "What needs you": it is not hers to do.
   */
  it('reads the board as pictured, open, with nothing to press and never "What needs you"', async () => {
    me = { id: 'u-grace', firstName: 'Grace', role: 'ADMIN' }
    renderBoard(board({ leadActions: [], readOnlyNote: 'You can read this check-in’s board and reports. Wairimu Kamau runs it.' }))
    expect(await screen.findByText('You can read this check-in’s board and reports. Wairimu Kamau runs it.')).toBeTruthy()
    expect(await screen.findByRole('region', { name: 'Every deal, day by day' })).toBeTruthy()
    expect(screen.getAllByText('Westgate Deli').length).toBeGreaterThan(0)
    expect(screen.queryByRole('region', { name: 'What needs you in this check-in' })).toBeNull()
    expect(screen.queryByText('Share now')).toBeNull()
    expect(screen.queryByText('Record the decision')).toBeNull()
    expect(screen.getByRole('link', { name: 'See every other part of this board' })).toBeTruthy()
  })
})

describe('the sales board, as Miriam, a team member', () => {
  /* Screen match, 16 October: Miriam's own deals are drawn as board-as-participant.jpg has them, with the
     full "Last updated" sentence and the key above her grid, as pictured (was: the short line and the key
     behind ⓘ, the light board's way). Still never the lead's summary. */
  it('keeps her own view, with the full "Last updated" sentence and the key above her deals, and never gets the lead’s summary', async () => {
    me = { id: 'u-miriam', firstName: 'Miriam', role: 'MEMBER' }
    renderBoard(board({
      atAGlance: undefined, myParticipantId: 'p-miriam', canEditFrame: false,
      teamPicture: { shared: false, says: 'Today’s team picture is not shared yet.', yourOwnReport: 'Your own report is ready now.' },
    }))
    await screen.findByText('Your deals, day by day')
    expect(screen.getByText(/^Last updated on Wednesday 23 September at \d{1,2}(:\d\d)?(am|pm)\./)).toBeTruthy()
    const own = screen.getByRole('region', { name: 'Your deals, day by day' })
    expect(within(own).getByText(/Contact in their words/)).toBeTruthy()
    expect(screen.queryByText('At a glance')).toBeNull()
    expect(screen.queryByText('Everything else')).toBeNull()
  })
})

describe('what Groundwork recommends, as Miriam reads it (Hafsah’s answer 5)', () => {
  /* The server serves a team member only offers about their own work; the board draws what it is served, after the ask bar. */
  it('reads the offer about her own work, with "Set it up" and "Not now"', async () => {
    me = { id: 'u-miriam', firstName: 'Miriam', role: 'MEMBER' }
    ;(recommendedCheckInsApi.list as any).mockResolvedValueOnce({ offers: [{ id: 'r-mine', kind: 'own_work', says: 'Prepare your request for the Green Mart quote', question: 'You said the quote is due on Friday.', yes: 'Set it up', no: 'Not now' }] })
    renderBoard(board({
      atAGlance: undefined, myParticipantId: 'p-miriam', canEditFrame: false,
      teamPicture: { shared: false, says: 'Today’s team picture is not shared yet.', yourOwnReport: 'Your own report is ready now.' },
    }))
    const section = await screen.findByRole('region', { name: 'Groundwork recommends' })
    expect(within(section).getByText('Prepare your request for the Green Mart quote')).toBeTruthy()
    expect(within(section).getByText('You said the quote is due on Friday.')).toBeTruthy()
    expect(within(section).getByRole('button', { name: 'Set it up' })).toBeTruthy()
    fireEvent.click(within(section).getByRole('button', { name: 'Not now' }))
    await waitFor(() => expect(recommendedCheckInsApi.notNow).toHaveBeenCalledWith('g1', 'r-mine'))
  })

  it('reads no "Groundwork recommends" when nothing about her own work is waiting', async () => {
    me = { id: 'u-miriam', firstName: 'Miriam', role: 'MEMBER' }
    renderBoard(board({ atAGlance: undefined, myParticipantId: 'p-miriam', canEditFrame: false }))
    await screen.findByText('Your deals, day by day')
    expect(screen.queryByRole('region', { name: 'Groundwork recommends' })).toBeNull()
  })
})

describe('a board that is not a sales board', () => {
  it('is drawn as it always was: no boxes, and the full "Last updated" sentence', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'LEAD' }
    renderBoard(board({ atAGlance: undefined, kindOfWork: 'support desk' }))
    await screen.findByText(/^Last updated on Wednesday 23 September at \d{1,2}(:\d\d)?(am|pm)\./)
    expect(screen.queryByText('Everything else')).toBeNull()
    expect(screen.queryByText(/^Updated /)).toBeNull()
  })
})

describe('the sales goals board (sales-first.md, section 3), as Wairimu', () => {
  it('names the first box "Work and targets" when no deal is on record, and lists every target she is served under "Where each target stands", three first', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'LEAD' }
    const objectives = [
      { id: 'o1', name: 'The team is aiming for 25 freezers sold.', target: 25, count: 21, ownerParticipantId: null, assumes: [] },
      { id: 'o2', name: 'The team is aiming to keep quotes followed up within 48 hours at 90% or more.', target: 90, count: 84, ownerParticipantId: null, assumes: [], stands: { word: 'Close', says: 'It is 84%, close to the aim of 90% or more.' }, journey: { now: 84 } },
      { id: 'o3', name: 'Miriam Wanjiru is aiming for 5 freezers sold.', target: 5, count: 4, ownerParticipantId: 'p-miriam', assumes: [], journey: { now: 4 } },
      { id: 'o4', name: 'Brian Ochieng is aiming for 5 freezers sold.', target: 5, count: 2, ownerParticipantId: 'p-brian', assumes: [], journey: { now: 2 } },
      { id: 'o5', name: 'Aisha Mohamed is aiming for 5 freezers sold.', target: 5, count: 5, ownerParticipantId: 'p-aisha', assumes: [], journey: { now: 5 } },
    ]
    renderBoard(board({
      title: 'Sales org, Q3', workRecords: [], objectives,
      headline: { question: 'Will we reach 25 freezers sold by 30 October?', answer: 'So far it is 21 of the 25 freezers sold.', bars: [{ objectiveId: 'o1', kind: 'aim', now: 21, target: 25, filled: 84, word: null }] },
      atAGlance: { ...AT_A_GLANCE, lines: { targetsOverTime: '21 of 25' }, boxes: { ...AT_A_GLANCE.boxes, work: ['21 of 25'] } },
    }))
    await screen.findByRole('heading', { name: 'Everything else' })
    await vi.waitFor(() => expect(boxNamed('Work and targets')).toBeTruthy())
    expect(screen.getByText('It is 84%, close to the aim of 90% or more.')).toBeTruthy()
    expect(screen.getByText('Miriam Wanjiru is aiming for 5 freezers sold.')).toBeTruthy()
    // The first three after the headline's own, then the rest one tap away.
    expect(screen.queryByText('Aisha Mohamed is aiming for 5 freezers sold.')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Show all 4' }))
    expect(screen.getByText('Aisha Mohamed is aiming for 5 freezers sold.')).toBeTruthy()
  })
})

