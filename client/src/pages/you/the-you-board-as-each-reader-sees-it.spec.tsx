import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { YouPage } from './YouPage'
import { useAuthStore } from '@/stores/auth'
import type { YourBoard } from '@/api/you'

/**
 * THE YOU BOARD (C2, #/you), AS EACH PERSON SEES THEIR OWN. What each person is served, and that
 * nobody else is served it, is tested on the server (api/src/modules/grounds/
 * the-you-board-as-each-reader-reads-it.spec.ts). Here: what each person reads on the page, in the
 * prototype's words (you-board-miriam.txt, you-board-wairimu.txt), and what the page never says.
 */
vi.mock('@/api/you', () => ({ youApi: { get: vi.fn() } }))
vi.mock('@/api/my-data', () => ({ myDataApi: { get: vi.fn(), erase: vi.fn() } }))
import { youApi } from '@/api/you'
import { myDataApi } from '@/api/my-data'

const EMPTY: YourBoard = { checkIns: [], turns: [], goals: [], saidYoudDo: [], todos: [], coaching: null, ownReports: [] }

const MIRIAMS: YourBoard = {
  checkIns: [{ id: 's', label: 'Sales team, Q3', youRunIt: false, line: 'You have finished 38 sessions.', to: '/grounds/s' }],
  turns: [{ key: 'turn-s', title: 'Your own check-in for Sales team, Q3', detail: null, action: { label: 'Start it', to: '/checkin/c39' } }],
  goals: [
    { id: 'g1', says: 'Close Westgate Deli and Lakeside Supermarket this quarter.', checkIn: 'Sales team, Q3' },
    { id: 'g2', says: 'Sales closed. You have 3 of 4.', checkIn: 'Sales team, Q3' },
  ],
  saidYoudDo: [
    { id: 'k1', text: 'Visit Westgate Deli on Friday', when: 'Friday', checkIn: 'Sales team, Q3', state: 'open', stateSays: 'Open' },
    { id: 'k2', text: 'Send Green Mart the quote, with a photo', when: null, checkIn: 'Sales team, Q3', state: 'kept', stateSays: 'Kept' },
  ],
  todos: [{ id: 'd1', text: 'Send a photo of Green Mart’s written order.', when: null }],
  coaching: { says: 'One thing for this week: Ask Westgate what would get the deposit paid this week.', checkIn: 'Sales team, Q3' },
  ownReports: [{ checkIn: 'Sales team, Q3', at: new Date(2026, 8, 23, 18, 0).toISOString(), to: '/checkin/c38/report' }],
}

const WAIRIMUS: YourBoard = {
  ...EMPTY,
  checkIns: [
    { id: 'l', label: 'Leadership, Q3', youRunIt: false, line: 'You have finished 12 sessions.', to: '/grounds/l' },
    { id: 's', label: 'Sales team, Q3', youRunIt: true, line: 'You run this check-in. You have finished 38 sessions.', to: '/grounds/s' },
  ],
  saidYoudDo: [{ id: 'k9', text: 'Bring the enterprise pipeline numbers', when: 'Today, 6pm', checkIn: 'Leadership, Q3', state: 'open', stateSays: 'Open' }],
}

function open(user: any, board: YourBoard) {
  ;(youApi.get as any).mockResolvedValue(board)
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={['/you']}><YouPage /></MemoryRouter></QueryClientProvider>)
}

const MIRIAM = { id: 'u-m', firstName: 'Miriam', role: 'MEMBER' }
const WAIRIMU = { id: 'u-w', firstName: 'Wairimu', role: 'LEAD' }
const GRACE = { id: 'u-g', firstName: 'Grace', role: 'ADMIN' }

const section = (name: string) => screen.getByRole('heading', { name }).closest('section') as HTMLElement
const hrefOf = (el: HTMLElement, name: string) => within(el).getByRole('link', { name }).getAttribute('href')

beforeEach(() => { vi.clearAllMocks() })

