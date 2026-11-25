import { describe, it, expect, vi, beforeEach } from 'vitest'
import { askIsReady } from '@/test/ask-is-ready'
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
const CAPTION = 'Ask about the company, your work or your check-ins.'
const ADD_LINE = 'You can also add context or documents to your check-ins here.'
const WELCOME = 'This is Ask Baridi. I answer about the whole organisation and about your own work, and you can point me at one of your check-ins whenever you want to. Ask me about the company, about your work, or about your check-ins. You can add context or a document to one of your check-ins here, and ask for leave or to spend money. What you ask me stays private. Anything you choose to add to a check-in is different: I say it back to you first, it goes in only once you say yes, and from then on it is part of that check-in.'
const STARTERS_WITH_A_CHECK_IN = [
  'What did I say I would do?',
  'What is my check-in for, and who reads it?',
  'When is my next check-in?',
  "What are the company's priorities right now?",
  'Add a document or some context to my check-in.',
  'Ask for leave, or to spend money.',
]
const STARTERS_WITH_NO_CHECK_IN = ["What are the company's priorities right now?", 'Ask for leave, or to spend money.']

const MIRIAMS: AskPageData = {
  canAsk: true,
  about: [{ id: 'g-sales', label: 'Sales team, Q3' }],
  turns: [
    { from: 'you', says: 'Why is Green Mart next quarter?', at: '2026-09-23T15:00:00Z' },
    { from: 'groundwork', says: 'Green Mart said January, in writing.', at: '2026-09-23T15:00:01Z' },
  ],
  askName: 'Ask Baridi',
  caption: CAPTION,
  addLine: ADD_LINE,
  welcome: null,
  starters: STARTERS_WITH_A_CHECK_IN,
}
const WAIRIMUS: AskPageData = {
  canAsk: true,
  about: [
    { id: 'g-faith', label: 'Faith, first 90 days' },
    { id: 'g-sales', label: 'Sales team, Q3' },
    { id: 'g-lead', label: 'Leadership, Q3' },
  ],
  turns: [],
  askName: 'Ask Baridi',
  caption: CAPTION,
  addLine: ADD_LINE,
  welcome: WELCOME,
  starters: STARTERS_WITH_A_CHECK_IN,
}
const TOMS: AskPageData = {
  canAsk: false,
  why: 'Ask Groundwork can answer you once your organisation has connected its list of people to Groundwork.',
  about: [],
  turns: [],
  askName: 'Ask Groundwork',
  caption: CAPTION,
  addLine: ADD_LINE,
  welcome: null,
  starters: [],
}

function panel(data: AskPageData, at = '/grounds/g-sales/board') {
  ;vi.mocked(askApi.mine).mockResolvedValue(data)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  /* B-202 (review round 3): AppShell now waits for the same ['my-waiting'] read RequireOrgSetup
  already makes before it mounts the sidebar at all - without this cached answer the real
  authApi.myWaiting (not mocked in this file) would be asked for real. */
  qc.setQueryData(['my-waiting'], { waiting: false })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[at]}><AskGroundwork onClose={() => {}} /></MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => { vi.clearAllMocks(); useAskStore.setState({ open: false }) })

