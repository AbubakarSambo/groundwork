import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
vi.mock('@/api/patterns', () => ({ patternsApi: { answer: vi.fn() } }))

/**
 * THE KIND OF WORK, AND ITS RECORDS, AS EACH READER READS THEM (request 76, U.10 task, and the
 * coordinator's picture-check notes of 30 September: real headings instead of the switchboard's own
 * internal names, one "Stage now" per row with the stage counts drawn once as "the shape of the
 * work", the owner in its own column, "Change" on the row with "Remove" behind the form's own
 * confirmation, and a person's own words never drawn as a status tag).
 *
 * Reads the rendered board, for the sales org (a "filled" Deal grid with stages, and a "not-known"
 * Forecast), the law firm matter (Timeline and Obligations, both without stages) and the founder's
 * own check-in (a "none-yet" Work plan) - the three kinds the task names. Checks that a participant
 * cannot change the kind of work or its records, that the lead can, and that a row's own words are
 * shown exactly as said.
 */
let me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: me }) }))
vi.mock('@/api/board', () => ({
  boardApi: { get: vi.fn(), addWorkItem: vi.fn(), updateWorkItem: vi.fn(), deleteWorkItem: vi.fn() },
  KIND_OF_WORK_OPTIONS: [
    'sales org', 'engineering release', 'support desk', 'distribution operations',
    'trader training programme', "founder's own check-in", 'asset loans',
    'MarketView where next', 'MarketView Q4', 'a law firm matter', 'a government programme',
  ],
}))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({ initiatorId: 'u-wairimu', organizationId: 'org-1', leadFirstName: 'Wairimu' }), setKindOfWork: vi.fn() } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))

const base = {
  groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', sections: [],
  title: 'A check-in', scenario: 'OKR_ALIGNMENT', coverageVariant: 'text',
  lastChangedAt: '2026-09-23T15:02:00.000Z',
  participants: [
    { id: 'p-lead', name: 'Wairimu Kamau', role: null, managingOnly: true, signedOffAt: null },
    { id: 'p-akinyi', name: 'Akinyi Otieno', role: null, managingOnly: false, signedOffAt: null },
  ],
}

