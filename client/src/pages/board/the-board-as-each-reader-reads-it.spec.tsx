import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage, seenAcross } from './BoardPage'
import { boardApi } from '@/api/board'
vi.mock('@/api/patterns', () => ({ patternsApi: { answer: vi.fn() } }))
import { patternsApi } from '@/api/patterns'

/**
 * U.10: THE BOARD, AS THE LEAD, A PARTICIPANT AND AN ADMIN READ IT.
 *
 * Each payload is what the server serves that reader (see the API's
 * the-board-as-each-reader-reads-it.spec.ts): the admin gets the read-only note, Miriam gets only
 * the targets she may read, and no row ever carries the rating of how checkable someone's answers
 * were. This reads the rendered page, not the code.
 */
let me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: me }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({ initiatorId: 'u-wairimu' }) } }))
import { groundsApi } from '@/api/grounds'
vi.mock('@/api/today', () => ({
  todayApi: {
    get: vi.fn().mockResolvedValue({
      count: 2, line: null, comingUp: [],
      needs: [
        { key: 'n1', kind: 'ready', title: 'Today’s report is ready', detail: 'Read it first if you like.', action: { label: 'Read it', to: '/grounds/g1/report' }, groundId: 'g1', organizationId: 'org-1' },
        { key: 'n2', kind: 'decide', title: 'Another check-in needs you', detail: null, action: { label: 'Open it', to: '/grounds/g2' }, groundId: 'g2', organizationId: 'org-1' },
      ],
    }),
  },
}))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))

const TEAM_TARGET = {
  id: 'o-team', name: 'Sales', count: 21, prevCount: 20, target: 25, delta: 1, isNew: false, askedOf: null,
  suggestedCount: null, notSettled: null,
  assumes: ['6 reps each close about 4 sales.', 'Stock arrives within a week of an order.'],
}
const AISHAS = {
  id: 'o-aisha', name: 'Aisha’s sales', count: 4, prevCount: 4, target: 5, delta: 0, isNew: false, askedOf: null,
  suggestedCount: null, notSettled: null, owner: 'Aisha Otieno', assumes: ['Aisha keeps her two supermarket buyers.'],
}

const base = {
  groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', sections: ['objectives'],
  title: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT', coverageVariant: 'text',
  lastChangedAt: '2026-09-23T15:02:00.000Z',
  participants: [
    { id: 'p-lead', name: 'Wairimu Kamau', role: null, managingOnly: true, signedOffAt: null },
    { id: 'p-miriam', name: 'Miriam Wanjiku', role: null, managingOnly: false, signedOffAt: null },
    { id: 'p-aisha', name: 'Aisha Otieno', role: null, managingOnly: false, signedOffAt: null },
  ],
}

const AS_THE_LEAD = {
  ...base, myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null,
  objectives: [TEAM_TARGET, AISHAS],
  eachPerson: [
    { participantId: 'p-aisha', who: 'Aisha Otieno', target: 5, count: 4, reason: 'nothing to do', says: 'Aisha Otieno has checked in, and nothing here needs you this week.', ask: null },
    { participantId: 'p-miriam', who: 'Miriam Wanjiku', target: null, count: 0, reason: 'nothing to do', says: 'Miriam Wanjiku has checked in, and nothing here needs you this week.', ask: null },
  ],
}
const AS_MIRIAM = { ...base, myParticipantId: 'p-miriam', canEditFrame: false, readOnlyNote: null, objectives: [TEAM_TARGET] }
const AS_AN_ADMIN = {
  ...base, myParticipantId: null, canEditFrame: false,
  readOnlyNote: 'You can read this check-in’s board and reports. Wairimu Kamau runs it.',
  objectives: [TEAM_TARGET, AISHAS],
}

/* Changed in batch 2, group 6 (Hafsah, 4 November, issue 40): the status line stays, its explanation goes for everybody. */
const LAST_UPDATED = /^Last updated on Wednesday 23 September at \d{1,2}(:\d\d)?(am|pm)\.$/

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

