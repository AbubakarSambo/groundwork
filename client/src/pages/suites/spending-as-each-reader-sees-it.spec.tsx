import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SpendingPage } from './SpendingPage'
import { useAuthStore } from '@/stores/auth'
import type { SpendBoard } from '@/api/suites'

/**
 * SPENDING AND BUDGETS (E7, #/suite/spend), AS EACH READER SEES IT. Who is served what is tested on
 * the server (api/src/modules/suites/the-spending-as-each-reader-reads-it.spec.ts). Here: the
 * prototype's words (suite-spend.txt), word for word, for Grace (an admin) and Fatuma (a lead), and
 * what everybody else reads.
 */
vi.mock('@/api/suites', () => ({ spendApi: { get: vi.fn(), decide: vi.fn(), setBudget: vi.fn(), ask: vi.fn() } }))
import { spendApi } from '@/api/suites'

const KAMAU = {
  id: 's-1', name: 'Kamau Njenga', firstName: 'Kamau', amount: 18000, what: 'fuel for Kisumu deliveries', team: 'Operations',
  says: 'Kamau: KES 18,000 for fuel for Kisumu deliveries',
  left: 38000, over: false, approver: { kind: 'manager' as const }, mayDecide: false,
  where: 'It is waiting for Fatuma.', category: null as string | null, needs: [] as string[], questions: [] as string[],
}
const LINA = {
  id: 's-2', name: 'Lina Mutua', firstName: 'Lina', amount: 95000, what: 'a new laptop', team: 'Product',
  says: 'Lina: KES 95,000 for a new laptop',
  left: 60000, over: true, approver: { kind: 'person' as const, firstName: 'Grace' }, mayDecide: true,
  where: 'It is waiting for you.', category: null as string | null, needs: [] as string[], questions: [] as string[],
}
const GRACES: SpendBoard = {
  currency: 'KES', limit: 20000, waiting: [KAMAU, LINA],
  budgets: [
    { team: 'Sales', budget: 400000, spent: 310000, left: 90000 },
    { team: 'Operations', budget: 250000, spent: 212000, left: 38000 },
    { team: 'Product', budget: 120000, spent: 60000, left: 60000 },
  ],
  teams: ['Operations', 'Product', 'Sales'],
}
const FATUMAS: SpendBoard = {
  currency: 'KES', limit: 20000, waiting: [{ ...KAMAU, mayDecide: true }],
  budgets: [{ team: 'Operations', budget: 250000, spent: 212000, left: 38000 }], teams: [],
}

const GRACE = { id: 'u-g', firstName: 'Grace', role: 'ADMIN', organizationName: 'Baridi Appliances' }
const FATUMA = { id: 'u-f', firstName: 'Fatuma', role: 'LEAD', organizationName: 'Baridi Appliances' }
const MIRIAM = { id: 'u-m', firstName: 'Miriam', role: 'MEMBER', organizationName: 'Baridi Appliances' }

