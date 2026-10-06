import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LeavingBoardPage } from './LeavingBoardPage'
import { useAuthStore } from '@/stores/auth'
import type { LeavingBoard } from '@/api/suites'

/**
 * WHEN SOMEONE LEAVES (E5, #/suite/leaving), AS AN ADMIN SEES IT, AND WHAT EVERYBODY ELSE READS. Who is
 * served what is tested on the server (api/src/modules/suites/the-leaving-board-as-each-reader-reads-it.spec.ts).
 * Here: the prototype's words (suite-leaving.txt), each step with its owner, and no label on anybody.
 */
vi.mock('@/api/suites', () => ({ leavingApi: { get: vi.fn(), start: vi.fn(), step: vi.fn() } }))
import { leavingApi } from '@/api/suites'

const OWNERS = [{ id: 'u-g', name: 'Grace Achieng' }, { id: 'u-k', name: 'Kamau Njenga' }, { id: 'u-w', name: 'Wairimu Kamau' }]
const TOM = {
  id: 'l-tom', name: 'Tom Odhiambo', firstName: 'Tom', lastDay: '2099-10-09', done: 0, of: 4, handover: null,
  steps: [
    { step: 'handover' as const, ownerId: 'u-w', ownerName: 'Wairimu Kamau', done: false },
    { step: 'equipment' as const, ownerId: 'u-k', ownerName: 'Kamau Njenga', done: false },
    { step: 'access' as const, ownerId: 'u-g', ownerName: 'Grace Achieng', done: false },
    { step: 'pay' as const, ownerId: 'u-g', ownerName: 'Grace Achieng', done: false },
  ],
}
const BOARD: LeavingBoard = {
  lists: [TOM],
  departures: [{ personId: 'p-samuel', name: 'Samuel Njoroge', departedOn: '2026-09-15' }],
  people: [{ id: 'p-tom', name: 'Tom Odhiambo' }, { id: 'p-miriam', name: 'Miriam Wanjiku' }],
  owners: OWNERS,
  strain: [{ team: 'Operations', says: 'For 3 check-ins in a row, two people in Operations said their workload is too high.' }],
}

const GRACE = { id: 'u-g', firstName: 'Grace', role: 'ADMIN', organizationName: 'Baridi Appliances' }
const WAIRIMU = { id: 'u-w', firstName: 'Wairimu', role: 'LEAD', organizationName: 'Baridi Appliances' }

