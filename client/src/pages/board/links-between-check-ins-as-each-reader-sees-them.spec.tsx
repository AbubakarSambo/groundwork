import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CheckInLinks } from './CheckInLinks'
import type { CheckInLinks as Links } from '@/api/check-in-links'

/**
 * LINKS BETWEEN CHECK-INS ON THE BOARD (D3, U.16), AS EACH READER SEES THEM. What each reader is
 * served, and refused, is tested on the server (api/src/modules/grounds/
 * links-between-check-ins-as-each-reader-reads-them.spec.ts). Here: what each reads on the board,
 * in the prototype's words (board-as-lead.txt, asked-of-operations.txt), and what it never says.
 */
vi.mock('@/api/check-in-links', () => ({ checkInLinksApi: { get: vi.fn() } }))
import { checkInLinksApi } from '@/api/check-in-links'

function open(links: Links | Error, label = 'Sales team, Q3') {
  if (links instanceof Error) (checkInLinksApi.get as any).mockRejectedValue(links)
  else (checkInLinksApi.get as any).mockResolvedValue(links)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter><CheckInLinks groundId="g" label={label} /></MemoryRouter></QueryClientProvider>)
}

const at = (d: number) => new Date(2026, 8, d, 10).toISOString()

beforeEach(() => vi.clearAllMocks())

describe('Wairimu, on the Sales board she runs', () => {
  const HERS: Links = {
    waitingOnOtherTeams: [
      { id: 'w1', team: 'Distribution operations', what: 'stock for Green Mart’s January order', asked: at(16), open: { label: 'Distribution operations', to: '/grounds/ops/board' } },
      { id: 'w2', team: 'Finance', what: 'credit terms for Westgate Deli', asked: at(14), open: null },
    ],
    askedOfThisCheckIn: [],
  }

  it('reads what Sales waits on from other teams, when each was asked, and a way into the one she may open', async () => {
    open(HERS)
    expect(await screen.findByRole('heading', { name: 'Waiting on other teams' })).toBeInTheDocument()
    expect(screen.getByText('Distribution operations: stock for Green Mart’s January order')).toBeInTheDocument()
    expect(screen.getByText('Asked 16 Sept.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open in Distribution operations' }).getAttribute('href')).toBe('/grounds/ops/board')
    expect(screen.getByText('Finance: credit terms for Westgate Deli')).toBeInTheDocument()
    expect(screen.getByText('Asked 14 Sept.')).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })

  it('never says the other boards show it too, and draws no heading for what nobody asked of Sales', async () => {
    const { container } = open(HERS)
    await screen.findByRole('heading', { name: 'Waiting on other teams' })
    expect(container.textContent).not.toContain('These show on their boards too')
    expect(screen.queryByRole('heading', { name: /by other teams/ })).toBeNull()
    expect(container.textContent).not.toMatch(/rating|score|at risk|\bPIP\b/i)
  })
})

describe('Wairimu, on the Operations board, where Sales and another check-in asked something', () => {
  it('reads each request with the check-in that asked, who asked where she may see who, and a way into it', async () => {
    open({
      waitingOnOtherTeams: [],
      askedOfThisCheckIn: [
        { id: 'a1', team: 'Sales team, Q3', what: 'stock for Green Mart’s January order', askedBy: 'Wairimu', asked: at(16), open: { label: 'Sales team, Q3', to: '/grounds/sales/board' } },
        { id: 'a2', team: 'Kwame, first 90 days', what: 'the demo freezer for Thursday', askedBy: null, asked: at(20), open: { label: 'Kwame, first 90 days', to: '/grounds/kwame/board' } },
      ],
    }, 'Distribution operations')
    expect(await screen.findByRole('heading', { name: 'Asked of Distribution operations by other teams' })).toBeInTheDocument()
    expect(screen.getByText('Sales team, Q3: stock for Green Mart’s January order')).toBeInTheDocument()
    expect(screen.getByText('Asked by Wairimu, 16 Sept.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open in Sales team, Q3' }).getAttribute('href')).toBe('/grounds/sales/board')
    expect(screen.getByText('Asked 20 Sept.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Waiting on other teams' })).toBeNull()
  })
})

describe('Brian, or anybody served no links', () => {
  it('sees nothing at all: no heading, no empty sentence', async () => {
    const { container } = open({ waitingOnOtherTeams: [], askedOfThisCheckIn: [] })
    await vi.waitFor(() => expect(checkInLinksApi.get).toHaveBeenCalledWith('g'))
    expect(container.textContent).toBe('')
  })

  it('and when the links do not load, the board simply goes on without them', async () => {
    const { container } = open(new Error('no'))
    await vi.waitFor(() => expect(checkInLinksApi.get).toHaveBeenCalled())
    expect(container.textContent).toBe('')
  })
})