describe('Miriam, taking part in the sales team, opens Ask Groundwork on its board', () => {
  it('reads the prototype’s panel, named for her organisation, about her check-in, with the one line under its name and no line explaining how to use it', async () => {
    panel(MIRIAMS)
    /* SCREEN FAULT 5d: the heading alone is no longer a safe "the real data has landed" wait -
       its fallback (askNameFor the signed-in person's own organisation) reads "Ask Baridi" too,
       before GET /ask has answered. The composer's placeholder still only takes this text from the
       real response, so that is what the rest of this test waits on. */
    await askIsReady()
    expect(screen.getByRole('heading', { name: 'Ask Baridi' })).toBeInTheDocument()
    /* No privacy note on the panel (standards: no privacy notes in messages or screens; Batch S round 2, T11). */
    expect(screen.queryByText(PRIVATE)).toBeNull()
    expect(screen.getByText(CAPTION)).toBeInTheDocument()
    /* UPDATED 23 November (journey 6, design guide rule 6): "You can also add context or documents to your check-ins here."
       explained how to use the panel, and the paperclip beside the box is that way in, so the line is no longer drawn. */
    expect(screen.queryByText(ADD_LINE)).toBeNull()
    const about = screen.getByRole('combobox', { name: 'About' }) as HTMLSelectElement
    expect([...about.options].map(o => o.textContent)).toEqual(['The whole organisation and your work', 'Sales team, Q3'])
    /* She is on the check-in's own page, so it is the one picked by default - never the organisation. */
    expect(about.value).toBe('g-sales')
    expect(screen.getByPlaceholderText(/^Ask (a question|about this check-in)$/)).toBeInTheDocument()
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
    await askIsReady()
    fireEvent.change(screen.getByPlaceholderText(/^Ask (a question|about this check-in)$/), { target: { value: 'What is waiting on me?' } })
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
    await askIsReady()
    fireEvent.change(screen.getByPlaceholderText(/^Ask (a question|about this check-in)$/), { target: { value: 'remind me to call Kariuki about the deposit' } })
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
    /* A refusal comes with its 4xx status, as the server sends it; whatTheServerSaid (5d1cbb40e) shows a server's words only for a 4xx. */
    ;vi.mocked(askApi.ask).mockRejectedValue({ response: { status: 403, data: { message: 'You are not part of this check-in.' } } })
    panel(MIRIAMS)
    await askIsReady()
    fireEvent.change(screen.getByPlaceholderText(/^Ask (a question|about this check-in)$/), { target: { value: 'what is stuck?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('You are not part of this check-in.')
    expect((screen.getByPlaceholderText(/^Ask (a question|about this check-in)$/) as HTMLInputElement).value).toBe('what is stuck?')
  })
})

describe('Wairimu, who runs several check-ins', () => {
  it('opens on the check-in whose page she is on by default, and can choose any other of hers, or the organisation', async () => {
    ;vi.mocked(askApi.ask).mockResolvedValue({ lane: 'what_is_due', composedBy: 'rules', blocks: [{ type: 'text', body: 'Nothing is due.' }] })
    panel(WAIRIMUS, '/grounds/g-lead')
    expect(await screen.findByText(WELCOME)).toBeInTheDocument()
    const about = screen.getByRole('combobox', { name: 'About' }) as HTMLSelectElement
    expect([...about.options].map(o => o.textContent)).toEqual([
      'The whole organisation and your work', 'Faith, first 90 days', 'Sales team, Q3', 'Leadership, Q3',
    ])
    /* The check-in whose page she is on, not the first on the list and not the organisation. */
    expect(about.value).toBe('g-lead')
    fireEvent.change(about, { target: { value: 'g-sales' } })
    expect(about.value).toBe('g-sales')
    fireEvent.change(screen.getByPlaceholderText(/^Ask (a question|about this check-in)$/), { target: { value: 'What is due?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await waitFor(() => expect(askApi.ask).toHaveBeenCalledWith('What is due?', 'g-sales'))
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
      askName: 'Ask Baridi',
      caption: CAPTION,
      addLine: ADD_LINE,
      welcome: null,
      starters: STARTERS_WITH_A_CHECK_IN,
    }, '/grounds/g-a')
    const about = await screen.findByRole('combobox', { name: 'About' }) as HTMLSelectElement
    await waitFor(() => expect([...about.options].map(o => o.textContent)).toEqual([
      'The whole organisation and your work',
      'Help a new hire get started, started 20 September',
      'Help a new hire get started, started 27 September',
    ]))
  })
})

describe('the starter questions, under the greeting', () => {
  const asked = () => within(screen.getByRole('group', { name: 'Questions you could ask' })).getAllByRole('button').map(b => b.textContent)

  /* Every starter the server serves (Batch S, S5, Hafsah, 19 November). The panel used to cut them to three, as the prototype's Ask did, and a lead's
     or an admin's own lines, which come after the check-in ones, were never seen. The server now cuts the list once, short, with the role's own lines first. */
  it('Wairimu, who has asked nothing yet, reads the greeting and then every starter she is served, in order', async () => {
    panel(WAIRIMUS, '/grounds/g-sales/board')
    await screen.findByText(WELCOME)
    expect(asked()).toEqual(STARTERS_WITH_A_CHECK_IN)
  })

  it('a lead reads her own role’s starters, which come after the third', async () => {
    const LEADS = ['How do I set up a check-in?', 'How is my team doing?', 'Add a document or some context to my check-in.', 'Get a quarterly report.', 'What is my check-in for, and who reads it?', 'What did I say I would do?']
    panel({ ...WAIRIMUS, starters: LEADS }, '/grounds/g-sales/board')
    await screen.findByText(WELCOME)
    expect(asked()).toEqual(LEADS)
    expect(screen.getByRole('button', { name: 'Get a quarterly report.' })).toBeInTheDocument()
  })

  it('pressing one asks it as her own question, about the check-in she is reading, and the starters go away', async () => {
    ;vi.mocked(askApi.ask).mockResolvedValue({ lane: 'when_next', composedBy: 'rules', blocks: [{ type: 'text', body: 'Tomorrow, 4pm.' }] })
    panel(WAIRIMUS, '/grounds/g-sales/board')
    fireEvent.click(await screen.findByRole('button', { name: 'When is my next check-in?' }))
    await waitFor(() => expect(askApi.ask).toHaveBeenCalledWith('When is my next check-in?', 'g-sales'))
    expect(await screen.findByText('Tomorrow, 4pm.')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Questions you could ask' })).toBeNull()
  })

  it('a reader with no check-in to ask about is offered only the two starters that need none', async () => {
    panel({ ...WAIRIMUS, about: [], starters: STARTERS_WITH_NO_CHECK_IN }, '/today')
    await screen.findByText(WELCOME)
    expect(asked()).toEqual(STARTERS_WITH_NO_CHECK_IN)
  })

  /* The prototype's Ask shows its question chips whatever was asked before (Hafsah, 25 October: add back what the prototype has):
     after her own earlier questions, until she asks something this visit. */
  it('Miriam, who has asked before, reads her own questions, then the starters after them', async () => {
    panel(MIRIAMS)
    const answer = await screen.findByText('Green Mart said January, in writing.')
    const chips = screen.getByRole('group', { name: 'Questions you could ask' })
    expect(answer.compareDocumentPosition(chips) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
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
    /* No privacy note on the panel (standards: no privacy notes in messages or screens; Batch S round 2, T11). */
    expect(screen.queryByText(PRIVATE)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Send' })).toBeNull()
    expect(screen.queryByRole('combobox', { name: 'About' })).toBeNull()
  })
})

describe('what nobody reads here', () => {
  it('no label on a person and nothing about how anybody was rated', async () => {
    const { container } = panel(MIRIAMS)
    await askIsReady()
    expect(container.textContent).not.toMatch(/\bPIP\b|at risk|low performer|rated|rating|score/i)
  })
})

describe('where it opens', () => {
  /* "Baridi", matching MIRIAMS's own served `askName` ("Ask Baridi") - the sidebar's own button names
     Ask from the signed-in person's organisation name (AppShell.tsx, `askNameFor`) the same way
     `GET /ask` does, so the two must agree in this test too. */
  const USER = { id: 'u-m', email: 'm@baridi.test', firstName: 'Miriam', lastName: 'Wanjiku', role: 'MEMBER', organizationId: 'o1', organizationName: 'Baridi' }

  it('on a computer, the speech bubble beside the mark opens the panel beside the page, named for the organisation', async () => {
    ;vi.mocked(askApi.mine).mockResolvedValue(MIRIAMS)
    useAuthStore.setState({ user: USER, token: "t", isAuthenticated: true } as unknown as Parameters<typeof useAuthStore.setState>[0])
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
    /* B-202 (review round 3): AppShell now waits for the same ['my-waiting'] read RequireOrgSetup
    already makes before it mounts the sidebar at all - without this cached answer the real
    authApi.myWaiting (not mocked in this file) would be asked for real. */
    qc.setQueryData(['my-waiting'], { waiting: false })
    qc.setQueryData(['grounds'], [])
    qc.setQueryData(['my-organizations'], [{ id: 'o1', name: 'Baridi', role: 'MEMBER', active: true }])
    const { container } = render(
      <QueryClientProvider client={qc}><MemoryRouter initialEntries={['/today']}><AppShell><div>page</div></AppShell></MemoryRouter></QueryClientProvider>,
    )
    const rail = container.querySelector('.gw-sidebar-desktop') as HTMLElement
    expect(screen.queryByRole('heading', { name: 'Ask Baridi' })).toBeNull()
    fireEvent.click(within(rail).getByRole('button', { name: 'Ask Baridi' }))
    expect(await screen.findByRole('heading', { name: 'Ask Baridi' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Ask Baridi' })).toBeNull())
  })

  /* UPDATED FOR B-163: the page's own heading used to say "Chat", a different name from the Ask
     panel it opens right underneath - now both read "Ask Baridi", the organisation's own name. */
  it('on a phone, #/chat is its own page named for the organisation', async () => {
    ;vi.mocked(askApi.mine).mockResolvedValue(MIRIAMS)
    useAuthStore.setState({ user: USER, token: 't', isAuthenticated: true } as unknown as Parameters<typeof useAuthStore.setState>[0])
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    /* B-202 (review round 3): AppShell now waits for the same ['my-waiting'] read RequireOrgSetup
    already makes before it mounts the sidebar at all - without this cached answer the real
    authApi.myWaiting (not mocked in this file) would be asked for real. */
    qc.setQueryData(['my-waiting'], { waiting: false })
    render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={['/chat']}><AskPage /></MemoryRouter></QueryClientProvider>)
    /* UPDATED 24 October: the prototype's #/chat is titled "Chat"; the panel under it is named for the organisation. */
    expect(screen.getByRole('heading', { level: 1, name: 'Chat' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 2, name: 'Ask Baridi' })).toBeInTheDocument()
    expect(await screen.findByText('Why is Green Mart next quarter?')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
  })

  /*
   * SCREEN FAULT 5d: opening Chat while `GET /ask` was still loading, or held up by a 429, used to
   * show the bare "Ask Groundwork" with no caption under it - the organisation's own name was
   * already in hand (the signed-in person's own profile), and the caption is a fixed sentence
   * (decision 100), so neither needs to wait for the request.
   */
  it('while GET /ask is still loading, reads her own organisation\'s name and the caption, not the bare default', async () => {
    useAuthStore.setState({ user: USER, token: 't', isAuthenticated: true } as unknown as Parameters<typeof useAuthStore.setState>[0])
    ;vi.mocked(askApi.mine).mockImplementation(() => new Promise(() => {})) // never resolves: still loading
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    /* B-202 (review round 3): AppShell now waits for the same ['my-waiting'] read RequireOrgSetup
    already makes before it mounts the sidebar at all - without this cached answer the real
    authApi.myWaiting (not mocked in this file) would be asked for real. */
    qc.setQueryData(['my-waiting'], { waiting: false })
    render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={['/today']}><AskGroundwork onClose={() => {}} /></MemoryRouter></QueryClientProvider>)
    expect(await screen.findByRole('heading', { name: 'Ask Baridi' })).toBeInTheDocument()
    expect(screen.getByText(CAPTION)).toBeInTheDocument()
  })

  it('held up by a 429, still reads her own organisation\'s name and the caption', async () => {
    useAuthStore.setState({ user: USER, token: 't', isAuthenticated: true } as unknown as Parameters<typeof useAuthStore.setState>[0])
    ;vi.mocked(askApi.mine).mockRejectedValue({ response: { status: 429, data: { message: 'Too many requests.' } } })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    /* B-202 (review round 3): AppShell now waits for the same ['my-waiting'] read RequireOrgSetup
    already makes before it mounts the sidebar at all - without this cached answer the real
    authApi.myWaiting (not mocked in this file) would be asked for real. */
    qc.setQueryData(['my-waiting'], { waiting: false })
    render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={['/today']}><AskGroundwork onClose={() => {}} /></MemoryRouter></QueryClientProvider>)
    expect(await screen.findByRole('heading', { name: 'Ask Baridi' })).toBeInTheDocument()
    expect(screen.getByText(CAPTION)).toBeInTheDocument()
  })
})

/*
 * JOURNEY 6, ON THE DESIGN SYSTEM (Hafsah, 23 November 2026; ask-panel-lead.jpg, ask-panel-participant.jpg). What the lead
 * and a participant read at the top of the panel, in order, and what they can press: one main button, the name and About
 * at the top, the one line under them, and no sentence on how to use the panel.
 */
describe('journey 6: the panel each reader reads, on the design system', () => {
  const headOf = (c: HTMLElement) => [...(c.querySelector('.ds-chat-head') as HTMLElement).querySelectorAll('h2, label > span, p')].map((e) => e.textContent)
  const mainButtons = (c: HTMLElement) => [...c.querySelectorAll('.ds-btn-main')].map((b) => b.textContent)

  it('Wairimu, the lead, reads the name, About and the one line, has one main button, and the paperclip to add a document', async () => {
    const { container } = panel({ ...WAIRIMUS, addsContext: true })
    expect((await askIsReady()).placeholder).toBe('Ask about this check-in')
    expect(headOf(container)).toEqual(['Ask Baridi', 'About', CAPTION])
    expect(screen.queryByText(ADD_LINE)).toBeNull()
    expect(mainButtons(container)).toEqual(['Send'])
    expect(screen.getByRole('button', { name: 'Add a photo or a document' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
    /* Nothing in the panel sets its own spacing, size or colour (rule 12). */
    expect(container.querySelectorAll('[style]')).toHaveLength(0)
  })

  it('Miriam, taking part, reads the same top, her earlier question on the right and the answer on the left, and no paperclip', async () => {
    const { container } = panel(MIRIAMS)
    expect((await askIsReady()).placeholder).toBe('Ask about this check-in')
    expect(headOf(container)).toEqual(['Ask Baridi', 'About', CAPTION])
    expect(screen.getByText('Why is Green Mart next quarter?').className).toContain('ds-bubble-me')
    expect(screen.getByText('Green Mart said January, in writing.').className).toContain('ds-bubble-them')
    expect(mainButtons(container)).toEqual(['Send'])
    expect(screen.queryByRole('button', { name: 'Add a photo or a document' })).toBeNull()
  })

  it('with the whole organisation chosen, the box reads "Ask a question", and an empty box sends nothing', async () => {
    panel(WAIRIMUS, '/company')
    expect((await askIsReady()).placeholder).toBe('Ask a question')
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(askApi.ask).not.toHaveBeenCalled()
  })
})
