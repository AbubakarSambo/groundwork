import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'
import { TheGoalsYouCanChange } from './TheGoalsYouCanChange'

/**
 * ADDING A GOAL ON THE DESK AND TYING CHECK-INS TO IT, AS EACH READER SEES IT (Hafsah, 21 November 2026). Who may change what is the
 * server's (api/src/modules/grounds/the-goals-on-the-desk-as-each-reader-changes-them.spec.ts); here, what each reader reads.
 */
vi.mock('@/api/company', () => ({ companyApi: { goals: vi.fn(), addGoal: vi.fn(), changeGoal: vi.fn() } }))
import { companyApi } from '@/api/company'

const WAIRIMUS = {
  mayChange: true, mayChooseOwner: false,
  goals: [{ id: 's-1', title: 'Grow supermarket sales', owner: 'Wairimu Njoroge', ownerId: 'p-w', wordsChangedHere: false, checkIns: [], fedBy: 'No check-in feeds this goal yet.' }],
  checkIns: [{ id: 'g-sales', label: 'Sales team, Q4', feeds: null }],
}

function open(user: any) {
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter><TheGoalsYouCanChange /></MemoryRouter></QueryClientProvider>)
}

beforeEach(() => { vi.clearAllMocks() })

describe('the goals a reader may change on the Desk', () => {
  it('Amani, a member, is not asked the server at all and reads nothing here', async () => {
    open({ id: 'u-a', role: 'MEMBER' })
    await new Promise(r => setTimeout(r, 0))
    expect(companyApi.goals).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Add a goal' })).toBeNull()
  })

  it('a reader the server says may change nothing reads nothing here', async () => {
    ;(companyApi.goals as any).mockResolvedValue({ mayChange: false })
    open({ id: 'u-x', role: 'LEAD' })
    await waitFor(() => expect(companyApi.goals).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: 'Add a goal' })).toBeNull()
  })

  it('Wairimu reads her goal in sentences, ties her check-in to it, and is told its words are changed in her organisation’s own system', async () => {
    ;(companyApi.goals as any).mockResolvedValue(WAIRIMUS)
    ;(companyApi.changeGoal as any).mockResolvedValue({ ...WAIRIMUS, goals: [{ ...WAIRIMUS.goals[0], checkIns: [{ id: 'g-sales', label: 'Sales team, Q4' }], fedBy: 'Fed by Sales team, Q4.' }] })
    open({ id: 'u-w', role: 'LEAD' })
    const s = (await screen.findByRole('heading', { name: 'Your goals, and the check-ins that feed them' })).closest('section') as HTMLElement
    expect(within(s).getByText('Wairimu Njoroge is responsible for this. No check-in feeds this goal yet.')).toBeInTheDocument()
    fireEvent.click(within(s).getByRole('button', { name: 'Change Grow supermarket sales' }))
    expect(within(s).getByText('This goal came from your organisation’s own system, so its words are changed there. You can still choose which check-ins feed it.')).toBeInTheDocument()
    expect(within(s).queryByRole('button', { name: 'Add a goal' })).toBeNull()
    fireEvent.click(within(s).getByRole('checkbox', { name: /Sales team, Q4/ }))
    fireEvent.click(within(s).getByRole('button', { name: 'Save the changes' }))
    await waitFor(() => expect(companyApi.changeGoal).toHaveBeenCalledWith('s-1', { checkInIds: ['g-sales'] }))
    expect(await within(s).findByText('Wairimu Njoroge is responsible for this. Fed by Sales team, Q4.')).toBeInTheDocument()
  })

  it('Grace adds a goal, chooses who is responsible, and ties a check-in to it', async () => {
    ;(companyApi.goals as any).mockResolvedValue({ mayChange: true, mayChooseOwner: true, goals: [], checkIns: [{ id: 'g-stock', label: 'The new stock system', feeds: 'Every depot on the new stock system' }], people: [{ id: 'p-b', name: 'Baraka Mutua' }] })
    ;(companyApi.addGoal as any).mockResolvedValue({ mayChange: true, mayChooseOwner: true, goals: [], checkIns: [], people: [] })
    open({ id: 'u-g', role: 'ADMIN' })
    const s = (await screen.findByRole('heading', { name: 'Add or change a goal' })).closest('section') as HTMLElement
    expect(within(s).getByText('There are no goals on the Desk yet. Add the first one, and choose the check-ins that feed it.')).toBeInTheDocument()
    fireEvent.click(within(s).getByRole('button', { name: 'Add a goal' }))
    expect(within(s).getByText(/It feeds Every depot on the new stock system now, so choosing it here moves it to this goal\./)).toBeInTheDocument()
    fireEvent.change(within(s).getByLabelText('What the goal is'), { target: { value: 'Hire two drivers' } })
    fireEvent.change(within(s).getByLabelText('Who is responsible for it'), { target: { value: 'p-b' } })
    fireEvent.click(within(s).getByRole('checkbox', { name: /The new stock system/ }))
    fireEvent.click(within(s).getByRole('button', { name: 'Add it to the Desk' }))
    await waitFor(() => expect(companyApi.addGoal).toHaveBeenCalledWith({ checkInIds: ['g-stock'], title: 'Hire two drivers', measure: null, target: null, ownerId: 'p-b' }))
  })
})
