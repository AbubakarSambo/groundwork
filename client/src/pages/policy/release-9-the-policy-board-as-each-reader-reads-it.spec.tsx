import type React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

/* Release 9, hand-written data only: Baridi Appliances' board and setup, as the engine serves them (api modules/policy/the-policy). */
const m = vi.hoisted(() => ({ board: vi.fn(), setup: vi.fn(), decide: vi.fn(), approve: vi.fn(), addDocument: vi.fn() }))
vi.mock('@/api/policy', () => ({ policyApi: m }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (f: any) => f({ user: { organization: { name: 'Baridi' } } }) }))
import { PolicyBoardPage } from './PolicyBoardPage'
import { SetUpFromYourDocumentsPage } from './SetUpFromYourDocumentsPage'

const BOARD = {
  title: 'The policy board',
  intro: 'Every rule Baridi runs on, in one place. Anyone can ask about them in Ask Baridi. Leave and spending requests follow the leave days, the notice and the proforma limit set here.',
  areas: [
    { area: 'leave', heading: 'Leave', rules: [{ id: 'r1', says: '21 days of paid leave a year.', facts: 'From the leave policy, section 2. Grace can make an exception. It applies to leave requests. Changed 2 October.' }] },
    { area: 'spending', heading: 'Spending', rules: [{ id: 'r2', says: 'Anything over KES 20,000 needs a proforma before it’s approved.', facts: 'From the expense policy, page 1. Grace can make an exception. It applies to spending requests. Unchanged.' }] },
  ],
  undecided: [{ title: 'How many hours a day', says: 'Two documents disagree. Nothing about how many hours a day is applied until it is decided.' }],
  empty: null,
}
const SETUP = {
  title: 'Set up from your documents',
  intro: 'Drop in what you already have. Groundwork shows what it will set up, area by area, and where each part came from. Nothing is set up until you approve that area.',
  added: 'Added the staff handbook and the leave policy.',
  decideFirst: [{ measure: 'leave.days', area: 'leave', title: 'How many leave days', says: 'The staff handbook says 20 days a year (page 6). The leave policy says 21 days a year (section 2). Which is right?', choices: [{ ruleId: 'h', value: '20', label: '20' }, { ruleId: 'l', value: '21', label: '21' }] }],
  areas: [
    { area: 'leave', heading: 'Leave', says: 'Staff get 20 days of paid leave a year. 21 days of paid leave a year.', from: 'From the staff handbook, page 6 and the leave policy, section 2.', approved: false, waitsOn: 'It can be approved once you decide how many leave days.' },
    { area: 'norms', heading: 'Working norms', says: 'Customers hear back within one working day.', from: 'From the staff handbook, page 4.', approved: false, waitsOn: null },
  ],
  noDocuments: 'No documents? The same setup can be done by talking it through in Ask Baridi.',
}
const draw = (el: React.ReactElement) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter>{el}</MemoryRouter></QueryClientProvider>)

beforeEach(() => { Object.values(m).forEach((f) => f.mockReset()) })

describe('Release 9: the policy board, as Kevin (a member) and Grace (an admin) read it', () => {
  it('shows every applied rule by area, with where it came from in a full sentence', async () => {
    m.board.mockResolvedValue({ on: true, mayChange: false, board: BOARD })
    draw(<PolicyBoardPage />)
    expect(await screen.findByText('21 days of paid leave a year.')).toBeTruthy()
    expect(screen.getByText('From the leave policy, section 2. Grace can make an exception. It applies to leave requests. Changed 2 October.')).toBeTruthy()
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Leave', 'Spending', 'Not applied until you decide'])
    expect(document.body.textContent).not.toMatch(/(Exceptions|Applies to): /)
    /* Kevin cannot change it, so nothing to set up or decide. */
    expect(screen.queryByText('Set up from your documents')).toBeNull()
    expect(screen.queryByText('Decide')).toBeNull()
  })

  it('gives Grace the way to set it up and to decide', async () => {
    m.board.mockResolvedValue({ on: true, mayChange: true, board: BOARD })
    draw(<PolicyBoardPage />)
    expect(await screen.findByText('Set up from your documents')).toBeTruthy()
    expect(screen.getByText('Decide')).toBeTruthy()
  })

  /* Changed 25 October (Hafsah: switches are Groundwork's own): where it is off, the page is not there, and nothing names a switch. */
  it('is not there where it is off, and says nothing about a switch', async () => {
    m.board.mockResolvedValue({ on: false })
    draw(<PolicyBoardPage />)
    expect(await screen.findByText('Nothing is at this address')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/switched on|switch/i)
  })
})

describe('Release 9: setting up from documents, as Grace reads it', () => {
  it('asks what to decide first, and holds an area back until it is decided', async () => {
    m.setup.mockResolvedValue({ on: true, setup: SETUP })
    m.decide.mockResolvedValue({ on: true, setup: SETUP })
    draw(<SetUpFromYourDocumentsPage />)
    expect(await screen.findByText('One thing to decide first')).toBeTruthy()
    expect(screen.getByText('The staff handbook says 20 days a year (page 6). The leave policy says 21 days a year (section 2). Which is right?')).toBeTruthy()
    expect(screen.getByText('It can be approved once you decide how many leave days.')).toBeTruthy()
    const approves = screen.getAllByRole('button', { name: 'Approve' }) as HTMLButtonElement[]
    expect(approves.map((b) => b.disabled)).toEqual([true, false])
    fireEvent.click(screen.getByRole('button', { name: '21' }))
    await waitFor(() => expect(m.decide).toHaveBeenCalledWith('l'))
  })

  /* Round 1's dead end (25 October): the link went to /ask, which is no page. Ask is /chat. */
  it('sends someone with no documents to the real Ask page', async () => {
    m.setup.mockResolvedValue({ on: true, setup: SETUP })
    draw(<SetUpFromYourDocumentsPage />)
    const link = await screen.findByRole('link', { name: /^Ask/ }) as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('/chat')
  })

  it('reads a document only once it has a name and words', async () => {
    m.setup.mockResolvedValue({ on: true, setup: { ...SETUP, decideFirst: [], added: null } })
    m.addDocument.mockResolvedValue({ on: true, setup: SETUP })
    draw(<SetUpFromYourDocumentsPage />)
    const read = await screen.findByRole('button', { name: 'Read it' }) as HTMLButtonElement
    expect(read.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('What it is called'), { target: { value: 'Leave policy' } })
    fireEvent.change(screen.getByLabelText('Its words'), { target: { value: 'Staff get 21 days of paid leave a year.' } })
    fireEvent.click(read)
    await waitFor(() => expect(m.addDocument).toHaveBeenCalledWith({ name: 'Leave policy', text: 'Staff get 21 days of paid leave a year.' }))
  })
})
