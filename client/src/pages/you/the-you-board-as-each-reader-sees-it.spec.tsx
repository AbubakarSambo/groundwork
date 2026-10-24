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
vi.mock('@/api/patterns', () => ({ patternsApi: { answer: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { list: vi.fn().mockResolvedValue([]) } }))
import { youApi } from '@/api/you'
import { myDataApi } from '@/api/my-data'
import { patternsApi } from '@/api/patterns'

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
    /* Walkthrough pass 2, item 4: each goal now also says which check-in it belongs to. */
    expect(within(section('Your goals')).getAllByRole('listitem').map(li => li.textContent)).toEqual([
      'Close Westgate Deli and Lakeside Supermarket this quarter.Sales team, Q3',
      'Sales closed. You have 3 of 4.Sales team, Q3',
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
    /* Rebuilt from the shared parts (group 2, piece 2): the row is now the shared `Row`
       (`gwui-row`, components/gw/ui/Rows.tsx), in place of the page's own `gw-you-row`. */
    expect([...said.querySelectorAll('.gwui-row')].map(r => [...r.children].map(c => c.textContent))).toEqual([
      ['Visit Westgate Deli on Friday', 'Sales team, Q3', 'Friday', 'Open'],
      ['Send Green Mart the quote, with a photo', 'Sales team, Q3', '', 'Kept'],
    ])
  })

  it('links to her own reports and her work in each check-in, and offers her data as one file', async () => {
    open(MIRIAM, MIRIAMS)
    await screen.findByRole('heading', { name: 'Your own reports' })
    expect(hrefOf(section('Your own reports'), 'Read')).toBe('/checkin/c38/report')
    /* SCREEN FAULT 10: 30px tall on a phone before the shared 40px tap class was added. */
    expect(within(section('Your own reports')).getByRole('link', { name: 'Read' }).className).toContain('gwui-tap-44')
    /* Walkthrough pass 2, item 4: dates read in full ("23 September", not "23 Sept"). */
    expect(within(section('Your own reports')).getByText('23 September')).toBeInTheDocument()
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
    /* Nothing is asked of her on this board, so there is no such part; and nothing shares her load (U.16). */
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

describe('two check-ins on "Your work in each" share one label (walkthrough pass 2, item 4)', () => {
  it('tells them apart by when each one started, the same way the sidebar already does', async () => {
    const groundsApi = (await import('@/api/grounds')).groundsApi as any
    groundsApi.list.mockResolvedValue([
      { id: 'c1', startsAt: new Date(2026, 8, 20).toISOString() },
      { id: 'c2', startsAt: new Date(2026, 8, 27).toISOString() },
    ])
    const board: YourBoard = {
      ...EMPTY,
      checkIns: [
        { id: 'c1', label: 'Help a new hire get started', youRunIt: false, line: 'You have finished 1 session.', to: '/grounds/c1' },
        { id: 'c2', label: 'Help a new hire get started', youRunIt: false, line: 'You have finished 2 sessions.', to: '/grounds/c2' },
      ],
    }
    open(MIRIAM, board)
    await screen.findByRole('heading', { name: 'Your work in each' })
    const each = section('Your work in each')
    expect(within(each).getByText('Help a new hire get started, started 20 September')).toBeInTheDocument()
    expect(within(each).getByText('Help a new hire get started, started 27 September')).toBeInTheDocument()
  })
})

describe('Grace, an admin in no check-in, reads her own', () => {
  it('is told plainly that she is not in any check-in yet, and can still download her data', async () => {
    open(GRACE, EMPTY)
    expect(await screen.findByText('You are not in any check-in yet.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download it' })).toBeInTheDocument()
  })
})

describe('Grace, an admin who runs check-ins but has never been one’s own subject (B-043)', () => {
  it('does not print the "Your board" heading with nothing under it', async () => {
    open(GRACE, {
      ...EMPTY,
      checkIns: [{ id: 's', label: 'Sales team, Q3', youRunIt: true, line: 'You run this check-in. You have finished 38 sessions.', to: '/grounds/s' }],
    })
    await screen.findByRole('heading', { name: 'Your work in each' })
    expect(screen.queryByRole('heading', { name: 'Your board' })).not.toBeInTheDocument()
    expect(screen.queryByText('You are not in any check-in yet.')).not.toBeInTheDocument()
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
      patterns: [{
        id: 'pat-1', participantId: 'p-m', yours: true, kind: 'attention',
        heading: 'Your qualified deals often don’t have a buying date',
        whatHappened: 'Without a date they can’t count toward the quarter.',
        howOften: '3 of 5, for three weeks running.',
        askThem: null,
        theirWords: null,
        canAnswer: true,
        whoSeesIt: 'Wairimu sees this pattern too. You can say what’s behind it; it goes next to the pattern, in your words.',
      }],
    })
    await screen.findByRole('heading', { name: 'Where you stand' })
    expect(within(section('Where you stand')).getByText('What would change this: Keeping 8 in 10 for the next 4 weeks.')).toBeInTheDocument()
    expect(within(section('Worth knowing now')).getByText('In March you said supermarkets need a sample first. Lakeside hasn’t had one yet.')).toBeInTheDocument()
    expect(within(section('Something Groundwork noticed about your work')).getByText('You are seeing this first. Wairimu can see it too. Nothing is decided from it.')).toBeInTheDocument()
    expect(within(section('Coaching, followed over time')).getByText(/You did it at Lakeside/)).toBeInTheDocument()
    expect(within(section('What you contributed')).getByText('Warned the team early that Green Mart would wait until January.')).toBeInTheDocument()
    const patternSection = section('Something that keeps coming up')
    expect(within(patternSection).getByText('About your part in the work')).toBeInTheDocument()
    expect(within(patternSection).getByText('Your qualified deals often don’t have a buying date')).toBeInTheDocument()
    expect(within(patternSection).getByText(/3 of 5, for three weeks running\./)).toBeInTheDocument()
    expect(within(patternSection).getByText(/Wairimu sees this pattern too\./)).toBeInTheDocument()
    expect(within(patternSection).getByRole('button', { name: 'Say what’s behind it' })).toBeInTheDocument()
  })

  it('never draws a colleague’s pattern, even where one somehow reached this reader’s own board', async () => {
    open(MIRIAM, {
      ...MIRIAMS,
      patterns: [{
        id: 'pat-2', participantId: 'p-somebody-else', yours: false, kind: 'attention',
        heading: 'Something about a colleague’s work', whatHappened: null,
        howOften: '3 of 5, for three weeks running.', askThem: 'Ask them about it.',
        theirWords: null, canAnswer: false,
        whoSeesIt: 'A colleague has not seen this yet, and has not answered yet.',
      }],
    })
    await screen.findByText('Your board')
    expect(screen.queryByText('Something about a colleague’s work')).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Something that keeps coming up' })).toBeNull()
  })

  it('lets Miriam say what’s behind it, and shows her own words back', async () => {
    ;(patternsApi.answer as any).mockResolvedValue({
      id: 'pat-1', participantId: 'p-m', yours: true,
      heading: 'Your qualified deals often don’t have a buying date', whatHappened: null,
      howOften: '3 of 5, for three weeks running.', askThem: null,
      theirWords: 'The buyer keeps pushing the meeting back.', canAnswer: true,
      whoSeesIt: 'Wairimu sees this pattern too.',
    })
    open(MIRIAM, {
      ...MIRIAMS,
      patterns: [{
        id: 'pat-1', participantId: 'p-m', yours: true, kind: 'attention',
        heading: 'Your qualified deals often don’t have a buying date', whatHappened: null,
        howOften: '3 of 5, for three weeks running.', askThem: null,
        theirWords: null, canAnswer: true,
        whoSeesIt: 'Wairimu sees this pattern too.',
      }],
    })
    await screen.findByRole('heading', { name: 'Something that keeps coming up' })
    const patternSection = section('Something that keeps coming up')
    fireEvent.click(await within(patternSection).findByRole('button', { name: 'Say what’s behind it' }))
    fireEvent.change(within(patternSection).getByRole('textbox'), { target: { value: 'The buyer keeps pushing the meeting back.' } })
    fireEvent.click(within(patternSection).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(within(patternSection).getByText(/The buyer keeps pushing the meeting back\./)).toBeInTheDocument())
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

describe('Everything asked of you this week (D3, U.16), on your own board only', () => {
  const ASKED: YourBoard = {
    ...MIRIAMS,
    askedOfYou: {
      items: [
        { id: 'a1', who: null, checkIn: 'Kwame, first 90 days', what: 'The demo freezer booking for Thursday', asked: new Date(2026, 8, 14, 10).toISOString(), standing: 'The demo freezer booking is due Thursday.' },
        { id: 'a2', who: 'Wairimu Kamau', checkIn: 'Sales team, Q3', what: 'What would get Westgate’s deposit', asked: new Date(2026, 8, 16, 10).toISOString(), standing: 'Overdue.' },
        { id: 'a3', who: 'Grace Achieng', checkIn: 'Supplier review', what: 'Delivery times you’ve seen from each supplier', asked: new Date(2026, 8, 17, 10).toISOString(), standing: 'No date has been given yet.' },
      ],
      says: '3 requests from 3 people across 3 check-ins.',
    },
  }

  it('Miriam reads each request with who asked, where, what and where it stands, in the engine\'s own words', async () => {
    /* Walkthrough pass 2, item 4: "Asked 14 Sept." was the screen's own guess at what mattered.
       The engine already writes one plain sentence of where each request stands (`standing`,
       api/src/modules/grounds/asked-of-you.ts) - that is what is drawn now, not a bare date. */
    open(MIRIAM, ASKED)
    await screen.findByRole('heading', { name: 'Everything asked of you this week' })
    const s = section('Everything asked of you this week')
    expect(within(s).getByText('From every check-in you’re in. Only you see this.')).toBeInTheDocument()
    const rows = within(s).getAllByRole('listitem').map((li) => li.textContent)
    expect(rows).toEqual([
      'Kwame, first 90 daysThe demo freezer booking for ThursdayThe demo freezer booking is due Thursday.',
      'Wairimu KamauSales team, Q3What would get Westgate’s depositOverdue.',
      'Grace AchiengSupplier reviewDelivery times you’ve seen from each supplierNo date has been given yet.',
    ])
    expect(within(s).getByText('3 requests from 3 people across 3 check-ins.')).toBeInTheDocument()
  })

  it('comes before what she said she’d do, as the prototype draws it', async () => {
    const { container } = open(MIRIAM, ASKED)
    await screen.findByRole('heading', { name: 'Everything asked of you this week' })
    const text = container.textContent ?? ''
    expect(text.indexOf('Everything asked of you this week')).toBeLessThan(text.indexOf('What you said you’d do'))
  })

  it('offers no sharing, says nobody else reads it, and shows no rating or label', async () => {
    const { container } = open(MIRIAM, ASKED)
    await screen.findByRole('heading', { name: 'Everything asked of you this week' })
    const text = container.textContent ?? ''
    expect(text).not.toContain('Share with your lead')
    expect(text).not.toContain('unless you share it')
    expect(screen.queryByRole('button', { name: /share/i })).toBeNull()
    expect(text).not.toMatch(/specific|confidence|rating|score/i)
    expect(text).not.toMatch(/\bPIP\b|at risk|\bexit\b/i)
  })

  it('Grace, with nothing asked of her, has no such part', async () => {
    open(GRACE, EMPTY)
    await screen.findByText('You are not in any check-in yet.')
    expect(screen.queryByRole('heading', { name: 'Everything asked of you this week' })).toBeNull()
  })
})

describe('Your turn, drawn as the prototype\'s own card (you-board-miriam.jpg)', () => {
  it('draws each turn in its own card, with a dark inset edge, not the striped "What needs you" row', async () => {
    open(MIRIAM, MIRIAMS)
    await screen.findByText('Your own check-in for Sales team, Q3')
    const card = screen.getByText('Your own check-in for Sales team, Q3').closest('.gwui-welcome-card')
    expect(card).toBeTruthy()
    expect(card?.querySelector('.gwui-edge-row')).toBeNull()
  })

  /* Hafsah, 30 September: at most one primary button per screen. The prototype's own board draws
     every "Start it" navy; with two turns open that is two at once. Only the first is navy - the
     same rule Today already applies to its own repeated "Start it" (TodayPage.tsx). */
  it('with two turns to start, only the first "Start it" is navy', async () => {
    open(MIRIAM, {
      ...MIRIAMS,
      turns: [
        { key: 't1', title: 'Your sales check-in closes at 6pm', detail: 'About two minutes.', action: { label: 'Start it', to: '/checkin/c39' } },
        { key: 't2', title: 'Your own check-in for Leadership, Q3', detail: 'About two minutes.', action: { label: 'Start it', to: '/checkin/c40' } },
      ],
    })
    const starts = await screen.findAllByRole('link', { name: 'Start it' })
    expect(starts).toHaveLength(2)
    expect(starts[0].className).toContain('pri')
    expect(starts[1].className).not.toContain('pri')
    expect(document.querySelectorAll('.pri')).toHaveLength(1)
    expect(document.querySelectorAll('.gwui-welcome-card')).toHaveLength(2)
  })
})

describe('Your data, on one line at 1440 (you-board-miriam.jpg)', () => {
  it('puts the sentence and "Download it" in the same row, so it wraps to its own line on a phone', async () => {
    open(MIRIAM, MIRIAMS)
    const data = await screen.findByRole('region', { name: 'Your data' })
    const row = data.querySelector('.gwui-sentence-row')
    expect(row).toBeTruthy()
    expect(within(row as HTMLElement).getByText('Everything you’ve written, in every check-in, as one file.')).toBeInTheDocument()
    expect(within(row as HTMLElement).getByRole('button', { name: 'Download it' })).toBeInTheDocument()
  })
})
