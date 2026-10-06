import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FinancePage } from './FinancePage'
import { useAuthStore } from '@/stores/auth'
import type { FinanceView, TheMonthsTotals } from '@/api/suites'

/**
 * THE MONTH'S SPENDING, ADDED UP FOR FINANCE (item 5, GET /suites/spend/finance/totals), AS EACH
 * READER SEES IT. The numbers and sentences are copied from the server's own spec
 * (api/src/modules/suites/the-months-spending-for-finance-as-each-reader-reads-it.spec.ts). Who may
 * read the totals is the same rule the rest of the finance page already enforces (`financeApi.get`),
 * so this reads only what FinancePage itself already lets in.
 */
vi.mock('@/api/suites', () => ({ financeApi: { get: vi.fn(), check: vi.fn(), code: vi.fn(), evidence: vi.fn(), paid: vi.fn(), file: vi.fn(), totals: vi.fn() } }))
import { financeApi } from '@/api/suites'

const EMPTY: FinanceView = { reader: 'finance', currency: 'KES', toPay: [], paid: [], lines: [] }

const OCTOBER: TheMonthsTotals = {
  reader: 'finance', currency: 'KES', month: '2026-10', monthSays: 'October 2026',
  all: {
    name: 'All teams', asked: { count: 92, amount: 4120000 }, approved: { count: 70, amount: 3100000 },
    paid: { count: 40, amount: 1500000 }, waiting: { count: 15, amount: 620000 }, declined: { count: 7 },
    says: 'All teams have KES 3,100,000 approved in October 2026, KES 1,500,000 of it paid, and KES 620,000 still waiting for an answer.',
  },
  byTeam: [
    {
      name: 'Operations', asked: { count: 34, amount: 1200000 }, approved: { count: 28, amount: 980000 },
      paid: { count: 20, amount: 500000 }, waiting: { count: 4, amount: 90000 }, declined: { count: 2 },
      says: 'Operations has KES 980,000 approved in October 2026, KES 500,000 of it paid, and KES 90,000 still waiting for an answer.',
    },
    {
      name: 'Sales', asked: { count: 30, amount: 900000 }, approved: { count: 25, amount: 800000 },
      paid: { count: 15, amount: 400000 }, waiting: { count: 3, amount: 50000 }, declined: { count: 2 },
      says: 'Sales has KES 800,000 approved in October 2026, KES 400,000 of it paid, and KES 50,000 still waiting for an answer.',
    },
  ],
  byCategory: [
    {
      name: 'Fuel', asked: { count: 20, amount: 300000 }, approved: { count: 18, amount: 280000 },
      paid: { count: 10, amount: 100000 }, waiting: { count: 1, amount: 10000 }, declined: { count: 1 },
      says: 'Fuel has KES 280,000 approved in October 2026, KES 100,000 of it paid, and KES 10,000 still waiting for an answer.',
    },
  ],
  says: 'In October 2026, 92 requests were asked for, adding up to KES 4,120,000. All teams have KES 3,100,000 approved in October 2026, KES 1,500,000 of it paid, and KES 620,000 still waiting for an answer.',
}
const SEPTEMBER: TheMonthsTotals = { ...OCTOBER, month: '2026-09', monthSays: 'September 2026', says: 'Nobody asked to spend anything in September 2026.', byTeam: [], byCategory: [] }

const OMAR = { id: 'u-o', firstName: 'Omar', role: 'MEMBER', organizationName: 'Baridi Appliances' }
const GRACE = { id: 'u-g', firstName: 'Grace', role: 'ADMIN', organizationName: 'Baridi Appliances' }
const WAIRIMU = { id: 'u-w', firstName: 'Wairimu', role: 'LEAD', organizationName: 'Baridi Appliances' }
const refusal = (status: number, message: string) => Object.assign(new Error(String(status)), { response: { status, data: { message } } })