function renderBoard(payload: any, at = '/grounds/g1/board') {
  ;(boardApi.get as any).mockResolvedValue(payload)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[at]}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the sales org’s Deal grid: filled, with stages, and a not-known Forecast', () => {
  const SALES_ORG = {
    ...base, myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null,
    kindOfWork: 'sales org',
    workRecords: [
      {
        section: 'Deal grid', holds: 'deals', state: 'filled',
        stages: ['Contacted', 'Need established', 'Pitched', 'Qualified', 'Quoted', 'Won'],
        rows: [
          {
            id: 'w-1', kind: 'deal', name: 'Nyama Choma Palace', stage: 'Won',
            owner: 'Akinyi Otieno', ownerParticipantId: 'p-akinyi', due: null,
            fields: { Value: 'KES 90K' }, from: 'said', mark: 'said',
            said: 'Nyama Choma Palace paid KES 90K on 22 September, so that one is won.',
          },
          {
            id: 'w-2', kind: 'deal', name: 'Naivas Karen', stage: null,
            owner: null, ownerParticipantId: null, due: '2026-10-09',
            fields: {}, from: 'lead', mark: 'none',
          },
        ],
      },
      { section: 'Forecast', holds: 'where the sales numbers are likely to end up', state: 'not-known', why: 'Groundwork does not keep this yet. It needs numbers from another system, such as payment records or a helpdesk.' },
    ],
  }

  beforeEach(() => vi.clearAllMocks())

  /*
   * SCREEN MATCH, 16 OCTOBER: THE LEAD OF A SALES CHECK-IN READS THE BOARD AS PICTURED
   * (board-as-lead.jpg; pictured/ThePicturedSalesBoard.tsx). Updated from the old grid, because the
   * picture is the target now: the rep is named by first name ("Aisha, KES 110,000"), one open deal is
   * shown in full below the grid (so its words appear once there), "Change" is on that open deal, not on
   * every row, and there is no Forecast section (the headline says there are no chance-to-close
   * percentages yet). What the old checks protected still holds: the kind of work and its "Change", the
   * sales heading, one stage per row, "Nobody is named for it yet.", the person's own words in their own
   * name, "You added it.", "Nothing booked", the key naming only marks the grid draws, never "proven",
   * "Add a record", and "Remove this record" only behind "Change".
   */
  /* Release 1: Drop Access is one lead and three reps, a sales team. The same sales board, with its own sentence. */
  it('the lead of a sales team reads the same sales board, said as a sales team', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard({ ...SALES_ORG, kindOfWork: 'sales team' })
    expect(await screen.findByText('This check-in is about a sales team and its deals.')).toBeTruthy()
    const dealGrid = screen.getByRole('region', { name: 'Every deal, day by day' })
    expect(within(dealGrid).getAllByText('Nyama Choma Palace').length).toBeGreaterThan(0)
    expect(within(dealGrid).getByText('Akinyi, KES 90K')).toBeTruthy()
  })

  it('the lead reads the kind of work, the sales org’s own heading, one stage per row, and the key only for marks drawn', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard(SALES_ORG)
    expect(await screen.findByText('This check-in is about a sales organisation of several teams, and its deals.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Change the kind of work' })).toBeTruthy()

    const dealGrid = screen.getByRole('region', { name: 'Every deal, day by day' })
    expect(within(dealGrid).getAllByText('Nyama Choma Palace').length).toBeGreaterThan(0)
    expect(within(dealGrid).getByText('Akinyi, KES 90K')).toBeTruthy()
    expect(within(dealGrid).queryByText('The value is KES 90K.')).toBeNull()
    expect(within(dealGrid).getByText('Nobody is named for it yet.')).toBeTruthy()
    expect(within(dealGrid).queryByText('Nobody named yet.')).toBeNull()
    expect(within(dealGrid).getByText('Won', { selector: '.tag' })).toHaveClass('tag')
    expect(within(dealGrid).getByText('No stage said yet.')).toBeTruthy()
    /* The open deal (the first) says what shows it, in the person's own words. */
    expect(within(dealGrid).getByText('In the words of someone in this check-in,')).toBeTruthy()
    expect(within(dealGrid).getByText('“Nyama Choma Palace paid KES 90K on 22 September, so that one is won.”')).toBeTruthy()
    expect(within(dealGrid).queryByText("Someone's word")).toBeNull()
    expect(within(dealGrid).getAllByText('Nothing booked').length).toBeGreaterThanOrEqual(2)
    expect(within(dealGrid).queryByText('The shape of the work')).toBeNull()
    expect(screen.queryByText(/proven/i)).toBeNull()
    expect(screen.queryByText(/criteria met/i)).toBeNull()

    expect(within(dealGrid).queryByText(/Contact with proof: a photo, a quote, a payment/)).toBeNull()
    expect(within(dealGrid).getByText('Contact in their words')).toBeTruthy()
    expect(within(dealGrid).queryByText('Next step booked')).toBeNull()
    expect(within(dealGrid).queryByText('Follow-up, no reply')).toBeNull()

    /* The deal she added herself, opened, says so. */
    within(dealGrid).getByText('Naivas Karen').click()
    expect(await within(dealGrid).findByText('You added it.')).toBeTruthy()

    expect(screen.queryByRole('region', { name: 'Where the sales numbers are likely to end up' })).toBeNull()

    expect(within(dealGrid).getAllByRole('button', { name: 'Change' }).length).toBe(1)
    expect(within(dealGrid).getByRole('button', { name: 'Add a record' })).toBeTruthy()
    expect(within(dealGrid).queryByRole('button', { name: 'Remove this record' })).toBeNull()
  })

  it('opening "Change" on the open deal offers "Remove this record", behind its own confirmation', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard(SALES_ORG)
    await screen.findByText('This check-in is about a sales organisation of several teams, and its deals.')
    const dealGrid = screen.getByRole('region', { name: 'Every deal, day by day' })
    within(dealGrid).getAllByRole('button', { name: 'Change' })[0].click()
    expect(await screen.findByRole('button', { name: 'Remove this record' })).toBeTruthy()
    expect(screen.queryByText(/cannot be undone/)).toBeNull()
    screen.getByRole('button', { name: 'Remove this record' }).click()
    expect(await screen.findByText('Remove "Nyama Choma Palace" from this board? This cannot be undone.')).toBeTruthy()
  })

  it('a colleague reads the same kind of work and record, but gets no way to change either', async () => {
    me = { id: 'u-akinyi', firstName: 'Akinyi', role: 'MEMBER' }
    renderBoard({ ...SALES_ORG, myParticipantId: 'p-akinyi', canEditFrame: false })
    expect(await screen.findByText('This check-in is about a sales organisation of several teams, and its deals.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Change' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Choose' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Add a record' })).toBeNull()
  })
})

