import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'
import type { YourBoard } from '@/api/you'
import { EverythingThatIsYours } from './EverythingThatIsYours'

/**
 * WHAT IS YOURS ON THE YOU PAGE, SECTION BY SECTION, AS EACH READER SEES THEIR OWN (Hafsah, 21 November 2026: "You does not have your
 * to-do list, commitments or patterns/coaching, performance history, leave etc."). Who is served what is the server's
 * (the-you-board-as-each-reader-reads-it.spec.ts and who-reads-a-pattern.ts); here, what each person reads, in full sentences, and that
 * nothing written for a lead reaches the person it is about, even if it were ever served by mistake.
 */
vi.mock('@/api/suites', () => ({
  yourRequestsApi: { leave: vi.fn(), spending: vi.fn(), hours: vi.fn() },
  reviewsApi: { mineQuietly: vi.fn() },
  suitesApi: { mine: vi.fn() },
}))
vi.mock('@/api/patterns', () => ({ patternsApi: { answer: vi.fn() } }))
import { yourRequestsApi, reviewsApi, suitesApi } from '@/api/suites'

const AMANI = { id: 'u-amani', firstName: 'Amani', role: 'MEMBER' }
const GRACE = { id: 'u-grace', firstName: 'Grace', role: 'ADMIN' }

const EMPTY: YourBoard = { checkIns: [], turns: [], goals: [], saidYoudDo: [], todos: [], coaching: null, ownReports: [] }

const AMANIS: YourBoard = {
  ...EMPTY,
  todos: [{ id: 't1', text: 'Call Naivas about the samples', when: 'by Friday' }],
  saidYoudDo: [
    { id: 'c1', text: 'Send Carrefour the price list', when: 'on Thursday', checkIn: 'Sales team, Q4', state: 'open', stateSays: 'Open', saidAt: '2026-11-16T09:00:00.000Z' },
    { id: 'c2', text: 'Visit Quickmart Kilimani', when: null, checkIn: 'Sales team, Q4', state: 'kept', stateSays: 'Kept', saidAt: '2026-11-09T09:00:00.000Z', settledOn: '2026-11-12T15:00:00.000Z' },
  ],
  keptLately: { kept: 1, of: 1, says: 'You kept 1 of 1 in the last 4 weeks.' },
  coaching: { says: 'Ask Naivas for a buying date on the first visit.', checkIn: 'Sales team, Q4' },
  patterns: [{
    id: 'p1', participantId: 'pa', yours: true, kind: 'attention', heading: 'Your qualified deals often have no buying date',
    whatHappened: null, howOften: '3 of 5, for three weeks running.', askThem: null, theirWords: null, canAnswer: true,
    /* What a lead is given about a pattern. Never served to the person (who-reads-a-pattern.ts); if it ever were, the page must not draw it. */
    ...({ coachTowards: 'LEAD-ONLY: push her harder on dates', oneStep: 'LEAD-ONLY: ask Wairimu to sit in' } as any),
  }],
  ownReports: [{ checkIn: 'Sales team, Q4', at: '2026-11-19T17:00:00.000Z', to: '/checkin/r3/report' }],
}

function open(user: any, board: YourBoard, suites: Record<string, boolean>) {
  ;(suitesApi.mine as any).mockResolvedValue({ leave: false, spend: false, time: false, reviews: false, ...suites })
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter><EverythingThatIsYours b={board} /></MemoryRouter></QueryClientProvider>)
}

const section = (name: string) => screen.getByRole('heading', { name }).closest('section') as HTMLElement

beforeEach(() => {
  vi.clearAllMocks()
  ;(yourRequestsApi.leave as any).mockResolvedValue({ daysLeftSaid: 'You have 18 days of leave left this year.', requests: [
    { id: 'l1', status: 'waiting', where: 'Your leave from 22 to 24 December is waiting for Wairimu.', questions: [], questionWaiting: null, declinedBecause: null },
  ] })
  ;(yourRequestsApi.spending as any).mockResolvedValue({ requests: [
    { id: 's1', status: 'approved', where: 'Your request for 4,500 shillings for fuel was approved by Wairimu.', questions: [], questionWaiting: null, declinedBecause: null },
  ] })
  ;(yourRequestsApi.hours as any).mockResolvedValue({ weeks: [], standing: null })
  ;(reviewsApi.mineQuietly as any).mockResolvedValue([{ id: 'rv1', dueOn: '2026-10-31', writtenWithFirstName: 'Wairimu', stands: 'decided', says: 'Your review with Wairimu is decided.' }])
})