describe('the board, as each reader reads it', () => {
  beforeEach(() => vi.clearAllMocks())

  it('Wairimu, who runs it, reads when it last changed, and what each target assumes', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard(AS_THE_LEAD)
    expect(await screen.findByText(LAST_UPDATED)).toBeTruthy()
    expect(screen.getByText('What the target of 25 assumes')).toBeTruthy()
    /* What needs her, kept to this check-in: Today's item for this one, not the other one's. */
    expect(await screen.findByText('What needs you in this check-in')).toBeTruthy()
    expect(screen.getByText('Today’s report is ready')).toBeTruthy()
    expect(screen.queryByText('Another check-in needs you')).toBeNull()
    expect(screen.getByText('6 reps each close about 4 sales.')).toBeTruthy()
    expect(screen.getByText('What the target of 5 assumes')).toBeTruthy()
    expect(screen.getAllByText('If one of these stops being true, the target needs a second look.')).toHaveLength(2)
    expect(screen.queryByText(/You can read this check-in’s board and reports/)).toBeNull()
    /* No rating of anybody's answers, in any words. */
    expect(document.body.textContent).not.toMatch(/checkable|specific|vague/i)
    /* And the old footer, which was not true, is gone. */
    expect(document.body.textContent).not.toMatch(/sees the same board|regenerates|Only the meeting poll/)
  })

  it('Miriam reads the same line, the team target and what it assumes, and nothing about Aisha’s number', async () => {
    me = { id: 'u-miriam', firstName: 'Miriam', role: 'MEMBER' }
    renderBoard(AS_MIRIAM)
    expect(await screen.findByText(LAST_UPDATED)).toBeTruthy()
    expect(screen.getByText('What the target of 25 assumes')).toBeTruthy()
    expect(screen.queryByText(/supermarket buyers/)).toBeNull()
    expect(screen.queryByText('What needs you in this check-in')).toBeNull()
    expect(screen.queryByText(/You can read this check-in’s board and reports/)).toBeNull()
  })

  it('Grace, an admin who only reads, is told who runs it', async () => {
    me = { id: 'u-grace', firstName: 'Grace', role: 'ADMIN' }
    renderBoard(AS_AN_ADMIN)
    expect(await screen.findByText(LAST_UPDATED)).toBeTruthy()
    expect(screen.getByText('You can read this check-in’s board and reports. Wairimu Kamau runs it.')).toBeTruthy()
    /* She reads; she is offered nothing to change. */
    expect(screen.queryByText('Add target')).toBeNull()
  })

  /*
   * U.10 (a): THE BOARD BUILDS ITS OWN HEADER TABS NOW (moved off the retired TheCheckInHeader,
   * which pinned these same three cases in components/gw/an-admin-who-only-reads-has-no-check-in-
   * tab.spec.tsx - that file still passes unchanged, since components/gw/TheCheckInHeader.tsx still
   * runs the report pages). Grace, an admin who neither runs this check-in nor takes part in it,
   * gets the prototype's read-only three tabs (read-only-view.txt): Board, Context, People and
   * setup - no Check-in, no My work, no "Your check-in"/"Start my check-in" button either.
   */
  it('Grace, an admin who only reads, gets the read-only three tabs and no way into a check-in', async () => {
    me = { id: 'u-grace', firstName: 'Grace', role: 'ADMIN' }
    renderBoard(AS_AN_ADMIN)
    expect(await screen.findByRole('tab', { name: 'Board' })).toBeTruthy()
    /* "Context" renamed to "Context and resources", then "References and resources" for everybody once Release 1B's switch
       went (eb43a349d). The three tabs are now asserted as the whole tab list, so nothing else can slip in. */
    expect(screen.getByRole('tab', { name: 'References and resources' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'People and setup' })).toBeTruthy()
    expect(screen.getAllByRole('tab').map((t) => t.textContent?.trim())).toEqual(['Board', 'References and resources', 'People and setup'])
    expect(screen.queryByRole('tab', { name: 'Check-in' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'My work' })).toBeNull()
    expect(screen.queryByText('Your check-in')).toBeNull()
    expect(screen.queryByText('Start my check-in')).toBeNull()
  })

  it('Wairimu, who runs it, still gets her Check-in and My work tabs, and "Your check-in"', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard(AS_THE_LEAD)
    expect(await screen.findByRole('tab', { name: 'Check-in' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'My work' })).toBeTruthy()
    expect(screen.getByText('Your check-in')).toBeTruthy()
  })

  it('Miriam, a participant who is not the lead, reads "Start my check-in" instead', async () => {
    me = { id: 'u-miriam', firstName: 'Miriam', role: 'MEMBER' }
    renderBoard(AS_MIRIAM)
    expect(await screen.findByRole('tab', { name: 'Check-in' })).toBeTruthy()
    expect(screen.getByText('Start my check-in')).toBeTruthy()
    expect(screen.queryByText('Your check-in')).toBeNull()
  })

  /**
   * FAULT 6 (live walk, 6 October 2026): NEVER "START MY CHECK-IN" ON AN ENDED CHECK-IN.
   *
   * Amani, a member on a check-in that had already ended, still read "Start my check-in" in the
   * header - pressing it opened "No check-in open right now", because there was none. The header
   * read `groundEnded` (`hasEnded`, `lib/a-ground-that-has-ended.ts`) for the clock under the
   * title already; it just never gated this button on it.
   */
  it('Miriam gets no "Start my check-in" once the check-in has ended, even though she is a member', async () => {
    me = { id: 'u-miriam', firstName: 'Miriam', role: 'MEMBER' }
    renderBoard({ ...AS_MIRIAM, groundStatus: 'CLOSED' })
    await screen.findByRole('tab', { name: 'Check-in' })
    expect(screen.queryByText('Start my check-in')).toBeNull()
  })

  /**
   * SCREEN FAULT 6(d) (live walk, 6 October 2026), EVERY SITUATION: NO "START MY CHECK-IN" ONCE
   * SHE HAS FINISHED HER OWN OPEN SESSION.
   *
   * `base` carries no phase spine (a sales-board-shaped ground, which never sends one), so the
   * header fell back to asking only whether Miriam's NEXT check-in is still in the future
   * (`myOpenOrNextOpensLater`) - true only when one exists. With nothing non-completed left for
   * her at all (she has answered everything there is so far), that read was never true either way,
   * so the button stayed up with nothing behind it. `groundsApi.get`'s own `checkIns` is the real
   * per-reader source: her one check-in here is COMPLETED, so there is nothing of hers left open.
   */
  it('Miriam gets no "Start my check-in" once she has finished the one check-in open for her', async () => {
    me = { id: 'u-miriam', firstName: 'Miriam', role: 'MEMBER' }
    ;(groundsApi.get as any).mockResolvedValue({
      initiatorId: 'u-wairimu',
      participants: [{ id: 'p-miriam2', userId: 'u-miriam' }],
      checkIns: [{ participantId: 'p-miriam2', status: 'COMPLETED', sessionNumber: 1 }],
    })
    renderBoard(AS_MIRIAM)
    await screen.findByRole('tab', { name: 'Check-in' })
    expect(screen.queryByText('Start my check-in')).toBeNull()
  })

  it('Wairimu, who runs an ended check-in, still gets "Your check-in"', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard({ ...AS_THE_LEAD, groundStatus: 'CLOSED' })
    await screen.findByRole('tab', { name: 'Check-in' })
    expect(screen.getByText('Your check-in')).toBeTruthy()
  })

  /* Changed in batch 2, group 6 (Hafsah, 4 November, issue 40): the status line stays, its explanation goes for everybody. */
  it('with no time on record yet, it says nothing about how the board works', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard({ ...AS_THE_LEAD, lastChangedAt: null })
    await screen.findByRole('tab', { name: 'Check-in' })
    expect(screen.queryByText(/The board only changes/)).toBeNull()
  })

  /*
   * HOW THE LEADING IS LANDING IS PROTECTED (Hafsah, 29 September): never hidden to solve a
   * problem. It used to vanish whenever patterns were off, because its count said "seen across 2
   * sessions" after one. Now the lead always reads it, and the count is said only when true.
   */
  const ALIGNMENT = [{
    managerParticipantId: 'p-lead', managerName: 'Wairimu Kamau', pattern: 'SETUP_NEVER_SAID',
    pole: 'NEITHER', label: 'Setup, never said', gap: 'Two check-ins read this differently.',
    note: 'Neither read is called wrong.', periods: 2,
  }]
  it('the lead reads How the leading is landing while patterns are off, with no count the record cannot bear', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard({ ...AS_THE_LEAD, sections: ['objectives'], phaseSpine: { ...(AS_THE_LEAD as any).phaseSpine, currentSession: 1 }, managerAlignment: ALIGNMENT })
    await screen.findByText(LAST_UPDATED)
    expect(screen.getByText('How the leading is landing')).toBeTruthy()
    expect(screen.getByText('Two check-ins read this differently.')).toBeTruthy()
    expect(screen.queryByText(/seen across/i)).toBeNull()
  })
  it('a participant never reads How the leading is landing, patterns on or off', async () => {
    me = { id: 'u-miriam', firstName: 'Miriam', role: 'MEMBER' }
    renderBoard({ ...AS_MIRIAM, sections: ['objectives', 'patterns'], managerAlignment: ALIGNMENT })
    await screen.findByText(LAST_UPDATED)
    expect(screen.queryByText('How the leading is landing')).toBeNull()
    expect(screen.queryByText('Two check-ins read this differently.')).toBeNull()
  })
  it('an admin who only reads never reads it either', async () => {
    me = { id: 'u-grace', firstName: 'Grace', role: 'ADMIN' }
    renderBoard({ ...AS_AN_ADMIN, sections: ['objectives', 'patterns'], managerAlignment: ALIGNMENT })
    await screen.findByText(LAST_UPDATED)
    expect(screen.queryByText('How the leading is landing')).toBeNull()
  })
})

