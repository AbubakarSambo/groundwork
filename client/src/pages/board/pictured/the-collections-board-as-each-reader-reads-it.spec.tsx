import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TheCollectionsBoard, TheCollectionsTeamReportSections, TheCollectionsOwnReportSections } from './TheCollectionsBoard'
import { BoardPage } from '../BoardPage'
import { boardApi } from '@/api/board'
import { groundsApi } from '@/api/grounds'
import SERVED from './__fixtures__/collections-served.json'

/**
 * THE COLLECTIONS BOARD AND ITS REPORTS, AS EACH PERSON READS THEM ON SCREEN (Release 2, pull request 2 of 3). What is drawn here is
 * exactly what the server serves each reader for Muchemi & Co (test) and the small lender (test): the JSON is the server's own
 * output (api/src/modules/board/the-collections-served-to-the-screen.spec.ts checks the two never differ). The screen words nothing
 * of its own; it lays the served board out in the picture's order (loans-board.jpg).
 */
let me: any = { id: 'u-wanjiru', firstName: 'Wanjiru', role: 'LEAD' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: me }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: ({ label }: { label?: string }) => <button type="button">{label ?? 'This board'}</button> }))
vi.mock('@/components/gw/Suggestions', () => ({ SuggestionsForTheLead: () => null }))

const S: any = SERVED
const draw = (board: any) => render(<MemoryRouter><TheCollectionsBoard board={board} onRecordTheDecision={() => undefined} /></MemoryRouter>)
const text = () => document.body.textContent ?? ''

describe('Wanjiru, the partner, reads every fee note', () => {
  it('the question and its answer, what needs her beside it, and the seven groups the release plan lists', () => {
    draw(S.boards.wanjiru)
    expect(screen.getByText('Are the fee notes being paid, and why not where they aren’t?')).toBeTruthy()
    expect(screen.getByText('27% of what’s due is paid, on proof. A further KES 120,000 is paid on somebody’s word, with no proof yet. One fee note is behind, but the client is in touch.')).toBeTruthy()
    expect(screen.getByText('Jamii Clinics missed the date they promised to pay by')).toBeTruthy()
    expect(screen.getByText('Fee note FN-007 for Jamii Clinics, KES 180,000. The client promised to pay by 10 October, and nothing has come in. Aisha follows it up.')).toBeTruthy()
    const stand = screen.getByRole('region', { name: 'Where the fee notes stand' })
    for (const label of ['Paid', 'Due and on track', 'Behind, but in touch', 'Genuinely blocked', 'Not heard from', 'Due when something happens', 'Not yet raised']) {
      expect(within(stand).getByText(label)).toBeTruthy()
    }
  })

  it('every fee note and what shows it: the columns the plan names, FN-004 filled with its slip, FN-006 ringed on Aisha’s word', () => {
    draw(S.boards.wanjiru)
    const every = screen.getByRole('region', { name: 'Every fee note, and what shows it' })
    for (const h of ['Client and matter', 'Number', 'Amount', 'Who follows up', 'Falls due', 'Payment', 'What’s in the way, in their words', 'Next']) expect(within(every).getByRole('columnheader', { name: h })).toBeTruthy()
    const row = (n: string) => within(every).getByText(n).closest('tr') as HTMLElement
    expect(row('FN-004').textContent).toContain('Paid on 20 October, with proof')
    expect(row('FN-004').textContent).toContain('It reads, “Equity Bank remittance advice: KES 250,000 received from Kasarani Foods for FN-004.”')
    expect(within(row('FN-004')).getByRole('img', { name: /proven/i })).toBeTruthy()
    expect(row('FN-006').textContent).toContain('Paid, as Aisha said')
    expect(row('FN-007').textContent).toContain('Call their finance office, by Thursday 22 October.')
    expect(row('Not raised yet').textContent).toContain('When the hearing date is set')
  })

  it('the pattern, follow-up given, the systems, and where this is heading with the decision hers', () => {
    draw(S.boards.wanjiru)
    expect(screen.getByText('Fee notes wait for events in the matter')).toBeTruthy()
    expect(screen.getByText('How we bill')).toBeTruthy()
    expect(screen.getByText('Two promises. One kept, and one missed.')).toBeTruthy()
    expect(screen.getByText('Nothing is connected yet. When your accounting system or your bank is connected, what it shows will be here, beside what people said.')).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Where this is heading' })).toBeTruthy()
    expect(screen.getByText('You decide.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Record the decision' })).toBeTruthy()
  })
})

describe('an associate and the accounts person read only their own', () => {
  it('Brian reads his four fee notes as "you", no client of Aisha’s, and no "Where this is heading"', () => {
    draw(S.boards.brian)
    expect(screen.getByText('Are your fee notes being paid, and why not where they aren’t?')).toBeTruthy()
    expect(screen.getByText('Of KES 340,000 due on your fee notes, KES 250,000 is paid with proof.')).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Your fee notes, and what shows them' })).toBeTruthy()
    expect(text()).not.toMatch(/Jamii|Upendo|Baraka|Aisha/)
    expect(text()).not.toContain('Equity Bank remittance advice')
    expect(screen.queryByRole('region', { name: 'Where this is heading' })).toBeNull()
  })

  it('Njeri, who follows up none, reads that none are hers', () => {
    draw(S.boards.njeri)
    expect(screen.getAllByText('No fee note that you follow up is on record yet.').length).toBeGreaterThan(0)
    expect(text()).not.toMatch(/Kasarani|Jamii|Nyota|Upendo|Baraka|KES/)
  })
})

