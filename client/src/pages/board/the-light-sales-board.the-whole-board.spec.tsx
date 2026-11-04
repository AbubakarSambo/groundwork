/* THE WHOLE BOARD, AS IT WAS (screen match, 16 October): this file's assertions as they stood before the board was drawn as pictured, now read on "See every other part of this board" (?whole=1), so nothing the picture leaves out is lost. */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
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
      <MemoryRouter initialEntries={['/grounds/g1/board?whole=1']}>
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
/** A folded line (a `details`) by its own name. */
function lineNamed(name: string): HTMLElement {
  const line = [...document.querySelectorAll('details.gwui-fold')].find((d) => d.querySelector(':scope > summary .gwui-fold-name')?.textContent === name)
  if (!line) throw new Error(`no line named ${name}`)
  return line as HTMLElement
}

describe('the light sales board, as Wairimu, who runs it', () => {
  it('reads what needs her first, then the headline, then everything else in five boxes, with each box’s facts from the server', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'LEAD' }
    renderBoard(board())
    await screen.findByRole('heading', { name: 'Everything else' })

    expect(screen.getByText(/^Updated Wed 23 Sep, \d{1,2}(:\d\d)?(am|pm)/)).toBeTruthy()
    // The full sentence is one tap away behind the ⓘ, not gone.
    expect(screen.getByText(/^Last updated on Wednesday 23 September at \d{1,2}(:\d\d)?(am|pm)\. The board only changes when something new comes in/)).toBeTruthy()
    expect(screen.getByText('Tap any line to see more')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Views' })).toBeTruthy()

    // "What needs you in this check-in" is drawn before "Everything else".
    const needs = await screen.findByRole('region', { name: 'What needs you in this check-in' })
    const rest = screen.getByRole('region', { name: 'Everything else' })
    expect(needs.compareDocumentPosition(rest) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(needs).getByText('You need to get back to Brian Ochieng, who is waiting on you for a stopping rule.')).toBeTruthy()

    const names = [...document.querySelectorAll('details.gwui-box > summary .gwui-box-name')].map((e) => e.textContent)
    expect(names).toEqual(['Deals and targets', 'The team', 'Plan and commitments', 'Risks and open issues', 'Reports and other boards'].filter((n) => names.includes(n)))
    expect(names).toContain('Deals and targets')
    expect(boxNamed('Deals and targets').querySelector('.gwui-box-facts')?.textContent).toBe('2 deals, each with what shows it · 21 of 25, on time')
  })

  it('finds every deal inside "Every deal, day by day", open by itself on a laptop, with the line’s fact from the server', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'LEAD' }
    renderBoard(board())
    await screen.findByRole('heading', { name: 'Everything else' })
    const deals = await vi.waitFor(() => lineNamed('Every deal, day by day'))
    expect(deals.hasAttribute('open')).toBe(true)
    expect(deals.querySelector('.gwui-fold-fact')?.textContent).toBe('2 deals, each with what shows it')
    expect(within(deals).getByText('Westgate Deli')).toBeTruthy()
    expect(within(deals).getByText('Nyama Choma Palace')).toBeTruthy()
    expect(boxNamed('Deals and targets').contains(deals)).toBe(true)
  })

  it('puts the work plan under "Plan and commitments", folded, with its words unchanged inside', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'LEAD' }
    renderBoard(board())
    await screen.findByRole('heading', { name: 'Everything else' })
    const plan = await vi.waitFor(() => lineNamed('Work plan'))
    expect(plan.hasAttribute('open')).toBe(false)
    expect(plan.querySelector('.gwui-fold-fact')?.textContent).toBe('2 open')
    expect(boxNamed('Plan and commitments').contains(plan)).toBe(true)
    expect(within(plan).getByText(/Collect the deposit from Westgate Deli/)).toBeTruthy()
  })
})

describe('the light sales board, as Grace, an admin who reads it', () => {
  it('reads the headline, then "At a glance" with what needs the lead, and the full board one tap away', async () => {
    me = { id: 'u-grace', firstName: 'Grace', role: 'ADMIN' }
    renderBoard(board({ leadActions: [], readOnlyNote: 'You can read this check-in’s board and reports. Wairimu Kamau runs it.' }))
    const glance = await screen.findByRole('region', { name: 'At a glance' })
    expect(within(glance).getByText('For you as an admin. The lead runs this check-in.')).toBeTruthy()
    expect(within(glance).getByText('Deals and targets')).toBeTruthy()
    /* Each fact on its own line, never two joined with a dot (boards audit O1, 30 October; this read the joined line). */
    expect(within(glance).getByText('2 deals, each with what shows it')).toBeTruthy()
    expect(within(glance).getByText('21 of 25, on time')).toBeTruthy()
    expect(glance.textContent).not.toContain(' · ')
    expect(within(glance).getByText('What needs the lead')).toBeTruthy()
    expect(within(glance).getByText('1 thing: Wairimu Kamau needs to get back to Brian Ochieng.')).toBeTruthy()
    const full = screen.getByText('Open the full board').closest('details') as HTMLElement
    expect(full.hasAttribute('open')).toBe(false)
    // Everything is still there inside it, folded the same way as the lead's.
    await vi.waitFor(() => expect(full.contains(lineNamed('Every deal, day by day'))).toBe(true))
    expect(within(full).getByText('Westgate Deli')).toBeTruthy()
    // An admin is never told "What needs you": it is not hers to do.
    expect(screen.queryByRole('region', { name: 'What needs you in this check-in' })).toBeNull()
  })
})

describe('the sales board, as Miriam, a team member', () => {
  it('keeps her own view, with the short "Updated" line and the deal key behind ⓘ, and never gets the lead’s summary', async () => {
    me = { id: 'u-miriam', firstName: 'Miriam', role: 'MEMBER' }
    renderBoard(board({
      atAGlance: undefined, myParticipantId: 'p-miriam', canEditFrame: false,
      teamPicture: { shared: false, says: 'Today’s team picture is not shared yet.', yourOwnReport: 'Your own report is ready now.' },
    }))
    await screen.findByText('Your deals, day by day')
    expect(screen.getByText(/^Updated Wed 23 Sep, \d{1,2}(:\d\d)?(am|pm)/)).toBeTruthy()
    const key = screen.getByLabelText('What the marks mean').closest('details') as HTMLElement
    expect(key.hasAttribute('open')).toBe(false)
    expect(within(key).getByText(/Contact in their words/)).toBeTruthy()
    expect(screen.queryByText('At a glance')).toBeNull()
    expect(screen.queryByText('Everything else')).toBeNull()
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