/**
 * U.10 (c1): THE SWITCHBOARD'S SECTIONS SIT IN THE SHARED PAGE RHYTHM, NOT WRAPPED AWAY FROM IT.
 *
 * Her review found the sections had no space between them - "'What the team is aiming for' touches the
 * panel above it" - because a wrapping div around the whole page escaped the shared Page frame's
 * own 30px child spacing (`.wrap > * + *`). Fixed by giving each switchboard section its
 * own heading AND content together, as one `<Section>`, so each is a direct child of the page wrap
 * again. This does not compute CSS in jsdom; it pins the DOM shape the rule depends on, so the
 * escape hatch cannot come back quietly.
 */
describe('the switchboard sections sit directly in the page rhythm', () => {
  /*
   * BOARD REVIEW, SALES PIECE A, ITEM 1: "WHAT WE ARE AIMING FOR" AND "WHAT SUCCESS LOOKS LIKE"
   * NOW DRAW INSIDE "EVERYTHING ELSE FROM THIS CHECK-IN", ON PURPOSE. No prototype screen shows
   * either as its own heading on a board, so both now fold under that one disclosure near the foot
   * of the page, the same way the participant's own board already folds "The whole check-in" -
   * this is the Folded part doing its job, not the escape-hatch wrapper this test was written
   * against. "The team today", drawn in the open per board-as-lead.txt, is the section checked here
   * instead - still a direct child of the page wrap, still getting the shared page rhythm's spacing.
   */
  it('each rebuilt section is its own direct child of the page wrap, not buried in an extra wrapper', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
    const { container } = renderBoard(AS_THE_LEAD)
    await screen.findByRole('heading', { name: 'The team today' })
    const wrap = container.querySelector('.wrap')
    expect(wrap).toBeTruthy()
    const sections = wrap!.querySelectorAll(':scope > section')
    const headings = Array.from(sections).map((s) => s.querySelector('h2')?.textContent)
    expect(headings).toEqual(expect.arrayContaining(['The team today']))
  })
})