function open(user: any, served: SpendBoard | Error) {
  if (served instanceof Error) (spendApi.get as any).mockRejectedValue(served)
  else (spendApi.get as any).mockResolvedValue(served)
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/suite/spend']}><SpendingPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}
const refusal = (status: number, message: string) => Object.assign(new Error(String(status)), { response: { status, data: { message } } })
/* "Waiting for a yes or no" is now the shared RowList's own list (group 2, piece 4 rebuild), in
   place of the page's prior .gw-leave-row class - found by its list's accessible name instead. */
const requests = () => {
  const list = screen.queryByRole('list', { name: 'Waiting for a yes or no' })
  return list ? [...list.querySelectorAll('li')].map(li => [li.querySelector('b')?.textContent, [...li.querySelectorAll('p')].map(p => p.textContent).join(' ')]) : []
}
const rows = () => [...document.querySelectorAll('tbody tr')].map(tr => [...tr.children].map(c => c.textContent))

beforeEach(() => { vi.clearAllMocks() })

describe('Grace, an admin', () => {
  it('reads the way back, the heading and the prototype’s sentence', async () => {
    open(GRACE, GRACES)
    expect(await screen.findByRole('heading', { level: 2, name: 'Waiting for a yes or no' })).toBeInTheDocument()
    /* "Where you are" is the shared PageTitle crumb's own aria-label (group 2, piece 4 rebuild),
       in place of the page's prior "Breadcrumb". */
    expect(screen.getByRole('navigation', { name: 'Where you are' }).textContent).toBe('Suites/Spending and budgets')
    expect(screen.getByRole('heading', { level: 1, name: 'Spending and budgets' })).toBeInTheDocument()
    expect(screen.getByText('People ask to spend by telling Groundwork. It checks the budget and the rules, then sends the request to the right person.')).toBeInTheDocument()
  })

  it('reads each request as the prototype writes it, with Approve and Decline only where she decides', async () => {
    open(GRACE, GRACES)
    await screen.findByText('Kamau: KES 18,000 for fuel for Kisumu deliveries')
    expect(requests()).toEqual([
      ['Kamau: KES 18,000 for fuel for Kisumu deliveries', 'Operations has KES 38,000 left this month. It is waiting for Fatuma.'],
      ['Lina: KES 95,000 for a new laptop', 'This is over KES 20,000. Product has KES 60,000 left this month. It is waiting for you.'],
    ])
    expect(screen.queryByRole('button', { name: 'Approve Kamau’s request' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Approve Lina’s request' })).toHaveTextContent('Approve')
    expect(screen.getByRole('button', { name: 'Decline Lina’s request' })).toHaveTextContent('Decline')
  })

  it('reads each team’s budget this month, as the prototype’s table', async () => {
    open(GRACE, GRACES)
    await screen.findByRole('table')
    expect(screen.getByRole('heading', { level: 2, name: 'Each team’s budget this month' })).toBeInTheDocument()
    expect([...document.querySelectorAll('thead th')].map(th => th.textContent)).toEqual(['Team', 'Budget', 'Spent so far', 'Left'])
    expect(rows()).toEqual([
      ['Sales', '400,000', '310,000', '90,000'],
      ['Operations', '250,000', '212,000', '38,000'],
      ['Product', '120,000', '60,000', '60,000'],
    ])
    expect(screen.getByText('Spending comes from the requests people make here.')).toBeInTheDocument()
    expect(screen.queryByText(/accounting tool/)).toBeNull()
  })

  it('approves Lina’s, and reads the board the server gives back', async () => {
    (spendApi.decide as any).mockResolvedValue({ ...GRACES, waiting: [KAMAU] })
    open(GRACE, GRACES)
    fireEvent.click(await screen.findByRole('button', { name: 'Approve Lina’s request' }))
    await waitFor(() => expect(screen.queryByText('Lina: KES 95,000 for a new laptop')).toBeNull())
    expect(spendApi.decide).toHaveBeenCalledWith('s-2', 'approve')
  })

  it('sets a team’s budget for this month', async () => {
    (spendApi.setBudget as any).mockResolvedValue(GRACES)
    open(GRACE, GRACES)
    const form = within(await screen.findByRole('region', { name: 'Set a team’s budget for this month' }))
    fireEvent.change(form.getByLabelText('Team'), { target: { value: 'Sales' } })
    fireEvent.change(form.getByLabelText('Budget'), { target: { value: '450000' } })
    fireEvent.click(form.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(spendApi.setBudget).toHaveBeenCalledWith('Sales', 450000))
  })

  it('reads a team that has spent more than its budget, and requests with nobody named', async () => {
    open(GRACE, {
      ...GRACES,
      waiting: [{ ...LINA, left: -35000, approver: { kind: 'admin' } }, { ...KAMAU, team: null, left: null, approver: { kind: 'admin' } }],
      budgets: [{ team: 'Product', budget: 120000, spent: 155000, left: -35000 }],
    })
    await screen.findByRole('table')
    expect(requests()).toEqual([
      ['Lina: KES 95,000 for a new laptop', 'This is over KES 20,000. Product is KES 35,000 over its budget this month. It is waiting for you.'],
      ['Kamau: KES 18,000 for fuel for Kisumu deliveries', 'It is waiting for Fatuma.'],
    ])
    expect(rows()).toEqual([['Product', '120,000', '155,000', '35,000 over']])
  })

  it('reads plain sentences when nothing waits and no budget is set', async () => {
    open(GRACE, { ...GRACES, waiting: [], budgets: [] })
    expect(await screen.findByText('Nothing is waiting for a yes or no.')).toBeInTheDocument()
    expect(screen.getByText('No budget is set for this month.')).toBeInTheDocument()
  })

  it('no label on anybody', async () => {
    open(GRACE, GRACES)
    await screen.findByRole('table')
    expect(document.body.textContent).not.toMatch(/\b(PIP|exit|at risk|score|rating)\b/i)
  })
})

describe('what the server says about each request is drawn, not the screen’s own line', () => {
  const FUEL = {
    ...KAMAU, id: 's-3', name: 'Chidi Okeke', firstName: 'Chidi', amount: 12000, what: 'fuel for the Kisumu trip', team: 'Sales', left: 26000,
    says: 'Chidi: KES 12,000 for fuel for the Kisumu trip',
    mayDecide: false, where: 'Wairimu has approved it, and it is now waiting for Omar in finance.', category: 'Fuel',
    needs: ['Spending on Fuel needs a receipt.'],
    questions: ['You asked Chidi on 5 October, “Is this for the Kisumu van?”', 'Chidi answered on 6 October, “Yes, the van.”'],
  }
  it('a request waiting for finance never says the lead can approve it', async () => {
    open(GRACE, { ...GRACES, waiting: [FUEL] })
    await screen.findByRole('table')
    expect(requests()).toEqual([[
      'Chidi: KES 12,000 for fuel for the Kisumu trip',
      'Sales has KES 26,000 left this month. Wairimu has approved it, and it is now waiting for Omar in finance. Spending on Fuel needs a receipt. You asked Chidi on 5 October, “Is this for the Kisumu van?” Chidi answered on 6 October, “Yes, the van.”',
    ]])
    expect(document.body.textContent).not.toMatch(/lead can approve|An admin can approve/)
    expect(screen.getByText('Fuel')).toBeInTheDocument()
  })

  it('asks the person a question and reads the server’s board with the question in it', async () => {
    const asked = { ...KAMAU, mayDecide: true, questions: ['You asked Kamau on 4 October, “Is this for the Kisumu van?”'] }
    ;(spendApi.ask as any).mockResolvedValue({ ...FATUMAS, waiting: [asked] })
    open(FATUMA, FATUMAS)
    await screen.findByText('Kamau: KES 18,000 for fuel for Kisumu deliveries')
    fireEvent.click(screen.getByRole('button', { name: 'Ask Kamau a question' }))
    fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'Is this for the Kisumu van?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send the question' }))
    await waitFor(() => expect(spendApi.ask).toHaveBeenCalledWith('s-1', 'Is this for the Kisumu van?'))
    expect(await screen.findByText('You asked Kamau on 4 October, “Is this for the Kisumu van?”')).toBeInTheDocument()
  })

  /*
   * Fault 5 of the live walk: "How people use it" dropped the prototype's own example chat. It is
   * back now, drawn with the shared Bubble: the prototype's own example names nobody from this
   * organisation, so it is copied as it stands.
   */
  it('says where people use it, with the prototype’s example chat', async () => {
    open(GRACE, GRACES)
    const how = await screen.findByRole('region', { name: 'How people use it' })
    expect(within(how).getByText('Can I spend KES 18,000 on fuel for the Kisumu deliveries?')).toBeInTheDocument()
    expect(within(how).getByText('Operations has KES 38,000 left this month, so yes, that fits. I have sent it to your lead to approve.')).toBeInTheDocument()
    expect(within(how).getByText('In their check-in, in chat, or on WhatsApp. Nobody fills in a form.')).toBeInTheDocument()
  })

  /*
   * Fault 6 of the live walk: Decline went through with no reason asked, so the person reads a
   * decline with no "why" (the server already carries one, told to them word for word, through
   * `declineReason` on the decline endpoint). "Say why" is optional - Decline still works with it
   * left blank.
   */
  it('asks why before declining, and sends what was said in the reason the server’s decline endpoint takes', async () => {
    (spendApi.decide as any).mockResolvedValue({ ...GRACES, waiting: [KAMAU] })
    open(GRACE, GRACES)
    fireEvent.click(await screen.findByRole('button', { name: 'Decline Lina’s request' }))
    expect(spendApi.decide).not.toHaveBeenCalled()
    const say = screen.getByLabelText('Say why (optional)')
    fireEvent.change(say, { target: { value: 'The budget is needed for the Kisumu deliveries.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Decline' }))
    await waitFor(() => expect(spendApi.decide).toHaveBeenCalledWith('s-2', 'decline', 'The budget is needed for the Kisumu deliveries.'))
  })

  it('declines with no reason when none is said', async () => {
    (spendApi.decide as any).mockResolvedValue({ ...GRACES, waiting: [KAMAU] })
    open(GRACE, GRACES)
    fireEvent.click(await screen.findByRole('button', { name: 'Decline Lina’s request' }))
    fireEvent.click(screen.getByRole('button', { name: 'Decline' }))
    await waitFor(() => expect(spendApi.decide).toHaveBeenCalledWith('s-2', 'decline', undefined))
  })
})

describe('the way to the requests for finance', () => {
  it('Grace, an admin, is offered the requests for finance, and Fatuma, a lead, is not', async () => {
    const { unmount } = open(GRACE, { ...GRACES, reader: 'admin' })
    const link = await screen.findByRole('link', { name: 'Open the requests for finance' })
    expect(link).toHaveAttribute('href', '/suite/spend/finance')
    unmount()
    open(FATUMA, { ...FATUMAS, reader: 'lead' })
    await screen.findByText('Kamau: KES 18,000 for fuel for Kisumu deliveries')
    expect(screen.queryByRole('link', { name: 'Open the requests for finance' })).toBeNull()
  })
})

describe('Fatuma, a lead', () => {
  it('reads only her team’s request and budget, decides Kamau’s, and cannot set a budget', async () => {
    open(FATUMA, FATUMAS)
    await screen.findByText('Kamau: KES 18,000 for fuel for Kisumu deliveries')
    expect(screen.getByRole('button', { name: 'Approve Kamau’s request' })).toBeInTheDocument()
    expect(rows()).toEqual([['Operations', '250,000', '212,000', '38,000']])
    expect(screen.queryByRole('region', { name: 'Set a team’s budget for this month' })).toBeNull()
  })
})

describe('everybody else', () => {
  it('Miriam, a member, reads the server’s refusal', async () => {
    open(MIRIAM, refusal(403, 'Only an admin or a lead can open this board.'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Only an admin or a lead can open this board.')
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('while the suite is off, the server says so', async () => {
    open(GRACE, refusal(404, 'The spending suite is not switched on.'))
    expect(await screen.findByRole('alert')).toHaveTextContent('The spending suite is not switched on.')
  })
})

/*
 * B-155. A category tag ran straight into the sentence before it with no space - "...for the
 * Mombasa depotLabels" - because nothing separated the two inline elements.
 */
describe('B-155: a category tag never runs into the sentence before it', () => {
  it('reads with a space between the line and its tag', async () => {
    open(GRACE, { ...GRACES, waiting: [{ ...KAMAU, category: 'Fuel' }] })
    const item = (await screen.findByRole('list', { name: 'Waiting for a yes or no' })).querySelector('li')!
    expect(item.textContent).not.toMatch(/\wFuel\b/)
    expect(item.textContent).toMatch(/\sFuel\b/)
  })
})
