import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CustomersPage } from './CustomersPage'
import { useAuthStore } from '@/stores/auth'
import type { CustomerList } from '@/api/suites'

/**
 * CUSTOMERS AND DEALS (E9, #/suite/customers), AS EACH READER SEES THEM. Who is served what is tested
 * on the server (api/src/modules/suites/the-customers-as-each-reader-reads-them.spec.ts). Here: the
 * prototype's words (suite-customers.txt), word for word, for Grace (an admin) and Wairimu (a lead),
 * and what everybody else reads.
 */
vi.mock('@/api/suites', () => ({ customersApi: { get: vi.fn() } }))
import { customersApi } from '@/api/suites'

const GRACES: CustomerList = {
  customers: [
    { id: 's-1', name: 'Kariuki Butchery', standing: 'Paid', owner: 'Aisha Otieno', lastContact: '2026-09-22' },
    { id: 's-2', name: 'Green Mart', standing: 'Quote sent. Buys in January', owner: 'Miriam Wanjiku', lastContact: '2026-09-23' },
    { id: 's-3', name: 'Naivas Ngong Road', standing: 'First order placed', owner: 'Kwame Boateng', lastContact: '2026-09-20' },
    { id: 's-4', name: 'Westgate Deli', standing: null, owner: null, lastContact: null },
  ],
}
const WAIRIMUS: CustomerList = { customers: GRACES.customers.slice(0, 2) }

const GRACE = { id: 'u-g', firstName: 'Grace', role: 'ADMIN', organizationName: 'Baridi Appliances' }
const WAIRIMU = { id: 'u-w', firstName: 'Wairimu', role: 'LEAD', organizationName: 'Baridi Appliances' }
const MIRIAM = { id: 'u-m', firstName: 'Miriam', role: 'MEMBER', organizationName: 'Baridi Appliances' }

function open(user: any, served: CustomerList | Error) {
  if (served instanceof Error) (customersApi.get as any).mockRejectedValue(served)
  else (customersApi.get as any).mockResolvedValue(served)
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/suite/customers']}><CustomersPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}
const refusal = (status: number, message: string) => Object.assign(new Error(String(status)), { response: { status, data: { message } } })
const rows = () => [...document.querySelectorAll('tbody tr')].map(tr => [...tr.children].map(c => c.textContent))

beforeEach(() => { vi.clearAllMocks() })

describe('Grace, an admin', () => {
  it('reads the way back, the heading and the prototype’s sentence', async () => {
    open(GRACE, GRACES)
    expect(await screen.findByRole('table')).toBeInTheDocument()
    /* "Where you are" is the shared PageTitle crumb's own aria-label (group 2, piece 4 rebuild),
       in place of the page's prior "Breadcrumb". */
    expect(screen.getByRole('navigation', { name: 'Where you are' }).textContent).toBe('Suites/Customers and deals')
    expect(screen.getByRole('heading', { level: 1, name: 'Customers and deals' })).toBeInTheDocument()
    /*
     * FAULT 6 OF THE LIVE WALK (6 October): "The sales check-ins keep it up to date" is not true -
     * customers come only from the organisation's own customer records (the-customers.service.ts
     * reads Subject rows of type COUNTERPARTY, never a check-in). The subtitle says what is true.
     */
    expect(screen.getByText('One list of customers and deals for the whole company, from the customer records your organisation brings in.')).toBeInTheDocument()
    expect(screen.queryByText(/sales check-ins keep it up to date/)).toBeNull()
  })

  it('reads every customer, where it stands, who owns it and the last contact, as the prototype writes them', async () => {
    open(GRACE, GRACES)
    await screen.findByRole('table')
    expect([...document.querySelectorAll('thead th')].map(th => th.textContent)).toEqual(['Customer', 'Where it stands', 'Who owns it', 'Last contact'])
    expect(rows()).toEqual([
      ['Kariuki Butchery', 'Paid', 'Aisha Otieno', '22 September'],
      ['Green Mart', 'Quote sent. Buys in January', 'Miriam Wanjiku', '23 September'],
      ['Naivas Ngong Road', 'First order placed', 'Kwame Boateng', '20 September'],
      ['Westgate Deli', '', '', ''],
    ])
  })

  it('cannot change anything here, so is not told that changing something tells the owner', async () => {
    open(GRACE, GRACES)
    await screen.findByRole('table')
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.queryByText(/Changing something here/)).toBeNull()
  })

  /*
   * FAULT 6 OF THE LIVE WALK (6 October): the empty state now says where a customer actually comes
   * from, with a link to Connections for Grace, who may open it.
   */
  it('reads where a customer comes from, with a link to Connections, when no customer is known', async () => {
    open(GRACE, { customers: [] })
    expect(await screen.findByText(/No customers are known yet\. They come from the customer records your organisation brings in under/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Connections' })).toHaveAttribute('href', '/settings/connections')
  })

  it('no label on anybody', async () => {
    open(GRACE, GRACES)
    await screen.findByRole('table')
    expect(document.body.textContent).not.toMatch(/\b(PIP|exit|at risk|score|rating)\b/i)
  })
})

describe('Wairimu, a lead', () => {
  it('reads only what the server gives her: her team’s customers', async () => {
    open(WAIRIMU, WAIRIMUS)
    await screen.findByRole('table')
    expect(rows().map(r => r[0])).toEqual(['Kariuki Butchery', 'Green Mart'])
  })

  /*
   * FAULT 6 OF THE LIVE WALK (6 October): a lead cannot open Connections (AdminsOnly), so the empty
   * state reads it as plain text, not a link that would refuse her.
   */
  it('reads the same sentence with no link to Connections, which would refuse her', async () => {
    open(WAIRIMU, { customers: [] })
    expect(await screen.findByText(/No customers are known yet\. They come from the customer records your organisation brings in under/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Connections' })).toBeNull()
  })
})

describe('everybody else', () => {
  it('Miriam, a member, reads the server’s refusal', async () => {
    open(MIRIAM, refusal(403, 'Only an admin or a lead can open this board.'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Only an admin or a lead can open this board.')
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('while the suite is off, the server says so', async () => {
    open(GRACE, refusal(404, 'The customers and deals suite is not switched on.'))
    expect(await screen.findByRole('alert')).toHaveTextContent('The customers and deals suite is not switched on.')
  })
})
