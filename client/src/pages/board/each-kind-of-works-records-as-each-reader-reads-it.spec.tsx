import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'
vi.mock('@/api/patterns', () => ({ patternsApi: { answer: vi.fn() } }))

/**
 * THE KIND OF WORK, AND ITS RECORDS, AS EACH READER READS THEM (request 76, U.10 task).
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
        ],
      },
      { section: 'Forecast', holds: 'where the sales numbers are likely to end up', state: 'not-known', why: 'Groundwork does not keep this yet. It needs numbers from another system, such as payment records or a helpdesk.' },
    ],
  }

  beforeEach(() => vi.clearAllMocks())

  it('the lead reads the kind of work, the filled deal, its stage track and its own words, and the not-known Forecast, quieter', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard(SALES_ORG)
    expect(await screen.findByText('This check-in is about a sales team and its deals.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Change' })).toBeTruthy()

    expect(screen.getByRole('region', { name: 'Deal grid' })).toBeTruthy()
    expect(screen.getByText('Nyama Choma Palace')).toBeTruthy()
    expect(screen.getByText('Value KES 90K')).toBeTruthy()
    /* The stage track draws every stage, and marks "Won" as where it stands. */
    expect(screen.getByText('Won')).toHaveClass('gwui-stage-track-current')
    expect(screen.getByText('Contacted')).toHaveClass('gwui-stage-track-done')
    /* The person's own words, exactly as said - never paraphrased. */
    expect(screen.getByText('“Nyama Choma Palace paid KES 90K on 22 September, so that one is won.”')).toBeTruthy()
    expect(screen.getByText("Someone's word")).toBeTruthy()

    const forecast = screen.getByRole('region', { name: 'Forecast' })
    expect(within(forecast).getByText('Groundwork does not keep this yet. It needs numbers from another system, such as payment records or a helpdesk.')).toBeTruthy()
    /* Never drawn as "proven" or "criteria met" - nothing served here says that. */
    expect(screen.queryByText(/proven/i)).toBeNull()
    expect(screen.queryByText(/criteria met/i)).toBeNull()

    /* The lead can add, change or remove a record. */
    const dealGrid = screen.getByRole('region', { name: 'Deal grid' })
    expect(within(dealGrid).getByRole('button', { name: 'Change this record' })).toBeTruthy()
    expect(within(dealGrid).getByRole('button', { name: 'Remove this record' })).toBeTruthy()
    expect(within(dealGrid).getByRole('button', { name: 'Add a record' })).toBeTruthy()
  })

  it('a colleague reads the same kind of work and record, but gets no way to change either', async () => {
    me = { id: 'u-akinyi', firstName: 'Akinyi', role: 'MEMBER' }
    renderBoard({ ...SALES_ORG, myParticipantId: 'p-akinyi', canEditFrame: false })
    expect(await screen.findByText('This check-in is about a sales team and its deals.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Change' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Choose' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Add a record' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Remove this record' })).toBeNull()
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
        ],
      },
      {
        section: 'Obligations', holds: 'the parties', state: 'filled',
        rows: [
          { id: 'w-3', kind: 'party', name: 'Pwani Mills', stage: null, owner: null, ownerParticipantId: null, due: null, fields: {}, from: 'said', said: 'Pwani Mills is the defendant in this matter.' },
        ],
      },
    ],
  }

  it('the lead reads both sections, each row without a stage track, and who added the deadline', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard(MATTER)
    expect(await screen.findByText('This check-in is about a law firm matter.')).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Timeline' })).toBeTruthy()
    expect(screen.getByText('Reply to the defence')).toBeTruthy()
    expect(screen.getByText('Due on 2 October.')).toBeTruthy()
    expect(screen.getByText('Added by Wairimu')).toBeTruthy()

    expect(screen.getByRole('region', { name: 'Obligations' })).toBeTruthy()
    expect(screen.getByText('Pwani Mills')).toBeTruthy()
    expect(screen.getByText('“Pwani Mills is the defendant in this matter.”')).toBeTruthy()
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

  it('says Groundwork keeps this but nothing has come up yet, in the founder’s own words, and offers to add one', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' }
    renderBoard(FOUNDER)
    expect(await screen.findByText("This is a founder's own check-in, about their own commitments and decisions.")).toBeTruthy()
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