describe('Amani, a member, reads what is hers', () => {
  it('reads her to-dos, her commitments with the days she said and kept them, and how many she kept', async () => {
    open(AMANI, AMANIS, { leave: true, spend: true, reviews: true })
    expect(within(section('Your to-dos')).getByText('Call Naivas about the samples')).toBeInTheDocument()
    expect(within(section('Your to-dos')).getByText('You want it done by Friday.')).toBeInTheDocument()
    const c = section('What you said you’d do')
    expect(within(c).getByText('You kept 1 of 1 in the last 4 weeks.')).toBeInTheDocument()
    expect(within(c).getByText('You said this in Sales team, Q4 on 16 November. It is still open, and you said you would do it on Thursday.')).toBeInTheDocument()
    expect(within(c).getByText('You said this in Sales team, Q4 on 9 November. You kept it on 12 November.')).toBeInTheDocument()
  })

  it('reads her own coaching step and her own pattern, and nothing a lead is given about her', async () => {
    open(AMANI, AMANIS, {})
    const c = section('Coaching')
    expect(within(c).getByText('Ask Naivas for a buying date on the first visit.')).toBeInTheDocument()
    expect(within(c).getByText('This came from your last Sales team, Q4 check-in.')).toBeInTheDocument()
    expect(within(section('Something that keeps coming up')).getByText('Your qualified deals often have no buying date')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/LEAD-ONLY/)
    expect(document.body.textContent).not.toMatch(/at risk|PIP|exit/i)
  })

  /* UPDATED 24 November 2026 (page audit row 4): her reports and reviews are the one list "Your own reports", the prototype's heading. */
  it('reads her own reports and reviews, newest first, her leave and her requests, each in the server’s own sentence', async () => {
    open(AMANI, AMANIS, { leave: true, spend: true, reviews: true })
    const h = section('Your own reports')
    expect(within(h).getByText('Your report from Sales team, Q4')).toBeInTheDocument()
    expect(within(h).getByText('It was written from your answers on 19 November.')).toBeInTheDocument()
    expect(await within(h).findByText('Your review, October')).toBeInTheDocument()
    const rows = within(h).getAllByRole('listitem').map(li => li.textContent ?? '')
    expect(rows[0]).toMatch(/Your report from Sales team, Q4/)
    expect(await within(section('Your leave')).findByText('You have 18 days of leave left this year.')).toBeInTheDocument()
    expect(within(section('Your leave')).getByText('Your leave from 22 to 24 December is waiting for Wairimu.')).toBeInTheDocument()
    expect(within(section('Your leave')).getByRole('link', { name: 'Request leave' })).toHaveAttribute('href', '/suite/leave/new')
    expect(await within(section('Your requests')).findByText('Your request for 4,500 shillings for fuel was approved by Wairimu.')).toBeInTheDocument()
  })

  it('reads a plain sentence in every section that is empty, and no section for a suite that is off', async () => {
    open(AMANI, EMPTY, {})
    expect(within(section('Your to-dos')).getByText('You have no to-dos open. To add one, tell Groundwork in Ask what you want to remember.')).toBeInTheDocument()
    expect(within(section('What you said you’d do')).getByText(/You have not said you would do anything in a check-in yet/)).toBeInTheDocument()
    expect(within(section('Coaching')).getByText(/There is no coaching step for you yet/)).toBeInTheDocument()
    expect(within(section('Something that keeps coming up')).getByText(/Nothing has come up often enough about your work to name/)).toBeInTheDocument()
    /* 24 November 2026 (page audit row 4): with no report or review yet, the list is not drawn at all. */
    expect(screen.queryByRole('heading', { name: 'Your own reports' })).toBeNull()
    await screen.findByRole('heading', { name: 'Your to-dos' })
    expect(screen.queryByRole('heading', { name: 'Your leave' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Your requests' })).toBeNull()
  })

  it('reads ten commitments a page, with the count said, and reaches the rest', async () => {
    const many = Array.from({ length: 13 }, (_, i) => ({ id: `m${i}`, text: `Promise number ${i + 1}`, when: null, checkIn: 'Sales team, Q4', state: 'open' as const, stateSays: 'Open' }))
    open(AMANI, { ...EMPTY, saidYoudDo: many }, {})
    const c = section('What you said you’d do')
    expect(within(c).getByText('Showing 1 to 10 of 13.')).toBeInTheDocument()
    expect(within(c).queryByText('Promise number 11')).toBeNull()
    fireEvent.click(within(c).getByRole('button', { name: 'Next' }))
    expect(within(c).getByText('Promise number 11')).toBeInTheDocument()
    expect(within(c).getByText('Showing 11 to 13 of 13.')).toBeInTheDocument()
  })
})

describe('Grace, the admin, reads what is hers', () => {
  it('is told a suite is off, where she can switch it on', async () => {
    open(GRACE, EMPTY, {})
    expect(await screen.findByRole('heading', { name: 'Your leave' })).toBeInTheDocument()
    expect(within(section('Your requests')).getByText(/Spending and time sheets are not switched on/)).toBeInTheDocument()
  })
})