describe('the small lender', () => {
  it('Halima reads the kit’s loans board: the cohort question, every borrower with the kit’s columns', () => {
    draw(S.boards.halima)
    expect(screen.getByText('Is the cohort repaying, and why not where it isn’t?')).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Where the cohort stands' })).toBeTruthy()
    const every = screen.getByRole('region', { name: 'Every borrower, and what shows it' })
    for (const h of ['Borrower', 'Business', 'Sales, 4 weeks', 'Repayment', 'What’s in the way, in their words', 'Next']) expect(within(every).getByRole('columnheader', { name: h })).toBeTruthy()
    expect(within(every).getByText('3 weeks behind')).toBeTruthy()
    expect(screen.getByText('Peter has not checked in since 21 September')).toBeTruthy()
    expect(screen.getByRole('region', { name: 'One person, a place, or the model?' })).toBeTruthy()
  })

  it('Musa reads only his own loan', () => {
    draw(S.boards.musa)
    expect(screen.getByText('Your repayment of KES 12,000 fell due on 12 October, and it is not paid yet. You promised to pay by Friday 23 October.')).toBeTruthy()
    expect(text()).not.toMatch(/Peter|Achieng|Halima/)
  })

  /* The server does not serve a borrower the lead's two sections (21 October), so Musa's board draws neither; Halima's draws both. */
  it('Musa reads neither "Support given, and whether it helped" nor "What the systems show"; Halima reads both', () => {
    draw(S.boards.musa)
    expect(text()).not.toMatch(/Support given|whether it helped|What the systems show|repayment system/)
    document.body.innerHTML = ''
    draw(S.boards.halima)
    expect(screen.getByText('Support given, and whether it helped')).toBeTruthy()
    expect(screen.getByText('What the systems show')).toBeTruthy()
  })
})

describe('the reports', () => {
  it('Wanjiru’s team report on the fee notes, in the full shape', () => {
    render(<MemoryRouter><TheCollectionsTeamReportSections r={S.reports.wanjiru} /></MemoryRouter>)
    for (const h of ['In short', 'What moved', 'What each person said', 'Where people see it differently', 'What this report can’t tell you', 'What I don’t know yet']) {
      expect(screen.getByRole('region', { name: h })).toBeTruthy()
    }
    expect(screen.getByText('Nyota Logistics disputes FN-008. Brian said, “The client says the review was billed twice.”')).toBeTruthy()
    expect(screen.getByText('Whether FN-006 for Baraka Hardware is paid. Aisha said it is, and nothing filed on it shows it.')).toBeTruthy()
  })

  it('Brian’s own report, and Musa’s, about their own only', () => {
    render(<MemoryRouter><TheCollectionsOwnReportSections r={S.reports.brian} /></MemoryRouter>)
    expect(screen.getByRole('region', { name: 'Your report on your fee notes, Monday 19 October' })).toBeTruthy()
    expect(screen.getByText('Send them the engagement letter, by Friday 23 October, for FN-008 for Nyota Logistics.')).toBeTruthy()
    expect(text()).not.toMatch(/Jamii|Upendo|Aisha/)
  })
})

describe('on the board page', () => {
  function renderBoard(payload: any) {
    ;(boardApi.get as any).mockResolvedValue(payload)
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u-wanjiru', leadFirstName: 'Wanjiru', scenario: 'COLLECTIONS', participants: [{ id: 'p-wanjiru', userId: 'u-wanjiru' }, { id: 'p-brian', userId: 'u-brian' }], checkIns: [], roundCompletions: [] })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/grounds/g-muchemi-fee-notes/board']}>
          <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
  }
  const base = (over: any) => ({
    groundId: 'g-muchemi-fee-notes', renders: true, mode: 'SHARED', family: 'PULSE', sections: [], title: 'Fee notes', scenario: 'COLLECTIONS', coverageVariant: 'text',
    lastChangedAt: '2026-10-20T10:00:00.000Z', participants: [{ id: 'p-wanjiru', name: 'Wanjiru Muchemi', managingOnly: false }, { id: 'p-brian', name: 'Brian Otieno', managingOnly: false }],
    myParticipantId: null, canEditFrame: true, readOnlyNote: null, kindOfWork: null, workRecords: [], objectives: [], ...over,
  })

  it('where the server serves the collections board, the page draws it in place of the board', async () => {
    me = { id: 'u-wanjiru', firstName: 'Wanjiru', role: 'LEAD' }
    renderBoard(base({ collections: S.boards.wanjiru, switchboard: { type: 'invoices or fee notes', typeConfirmed: true, board: 'the collections board', reports: 'full' } }))
    expect(await screen.findByText('Are the fee notes being paid, and why not where they aren’t?')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'See every other part of this board' })).toBeTruthy()
  })

  it('where it does not (Release 2 off), nothing of it is drawn', async () => {
    renderBoard(base({}))
    await screen.findAllByText('Fee notes')
    expect(screen.queryByText('Are the fee notes being paid, and why not where they aren’t?')).toBeNull()
    expect(document.querySelector('[data-collections-board]')).toBeNull()
  })
})