describe('seenAcross', () => {
  it('says the count only when that many sessions have happened', () => {
    expect(seenAcross(2, 1)).toBeNull()
    expect(seenAcross(1, 5)).toBeNull()
    expect(seenAcross(3, null)).toBeNull()
    expect(seenAcross(3, 4)).toBe('Seen across 3 check-ins.')
  })
})

describe('where people see it differently', () => {
  it('prints who each side is, never the engine’s label', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard({
      ...AS_THE_LEAD,
      sections: ['objectives', 'divergence'],
      divergence: {
        agreements: [],
        items: [{ topic: 'Whether a price range counts as a budget', positions: [
          { participantLabel: 'Participant A', who: 'Miriam Wanjiku', view: 'A range is a budget.' },
          { participantLabel: 'Participant B', who: 'A colleague', view: 'Only a figure is a budget.' },
        ] }],
      },
    })
    expect(await screen.findByText('Whether a price range counts as a budget')).toBeTruthy()
    expect(screen.getAllByText('Miriam Wanjiku').length).toBeGreaterThan(0)
    expect(screen.getByText('A colleague')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/Participant [AB]/)
  })
})

/**
 * WHAT KEEPS COMING UP (board-as-lead.txt), IN THE SERVED SHAPE (docs/answers-from-engine.md,
 * "Patterns have a new shape"): `heading`, `whatHappened`, `howOften`, `whoSeesIt`, `theirWords`,
 * `canAnswer`, `askThem`, `participantId` - no `label`, `code`, `text` or `periods`.
 */
