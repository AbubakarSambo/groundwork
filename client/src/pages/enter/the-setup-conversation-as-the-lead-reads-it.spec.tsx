import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'

/*
 * THE SETUP CONVERSATION, AS THE LEAD READS IT (U.6 review), against start-chat.txt: "Set up a
 * check-in", the conversation, "This sounds like" and "It’s something else". Not the old name box,
 * "Getting started", the arrow steps, "Pick a different situation" or the chickens example.
 */
vi.mock('@/api/entry', () => ({
  entryApi: { opener: vi.fn().mockResolvedValue({ reply: '' }), chat: vi.fn(), report: vi.fn(), onboard: vi.fn(), classifyIntent: vi.fn() },
}))
vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn() } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: null, isAuthenticated: false }) }))

function openWith(session: object) {
  localStorage.clear()
  localStorage.setItem('gw_entry_session', JSON.stringify(session))
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/start']}><EntryChatPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the setup conversation', () => {
  beforeEach(() => localStorage.clear())

  it('reads as start-chat.txt, and none of the old wording', async () => {
    const { THE_OPENING_QUESTION } = await import('./EntryChatPage')
    openWith({
      scenario: 'PIP', history: [], closed: false, onboardingStep: 1,
      onboardingSelections: { mode: 'new', initial: 'A team member is not delivering.', classifiedScenario: 'PIP', peopleNamed: ['Daniel'] },
      onboardingHistory: [
        { role: 'assistant', content: THE_OPENING_QUESTION },
        { role: 'user', content: 'A team member is not delivering and I need to address it.' },
        { role: 'assistant', content: 'Who is it, and what were they meant to be delivering?' },
      ],
    })
    await waitFor(() => expect(screen.getByText('Who is it, and what were they meant to be delivering?')).toBeTruthy())
    expect(screen.getByRole('heading', { level: 1, name: 'Set up a check-in' })).toBeTruthy()
    expect(document.body.textContent).toContain('This sounds like Help someone get back on track.')
    expect(screen.getByRole('button', { name: 'It’s something else' })).toBeTruthy()
    const page = document.body.textContent ?? ''
    for (const old of ['Give this a name', 'Getting started', 'session is about 10 minutes', 'What is going on', 'Save & invite', 'Pick a different situation', 'Set up as', 'organic chickens']) {
      expect(page, old).not.toContain(old)
    }
  })

  it('once in the check-in, the planned number follows how often it runs', async () => {
    openWith({
      scenario: 'PIP', closed: false, flowPath: 'self', onboardingStep: 7,
      history: [{ role: 'assistant', content: 'How is it going?' }],
      sessions: 1, cadence: 'WEEKLY', cadenceChosen: true, plannedFrom: { timelineDays: 42, cadence: 'WEEKLY' },
      onboardingSelections: { mode: 'new', initial: 'x', classifiedScenario: 'PIP' },
    })
    await waitFor(() => expect(document.body.textContent).toContain('sessions planned'))
    expect(document.body.textContent).toContain('6 sessions planned')
    expect(document.body.textContent).not.toContain('1 session planned')
  })
})

describe('the setup shows what will be saved (U.6 review)', () => {
  /* Read live: "This will run every 2 weeks" and fortnightly dates, saved as weekly for 90 days. */
  it('an unpicked rhythm is the situation’s own, and its dates run to its usual end', async () => {
    localStorage.clear()
    localStorage.setItem('gw_entry_session', JSON.stringify({
      scenario: '', closed: true, flowPath: 'self', onboardingStep: 7,
      history: [{ role: 'user', content: 'He has missed three deadlines.' }, { role: 'assistant', content: 'Noted.' }],
      onboardingSelections: { mode: 'new', initial: 'x', classifiedScenario: 'PIP' },
    }))
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={['/start']}><EntryChatPage /></MemoryRouter></QueryClientProvider>)
    expect(await screen.findByText('Not set yet. This will run every week unless you pick one.')).toBeTruthy()
    /* 90 days, weekly: 12 check-ins, as the server keeps them, and the end date goes with the save. */
    await waitFor(() => expect(document.body.textContent).toMatch(/: 12 in all\./))
    expect(document.body.textContent).not.toContain('every 2 weeks unless')
  })
})

describe('coming back to /start with a setup unfinished (U.6 review)', () => {
  it('offers "Carry on with this one" or "Start a new one"', async () => {
    localStorage.clear()
    localStorage.setItem('gw_entry_session', JSON.stringify({
      scenario: '', history: [], closed: false, onboardingStep: 1,
      onboardingSelections: { mode: 'new', initial: 'x', classifiedScenario: 'PIP' },
      onboardingHistory: [{ role: 'assistant', content: 'Opening.' }, { role: 'user', content: 'Someone is not delivering.' }, { role: 'assistant', content: 'Who is it?' }],
    }))
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={['/start?new=1']}><EntryChatPage /></MemoryRouter></QueryClientProvider>)
    expect(await screen.findByRole('button', { name: 'Carry on with this one' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Start a new one' })).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/scenario|Keep current session/i)
    expect(document.body.textContent).toContain('Starting a new one clears the one you were setting up, and nothing you said in it is kept. Carry on with it to pick up where you left off.')
    expect(document.body.textContent).not.toContain('Keep it to carry on')
  })

  /* Read live: pressing it showed the empty first screen, and the setup came back only on reload. */
  it('"Carry on with this one" puts the kept conversation back on the screen straight away', async () => {
    localStorage.clear()
    localStorage.setItem('gw_entry_session', JSON.stringify({
      scenario: '', history: [], closed: false, onboardingStep: 1,
      onboardingSelections: { mode: 'new', initial: 'x', classifiedScenario: 'PIP' },
      onboardingHistory: [{ role: 'assistant', content: 'Opening.' }, { role: 'user', content: 'Someone is not delivering.' }, { role: 'assistant', content: 'Who is it?' }],
    }))
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={['/start?new=1']}><EntryChatPage /></MemoryRouter></QueryClientProvider>)
    fireEvent.click(await screen.findByRole('button', { name: 'Carry on with this one' }))
    expect(await screen.findByText('Who is it?')).toBeTruthy()
    expect(screen.getByText('Someone is not delivering.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Carry on with this one' })).toBeNull()
    expect(document.body.textContent).not.toContain('Describe it in your own words')
  })
})
