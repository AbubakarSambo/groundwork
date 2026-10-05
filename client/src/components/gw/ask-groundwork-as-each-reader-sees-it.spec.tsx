import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AskGroundwork } from './AskGroundwork'
import { AppShell } from './AppShell'
import { AskPage } from '@/pages/ask/AskPage'
import { useAuthStore } from '@/stores/auth'
import { useAskStore } from '@/stores/ask'
import type { AskPage as AskPageData } from '@/api/ask'

/**
 * ASK GROUNDWORK (D1), AS EACH PERSON SEES IT, in the prototype's words
 * (docs/prototype/screens/D1-ask-groundwork/ask-panel-lead.txt, ask-panel-participant.txt,
 * ask-on-a-phone.txt). Who is served whose questions, and that a request waits for a yes, are
 * tested on the server (api/src/modules/ask/ask-groundwork-as-each-reader-reads-it.spec.ts). Here:
 * what each person reads, and that the screen sends the yes only for the request it was shown.
 */
vi.mock('@/api/ask', () => ({ askApi: { mine: vi.fn(), ask: vi.fn(), answer: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { list: vi.fn().mockResolvedValue([]) } }))
import { askApi } from '@/api/ask'
import { groundsApi } from '@/api/grounds'

const PRIVATE = 'Your questions and the answers are private. Only you see them. They are never part of your check-in or a report.'

const MIRIAMS: AskPageData = {
  canAsk: true,
  about: [{ id: 'g-sales', label: 'Sales team, Q3' }],
  turns: [
    { from: 'you', says: 'Why is Green Mart next quarter?', at: '2026-09-23T15:00:00Z' },
    { from: 'groundwork', says: 'Green Mart said January, in writing.', at: '2026-09-23T15:00:01Z' },
  ],
}
const WAIRIMUS: AskPageData = {
  canAsk: true,
  about: [
    { id: 'g-faith', label: 'Faith, first 90 days' },
    { id: 'g-sales', label: 'Sales team, Q3' },
    { id: 'g-lead', label: 'Leadership, Q3' },
  ],
  turns: [],
}
const TOMS: AskPageData = {
  canAsk: false,
  why: 'Ask Groundwork can answer you once your organisation has connected its list of people to Groundwork.',
  about: [],
  turns: [],
}

function panel(data: AskPageData, at = '/grounds/g-sales/board') {
  ;vi.mocked(askApi.mine).mockResolvedValue(data)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[at]}><AskGroundwork onClose={() => {}} /></MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => { vi.clearAllMocks(); useAskStore.setState({ open: false }) })