/**
 * U.10 (c1/c2): THE HEADING AND ITS CONTENT ARE ONE `<section>` NOW, not a heading-only `<section>`
 * with the card as its next sibling (the shape this helper originally pinned, back when only the
 * headings had moved to the shared `Section` and the insides were still built from the old kit).
 * Every switchboard section on the board now puts its content inside `Section`'s own children, so
 * the whole section (heading and body together) is what a caller wants back.
 */
function cardAfter(headingText: string): HTMLElement {
  const heading = screen.getByText(headingText)
  return heading.closest('section') as HTMLElement
}

describe('what keeps coming up', () => {
  beforeEach(() => vi.clearAllMocks())

  const miriamsPattern = {
    id: 'pat-miriam', participantId: 'p-miriam', yours: false,
    heading: 'Her qualified deals often don’t have a buying date', whatHappened: null,
    howOften: '3 of 5, for three weeks running.', askThem: 'What would get a date on the deal?',
    theirWords: null, canAnswer: false,
    whoSeesIt: 'Miriam Wanjiku has not seen this yet, and has not answered yet.',
  }
  const aishasPattern = {
    id: 'pat-aisha', participantId: 'p-aisha', yours: false,
    heading: 'Leads the team on buying dates', whatHappened: null,
    howOften: '3 of 5, for three weeks running.', askThem: null,
    theirWords: null, canAnswer: false,
    whoSeesIt: 'Aisha Otieno saw this first and has not answered yet.',
  }

  it('Wairimu, who runs it, reads what keeps coming up about each person’s work, under their name', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard({ ...AS_THE_LEAD, sections: ['objectives', 'patterns'], patterns: [miriamsPattern, aishasPattern] })
    await screen.findByText('What keeps coming up')
    const card = cardAfter('What keeps coming up')
    expect(within(card).getByText('About each person’s work')).toBeTruthy()
    expect(within(card).getByText('Miriam Wanjiku')).toBeTruthy()
    expect(within(card).getByText('Aisha Otieno')).toBeTruthy()
    expect(within(card).getByText('Her qualified deals often don’t have a buying date')).toBeTruthy()
    expect(within(card).getByText('Leads the team on buying dates')).toBeTruthy()
    expect(within(card).getByText(/What would get a date on the deal\?/)).toBeTruthy()
    /* Never a label joined to a name: the sentence names the work, not "Miriam: qualified deals". */
    expect(document.body.textContent).not.toMatch(/Miriam Wanjiku:/)
  })

  it('Miriam reads her own, can answer it, and never a colleague’s - even one the payload carried', async () => {
    me = { id: 'u-miriam', firstName: 'Miriam', role: 'MEMBER' }
    renderBoard({
      ...AS_MIRIAM, sections: ['objectives', 'patterns'],
      patterns: [{ ...miriamsPattern, yours: true, canAnswer: true, whoSeesIt: 'Wairimu can see this too, once you answer or three days pass.' }, aishasPattern],
    })
    expect(await screen.findByText('What keeps coming up')).toBeTruthy()
    expect(screen.getByText('Her qualified deals often don’t have a buying date')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Say what’s behind it' })).toBeTruthy()
    /* Aisha's pattern was in the payload and must never draw on Miriam's own board. */
    expect(screen.queryByText('Leads the team on buying dates')).toBeNull()
    expect(screen.queryByText('Aisha Otieno')).toBeNull()
  })

  it('Miriam can say what’s behind it, and her own words show back next to the pattern', async () => {
    me = { id: 'u-miriam', firstName: 'Miriam', role: 'MEMBER' }
    ;(patternsApi.answer as any).mockResolvedValue({ ...miriamsPattern, yours: true, canAnswer: true, theirWords: 'The buyer keeps delaying.' })
    renderBoard({
      ...AS_MIRIAM, sections: ['objectives', 'patterns'],
      patterns: [{ ...miriamsPattern, yours: true, canAnswer: true }],
    })
    await screen.findByText('What keeps coming up')
    const card = cardAfter('What keeps coming up')
    fireEvent.click(within(card).getByRole('button', { name: 'Say what’s behind it' }))
    fireEvent.change(within(card).getByRole('textbox'), { target: { value: 'The buyer keeps delaying.' } })
    fireEvent.click(within(card).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(within(card).getByText(/The buyer keeps delaying\./)).toBeTruthy())
  })

  /*
   * UPDATED, U.4 REVIEW ROUND (30 Sept), ITEM 1: THE MORE PRIVATE OPTION, UNTIL HAFSAH DECIDES
   * (Needs Hafsah 0-pat2, request 84).
   *
   * This used to assert an admin who only reads sees everybody's pattern, "the same as the lead" -
   * because the server serves `eachPerson` under the same test as `patterns`, whoever runs the
   * check-in, admin included. But a colleague's own report and screens tell them their pattern
   * reaches only the person who RUNS the check-in - not every admin who can merely read it - so
   * drawing it here for a reading admin made that promise false. Until Hafsah answers, the board
   * itself is the more private of the two readings: `viewerRunsThisCheckIn` gates a colleague's
   * pattern, not the wider `eachPerson` signal. An admin who runs nothing here now reads nobody
   * else's pattern, the same as any other reader who is not running it.
   */
  it('an admin who only reads sees nobody else’s pattern, even though the payload carries one', async () => {
    me = { id: 'u-grace', firstName: 'Grace', role: 'ADMIN' }
    renderBoard({ ...AS_AN_ADMIN, sections: ['objectives', 'patterns'], patterns: [miriamsPattern, aishasPattern], eachPerson: AS_THE_LEAD.eachPerson })
    /* 15 November 2026: with nothing of anybody's to show, the section is not drawn at all (no heading over nothing). Nobody else's pattern is anywhere on the page. */
    await screen.findByText('What needs you in this check-in').catch(() => null)
    expect(screen.queryByText('What keeps coming up')).toBeNull()
    expect(screen.queryByText('Leads the team on buying dates')).toBeNull()
    expect(screen.queryByText('Her qualified deals often don’t have a buying date')).toBeNull()
  })

  it('“The team today” carries what keeps coming up under each person’s own line, lead only', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard({
      ...AS_THE_LEAD, sections: ['objectives'],
      eachPersonToday: [
        { participantId: 'p-aisha', who: 'Aisha Otieno', line: 'Deals moving', keepsComingUp: 'Leads the team on buying dates' },
        { participantId: 'p-miriam', who: 'Miriam Wanjiku', line: 'Deals moving', keepsComingUp: 'Qualified deals often lack a date' },
      ],
    })
    await screen.findByText('The team today')
    expect(screen.getByText('Qualified deals often lack a date')).toBeTruthy()
    expect(screen.getByText('Leads the team on buying dates')).toBeTruthy()
  })

  /* PROTECTED (Hafsah, 29 September). Found by the review: after Amani answered her pattern, her
     line under "The team today" said nothing, because the board's own line needs three finished
     sessions of rows. A pattern the lead may read now says it on the person's line too. */
  it('a person’s line carries their served pattern when the board’s own line has nothing yet', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard({
      ...AS_THE_LEAD, sections: ['objectives', 'patterns'], patterns: [miriamsPattern],
      eachPersonToday: [{ participantId: 'p-miriam', who: 'Miriam Wanjiku', line: 'Deals moving', keepsComingUp: null }],
    })
    await screen.findByText('The team today')
    const card = cardAfter('The team today')
    /* Decision 2 (Hafsah, 12 October): the pattern's name never sits beside her name in this list; what happened does. Her pattern
       has no "what happened" sentence served, so the line says that something keeps coming up and where it is. Changed from
       expecting the heading here, which the decision rules out. */
    expect(within(card).queryByText(miriamsPattern.heading)).toBeNull()
    expect(within(card).getByText('Something keeps coming up in these check-ins. It is shown below, with what happened.')).toBeTruthy()
  })

  it('with a sentence of what happened served, that sentence is the line beside her name', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
    const said = 'In three of the last five check-ins, a deal Miriam called qualified had no buying date.'
    renderBoard({
      ...AS_THE_LEAD, sections: ['objectives', 'patterns'], patterns: [{ ...miriamsPattern, whatHappened: said }],
      eachPersonToday: [{ participantId: 'p-miriam', who: 'Miriam Wanjiku', line: 'Deals moving', keepsComingUp: null }],
    })
    await screen.findByText('The team today')
    const card = cardAfter('The team today')
    expect(within(card).queryByText(miriamsPattern.heading)).toBeNull()
    expect(within(card).getByText(said)).toBeTruthy()
  })
})