function open(user: any, served: FinanceView | Error) {
  if (served instanceof Error) (financeApi.get as any).mockRejectedValue(served)
  else (financeApi.get as any).mockResolvedValue(served)
  ;(financeApi.totals as any).mockResolvedValue(OCTOBER)
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/suite/spend/finance']}><FinancePage /></MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  /* `thisMonth()` (FinancePage.tsx) reads the real clock, so the month it opens on is fixed here. */
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-06T09:00:00Z'))
})
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

describe('Omar, who looks after finance', () => {
  it('reads the month’s totals in the server’s own sentences, by team and by category', async () => {
    open(OMAR, EMPTY)
    const byTeam = await screen.findByRole('region', { name: 'By team' })
    await waitFor(() => expect(financeApi.totals).toHaveBeenCalledWith('2026-10'))
    expect(screen.getByText(OCTOBER.says)).toBeInTheDocument()
    expect(within(byTeam).getByText(OCTOBER.byTeam[0].says)).toBeInTheDocument()
    expect(within(byTeam).getByText(OCTOBER.byTeam[1].says)).toBeInTheDocument()
    const byCategory = screen.getByRole('region', { name: 'By category' })
    expect(within(byCategory).getByText(OCTOBER.byCategory[0].says)).toBeInTheDocument()
  })

  it('changing the month asks the server for that month, and reads what it sends back', async () => {
    open(OMAR, EMPTY)
    await screen.findByRole('region', { name: 'By team' })
    ;(financeApi.totals as any).mockResolvedValue(SEPTEMBER)
    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '2026-09' } })
    await waitFor(() => expect(financeApi.totals).toHaveBeenCalledWith('2026-09'))
    expect(await screen.findByText('Nobody asked to spend anything in September 2026.')).toBeInTheDocument()
  })

  /*
   * FAULT 3 OF THE LIVE WALK: the heading stayed "This month's spending" after a different month was
   * chosen. It now follows the month that is actually shown, and reads the new month at once, not
   * after the server's own answer for it has arrived (the server's words are used once they do).
   */
  it('the heading follows the month that is actually chosen, not a fixed "this month"', async () => {
    open(OMAR, EMPTY)
    expect(await screen.findByRole('heading', { name: 'Spending in October 2026' })).toBeInTheDocument()
    ;(financeApi.totals as any).mockResolvedValue(SEPTEMBER)
    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '2026-09' } })
    expect(await screen.findByRole('heading', { name: 'Spending in September 2026' })).toBeInTheDocument()
    expect(screen.queryByText('This month’s spending')).toBeNull()
  })

  /* Fault 3 of the live walk: the totals used to sit under the whole list of payment cards. The
     summary now comes first. */
  it('the totals are the first thing on the page, before the list of payment cards', async () => {
    open(OMAR, EMPTY)
    await screen.findByRole('region', { name: 'By team' })
    const headings = screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent)
    expect(headings[0]).toBe('Spending in October 2026')
    expect(headings).toContain('Waiting to be paid')
    expect(headings.indexOf('Spending in October 2026')).toBeLessThan(headings.indexOf('Waiting to be paid'))
  })

  it('writes no price, limit or count of its own: the top line is the server’s whole `says`, word for word', async () => {
    open(OMAR, EMPTY)
    await screen.findByRole('region', { name: 'By team' })
    expect(screen.getByText(OCTOBER.says)).toBeInTheDocument()
  })
})

describe('Grace, an admin', () => {
  it('reads the same totals', async () => {
    open(GRACE, { ...EMPTY, reader: 'admin' })
    expect(await screen.findByText(OCTOBER.says)).toBeInTheDocument()
  })
})

describe('Wairimu, a lead who does not look after finance', () => {
  it('never asks for the totals, since the page itself already refuses her', async () => {
    open(WAIRIMU, refusal(403, 'Only whoever looks after finance, or an admin, can do this.'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Only whoever looks after finance, or an admin, can do this.')
    expect(screen.queryByText('By team')).toBeNull()
    expect(financeApi.totals).not.toHaveBeenCalled()
  })
})
