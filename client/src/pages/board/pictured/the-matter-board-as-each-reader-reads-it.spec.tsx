import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TheMatterBoard } from './TheMatterBoard'
import { TheCollectionsBoard } from './TheCollectionsBoard'
import { BoardPage } from '../BoardPage'
import { boardApi } from '@/api/board'
import { groundsApi } from '@/api/grounds'
import SERVED from './__fixtures__/matter-served.json'

/**
 * THE MATTER BOARD, AND THE FEE NOTES THAT FELL DUE ON AN EVENT, AS EACH PERSON READS THEM ON SCREEN (Release 2, pull request 3 of 3).
 * What is drawn here is exactly what the server serves each reader for Muchemi & Co (test) after the litigation daily's week: the
 * JSON is the server's own output (api/src/modules/board/the-matter-served-to-the-screen.spec.ts checks the two never differ). The
 * screen words nothing of its own; it lays the served board out in the picture's order (matter-board.jpg).
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
const draw = (board: any) => render(<MemoryRouter><TheMatterBoard board={board} /></MemoryRouter>)
const text = () => document.body.textContent ?? ''

describe('Wanjiru, the partner, reads every matter, each with one line for its fees', () => {
  it('the matters, where each stands, and the fees line under each', () => {
    draw(S.matter.wanjiru)
    expect(screen.getByText('Two matters are on record in this check-in, Kasarani Foods v. Tumaini Traders and Jamii Clinics employment claim.')).toBeTruthy()
    const kasarani = document.querySelector('[data-matter="kasarani foods v tumaini traders"]') as HTMLElement
    expect(within(kasarani).getByText('The hearing in Kasarani Foods v. Tumaini Traders is due on Thursday 12 November. Nothing is in the way that has not been cleared.')).toBeTruthy()
    expect(within(kasarani).getByText('There are three fee notes on this matter, for KES 750,000 in all. FN-004 is paid, with proof. FN-005 fell due on 20 October, when the reply was filed. The fee note not raised yet fell due on 21 October, when the hearing date was set.')).toBeTruthy()
    expect(screen.getByText('There is one fee note on this matter, for KES 180,000. FN-007 was promised for 10 October, and the date passed.')).toBeTruthy()
  })

  it('what she needs to decide beside it, and what changed this week and what it changed, with the legend', () => {
    draw(S.matter.wanjiru)
    expect(screen.getByText('What you need to decide')).toBeTruthy()
    expect(screen.getByText('Nothing is waiting for a decision yet.')).toBeTruthy()
    const changed = screen.getByRole('region', { name: 'What changed this week, and what it changed' })
    const brian = changed.querySelector('[data-changed="e-lit-brian-2"]') as HTMLElement
    expect(brian.textContent).toBe('Brian, on Kasarani Foods v. Tumaini Traders“In Kasarani Foods v. Tumaini Traders, the reply was filed on 20 October.” It made fee note FN-005 due on 20 October.')
    expect(within(changed).getByRole('list', { name: 'How each line is known' }).textContent).toContain('Said in a check-in, with no document yet')
  })
})

describe('the others read only their own', () => {
  it('Brian: his one matter, his three fee notes as his, nothing to decide', () => {
    draw(S.matter.brian)
    expect(screen.getByText('You have spoken about one matter in this check-in, Kasarani Foods v. Tumaini Traders.')).toBeTruthy()
    expect(screen.getByText(/^You follow up three fee notes on this matter, for KES 750,000 in all\./)).toBeTruthy()
    expect(screen.queryByText('What you need to decide')).toBeNull()
    expect(text()).not.toMatch(/Jamii|David|Aisha/)
  })

  it('David, the paralegal: both matters he spoke of, and that the fees are not shown to him; no amount anywhere', () => {
    draw(S.matter.david)
    expect(screen.getAllByText('You do not follow up a fee note on this matter, so its fees are not shown to you.')).toHaveLength(2)
    expect(text()).not.toMatch(/KES|FN-|Brian|Aisha|Wanjiru/)
  })
})

describe('the fee notes board: what fell due on an event, and the near miss for Wanjiru to confirm', () => {
  it('after Wednesday, both fee notes show under What needs you with the line that said it', () => {
    render(<MemoryRouter><TheCollectionsBoard board={S.feeNotes.wanjiru} /></MemoryRouter>)
    expect(screen.getByText('Fee note FN-005 for Kasarani Foods fell due on 20 October')).toBeTruthy()
    expect(screen.getByText('A fee note for Kasarani Foods fell due on 21 October, and it is not raised yet')).toBeTruthy()
  })

  it('after Tuesday, the near miss is asked with Yes and No, and her answer is sent as the server built it', () => {
    const onAnswer = vi.fn()
    render(<MemoryRouter><TheCollectionsBoard board={S.feeNotes.wanjiruOnTuesday} onAnswer={onAnswer} /></MemoryRouter>)
    expect(screen.getByText('Did the fee note for Kasarani Foods that is not raised yet fall due on 20 October?')).toBeTruthy()
    expect(screen.getByText('It falls due when the hearing date is set. David said in Litigation team daily on 20 October, “Kasarani Foods: the mention date is set for 3 November.” Groundwork cannot tell whether this is the same event, so nothing has changed.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'No, it is not' }))
    expect(onAnswer).toHaveBeenCalledWith({ method: 'POST', path: '/grounds/g-muchemi-fee-notes/board/due-on-an-event/answer', body: { itemId: 'w-kasarani-3', lineId: 'e-lit-david-2', yes: false } })
  })

  it('without an answer to give (anybody but the lead), the question is read and no button is drawn', () => {
    render(<MemoryRouter><TheCollectionsBoard board={S.feeNotes.wanjiruOnTuesday} /></MemoryRouter>)
    expect(screen.queryByRole('button', { name: 'Yes, it is due' })).toBeNull()
  })
})

describe('on the board page', () => {
  function renderBoard(payload: any) {
    ;(boardApi.get as any).mockResolvedValue(payload)
    ;(groundsApi.get as any).mockResolvedValue({ initiatorId: 'u-wanjiru', leadFirstName: 'Wanjiru', scenario: 'PULSE_CHECK', participants: [{ id: 'l-wanjiru', userId: 'u-wanjiru' }, { id: 'l-david', userId: 'u-david' }], checkIns: [], roundCompletions: [] })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/grounds/g-muchemi-litigation/board']}>
          <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
  }
  const base = (over: any) => ({
    groundId: 'g-muchemi-litigation', renders: true, mode: 'SHARED', family: 'PULSE', sections: [], title: 'Litigation team daily', scenario: 'PULSE_CHECK', coverageVariant: 'text',
    lastChangedAt: '2026-10-21T10:00:00.000Z', participants: [{ id: 'l-wanjiru', name: 'Wanjiru Muchemi', managingOnly: false }, { id: 'l-david', name: 'David Mwangi', managingOnly: false }],
    myParticipantId: null, canEditFrame: true, readOnlyNote: null, kindOfWork: 'a law firm matter', workRecords: [], objectives: [], ...over,
  })

  it('where the server serves the matter board, the page draws it in place of the board', async () => {
    me = { id: 'u-wanjiru', firstName: 'Wanjiru', role: 'LEAD' }
    renderBoard(base({ matter: S.matter.wanjiru, switchboard: { type: 'legal matter', typeConfirmed: false, board: 'the matter board', reports: 'full' } }))
    expect(await screen.findByText('Two matters are on record in this check-in, Kasarani Foods v. Tumaini Traders and Jamii Clinics employment claim.')).toBeTruthy()
    expect(document.querySelector('[data-matter-board]')).toBeTruthy()
  })

  it('David, a person in it, reads his own matter board on the page', async () => {
    me = { id: 'u-david', firstName: 'David', role: 'MEMBER' }
    renderBoard(base({ matter: S.matter.david, myParticipantId: 'l-david' }))
    expect(await screen.findByText('You have spoken about two matters in this check-in, Kasarani Foods v. Tumaini Traders and Jamii Clinics employment claim.')).toBeTruthy()
    expect(text()).not.toMatch(/KES|FN-/)
  })

  it('where it does not (Release 2 off), nothing of it is drawn', async () => {
    me = { id: 'u-wanjiru', firstName: 'Wanjiru', role: 'LEAD' }
    renderBoard(base({}))
    await screen.findAllByText('Litigation team daily')
    expect(document.querySelector('[data-matter-board]')).toBeNull()
  })
})
