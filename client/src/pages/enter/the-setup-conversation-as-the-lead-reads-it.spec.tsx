import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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
