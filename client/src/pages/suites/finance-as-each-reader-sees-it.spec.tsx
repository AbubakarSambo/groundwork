import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FinancePage } from './FinancePage'
import { useAuthStore } from '@/stores/auth'
import type { FinanceView, TheMonthsTotals } from '@/api/suites'

/**
 * THE REQUESTS FOR FINANCE (#/suite/spend/finance), AS EACH READER SEES IT. Who is served what is
 * tested on the server (api/src/modules/suites/finance-and-a-request-to-spend-as-each-reader-reads-it.spec.ts).
 * Here: the server's own sentences, drawn as they come, for Omar (who looks after finance) and Grace
 * (an admin), the buttons each request offers, and what everybody else is told.
 */
vi.mock('@/api/suites', () => ({ financeApi: { get: vi.fn(), check: vi.fn(), code: vi.fn(), evidence: vi.fn(), paid: vi.fn(), file: vi.fn(), totals: vi.fn() } }))
import { financeApi } from '@/api/suites'

/* Real shapes, with the sentences the server writes (the-spending-for-finance.service.ts). */
const CHIDIS = {
  id: 'r-1', name: 'Chidi Okeke', team: 'Sales', amount: 12000, what: 'fuel for the Kisumu trip', category: 'Fuel',
  askedOn: '2026-10-01', approvedBy: ['Wairimu'], approvedOn: '2026-10-01', evidenceNeeded: ['receipt'], evidenceGiven: [],
  checked: null, code: null, paidOn: null,
  said: [
    'Chidi Okeke, in Sales, asked on 1 October to spend KES 12,000 for fuel for the Kisumu trip.',
    'It is for Fuel.',
    'Wairimu approved it on 1 October.',
    'It needs a receipt, and finance has not had it yet.',
    'Nobody in finance has checked it yet.',
    'It has not been paid yet.',
  ],
}
const AMANIS = {
  ...CHIDIS, id: 'r-2', name: 'Amani Wekesa', team: 'Operations', amount: 4500, what: 'printer paper', category: null, evidenceNeeded: [],
  checked: { by: 'you', on: '2026-10-02' }, code: 'Office costs',
  said: [
    'Amani Wekesa, in Operations, asked on 1 October to spend KES 4,500 for printer paper.',
    'Wairimu approved it on 1 October.',
    'You checked it on 2 October.',
    'It is paid from Office costs.',
    'It has not been paid yet.',
  ],
}
const PAID = {
  ...AMANIS, id: 'r-3', name: 'Baraka Mutua', amount: 800, what: 'airtime', code: 'Phones', paidOn: '2026-10-03',
  said: ['Baraka Mutua, in Operations, asked on 1 October to spend KES 800 for airtime.', 'It is paid from Phones.', 'It was paid on 3 October.'],
}
const OMARS: FinanceView = { reader: 'finance', currency: 'KES', toPay: [CHIDIS, AMANIS], paid: [PAID], lines: ['Fuel', 'Office costs', 'Sales'] }
const GRACES: FinanceView = { ...OMARS, reader: 'admin' }

/* A plain default for the month's totals, read once this reader has already been let in above - its
   own reader rules are tested separately (the-months-spending-for-finance-as-each-reader-reads-it.spec.tsx
   on the server, and finance-totals-as-each-reader-sees-it.spec.tsx here). */
const TOTALS: TheMonthsTotals = {
  reader: 'finance', currency: 'KES', month: '2026-10', monthSays: 'October 2026',
  all: { name: 'All teams', asked: { count: 0, amount: 0 }, approved: { count: 0, amount: 0 }, paid: { count: 0, amount: 0 }, waiting: { count: 0, amount: 0 }, declined: { count: 0 }, says: 'All teams have nothing approved in October 2026.' },
  byTeam: [], byCategory: [],
  says: 'Nobody asked to spend anything in October 2026.',
}

const OMAR = { id: 'u-o', firstName: 'Omar', role: 'MEMBER', organizationName: 'Baridi Appliances' }
const GRACE = { id: 'u-g', firstName: 'Grace', role: 'ADMIN', organizationName: 'Baridi Appliances' }
const WAIRIMU = { id: 'u-w', firstName: 'Wairimu', role: 'LEAD', organizationName: 'Baridi Appliances' }

function open(user: any, served: FinanceView | Error) {
  if (served instanceof Error) (financeApi.get as any).mockRejectedValue(served)
  else (financeApi.get as any).mockResolvedValue(served)
  ;(financeApi.totals as any).mockResolvedValue(TOTALS)
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/suite/spend/finance']}><FinancePage /></MemoryRouter>
    </QueryClientProvider>,
  )
}
const refusal = (status: number, message: string) => Object.assign(new Error(String(status)), { response: { status, data: { message } } })
const toPay = () => screen.getByRole('list', { name: 'Waiting to be paid' })
const rowOf = (name: string) => within(toPay()).getAllByRole('listitem').find(li => li.textContent?.includes(name))!