/**
 * THE ALIGNMENT FEED, REBUILT FROM THE ENGINE'S SERVED PATTERN SHAPE.
 *
 * It used to read the old shape (`sig.type`, `sig.text`, `sig.periodsObserved`), which the server no
 * longer sends, so with one pattern it said "0 to look at · 0 good signs" and drew one empty card
 * that only said "Seen across sessions". `groundsApi.get`'s `signals` is the very same
 * `servedPatterns(...)` call as the board's own `patterns`, so whenever "What keeps coming up" is
 * already on the page, the feed says once, truly, that the same pattern is shown there - it never
 * draws the pattern a second time. Only lead only, and only when "What keeps coming up" is not shown
 * at all, does it draw the pattern itself, with the shared `PatternPanel`.
 */
describe('the alignment feed', () => {
  beforeEach(() => vi.clearAllMocks())

  const feedPattern = {
    id: 'pat-feed', participantId: 'p-miriam', yours: false, kind: 'attention',
    heading: 'Her qualified deals often don’t have a buying date', whatHappened: null,
    howOften: '3 of 5, for three weeks running.', askThem: 'What would get a date on the deal?',
    theirWords: null, canAnswer: false,
    whoSeesIt: 'Miriam Wanjiku has not seen this yet, and has not answered yet.',
  }

  it('Wairimu, who runs it, reads a single true sentence, never the pattern a second time, when it is already shown above', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u-wairimu', signals: [feedPattern] })
    renderBoard({ ...AS_THE_LEAD, sections: ['objectives', 'patterns'], patterns: [feedPattern] })
    await screen.findByText('What keeps coming up')
    await screen.findByText('Alignment feed')
    const feedCard = cardAfter('Alignment feed')
    expect(within(feedCard).getByText('One pattern has come up so far. It is shown above, under What keeps coming up.')).toBeTruthy()
    /* The pattern is not drawn a second time inside the alignment feed's own card. */
    expect(within(feedCard).queryByText(feedPattern.heading)).toBeNull()
    expect(within(feedCard).queryByRole('button', { name: /Say what/ })).toBeNull()
  })

  it('counts more than one truly, when they are already shown above', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
    const second = { ...feedPattern, id: 'pat-feed-2', participantId: 'p-aisha', kind: 'good', heading: 'Leads the team on buying dates' }
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u-wairimu', signals: [feedPattern, second] })
    renderBoard({ ...AS_THE_LEAD, sections: ['objectives', 'patterns'], patterns: [feedPattern, second] })
    await screen.findByText('What keeps coming up')
    const feedCard = await (async () => { await screen.findByText('Alignment feed'); return cardAfter('Alignment feed') })()
    expect(within(feedCard).getByText('2 patterns have come up so far. They are shown above, under What keeps coming up.')).toBeTruthy()
  })

  it('draws the pattern itself, with the shared panel, when "What keeps coming up" is not shown at all', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u-wairimu', signals: [feedPattern] })
    renderBoard({ ...AS_THE_LEAD, sections: ['objectives'] })
    expect(screen.queryByText('What keeps coming up')).toBeNull()
    await screen.findByText('Alignment feed')
    const feedCard = cardAfter('Alignment feed')
    expect(within(feedCard).getByText(feedPattern.heading)).toBeTruthy()
    expect(within(feedCard).getByText(/What would get a date on the deal\?/)).toBeTruthy()
  })

  it('Miriam, a participant who does not run it, never reads an alignment feed', async () => {
    me = { id: 'u-miriam', firstName: 'Miriam', role: 'MEMBER' }
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u-wairimu', signals: [feedPattern] })
    renderBoard({ ...AS_MIRIAM, sections: ['objectives'] })
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(screen.queryByText('Alignment feed')).toBeNull()
  })

  it('Grace, an admin who only reads and does not run it, never reads an alignment feed', async () => {
    me = { id: 'u-grace', firstName: 'Grace', role: 'ADMIN' }
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u-wairimu', signals: [feedPattern] })
    renderBoard({ ...AS_AN_ADMIN, sections: ['objectives'] })
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(screen.queryByText('Alignment feed')).toBeNull()
  })
})