describe('Miriam, taking part in the sales team, opens Ask Groundwork on its board', () => {
  it('reads the prototype’s panel, about her check-in, with the privacy line', async () => {
    panel(MIRIAMS)
    expect(screen.getByRole('heading', { name: 'Ask Groundwork' })).toBeInTheDocument()
    expect(screen.getByText(PRIVATE)).toBeInTheDocument()
    expect(await screen.findByText('Ask me about Sales team, Q3: a deal, a target, or what to do next.')).toBeInTheDocument()
    const about = screen.getByRole('combobox', { name: 'About' }) as HTMLSelectElement
    expect([...about.options].map(o => o.textContent)).toEqual(['Sales team, Q3'])
    expect(screen.getByPlaceholderText('Ask about this check-in')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument()
  })

  it('reads her own earlier questions and answers', async () => {
    panel(MIRIAMS)
    expect(await screen.findByText('Why is Green Mart next quarter?')).toBeInTheDocument()
    expect(screen.getByText('Green Mart said January, in writing.')).toBeInTheDocument()
  })

  it('asks about the check-in chosen, and reads the answer as it comes', async () => {
    ;vi.mocked(askApi.ask).mockResolvedValue({ lane: 'what_is_stuck', composedBy: 'rules', blocks: [{ type: 'text', body: 'Nothing is recorded as waiting on you.' }] })
    panel(MIRIAMS)
    await screen.findByText(/Ask me about Sales team, Q3/)
    fireEvent.change(screen.getByPlaceholderText('Ask about this check-in'), { target: { value: 'What is waiting on me?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findByText('Nothing is recorded as waiting on you.')).toBeInTheDocument()
    expect(askApi.ask).toHaveBeenCalledWith('What is waiting on me?', 'g-sales')
    expect(screen.getByText('What is waiting on me?')).toBeInTheDocument()
  })
})

describe('a request is said back, and only a yes to that request sends it', () => {
  const OFFER = 'Add "call Kariuki about the deposit" to your list? Yes to add it, no to leave it.'

  it('reads the request once, with Yes and No, and the yes names that request', async () => {
    ;vi.mocked(askApi.ask).mockResolvedValue({
      lane: 'add_a_to_do', composedBy: 'rules',
      blocks: [{ type: 'text', body: OFFER }, { type: 'proposal', proposalId: 'pr-1', summary: OFFER }],
    })
    ;vi.mocked(askApi.answer).mockResolvedValue({ lane: 'add_a_to_do', composedBy: 'rules', blocks: [{ type: 'text', body: 'On your list: call Kariuki about the deposit.' }] })
    panel(MIRIAMS)
    await screen.findByText(/Ask me about/)
    fireEvent.change(screen.getByPlaceholderText('Ask about this check-in'), { target: { value: 'remind me to call Kariuki about the deposit' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findAllByText(OFFER)).toHaveLength(1)
    expect(askApi.answer).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
    expect(await screen.findByText('On your list: call Kariuki about the deposit.')).toBeInTheDocument()
    expect(askApi.answer).toHaveBeenCalledWith('pr-1', 'yes')
    expect(screen.queryByRole('button', { name: 'Yes' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'No' })).toBeNull()
  })

  it('shows the server’s own words when it refuses', async () => {
    ;vi.mocked(askApi.ask).mockRejectedValue({ response: { data: { message: 'You are not part of this check-in.' } } })
    panel(MIRIAMS)
    await screen.findByText(/Ask me about/)
    fireEvent.change(screen.getByPlaceholderText('Ask about this check-in'), { target: { value: 'what is stuck?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('You are not part of this check-in.')
    expect((screen.getByPlaceholderText('Ask about this check-in') as HTMLInputElement).value).toBe('what is stuck?')
  })
})

describe('Wairimu, who runs several check-ins', () => {
  it('opens on the check-in whose page she is on, and can choose any other of hers', async () => {
    panel(WAIRIMUS, '/grounds/g-lead')
    expect(await screen.findByText('Ask me about Leadership, Q3: a deal, a target, or what to do next.')).toBeInTheDocument()
    const about = screen.getByRole('combobox', { name: 'About' }) as HTMLSelectElement
    expect([...about.options].map(o => o.textContent)).toEqual(['Faith, first 90 days', 'Sales team, Q3', 'Leadership, Q3'])
    fireEvent.change(about, { target: { value: 'g-sales' } })
    expect(screen.getByText('Ask me about Sales team, Q3: a deal, a target, or what to do next.')).toBeInTheDocument()
  })
})

/*
 * WALKTHROUGH PASS 2, ITEM 7: TWO CHECK-INS ON "ABOUT" SHARE ONE LABEL.
 */
describe('two check-ins on "About" share one label', () => {
  it('tells them apart by when each one started, read from the grounds list by id', async () => {
    vi.mocked(groundsApi.list).mockResolvedValue([
      { id: 'g-a', label: 'Help a new hire get started', startsAt: new Date(2026, 8, 20).toISOString() } as any,
      { id: 'g-b', label: 'Help a new hire get started', startsAt: new Date(2026, 8, 27).toISOString() } as any,
    ])
    panel({
      canAsk: true,
      about: [
        { id: 'g-a', label: 'Help a new hire get started' },
        { id: 'g-b', label: 'Help a new hire get started' },
      ],
      turns: [],
    }, '/grounds/g-a')
    const about = await screen.findByRole('combobox', { name: 'About' }) as HTMLSelectElement
    await waitFor(() => expect([...about.options].map(o => o.textContent)).toEqual([
      'Help a new hire get started, started 20 September',
      'Help a new hire get started, started 27 September',
    ]))
  })
})

describe('the three questions under the opening line', () => {
  const asked = () => within(screen.getByRole('group', { name: 'Questions you could ask' })).getAllByRole('button').map(b => b.textContent)

  it('Wairimu, who has asked nothing yet, reads the opening line and then the three questions', async () => {
    panel(WAIRIMUS, '/grounds/g-sales/board')
    await screen.findByText('Ask me about Sales team, Q3: a deal, a target, or what to do next.')
    expect(asked()).toEqual(['What should I do next?', 'What is due?', 'Will we reach our target?'])
  })

  it('pressing one asks it as her own question, about the check-in she is reading, and the three go away', async () => {
    ;vi.mocked(askApi.ask).mockResolvedValue({ lane: 'what_is_due', composedBy: 'rules', blocks: [{ type: 'text', body: 'Nothing is due.' }] })
    panel(WAIRIMUS, '/grounds/g-sales/board')
    fireEvent.click(await screen.findByRole('button', { name: 'What is due?' }))
    await waitFor(() => expect(askApi.ask).toHaveBeenCalledWith('What is due?', 'g-sales'))
    expect(await screen.findByText('Nothing is due.')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Questions you could ask' })).toBeNull()
  })

  it('Miriam, who has asked before, reads her own questions and not the three', async () => {
    panel(MIRIAMS)
    await screen.findByText('Green Mart said January, in writing.')
    expect(screen.queryByRole('group', { name: 'Questions you could ask' })).toBeNull()
  })

  it('Tom, whom Ask Groundwork cannot answer yet, reads why and is offered no question', async () => {
    panel(TOMS, '/today')
    await screen.findByText(TOMS.why!)
    expect(screen.queryByRole('group', { name: 'Questions you could ask' })).toBeNull()
  })
})

describe('somebody Ask Groundwork cannot answer yet', () => {
  it('reads why, in the server’s words, and is offered no box to type in', async () => {
    panel(TOMS, '/today')
    expect(await screen.findByText(TOMS.why!)).toBeInTheDocument()
    expect(screen.getByText(PRIVATE)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Send' })).toBeNull()
    expect(screen.queryByRole('combobox', { name: 'About' })).toBeNull()
  })
})

describe('what nobody reads here', () => {
  it('no label on a person and nothing about how anybody was rated', async () => {
    const { container } = panel(MIRIAMS)
    await screen.findByText(/Ask me about/)
    expect(container.textContent).not.toMatch(/\bPIP\b|at risk|low performer|rated|rating|score/i)
  })
})

describe('where it opens', () => {
  const USER = { id: 'u-m', email: 'm@baridi.test', firstName: 'Miriam', lastName: 'Wanjiku', role: 'MEMBER', organizationId: 'o1', organizationName: 'Baridi Appliances' }

  it('on a computer, the speech bubble beside the mark opens the panel beside the page', async () => {
    ;vi.mocked(askApi.mine).mockResolvedValue(MIRIAMS)
    useAuthStore.setState({ user: USER, token: "t", isAuthenticated: true } as unknown as Parameters<typeof useAuthStore.setState>[0])
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
    qc.setQueryData(['grounds'], [])
    qc.setQueryData(['my-organizations'], [{ id: 'o1', name: 'Baridi Appliances', role: 'MEMBER', active: true }])
    const { container } = render(
      <QueryClientProvider client={qc}><MemoryRouter initialEntries={['/today']}><AppShell><div>page</div></AppShell></MemoryRouter></QueryClientProvider>,
    )
    const rail = container.querySelector('.gw-sidebar-desktop') as HTMLElement
    expect(screen.queryByRole('heading', { name: 'Ask Groundwork' })).toBeNull()
    fireEvent.click(within(rail).getByRole('button', { name: 'Ask Groundwork' }))
    expect(await screen.findByRole('heading', { name: 'Ask Groundwork' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Ask Groundwork' })).toBeNull())
  })

  it('on a phone, #/chat is its own page called "Chat"', async () => {
    ;vi.mocked(askApi.mine).mockResolvedValue(MIRIAMS)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={['/chat']}><AskPage /></MemoryRouter></QueryClientProvider>)
    expect(screen.getByRole('heading', { level: 1, name: 'Chat' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ask Groundwork' })).toBeInTheDocument()
    expect(await screen.findByText('Ask me about Sales team, Q3: a deal, a target, or what to do next.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
  })
})