describe('Miriam reads her own You board', () => {
  it('opens with the prototype’s heading and says only she sees it', async () => {
    open(MIRIAM, MIRIAMS)
    expect(screen.getByRole('heading', { level: 1, name: 'You' })).toBeInTheDocument()
    expect(screen.getByText('What’s yours, across your check-ins. Only you see this page.')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Your board' })).toBeInTheDocument()
  })

  it('shows her goals, her to-dos, her coaching step and her turn, in full sentences', async () => {
    open(MIRIAM, MIRIAMS)
    await screen.findByRole('heading', { name: 'Your goals' })
    expect(within(section('Your goals')).getAllByRole('listitem').map(li => li.textContent)).toEqual([
      'Close Westgate Deli and Lakeside Supermarket this quarter.',
      'Sales closed. You have 3 of 4.',
    ])
    expect(within(section('Your to-dos')).getByText('Send a photo of Green Mart’s written order.')).toBeInTheDocument()
    expect(within(section('Coaching')).getByText('One thing for this week: Ask Westgate what would get the deposit paid this week.')).toBeInTheDocument()
    expect(screen.getByText('Your own check-in for Sales team, Q3')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Start it' }).getAttribute('href')).toBe('/checkin/c39')
  })

  it('lists what she said she’d do, from every check-in, each with where and when and how it stands', async () => {
    open(MIRIAM, MIRIAMS)
    await screen.findByRole('heading', { name: 'What you said you’d do' })
    const said = section('What you said you’d do')
    expect(within(said).getByText('From every check-in')).toBeInTheDocument()
    expect([...said.querySelectorAll('.gw-you-row')].map(r => [...r.children].map(c => c.textContent))).toEqual([
      ['Visit Westgate Deli on Friday', 'Sales team, Q3', 'Friday', 'Open'],
      ['Send Green Mart the quote, with a photo', 'Sales team, Q3', '', 'Kept'],
    ])
  })

  it('links to her own reports and her work in each check-in, and offers her data as one file', async () => {
    open(MIRIAM, MIRIAMS)
    await screen.findByRole('heading', { name: 'Your own reports' })
    expect(hrefOf(section('Your own reports'), 'Read')).toBe('/checkin/c38/report')
    const each = section('Your work in each')
    expect(within(each).getByText('Sales team, Q3')).toBeInTheDocument()
    expect(within(each).getByText('You have finished 38 sessions.')).toBeInTheDocument()
    expect(hrefOf(each, 'Open')).toBe('/grounds/s')
    const data = screen.getByRole('region', { name: 'Your data' })
    expect(within(data).getByText('Everything you’ve written, in every check-in, as one file.')).toBeInTheDocument()
    expect(within(data).getByRole('button', { name: 'Download it' })).toBeInTheDocument()
  })

  it('downloads her own file from the server when she asks, and says so if it fails', async () => {
    ;(myDataApi.get as any).mockRejectedValue(new Error('offline'))
    open(MIRIAM, MIRIAMS)
    fireEvent.click(await screen.findByRole('button', { name: 'Download it' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Your file did not download. Try again.'))
    expect(myDataApi.get).toHaveBeenCalledTimes(1)
  })

  it('never says who else reads it, never shows a rating, and puts no label on her', async () => {
    const { container } = open(MIRIAM, MIRIAMS)
    await screen.findByRole('heading', { name: 'Your goals' })
    const text = container.textContent ?? ''
    expect(text).not.toContain('the people who run your check-ins')
    expect(text).not.toMatch(/specific|confidence|rating|score/i)
    expect(text).not.toMatch(/\bPIP\b|at risk|\bexit\b/i)
    /* Nothing of the engine's is drawn until the engine serves it. */
    for (const h of ['Where you stand', 'Worth knowing now', 'Something Groundwork noticed about your work', 'Coaching, followed over time', 'What you contributed', 'Something that keeps coming up']) {
      expect(screen.queryByRole('heading', { name: h })).toBeNull()
    }
    /* Her load across check-ins is private unless she shares it, and nothing holds the sharing yet. */
    expect(text).not.toContain('Everything asked of you this week')
    expect(text).not.toContain('Share with your lead')
  })
})

describe('Wairimu reads her own, as someone who runs a check-in and takes part in another', () => {
  it('says which one she runs, in a sentence, and shows only her own things', async () => {
    const { container } = open(WAIRIMU, WAIRIMUS)
    await screen.findByRole('heading', { name: 'Your work in each' })
    const each = section('Your work in each')
    expect(within(each).getByText('You run this check-in. You have finished 38 sessions.')).toBeInTheDocument()
    expect(within(section('What you said you’d do')).getByText('Bring the enterprise pipeline numbers')).toBeInTheDocument()
    expect(container.textContent).not.toContain('Westgate')
    expect(screen.queryByRole('heading', { name: 'Your goals' })).toBeNull()
  })
})

describe('Grace, an admin in no check-in, reads her own', () => {
  it('is told plainly that she is not in any check-in yet, and can still download her data', async () => {
    open(GRACE, EMPTY)
    expect(await screen.findByText('You are not in any check-in yet.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download it' })).toBeInTheDocument()
  })
})

describe('when the engine serves its own parts (request 14)', () => {
  it('draws each one in the prototype’s words', async () => {
    open(MIRIAM, {
      ...MIRIAMS,
      whereYouStand: { says: '14 of 16 kept, in the last 4 weeks. Nothing needs deciding about your work right now.', whatWouldChangeIt: 'Keeping 8 in 10 for the next 4 weeks.' },
      worthKnowing: ['In March you said supermarkets need a sample first. Lakeside hasn’t had one yet.'],
      noticed: { says: 'For three weeks, calls that need a difficult ask have been moved to next week.', whoSees: 'You are seeing this first. Wairimu can see it too. Nothing is decided from it.' },
      coachingOverTime: 'Last week we talked about asking for a buying date on the first visit. You did it at Lakeside.',
      contributed: ['Warned the team early that Green Mart would wait until January.'],
      keepsComingUp: [{ title: 'Your qualified deals often don’t have a buying date', says: '3 of 5, for three weeks running. Wairimu sees this pattern too.' }],
    })
    await screen.findByRole('heading', { name: 'Where you stand' })
    expect(within(section('Where you stand')).getByText('What would change this: Keeping 8 in 10 for the next 4 weeks.')).toBeInTheDocument()
    expect(within(section('Worth knowing now')).getByText('In March you said supermarkets need a sample first. Lakeside hasn’t had one yet.')).toBeInTheDocument()
    expect(within(section('Something Groundwork noticed about your work')).getByText('You are seeing this first. Wairimu can see it too. Nothing is decided from it.')).toBeInTheDocument()
    expect(within(section('Coaching, followed over time')).getByText(/You did it at Lakeside/)).toBeInTheDocument()
    expect(within(section('What you contributed')).getByText('Warned the team early that Green Mart would wait until January.')).toBeInTheDocument()
    expect(within(section('Something that keeps coming up')).getByText('About your part in the work')).toBeInTheDocument()
  })
})

describe('Daniel, when Groundwork has made a suggestion about him (C3, U.13, what-daniel-sees.txt)', () => {
  const DANIEL = { id: 'u-d', firstName: 'Daniel', role: 'MEMBER' }
  const DANIELS: YourBoard = {
    ...EMPTY,
    checkIns: [{ id: 'd', label: 'Daniel, the next six weeks', youRunIt: false, line: 'You have finished 3 sessions.', to: '/grounds/d' }],
    suggestionsAboutYou: [{
      id: 's-d', checkIn: { id: 'd', label: 'Daniel, the next six weeks' }, leadName: 'Wairimu',
      facts: 'In the last 4 weeks, you kept 11 of your 20 commitments. When fewer than 6 in 10 are kept, Groundwork suggests extra help to your manager.',
      whatWouldChangeIt: 'Keeping 8 in 10 for the next 4 weeks.',
      decision: null, yourSide: null, yourAppeal: null, appealDecision: null, mayAppeal: false,
    }],
  }

  it('reads where he stands, in the prototype’s words, with "Add my side", and no label on him', async () => {
    const { container } = open(DANIEL, DANIELS)
    await screen.findByText('Where you stand')
    const text = container.textContent ?? ''
    expect(text).toContain('In the last 4 weeks, you kept 11 of your 20 commitments. When fewer than 6 in 10 are kept, Groundwork suggests extra help to your manager.')
    expect(text).toContain('What would change this: Keeping 8 in 10 for the next 4 weeks.')
    expect(text).toContain('Wairimu has not decided anything yet. You will see the decision and the reasons here.')
    expect(screen.getByRole('button', { name: 'Add my side' })).toBeTruthy()
    expect(text).not.toMatch(/\bPIP\b|at risk|\bexit\b|performance plan/i)
    expect(text).not.toMatch(/specific|confidence|rating|score/i)
  })
})

describe('when the board does not load', () => {
  it('says so, says nothing written is affected, and offers to try again', async () => {
    ;(youApi.get as any).mockRejectedValue(new Error('down'))
    useAuthStore.setState({ user: MIRIAM, token: 't', isAuthenticated: true } as any)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={qc}><MemoryRouter><YouPage /></MemoryRouter></QueryClientProvider>)
    expect(await screen.findByText('Your board did not load. Nothing you have written is affected.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