/* Polish round 1 dead end (25 October): a target can be given its unit on screen, and the unit is sent with it. */
describe('a target with its unit, as Wairimu adds it', () => {
  it('"Units sold by 30 October", 120, "units" goes to the server with its unit', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
    const create = vi.fn().mockResolvedValue({});
    (boardApi as any).createObjective = create
    renderBoard(AS_THE_LEAD)
    expect(await screen.findByText(LAST_UPDATED)).toBeTruthy()
    fireEvent.change(screen.getByPlaceholderText('Add a target, e.g. Paying companies'), { target: { value: 'Units sold by 30 October' } })
    fireEvent.change(screen.getByPlaceholderText('how many'), { target: { value: '120' } })
    fireEvent.change(screen.getByLabelText('Unit'), { target: { value: 'units' } })
    fireEvent.click(screen.getByText('Add target'))
    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.any(String), { name: 'Units sold by 30 October', target: 120, unit: 'units' }))
  })
})

/* Polish round 1 dead end (25 October): the lead names whose goal a target is; nobody named is hers, as she runs it. Miriam is offered no choice. */
describe('whose goal a target is', () => {
  it('Wairimu can name somebody, or leave it as hers', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
    const update = vi.fn().mockResolvedValue({});
    (boardApi as any).updateObjective = update
    renderBoard(AS_THE_LEAD)
    expect(await screen.findByText(LAST_UPDATED)).toBeTruthy()
    const whose = screen.getAllByLabelText('Whose goal')[0] as HTMLSelectElement
    expect(whose.options[0].text).toBe('Yours, as you run this check-in')
    if (whose.options.length > 1) {
      fireEvent.change(whose, { target: { value: whose.options[1].value } })
      await waitFor(() => expect(update).toHaveBeenCalledWith(expect.any(String), expect.any(String), { ownerParticipantId: whose.options[1].value }))
    }
  })

  it('Miriam is offered no choice', async () => {
    me = { id: 'u-miriam', firstName: 'Miriam', role: 'MEMBER' }
    renderBoard(AS_MIRIAM)
    expect(await screen.findByText(LAST_UPDATED)).toBeTruthy()
    expect(screen.queryByLabelText('Whose goal')).toBeNull()
  })
})