function open(user: any, served: LeavingBoard | Error) {
  if (served instanceof Error) (leavingApi.get as any).mockRejectedValue(served)
  else (leavingApi.get as any).mockResolvedValue(served)
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/suite/leaving']}><LeavingBoardPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}
const refusal = (status: number, message: string) => Object.assign(new Error(String(status)), { response: { status, data: { message } } })
const text = () => document.body.textContent ?? ''

beforeEach(() => { vi.clearAllMocks() })

describe('Grace, an admin', () => {
  it('reads the way back, the heading and the prototype’s sentence', async () => {
    open(GRACE, BOARD)
    expect(await screen.findByRole('heading', { level: 2, name: 'Tom Odhiambo leaves on 9 October' })).toBeInTheDocument()
    /* "Where you are" is the shared PageTitle crumb's own aria-label (group 2, piece 4 rebuild),
       in place of the page's prior "Breadcrumb". */
    expect(screen.getByRole('navigation', { name: 'Where you are' }).textContent).toBe('Suites/When someone leaves')
    expect(screen.getByRole('heading', { level: 1, name: 'When someone leaves' })).toBeInTheDocument()
    expect(screen.getByText('Everything that has to happen when someone leaves, each with an owner, so nothing is forgotten.')).toBeInTheDocument()
  })

  it('reads Tom’s four steps, each with its owner and "Mark done", and "0 of 4 done"', async () => {
    open(GRACE, BOARD)
    const region = await screen.findByRole('region', { name: 'Tom Odhiambo leaves on 9 October' })
    expect(within(region).getByText('0 of 4 done')).toBeInTheDocument()
    const rows = [...region.querySelectorAll('li')]
    expect(rows.map(r => r.querySelector('b')?.textContent)).toEqual([
      'Hand over Tom’s work', 'Collect Tom’s laptop and phone', 'Remove Tom’s access on their last day', 'Work out Tom’s final pay',
    ])
    expect(rows.map(r => (r.querySelector('select') as HTMLSelectElement).selectedOptions[0].textContent)).toEqual([
      'Wairimu Kamau', 'Kamau Njenga', 'Grace Achieng', 'Grace Achieng',
    ])
    /* FAULT 7C OF THE LIVE WALK (6 October): the aria-label reads as a phrase, "Mark "..." as
       done", not "Mark done: ..." stapled together with a colon - the visible button text stays
       "Mark done". */
    expect(within(region).getAllByRole('button', { name: /^Mark “.+” as done$/ })).toHaveLength(4)
    expect(within(region).getAllByText('Mark done')).toHaveLength(4)
  })

  it('marking a step done and changing its owner go to the server', async () => {
    open(GRACE, BOARD)
    ;(leavingApi.step as any).mockResolvedValue({ ...BOARD, lists: [{ ...TOM, done: 1, steps: TOM.steps.map(s => (s.step === 'equipment' ? { ...s, done: true } : s)) }] })
    fireEvent.click(await screen.findByRole('button', { name: 'Mark “Collect Tom’s laptop and phone” as done' }))
    await waitFor(() => expect(leavingApi.step).toHaveBeenCalledWith('l-tom', 'equipment', { ownerUserId: undefined, done: true }))
    expect(await screen.findByText('1 of 4 done')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Undo marking “Collect Tom’s laptop and phone” as done' })).toBeInTheDocument()
    fireEvent.change(screen.getAllByLabelText('Who does this')[0], { target: { value: 'u-g' } })
    await waitFor(() => expect(leavingApi.step).toHaveBeenCalledWith('l-tom', 'handover', { ownerUserId: 'u-g', done: undefined }))
  })

  it('reads who took over, from the product’s own handover, and nothing of what was in it', async () => {
    open(GRACE, { ...BOARD, lists: [{ ...TOM, name: 'Samuel Njoroge', firstName: 'Samuel', lastDay: '2026-09-15', handover: { to: 'Aisha Otieno', on: '2026-09-15' } }], departures: [] })
    expect(await screen.findByRole('heading', { level: 2, name: 'Samuel Njoroge left on 15 September' })).toBeInTheDocument()
    expect(screen.getByText('Hand over Samuel’s work to Aisha')).toBeInTheDocument()
    expect(screen.getByText('Aisha Otieno has the handover of Samuel’s role, since 15 September.')).toBeInTheDocument()
  })

  it('is offered a list for somebody who already left, and can start one for a coming last day', async () => {
    open(GRACE, BOARD)
    const already = await screen.findByRole('region', { name: 'Already left, with no list yet' })
    expect(within(already).getByText('Samuel Njoroge left on 15 September.')).toBeInTheDocument()
    ;(leavingApi.start as any).mockResolvedValue(BOARD)
    fireEvent.click(within(already).getByRole('button', { name: 'Start the list for Samuel Njoroge' }))
    await waitFor(() => expect(leavingApi.start).toHaveBeenCalledWith('p-samuel', '2026-09-15'))
    const form = screen.getByRole('region', { name: 'Start a list' })
    const go = within(form).getByRole('button', { name: 'Start the list' })
    expect(go).toBeDisabled()
    fireEvent.change(within(form).getByLabelText('Who is leaving'), { target: { value: 'p-miriam' } })
    fireEvent.change(within(form).getByLabelText('Their last day'), { target: { value: '2026-11-30' } })
    fireEvent.click(go)
    await waitFor(() => expect(leavingApi.start).toHaveBeenCalledWith('p-miriam', '2026-11-30'))
  })

  it('reads a sign that a team is under strain, for the team, with the prototype’s promise', async () => {
    open(GRACE, BOARD)
    const region = await screen.findByRole('region', { name: 'Signs a team is under strain' })
    expect(within(region).getByText('For 3 check-ins in a row, two people in Operations said their workload is too high.')).toBeInTheDocument()
    expect(within(region).getByText('This is shown for the team, never for one named person, and nobody is scored.')).toBeInTheDocument()
  })

  it('never shows a label, or the prototype’s lines that are not true here', async () => {
    open(GRACE, BOARD)
    await screen.findByRole('heading', { level: 2, name: 'Tom Odhiambo leaves on 9 October' })
    expect(text()).not.toMatch(/\b(exit|at risk|flight risk|PIP|fired|score \d)\b/i)
    expect(text()).not.toMatch(/keeps his own history|handover page gives/)
  })

  it('says so plainly when nobody is leaving', async () => {
    open(GRACE, { ...BOARD, lists: [], departures: [], strain: [] })
    expect(await screen.findByText('Nobody is leaving.')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Signs a team is under strain' })).toBeNull()
  })
})

describe('everybody else', () => {
  it('Wairimu, a lead, reads the server’s refusal, and no list', async () => {
    open(WAIRIMU, refusal(403, 'Only an admin can open this board.'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Only an admin can open this board.')
    expect(screen.queryAllByRole('heading', { level: 2 })).toHaveLength(0)
  })
})
