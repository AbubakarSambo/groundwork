import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'
import { TheGoalsYouCanChange } from './TheGoalsYouCanChange'

/**
 * ADDING A GOAL ON THE DESK AND TYING CHECK-INS TO IT, AS EACH READER SEES IT (Hafsah, 21 November 2026). Who may change what is the
 * server's (api/src/modules/grounds/the-goals-on-the-desk-as-each-reader-changes-them.spec.ts); here, what each reader reads.
 *
 * UPDATED 24 November 2026 (page audit row 3, approved by Hafsah): the goals are not listed a second time under the priority cards, which
 * already say who owns each and what feeds it. There is one "Add or change a goal"; it opens the editor (and #goals opens it too), where
 * each goal is its name and "Change it". So the specs open it first, and no longer look for the goal's sentence or the empty sentence.
 */
vi.mock('@/api/company', () => ({ companyApi: { goals: vi.fn(), addGoal: vi.fn(), changeGoal: vi.fn() } }))
import { companyApi } from '@/api/company'

const WAIRIMUS = {
  mayChange: true, mayChooseOwner: false,
  goals: [{ id: 's-1', title: 'Grow supermarket sales', owner: 'Wairimu Njoroge', ownerId: 'p-w', wordsChangedHere: false, checkIns: [], fedBy: 'No check-in feeds this goal yet.' }],
  checkIns: [{ id: 'g-sales', label: 'Sales team, Q4', feeds: null }],
}

function open(user: any, at = '/company') {
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={[at]}><TheGoalsYouCanChange /></MemoryRouter></QueryClientProvider>)
}
const theEditor = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'Add or change a goal' }))
  return screen.getByRole('heading', { name: 'Add or change a goal' }).closest('section') as HTMLElement
}

beforeEach(() => { vi.clearAllMocks() })

describe('the goals a reader may change on the Desk', () => {
  it('Amani, a member, is not asked the server at all and reads nothing here', async () => {
    open({ id: 'u-a', role: 'MEMBER' })
    await new Promise(r => setTimeout(r, 0))
    expect(companyApi.goals).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Add a goal' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Add or change a goal' })).toBeNull()
  })

  it('a reader the server says may change nothing reads nothing here', async () => {
    ;(companyApi.goals as any).mockResolvedValue({ mayChange: false })
    open({ id: 'u-x', role: 'LEAD' })
    await waitFor(() => expect(companyApi.goals).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: 'Add a goal' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Add or change a goal' })).toBeNull()
  })

  it('Wairimu opens the one "Add or change a goal", ties her check-in to her goal, and is told its words are changed in her organisation’s own system', async () => {
    ;(companyApi.goals as any).mockResolvedValue(WAIRIMUS)
    ;(companyApi.changeGoal as any).mockResolvedValue({ ...WAIRIMUS, goals: [{ ...WAIRIMUS.goals[0], checkIns: [{ id: 'g-sales', label: 'Sales team, Q4' }], fedBy: 'Fed by Sales team, Q4.' }] })
    open({ id: 'u-w', role: 'LEAD' })
    expect(screen.queryByText('Grow supermarket sales')).toBeNull()
    const s = await theEditor()
    expect(within(s).getByText('Grow supermarket sales')).toBeInTheDocument()
    expect(within(s).queryByText(/is responsible for this/)).toBeNull()
    fireEvent.click(within(s).getByRole('button', { name: 'Change Grow supermarket sales' }))
    expect(within(s).getByText('This goal came from your organisation’s own system, so its words are changed there. You can still choose which check-ins feed it.')).toBeInTheDocument()
    expect(within(s).queryByRole('button', { name: 'Add a goal' })).toBeNull()
    fireEvent.click(within(s).getByRole('checkbox', { name: /Sales team, Q4/ }))
    fireEvent.click(within(s).getByRole('button', { name: 'Save the changes' }))
    await waitFor(() => expect(companyApi.changeGoal).toHaveBeenCalledWith('s-1', { checkInIds: ['g-sales'] }))
    expect(await within(s).findByRole('button', { name: 'Change Grow supermarket sales' })).toBeInTheDocument()
  })

  it('Grace adds a goal, chooses who is responsible, and ties a check-in to it', async () => {
    ;(companyApi.goals as any).mockResolvedValue({ mayChange: true, mayChooseOwner: true, goals: [], checkIns: [{ id: 'g-stock', label: 'The new stock system', feeds: 'Every depot on the new stock system' }], people: [{ id: 'p-b', name: 'Baraka Mutua' }] })
    ;(companyApi.addGoal as any).mockResolvedValue({ mayChange: true, mayChooseOwner: true, goals: [], checkIns: [], people: [] })
    open({ id: 'u-g', role: 'ADMIN' })
    const s = await theEditor()
    fireEvent.click(within(s).getByRole('button', { name: 'Add a goal' }))
    expect(within(s).getByText(/It feeds Every depot on the new stock system now, so choosing it here moves it to this goal\./)).toBeInTheDocument()
    fireEvent.change(within(s).getByLabelText('What the goal is'), { target: { value: 'Hire two drivers' } })
    fireEvent.change(within(s).getByLabelText('Who is responsible for it'), { target: { value: 'p-b' } })
    fireEvent.click(within(s).getByRole('checkbox', { name: /The new stock system/ }))
    fireEvent.click(within(s).getByRole('button', { name: 'Add it to the Desk' }))
    await waitFor(() => expect(companyApi.addGoal).toHaveBeenCalledWith({ checkInIds: ['g-stock'], title: 'Hire two drivers', measure: null, target: null, ownerId: 'p-b' }))
  })

  it('arriving at #goals (Company context) opens the editor straight away', async () => {
    ;(companyApi.goals as any).mockResolvedValue(WAIRIMUS)
    open({ id: 'u-w', role: 'LEAD' }, '/company#goals')
    expect(await screen.findByRole('heading', { name: 'Add or change a goal' })).toBeInTheDocument()
  })
})