beforeEach(() => { vi.clearAllMocks() })
afterEach(() => { vi.restoreAllMocks() })

describe('Omar, who looks after finance', () => {
  it('reads the way back, the heading and what the page is for', async () => {
    open(OMAR, OMARS)
    expect(await screen.findByRole('heading', { level: 2, name: 'Waiting to be paid' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Where you are' }).textContent).toBe('Suites/Spending and budgets/Requests for finance')
    expect(screen.getByRole('heading', { level: 1, name: 'Requests for finance' })).toBeInTheDocument()
    expect(screen.getByText('These requests to spend have been approved. Check each one, write the budget line it is paid from, note the receipt or quote, and mark it paid.')).toBeInTheDocument()
  })

  it('reads each request in the server’s own sentences, word for word', async () => {
    open(OMAR, OMARS)
    await screen.findByRole('heading', { level: 2, name: 'Waiting to be paid' })
    const chidi = rowOf('Chidi')
    expect(within(chidi).getByText('Chidi Okeke: KES 12,000 for fuel for the Kisumu trip')).toBeInTheDocument()
    expect([...chidi.querySelectorAll('p')].map(p => p.textContent)).toEqual(CHIDIS.said)
    expect([...rowOf('Amani').querySelectorAll('p')].map(p => p.textContent)).toEqual(AMANIS.said)
  })

  it('offers to check a request nobody has checked, and does not offer it again once checked', async () => {
    open(OMAR, OMARS)
    await screen.findByRole('heading', { level: 2, name: 'Waiting to be paid' })
    expect(within(rowOf('Chidi')).getByRole('button', { name: 'Check Chidi Okeke’s request' })).toBeInTheDocument()
    expect(within(rowOf('Amani')).queryByRole('button', { name: /^Check / })).toBeNull()
  })

  it('offers "Mark it paid" only on a request that has been checked', async () => {
    open(OMAR, OMARS)
    await screen.findByRole('heading', { level: 2, name: 'Waiting to be paid' })
    expect(within(rowOf('Chidi')).queryByRole('button', { name: /Mark .* paid/ })).toBeNull()
    expect(within(rowOf('Amani')).getByRole('button', { name: 'Mark Amani Wekesa’s request paid' })).toBeInTheDocument()
  })

  it('offers the receipt only where the rules asked for one that finance has not had', async () => {
    open(OMAR, OMARS)
    await screen.findByRole('heading', { level: 2, name: 'Waiting to be paid' })
    expect(within(rowOf('Chidi')).getByRole('button', { name: 'Finance has a receipt for Chidi Okeke’s request' })).toHaveTextContent('Finance has the receipt')
    expect(within(rowOf('Amani')).queryByRole('button', { name: /Finance has/ })).toBeNull()
  })

  it('checks a request, then reads what the server sends back', async () => {
    const after: FinanceView = { ...OMARS, toPay: [{ ...CHIDIS, checked: { by: 'you', on: '2026-10-04' }, said: [...CHIDIS.said.slice(0, 4), 'You checked it on 4 October.', 'It has not been paid yet.'] }, AMANIS] }
    ;(financeApi.check as any).mockResolvedValue(after)
    open(OMAR, OMARS)
    await screen.findByRole('heading', { level: 2, name: 'Waiting to be paid' })
    fireEvent.click(within(rowOf('Chidi')).getByRole('button', { name: 'Check Chidi Okeke’s request' }))
    await waitFor(() => expect(financeApi.check).toHaveBeenCalledWith('r-1'))
    expect(await within(rowOf('Chidi')).findByText('You checked it on 4 October.')).toBeInTheDocument()
    expect(within(rowOf('Chidi')).queryByRole('button', { name: /^Check / })).toBeNull()
  })

  it('records the budget line, from the lines the server offers or one of her own', async () => {
    ;(financeApi.code as any).mockResolvedValue(OMARS)
    open(OMAR, OMARS)
    await screen.findByRole('heading', { level: 2, name: 'Waiting to be paid' })
    const chidi = rowOf('Chidi')
    expect([...chidi.querySelectorAll('datalist option')].map(o => o.getAttribute('value'))).toEqual(['Fuel', 'Office costs', 'Sales'])
    fireEvent.change(within(chidi).getByLabelText('Budget line'), { target: { value: 'Fuel' } })
    fireEvent.click(within(chidi).getByRole('button', { name: 'Save the budget line for Chidi Okeke’s request' }))
    await waitFor(() => expect(financeApi.code).toHaveBeenCalledWith('r-1', 'Fuel'))
  })

  it('records the receipt', async () => {
    ;(financeApi.evidence as any).mockResolvedValue(OMARS)
    open(OMAR, OMARS)
    await screen.findByRole('heading', { level: 2, name: 'Waiting to be paid' })
    fireEvent.click(within(rowOf('Chidi')).getByRole('button', { name: 'Finance has a receipt for Chidi Okeke’s request' }))
    await waitFor(() => expect(financeApi.evidence).toHaveBeenCalledWith('r-1', 'receipt'))
  })

  it('marks a checked request paid on the day she gives, and reads the server’s refusal in its words', async () => {
    ;(financeApi.paid as any).mockRejectedValue(refusal(400, 'Give the day it was paid as a date, no later than today and no earlier than the day it was asked for.'))
    open(OMAR, OMARS)
    await screen.findByRole('heading', { level: 2, name: 'Waiting to be paid' })
    const amani = rowOf('Amani')
    fireEvent.change(within(amani).getByLabelText('The day it was paid'), { target: { value: '2026-10-03' } })
    fireEvent.click(within(amani).getByRole('button', { name: 'Mark Amani Wekesa’s request paid' }))
    await waitFor(() => expect(financeApi.paid).toHaveBeenCalledWith('r-2', '2026-10-03'))
    expect(await within(amani).findByText('Give the day it was paid as a date, no later than today and no earlier than the day it was asked for.')).toBeInTheDocument()
  })

  it('downloads the file as CSV and as Excel, and says what is in it', async () => {
    ;(financeApi.file as any).mockResolvedValue({ blob: new Blob(['x']), fileName: 'requests-to-pay-2026-10-04.csv' })
    ;(URL as any).createObjectURL = vi.fn(() => 'blob:x')
    ;(URL as any).revokeObjectURL = vi.fn()
    open(OMAR, OMARS)
    await screen.findByRole('heading', { level: 2, name: 'Waiting to be paid' })
    expect(screen.getByText('The file only holds the requests that are waiting to be paid.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Download as CSV' }))
    await waitFor(() => expect(financeApi.file).toHaveBeenCalledWith('csv'))
    fireEvent.click(screen.getByRole('button', { name: 'Download as Excel' }))
    await waitFor(() => expect(financeApi.file).toHaveBeenCalledWith('xlsx'))
  })

  it('reads what was paid in the last 60 days, with no buttons', async () => {
    open(OMAR, OMARS)
    const list = await screen.findByRole('list', { name: 'Paid in the last 60 days' })
    expect(within(list).getByText('Baraka Mutua: KES 800 for airtime')).toBeInTheDocument()
    expect(within(list).getByText('It was paid on 3 October.')).toBeInTheDocument()
    expect(within(list).queryAllByRole('button')).toHaveLength(0)
  })

  it('reads plainly when nothing waits', async () => {
    open(OMAR, { ...OMARS, toPay: [], paid: [] })
    expect(await screen.findByText('Nothing is waiting to be paid.')).toBeInTheDocument()
    expect(screen.getByText('Nothing has been paid in the last 60 days.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Download as CSV' })).toBeNull()
  })
})

describe('Grace, an admin', () => {
  it('reads the same requests with the same buttons', async () => {
    open(GRACE, GRACES)
    await screen.findByRole('heading', { level: 2, name: 'Waiting to be paid' })
    expect(within(rowOf('Chidi')).getByRole('button', { name: 'Check Chidi Okeke’s request' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download as Excel' })).toBeInTheDocument()
  })

  it('reads the server’s refusal when she tries to check her own request', async () => {
    ;(financeApi.check as any).mockRejectedValue(refusal(403, 'Nobody checks or pays their own request. Somebody else in finance, or an admin, can.'))
    open(GRACE, GRACES)
    await screen.findByRole('heading', { level: 2, name: 'Waiting to be paid' })
    fireEvent.click(within(rowOf('Chidi')).getByRole('button', { name: 'Check Chidi Okeke’s request' }))
    expect(await within(rowOf('Chidi')).findByText('Nobody checks or pays their own request. Somebody else in finance, or an admin, can.')).toBeInTheDocument()
  })
})

describe('Wairimu, a lead who does not look after finance', () => {
  it('reads the server’s refusal and no request', async () => {
    open(WAIRIMU, refusal(403, 'Only whoever looks after finance, or an admin, can do this.'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Only whoever looks after finance, or an admin, can do this.')
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('reads that the suite is not on, in the server’s words', async () => {
    open(GRACE, refusal(404, 'The spending suite is not switched on.'))
    expect(await screen.findByRole('alert')).toHaveTextContent('The spending suite is not switched on.')
  })

  it('a page that did not load says so, with a way to try again', async () => {
    open(OMAR, new Error('network'))
    expect(await screen.findByText('The requests did not load.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