describe('the law firm matter’s Timeline and Obligations, both without stages', () => {
  const MATTER = {
    ...base, myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null,
    kindOfWork: 'a law firm matter',
    workRecords: [
      {
        section: 'Timeline', holds: 'deadlines', state: 'filled',
        rows: [
          { id: 'w-2', kind: 'deadline', name: 'Reply to the defence', stage: null, owner: null, ownerParticipantId: null, due: '2026-10-02', fields: {}, from: 'lead' },
          { id: 'w-4', kind: 'deadline', name: 'File the counterclaim', stage: null, owner: null, ownerParticipantId: null, due: '2026-09-25', fields: {}, from: 'lead' },
        ],
      },
      {
        section: 'Obligations', holds: 'the parties', state: 'filled',
        rows: [
          { id: 'w-3', kind: 'party', name: 'Pwani Mills', stage: null, owner: 'Amani Otieno', ownerParticipantId: 'p-akinyi', due: null, fields: { Side: 'the other side' }, from: 'said', said: 'Pwani Mills is the defendant in this matter.' },
        ],
      },
    ],
  }

  /* Screen match, 16 October: a law firm matter's lead first reads matter-board.jpg's own board, which has neither; both hold, unchanged, on "See every other part of this board" (?whole=1). */
  it('the lead reads both under plain headings, deadlines in date order with the date in words, and who added a deadline', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard(MATTER, '/grounds/g1/board?whole=1')
    expect(await screen.findByText('This check-in is about a law firm matter.')).toBeTruthy()

    const timeline = screen.getByRole('region', { name: 'Every deadline' })
    const rows = within(timeline).getAllByRole('row')
    expect(rows[0]).toHaveTextContent('File the counterclaim is due on Friday 25 September.')
    expect(rows[1]).toHaveTextContent('Reply to the defence is due on Friday 2 October.')
    /* Wairimu is the lead AND the reader here, so what they added reads "You added it.". */
    expect(within(timeline).getAllByText('You added it.').length).toBe(2)

    const obligations = screen.getByRole('region', { name: 'The parties' })
    expect(within(obligations).getByText('Pwani Mills')).toBeTruthy()
    /* Each party's side, as the prototype shows it. */
    expect(within(obligations).getByText('The other side.')).toBeTruthy()
    expect(within(obligations).getByText('In the words of someone in this check-in,')).toBeTruthy()
    expect(within(obligations).getByText('“Pwani Mills is the defendant in this matter.”')).toBeTruthy()
  })
})

describe('the founder’s own check-in: a Work plan with none yet', () => {
  const FOUNDER = {
    ...base, myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null,
    kindOfWork: "founder's own check-in",
    workRecords: [
      { section: 'Work plan', holds: 'commitments and decisions', state: 'none-yet', rows: [] },
    ],
  }

  it('says Groundwork keeps this but nothing has come up yet, under its own plain heading, and offers to add one', async () => {
    /*
     * THE FOUNDER'S OWN CHECK-IN BOARD (founder.txt): two wordings changed here, not the test's
     * own behaviour. "Wairimu" is this ground's initiator, so `viewerRunsThisCheckIn` is true and
     * she reads the kind-of-work sentence in the second person, as the founder it is about
     * ("This is your own check-in as a founder..."), not the third-person sentence every other
     * reader still gets (see the next test, a colleague). And founder.txt's own heading for this
     * table is "Every item, and what shows it" - the same words every other kind uses - not
     * "Every commitment and decision", which named the record's own item kinds instead.
     */
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard(FOUNDER)
    expect(await screen.findByText('This is your own check-in as a founder, about your own commitments and decisions.')).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Every item, and what shows it' })).toBeTruthy()
    expect(screen.getByText('No commitments and decisions have come up yet. They appear here when someone names one in a check-in, or when you add one below.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add one' })).toBeTruthy()
  })

  it('a colleague reads the same none-yet sentence without the offer to add one', async () => {
    me = { id: 'u-akinyi', firstName: 'Akinyi', role: 'MEMBER' }
    renderBoard({ ...FOUNDER, myParticipantId: 'p-akinyi', canEditFrame: false })
    expect(await screen.findByText("This is a founder's own check-in, about their own commitments and decisions.")).toBeTruthy()
    expect(screen.getByText('No commitments and decisions have come up yet. They appear here when someone names one in a check-in.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Add one' })).toBeNull()
  })
})

describe('nobody has said the kind of work yet: every section not-known', () => {
  const NO_KIND = {
    ...base, myParticipantId: 'p-lead', canEditFrame: true, readOnlyNote: null,
    kindOfWork: null,
    workRecords: [
      { section: 'Deal grid', holds: '', state: 'not-known', why: 'Groundwork does not know what kind of work this check-in is about yet, so it keeps no records of this kind.' },
      { section: 'Forecast', holds: '', state: 'not-known', why: 'Groundwork does not know what kind of work this check-in is about yet, so it keeps no records of this kind.' },
    ],
  }

  it('the lead is asked to choose a kind, and every section reads as not-known, said once', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard(NO_KIND)
    expect(await screen.findByText('Nobody has said what kind of work this check-in is about yet. Choose one, so its board can keep the right kind of record.')).toBeTruthy()
    /* Was pinned at 2 (the same sentence shown once per section), the exact repeated-line fault
       found live on a role-handover board (real-user walk, Kijani Foods, fault 4b): the collapsing
       this sentence already gets on a project or onboarding board was never scoped to apply here
       too, though the check-in's family makes no difference to whether repeating it is right. */
    expect(screen.getAllByText('Groundwork does not know what kind of work this check-in is about yet, so it keeps no records of this kind.').length).toBe(1)
  })
})
