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
            fields: { Value: 'KES 90K' }, from: 'said',
            said: 'Nyama Choma Palace paid KES 90K on 22 September, so that one is won.',
          },
          {
            id: 'w-2', kind: 'deal', name: 'Naivas Karen', stage: null,
            owner: null, ownerParticipantId: null, due: '2026-10-09',
            fields: {}, from: 'lead',
          },
        ],
      },
      { section: 'Forecast', holds: 'where the sales numbers are likely to end up', state: 'not-known', why: 'Groundwork does not keep this yet. It needs numbers from another system, such as payment records or a helpdesk.' },
    ],
  }

  beforeEach(() => vi.clearAllMocks())

  it('the lead reads the kind of work, the sales org’s own heading, one stage per row, the shape of the work, and the not-known Forecast under its own plain heading', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard(SALES_ORG)
    expect(await screen.findByText('This check-in is about a sales team and its deals.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Change the kind of work' })).toBeTruthy()

    /* The prototype's own heading, not the switchboard's internal "Deal grid". */
    const dealGrid = screen.getByRole('region', { name: 'Every sale, and what shows it' })
    expect(within(dealGrid).getByText('Nyama Choma Palace')).toBeTruthy()
    expect(within(dealGrid).getByText('Value KES 90K')).toBeTruthy()
    /* The owner in its own column; a row with none reads plainly, never blank. */
    expect(within(dealGrid).getByText('Akinyi Otieno')).toBeTruthy()
    expect(within(dealGrid).getByText('Nobody named yet.')).toBeTruthy()
    /* One "Stage now" per row - a single tag, not the whole track. */
    expect(within(dealGrid).getByText('Won')).toHaveClass('gwui-tag')
    expect(within(dealGrid).getByText('No stage said yet.')).toBeTruthy()
    /* The person's own words, in their own name, never a colon join and never a status tag. */
    expect(within(dealGrid).getByText("In Akinyi's words,")).toBeTruthy()
    expect(within(dealGrid).getByText('“Nyama Choma Palace paid KES 90K on 22 September, so that one is won.”')).toBeTruthy()
    expect(within(dealGrid).queryByText("Someone's word")).toBeNull()
    expect(within(dealGrid).getByText('Wairimu added it.')).toBeTruthy()

    /* The shape of the work: every stage, once, with how many rows sit at each. */
    expect(within(dealGrid).getByText('The shape of the work')).toBeTruthy()
    expect(within(dealGrid).getByText('Won (1)')).toBeTruthy()
    expect(within(dealGrid).getByText('Contacted (0)')).toBeTruthy()
    /* Never drawn as "proven" or "criteria met" - nothing served here says that. */
    expect(screen.queryByText(/proven/i)).toBeNull()
    expect(screen.queryByText(/criteria met/i)).toBeNull()

    /* Not-known: the server's own reason, under a plain heading built from its own `holds`. */
    const forecast = screen.getByRole('region', { name: 'Where the sales numbers are likely to end up' })
    expect(within(forecast).getByText('Groundwork does not keep this yet. It needs numbers from another system, such as payment records or a helpdesk.')).toBeTruthy()

    /* The lead can add a record; changing or removing one lives behind "Change". */
    expect(within(dealGrid).getAllByRole('button', { name: 'Change' }).length).toBe(2)
    expect(within(dealGrid).getByRole('button', { name: 'Add a record' })).toBeTruthy()
    expect(within(dealGrid).queryByRole('button', { name: 'Remove this record' })).toBeNull()
  })

  it('opening "Change" on a row offers "Remove this record", behind its own confirmation', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard(SALES_ORG)
    await screen.findByText('This check-in is about a sales team and its deals.')
    const dealGrid = screen.getByRole('region', { name: 'Every sale, and what shows it' })
    within(dealGrid).getAllByRole('button', { name: 'Change' })[0].click()
    expect(await screen.findByRole('button', { name: 'Remove this record' })).toBeTruthy()
    expect(screen.queryByText(/cannot be undone/)).toBeNull()
    screen.getByRole('button', { name: 'Remove this record' }).click()
    expect(await screen.findByText('Remove "Nyama Choma Palace" from this board? This cannot be undone.')).toBeTruthy()
  })

  it('a colleague reads the same kind of work and record, but gets no way to change either', async () => {
    me = { id: 'u-akinyi', firstName: 'Akinyi', role: 'MEMBER' }
    renderBoard({ ...SALES_ORG, myParticipantId: 'p-akinyi', canEditFrame: false })
    expect(await screen.findByText('This check-in is about a sales team and its deals.')).toBeTruthy()
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
          { id: 'w-3', kind: 'party', name: 'Pwani Mills', stage: null, owner: 'Amani Otieno', ownerParticipantId: 'p-akinyi', due: null, fields: {}, from: 'said', said: 'Pwani Mills is the defendant in this matter.' },
        ],
      },
    ],
  }

  it('the lead reads both under plain headings, deadlines in date order with the date in words, and who added a deadline', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard(MATTER)
    expect(await screen.findByText('This check-in is about a law firm matter.')).toBeTruthy()

    const timeline = screen.getByRole('region', { name: 'Every deadline' })
    const rows = within(timeline).getAllByRole('row')
    expect(rows[0]).toHaveTextContent('File the counterclaim is due on Friday 25 September.')
    expect(rows[1]).toHaveTextContent('Reply to the defence is due on Friday 2 October.')
    expect(within(timeline).getAllByText('Wairimu added it.').length).toBe(2)

    const obligations = screen.getByRole('region', { name: 'The parties' })
    expect(within(obligations).getByText('Pwani Mills')).toBeTruthy()
    expect(within(obligations).getByText("In Amani's words,")).toBeTruthy()
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
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard(FOUNDER)
    expect(await screen.findByText("This is a founder's own check-in, about their own commitments and decisions.")).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Every item, and what shows it' })).toBeTruthy()
    expect(screen.getByText('No commitments and decisions have come up yet. They appear here when someone names one in a check-in, or when you add one below.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add one' })).toBeTruthy()
  })

  it('a colleague reads the same none-yet sentence without the offer to add one', async () => {
    me = { id: 'u-akinyi', firstName: 'Akinyi', role: 'MEMBER' }
    renderBoard({ ...FOUNDER, myParticipantId: 'p-akinyi', canEditFrame: false })
    expect(await screen.findByText('No commitments and decisions have come up yet. They appear here when someone names one in a check-in.')).toBeTruthy()
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

  it('the lead is asked to choose a kind, and every section reads as not-known', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard(NO_KIND)
    expect(await screen.findByText('Nobody has said what kind of work this check-in is about yet. Choose one, so its board can keep the right kind of record.')).toBeTruthy()
    expect(screen.getAllByText('Groundwork does not know what kind of work this check-in is about yet, so it keeps no records of this kind.').length).toBe(2)
  })
})
